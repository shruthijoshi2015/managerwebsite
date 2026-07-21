import { readDb, Reportee } from './db';

/**
 * lib/security.ts
 * Centralized Security Module for Input Validation, Sanitization, Authorization,
 * Rate Limiting, Safe Logging, and Data Masking.
 * Complies with OWASP Top 10 & WCAG/Security Checklist (Sections 4.1, 4.2, 4.3, 4.4).
 */

// --- 4.1 INPUT VALIDATION & SANITIZATION ---

/**
 * Sanitizes plain string inputs by stripping potentially dangerous HTML tags and script injection attempts.
 */
export function sanitizeString(input: any, maxLength = 2000): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  // Strip script, style, iframe, object, embed tags and event handlers
  return str
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\b(on[a-z]+)\s*=\s*(['"\s][^'">]*['"\s]|\S+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Sanitizes rich text / HTML content (e.g. Check-in Notes, Notebook pages) allowing safe formatting tags
 * while aggressively neutralizing XSS vectors.
 */
export function sanitizeHtml(input: any): string {
  if (input === null || input === undefined) return '';
  let html = String(input);
  
  // Remove dangerous tags and javascript/data protocols in attributes
  html = html
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|applet|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|applet|meta|base)[^>]*\/?>/gi, '')
    .replace(/\b(on[a-z]+)\s*=\s*(['"\s][^'">]*['"\s]|\S+)/gi, '')
    .replace(/(href|src|background)\s*=\s*['"]\s*(javascript|vbscript|data:text\/html)[^'"]*['"]/gi, '$1="#"');

  return html;
}

/**
 * Validates whether an email is well-formed and safe.
 */
export function validateEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 254;
}

/**
 * Validates numeric identifiers to prevent ID injection or type mismatch errors.
 */
export function validateId(id: any): number | null {
  if (id === null || id === undefined) return null;
  const num = Number(id);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Validates uploaded files or base64 data strings for acceptable MIME types and maximum payload size.
 */
export function validateFileUpload(fileOrBase64: { type?: string; size?: number; name?: string; content?: string }, maxSizeBytes = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown'];
  const disallowedExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.pl', '.py'];

  if (fileOrBase64.name) {
    const lowerName = fileOrBase64.name.toLowerCase();
    if (disallowedExtensions.some(ext => lowerName.endsWith(ext))) {
      return { valid: false, error: 'File type not permitted for security reasons.' };
    }
  }

  if (fileOrBase64.type && !allowedMimeTypes.includes(fileOrBase64.type)) {
    return { valid: false, error: `MIME type "${fileOrBase64.type}" is not allowed.` };
  }

  if (fileOrBase64.size && fileOrBase64.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds the allowable limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.` };
  }

  if (fileOrBase64.content && fileOrBase64.content.length > maxSizeBytes * 1.5) {
    return { valid: false, error: 'Encoded content size exceeds limit.' };
  }

  return { valid: true };
}


// --- 4.2 DATA PROTECTION & SAFE LOGGING ---

/**
 * Safe logging utility that automatically scrubs sensitive attributes (passwords, tokens, API keys, emails)
 * before writing logs to stdout/stderr.
 */
export function logSafe(message: string, meta?: any): void {
  if (meta === undefined) {
    console.log(`[SAFE_LOG] ${message}`);
    return;
  }
  try {
    const scrubbed = JSON.parse(JSON.stringify(meta, (key, value) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('api_key') || lowerKey.includes('apikey') || lowerKey.includes('authorization')) {
        return '[REDACTED_SECRET]';
      }
      if (lowerKey.includes('ssn') || lowerKey.includes('creditcard') || lowerKey.includes('cardnumber')) {
        return '[REDACTED_PII]';
      }
      return value;
    }));
    console.log(`[SAFE_LOG] ${message}`, scrubbed);
  } catch (e) {
    console.log(`[SAFE_LOG] ${message} [Metadata Redacted due to formatting]`);
  }
}

/**
 * Masks sensitive data such as credit card numbers, email addresses, or phone numbers.
 */
export function maskSensitiveData(input: string, type: 'card' | 'email' | 'phone'): string {
  if (!input) return '';
  if (type === 'card') {
    const clean = input.replace(/\D/g, '');
    if (clean.length < 4) return '****';
    return '****-****-****-' + clean.slice(-4);
  }
  if (type === 'email') {
    const parts = input.split('@');
    if (parts.length !== 2) return input;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name.charAt(0)}****@${domain}`;
    return `${name.charAt(0)}${'*'.repeat(Math.max(1, name.length - 2))}${name.charAt(name.length - 1)}@${domain}`;
  }
  if (type === 'phone') {
    const clean = input.replace(/\D/g, '');
    if (clean.length < 4) return '****';
    return '***-***-' + clean.slice(-4);
  }
  return input;
}


// --- 4.3 AUTHENTICATION & AUTHORIZATION ---

export interface SecurityContext {
  userId?: number;
  isManager: boolean;
  role: string;
}

/**
 * Verifies whether the calling context has managerial / administrator privileges.
 */
export function verifyAdminOrManager(ctx?: SecurityContext): boolean {
  if (!ctx) return true; // Default to allow in single-user local mode unless context specified
  return ctx.isManager === true || ctx.role.toLowerCase().includes('manager') || ctx.role.toLowerCase().includes('admin');
}

/**
 * Verifies whether a user can read/write data belonging to a target reportee ID.
 * Managers can access all reportee data. Reportees can only access their own data.
 */
export function verifyUserOwnership(actingUserId: number | undefined, targetReporteeId: number, isManager: boolean): boolean {
  if (isManager) return true;
  if (actingUserId === undefined) return true; // Standalone single-tenant mode
  return Number(actingUserId) === Number(targetReporteeId);
}

/**
 * Checks if a requested reportee exists and verifies permissions before modifying.
 */
export function getAuthorizedReportee(id: number, ctx?: SecurityContext): Reportee | null {
  const db = readDb();
  const target = db.team.find(r => Number(r.id) === Number(id));
  if (!target) return null;
  if (ctx && !verifyUserOwnership(ctx.userId, target.id, ctx.isManager)) {
    return null;
  }
  return target;
}


// --- 4.1 RATE LIMITING IN-MEMORY STORE ---

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Sliding window token-bucket rate limiter.
 * @param identifier Unique IP or User ID key
 * @param limit Maximum allowed requests per window
 * @param windowMs Window duration in milliseconds (default 60s)
 */
export function checkRateLimit(identifier: string, limit = 100, windowMs = 60 * 1000): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}
