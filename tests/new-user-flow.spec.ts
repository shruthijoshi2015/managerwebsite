/**
 * @file new-user-flow.spec.ts
 * @description Automated UI test for new user creation, route resolution, and IndexedDB sync
 * 
 * Framework: Playwright (https://playwright.dev)
 * Run: npx playwright test tests/new-user-flow.spec.ts --headed
 * 
 * Install Playwright if not already:
 *   npx playwright install chromium
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read a value from IndexedDB inside the browser context */
async function getIndexedDBUser(page: Page, userName: string) {
  return page.evaluate(async (name: string) => {
    return new Promise((resolve) => {
      const request = indexedDB.open('ManagerOS_DB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('store', 'readonly');
        const store = tx.objectStore('store');
        const get = store.get('database');
        get.onsuccess = () => {
          const data = get.result;
          if (!data || !data.team) return resolve(null);
          const user = data.team.find((m: any) =>
            m.name.toLowerCase() === name.toLowerCase()
          );
          resolve(user || null);
        };
        get.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  }, userName);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('New User Creation Flow', () => {
  const BASE_URL = 'http://localhost:3000';
  const NEW_USER = {
    name: 'Test User3',
    role: 'QA Engineer',
    email: 'test.user3@company.com',
  };

  // ─── Test 1: Create new user via modal ─────────────────────────────────────
  test('Step 1-3: Create user, verify immediate appearance, no 404 error', async ({ page }) => {
    // Step 1.1 — Open My Team page
    await page.goto(`${BASE_URL}/team`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Step 1.1: My Team page loaded');

    // Step 1.2-1.3 — Click "+ New member" button
    const addBtn = page.locator('button:has-text("New member"), button:has-text("+ New member")');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    console.log('✅ Step 1.3: Add modal opened');

    // Step 2 — Fill in the form
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await page.locator('input[name="name"]').fill(NEW_USER.name);
    await page.locator('input[name="role"]').fill(NEW_USER.role);
    await page.locator('input[name="email"]').fill(NEW_USER.email);
    console.log('✅ Step 2: Form filled with new user data');

    // Step 2.4 — Submit
    await page.locator('button[type="submit"]').click();
    console.log('✅ Step 2.4: Create Profile submitted');

    // Step 3.1 — User should appear on My Team after modal closes
    await expect(modal).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(500); // allow re-render

    const memberCard = page.locator(`text=${NEW_USER.name}`).first();
    await expect(memberCard).toBeVisible({ timeout: 5000 });
    console.log(`✅ Step 3.1: "${NEW_USER.name}" is visible on My Team page`);

    // Step 3.2 — No 404 error page
    await expect(page.locator('text=404')).toBeHidden();
    await expect(page.locator('text=Page Not Found')).toBeHidden();
    console.log('✅ Step 3.2: No 404 or Page Not Found error');
  });

  // ─── Test 2: Refresh & verify persistence ──────────────────────────────────
  test('Step 4: Refresh page and verify user persists', async ({ page }) => {
    await page.goto(`${BASE_URL}/team`);
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('✅ Step 4.1: Page refreshed');

    // Verify member still visible
    const memberCard = page.locator(`text=${NEW_USER.name}`).first();
    await expect(memberCard).toBeVisible({ timeout: 5000 });
    console.log(`✅ Step 4.2: "${NEW_USER.name}" persists after page refresh`);
  });

  // ─── Test 3: Open profile page — no 404 ────────────────────────────────────
  test('Step 5: Click on new user and profile page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/team`);
    await page.waitForLoadState('networkidle');

    // Click on the member card
    const memberLink = page.locator(`a[href*="/team/"]:has-text("${NEW_USER.name}")`).first();
    await expect(memberLink).toBeVisible({ timeout: 5000 });

    const href = await memberLink.getAttribute('href');
    console.log(`✅ Step 5.1: Found member link: ${href}`);

    await memberLink.click();
    await page.waitForLoadState('networkidle');

    // Verify the profile loaded (not 404)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/team/');
    expect(currentUrl).not.toBe(`${BASE_URL}/team`);
    console.log(`✅ Step 5.1: Navigated to ${currentUrl}`);

    // Verify name appears in profile
    const nameHeading = page.locator(`text=${NEW_USER.name}`).first();
    await expect(nameHeading).toBeVisible({ timeout: 5000 });
    console.log(`✅ Step 5.2: Profile page shows "${NEW_USER.name}"`);

    // Verify role
    const roleBadge = page.locator(`text=${NEW_USER.role}`).first();
    await expect(roleBadge).toBeVisible({ timeout: 5000 });
    console.log(`✅ Step 5.2: Role "${NEW_USER.role}" shown on profile`);

    // No error in page content
    await expect(page.locator('text=notFound')).toBeHidden();
    console.log('✅ Step 5.4: No notFound error visible');
  });

  // ─── Test 4: Verify IndexedDB sync ─────────────────────────────────────────
  test('Step 6: Verify new user is stored in browser IndexedDB', async ({ page }) => {
    // Navigate to any page to initialize IndexedDB
    await page.goto(`${BASE_URL}/team`);
    await page.waitForLoadState('networkidle');

    // Wait a moment for IndexedDB to hydrate
    await page.waitForTimeout(2000);

    const userInIDB = await getIndexedDBUser(page, NEW_USER.name);

    console.log('IndexedDB user entry:', JSON.stringify(userInIDB, null, 2));

    expect(userInIDB).not.toBeNull();

    const user = userInIDB as any;
    expect(user.name).toBe(NEW_USER.name);
    expect(user.role).toBe(NEW_USER.role);
    expect(user.email).toBe(NEW_USER.email);
    expect(Array.isArray(user.goals)).toBe(true);
    expect(Array.isArray(user.tasks)).toBe(true);
    expect(Array.isArray(user.notes)).toBe(true);
    expect(typeof user.id).toBe('number');

    console.log(`✅ Step 6.5: "${NEW_USER.name}" found in IndexedDB`);
    console.log(`✅ Step 6.6: ID is a valid timestamp number: ${user.id}`);
    console.log(`✅ Step 6.7: goals=${user.goals.length}, tasks=${user.tasks.length}, notes=${user.notes.length}`);
  });

  // ─── Test 5: Full e2e — Create → Refresh → Open → IndexedDB ────────────────
  test('Step 1-6 Full E2E: Create user, refresh, open profile, check IndexedDB', async ({ page }) => {
    await page.goto(`${BASE_URL}/team`);
    await page.waitForLoadState('networkidle');

    // Click Add
    const addBtn = page.locator('button:has-text("New member"), button:has-text("+ New member")').first();
    await addBtn.click();
    
    await page.locator('input[name="name"]').fill('E2E Test User');
    await page.locator('input[name="role"]').fill('Automation QA');
    await page.locator('input[name="email"]').fill('e2e.test@company.com');
    await page.locator('button[type="submit"]').click();
    
    // Wait for member to appear
    await page.waitForSelector('text=E2E Test User', { timeout: 8000 });
    console.log('✅ E2E: User created and visible');

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=E2E Test User').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ E2E: User persists after refresh');

    // Open profile
    await page.locator(`a[href*="/team/"]:has-text("E2E Test User")`).first().click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/team/');
    await expect(page.locator('text=E2E Test User').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ E2E: Profile page opened without 404');

    // Check IndexedDB
    await page.goto(`${BASE_URL}/team`);
    await page.waitForTimeout(2000);
    const idbUser = await getIndexedDBUser(page, 'E2E Test User') as any;
    expect(idbUser).not.toBeNull();
    expect(idbUser.name).toBe('E2E Test User');
    console.log('✅ E2E: User found in IndexedDB');
    console.log('🎉 E2E Full flow PASSED!');
  });
});
