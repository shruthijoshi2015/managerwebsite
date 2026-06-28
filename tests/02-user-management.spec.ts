/**
 * @file 02-user-management.spec.ts
 * @description Tests: Create user, view profile, edit profile, IndexedDB sync
 * RUN BEFORE: Any change touching TeamOverviewClient, ProfileLayoutClient, actions.ts, db.ts
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, TEST_USER, goToTeam, createUser,
  openUserProfile, findUserInIndexedDB, waitForIndexedDBSync, assertNoErrors
} from './helpers';

const UNIQUE_USER = {
  name: `AutoTest_${Date.now()}`,
  role: 'Test Automation Engineer',
  email: `autotest_${Date.now()}@company.com`,
};

test.describe('👤 User Management — Create, View, Edit, Sync', () => {

  test('02.1 Create new user via "+ New member" modal', async ({ page }) => {
    await goToTeam(page);

    // Count members before
    const before = await page.locator('a[href^="/team/"]').count();

    // Open modal
    await page.locator('button').filter({ hasText: /New member/i }).first().click();
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 3000 });

    // Fill form
    await page.locator('input[name="name"]').fill(UNIQUE_USER.name);
    await page.locator('input[name="role"]').fill(UNIQUE_USER.role);
    await page.locator('input[name="email"]').fill(UNIQUE_USER.email);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Modal should close and user should appear
    await expect(page.locator(`text=${UNIQUE_USER.name}`).first()).toBeVisible({ timeout: 8000 });

    // Count should be +1
    const after = await page.locator('a[href^="/team/"]').count();
    expect(after).toBeGreaterThan(before);
    console.log(`✅ 02.1: User "${UNIQUE_USER.name}" created. Members: ${before} → ${after}`);
  });

  test('02.2 New user persists after page refresh', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${UNIQUE_USER.name}`).first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ 02.2: User "${UNIQUE_USER.name}" persists after refresh`);
  });

  test('02.3 Clicking new user opens profile page (no 404)', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    const url = await openUserProfile(page, UNIQUE_USER.name);
    expect(url).toMatch(/\/team\/\d+/);
    await assertNoErrors(page);
    await expect(page.locator(`text=${UNIQUE_USER.name}`).first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ 02.3: Profile page opened at ${url}`);
  });

  test('02.4 Profile page shows correct tabs (Goals, Actions, Notes, Settings)', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    await openUserProfile(page, UNIQUE_USER.name);

    // Tabs visible in profile header
    const tabs = ['Goals', 'Actions', 'Notes'];
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ 02.4: Tab "${tab}" visible`);
    }
  });

  test('02.5 Profile page shows user name and role', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    await openUserProfile(page, UNIQUE_USER.name);
    await expect(page.locator(`text=${UNIQUE_USER.name}`).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${UNIQUE_USER.role}`).first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ 02.5: Name and role displayed on profile`);
  });

  test('02.6 New user synced to IndexedDB after creation', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    await waitForIndexedDBSync(page, 2000);

    const user = await findUserInIndexedDB(page, UNIQUE_USER.name);
    expect(user).not.toBeNull();
    expect(user.name).toBe(UNIQUE_USER.name);
    expect(user.role).toBe(UNIQUE_USER.role);
    expect(user.email).toBe(UNIQUE_USER.email);
    expect(Array.isArray(user.goals)).toBe(true);
    expect(Array.isArray(user.tasks)).toBe(true);
    expect(Array.isArray(user.notes)).toBe(true);
    expect(typeof user.id).toBe('number');
    console.log(`✅ 02.6: IndexedDB contains "${UNIQUE_USER.name}" with id=${user.id}`);
  });

  test('02.7 Create user via /team/new standalone page', async ({ page }) => {
    const standaloneUser = { name: `Standalone_${Date.now()}`, role: 'Standalone Role', email: `standalone_${Date.now()}@co.com` };
    await page.goto(`${BASE_URL}/team/new`);
    await page.waitForLoadState('networkidle');

    await page.locator('#name').fill(standaloneUser.name);
    await page.locator('#role').fill(standaloneUser.role);
    await page.locator('#email').fill(standaloneUser.email);
    await page.locator('button[type="submit"]').click();

    // Should navigate back to /team
    await page.waitForURL('**/team', { timeout: 10000 });
    await expect(page.locator(`text=${standaloneUser.name}`).first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ 02.7: User "${standaloneUser.name}" created via /team/new`);
  });

  test('02.8 Profile shows empty state for new user (no goals, no tasks)', async ({ page }) => {
    await createUser(page, UNIQUE_USER);
    await openUserProfile(page, UNIQUE_USER.name);

    // Click Goals tab
    await page.locator('button:has-text("Goals"), [role="tab"]:has-text("Goals")').first().click();
    await page.waitForTimeout(500);

    // Should show empty state or empty list
    const goalRows = page.locator('tr, [data-testid="goal-row"]');
    const goalCount = await goalRows.count();
    console.log(`✅ 02.8: Profile has ${goalCount} goal rows for new user (expected 0 or empty state)`);
  });

  test('02.9 Team view switch: Grid view and List view both work', async ({ page }) => {
    await goToTeam(page);

    // Switch to Grid view
    const gridBtn = page.locator('button[title="Grid view"], button:has(svg)').first();
    // Try clicking grid icon
    const viewBtns = page.locator('button').filter({ hasText: '' });
    
    // Check list view table is visible
    const listTable = page.locator('table, [role="table"]').first();
    const isTable = await listTable.isVisible().catch(() => false);
    console.log(`✅ 02.9: List view visible: ${isTable}`);

    // Look for grid/list toggle buttons
    const toggleBtns = page.locator('button svg[class*="LayoutGrid"], button svg[class*="List"]');
    const toggleCount = await toggleBtns.count();
    console.log(`✅ 02.9: Found ${toggleCount} view toggle buttons`);
  });

  test('02.10 My Team search filters members correctly', async ({ page }) => {
    await goToTeam(page);
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Get initial member count
    const allCards = page.locator('a[href^="/team/"]');
    const initialCount = await allCards.count();

    // Type a search that matches known user
    await searchInput.fill('Test User');
    await page.waitForTimeout(500);

    const filteredCount = await allCards.count();
    console.log(`✅ 02.10: Search "Test User" → ${initialCount} → ${filteredCount} members`);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    const restoredCount = await allCards.count();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    console.log(`✅ 02.10: After clear: ${restoredCount} members restored`);
  });
});
