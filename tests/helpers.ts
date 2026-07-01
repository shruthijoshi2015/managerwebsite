/**
 * @file helpers.ts
 * @description Shared utilities and constants for all ManagerOS tests
 */

import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';

// ─── Test Data ────────────────────────────────────────────────────────────────
export const TEST_USER = {
  name: 'Test User Playwright',
  role: 'QA Automation Engineer',
  email: 'playwright.test@company.com',
};

export const TEST_GOAL = {
  title: 'Improve Test Coverage to 90%',
  description: 'Automate all critical user flows',
  status: 'on_track',
};

export const TEST_ACTION = {
  title: 'Write unit tests for auth module',
  priority: 'P1',
  status: 'in_progress',
  timeframe: 'Q3 2025',
};

// ─── IndexedDB Helper ─────────────────────────────────────────────────────────
export async function getIndexedDBData(page: Page) {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('ManagerOS_DB', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('store', 'readonly');
        const get = tx.objectStore('store').get('database');
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  });
}

export async function findUserInIndexedDB(page: Page, name: string) {
  const db: any = await getIndexedDBData(page);
  if (!db || !db.team) return null;
  return db.team.find((m: any) => m.name === name) || null;
}

export async function waitForIndexedDBSync(page: Page, timeoutMs = 3000) {
  await page.waitForTimeout(timeoutMs);
}

// ─── Navigation Helpers ───────────────────────────────────────────────────────
export async function goToDashboard(page: Page) {
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
}

export async function goToTeam(page: Page) {
  await page.goto(`${BASE_URL}/team`);
  await page.waitForLoadState('networkidle');
}

export async function goToGoals(page: Page) {
  await page.goto(`${BASE_URL}/goals`);
  await page.waitForLoadState('networkidle');
}

export async function goToNotes(page: Page) {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');
}

export async function goToActions(page: Page) {
  await page.goto(`${BASE_URL}/actions`);
  await page.waitForLoadState('networkidle');
}

export async function goToSettings(page: Page) {
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');
}

// ─── User Creation Helper ─────────────────────────────────────────────────────
export async function createUser(page: Page, user = TEST_USER): Promise<void> {
  await goToTeam(page);
  const addBtn = page.locator('button').filter({ hasText: /New member/i }).first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();

  await page.locator('input[name="name"]').fill(user.name);
  await page.locator('input[name="role"]').fill(user.role);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('button[type="submit"]').click();

  // Wait for modal to close and member link to appear
  await expect(page.locator(`a[href*="/team/"]:has-text("${user.name}")`).first()).toBeVisible({ timeout: 15000 });
}

// ─── User Profile Navigation ──────────────────────────────────────────────────
export async function openUserProfile(page: Page, userName: string): Promise<string> {
  await goToTeam(page);
  const link = page.locator(`a[href*="/team/"]:has-text("${userName}")`).first();
  await expect(link).toBeVisible({ timeout: 5000 });
  await link.click();
  await page.waitForURL(/\/team\/\d+/, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  return page.url();
}

// ─── Verification Helpers ─────────────────────────────────────────────────────
export async function assertNoErrors(page: Page) {
  await expect(page.locator('text=404')).toBeHidden();
  await expect(page.locator('text=Page Not Found')).toBeHidden();
  await expect(page.locator('text=Application error')).toBeHidden();
  await expect(page.locator('text=Internal Server Error')).toBeHidden();
}

export async function assertPageLoaded(page: Page, expectedTitle: string | RegExp) {
  await assertNoErrors(page);
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible({ timeout: 5000 });
  if (expectedTitle) {
    await expect(heading).toContainText(expectedTitle);
  }
}

export async function cleanupTestData(page: Page) {
  try {
    await page.request.post(`${BASE_URL}/api/cleanup-tests`);
  } catch (e) {
    console.error("Failed to clean up test data:", e);
  }
}
