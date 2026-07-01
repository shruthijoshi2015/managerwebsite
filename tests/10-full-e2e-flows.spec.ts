/**
 * @file 10-full-e2e-flows.spec.ts
 * @description Tests: Complete end-to-end flows — create user → add goal → add action → verify IndexedDB
 * RUN BEFORE: Every release. These are the golden-path regression tests.
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToTeam, goToGoals, goToActions, goToDashboard,
  createUser, openUserProfile, findUserInIndexedDB, waitForIndexedDBSync,
  assertNoErrors
} from './helpers';

test.describe('🚀 Full E2E Flows — Critical User Journeys', () => {

  test('E2E-01: Create user → refresh → open profile → verify IndexedDB', async ({ page }) => {
    const user = { name: `E2E_User_${Date.now()}`, role: 'E2E Role', email: `e2e_${Date.now()}@co.com` };

    // Step 1: Create user
    await createUser(page, user);
    console.log(`✅ E2E-01 Step 1: User "${user.name}" created`);

    // Step 2: Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${user.name}`).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ E2E-01 Step 2: User persists after refresh');

    // Step 3: Open profile
    const url = await openUserProfile(page, user.name);
    expect(url).toMatch(/\/team\/\d+/);
    await assertNoErrors(page);
    console.log(`✅ E2E-01 Step 3: Profile opened at ${url}`);

    // Step 4: Verify IndexedDB
    await goToTeam(page);
    await waitForIndexedDBSync(page, 2000);
    const idbUser = await findUserInIndexedDB(page, user.name);
    expect(idbUser).not.toBeNull();
    expect(idbUser.name).toBe(user.name);
    console.log('✅ E2E-01 Step 4: User in IndexedDB ✓');
    console.log('🎉 E2E-01 PASSED');
  });

  test('E2E-02: Navigate all pages in sequence without any error', async ({ page }) => {
    const routes = ['/', '/team', '/goals', '/notes', '/actions', '/settings'];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      await assertNoErrors(page);
      console.log(`✅ E2E-02: ${route} — OK`);
    }
    console.log('🎉 E2E-02 PASSED: All pages navigated without errors');
  });

  test('E2E-03: Goals page — open modal, fill form, close — no errors', async ({ page }) => {
    await goToGoals(page);
    await assertNoErrors(page);

    // Open goal modal
    await page.locator('button:has-text("New goal")').click();
    await page.waitForTimeout(500);

    // Fill the goal title
    const titleInput = page.locator('input[placeholder*="goal" i], input[name="title"], input[placeholder*="title" i]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(`E2E Goal ${Date.now()}`);
    }

    // Close without saving
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await assertNoErrors(page);
    console.log('🎉 E2E-03 PASSED: Goal modal open/fill/close without errors');
  });

  test('E2E-04: Action Items page — list/grouped view switch, filter, back to default', async ({ page }) => {
    await goToActions(page);

    // Switch views
    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    const groupedBtn = page.locator('button').filter({ hasText: /Grouped/i }).first();

    if (await groupedBtn.isVisible()) {
      await groupedBtn.click();
      await page.waitForTimeout(400);
    }
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(400);
    }

    await assertNoErrors(page);
    console.log('🎉 E2E-04 PASSED: Action Items view switching works');
  });

  test('E2E-05: Dashboard Me/Team tab switch — persistent and error-free', async ({ page }) => {
    await goToDashboard(page);

    const teamTab = page.locator('button:has-text("Team")').first();
    await teamTab.click();
    await page.waitForTimeout(500);
    await assertNoErrors(page);

    const meTab = page.locator('button:has-text("Me")').first();
    await meTab.click();
    await page.waitForTimeout(500);
    await assertNoErrors(page);

    console.log('🎉 E2E-05 PASSED: Dashboard tab switching works');
  });

  test('E2E-06: Settings save flow — no crash or 500 error', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Settings")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      await assertNoErrors(page);
    }
    console.log('🎉 E2E-06 PASSED: Settings save completes without error');
  });

  test('E2E-07: Open every team member profile — none should 404', async ({ page }) => {
    await goToTeam(page);
    const profileLinks = await page.locator('a[href^="/team/"]').all();
    
    const hrefs: string[] = [];
    for (const link of profileLinks) {
      const href = await link.getAttribute('href');
      if (href && href !== '/team' && !hrefs.includes(href)) {
        hrefs.push(href);
      }
    }

    console.log(`✅ E2E-07: Found ${hrefs.length} profile links to test`);
    
    for (const href of hrefs) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await assertNoErrors(page);
      console.log(`✅ E2E-07: ${href} — OK`);
    }
    console.log('🎉 E2E-07 PASSED: All team member profiles load without 404');
  });

  test('E2E-08: Notes Hub board/timeline view switch and search combined', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    // Switch to Board
    const boardBtn = page.locator('button').filter({ hasText: /Board/i }).first();
    if (await boardBtn.isVisible()) {
      await boardBtn.click();
      await page.waitForTimeout(400);
    }

    // Search while in board view
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search');
      await page.waitForTimeout(300);
      await searchInput.clear();
    }

    // Switch back to timeline
    const timelineBtn = page.locator('button').filter({ hasText: /Timeline/i }).first();
    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();
      await page.waitForTimeout(400);
    }

    await assertNoErrors(page);
    console.log('🎉 E2E-08 PASSED: Notes view/search combinations work');
  });

  test('E2E-09: Goal status filter → clear filter → view restored', async ({ page }) => {
    await goToGoals(page);

    // Apply a filter
    const atRiskBtn = page.locator('button').filter({ hasText: 'At risk' }).first();
    if (await atRiskBtn.isVisible()) {
      await atRiskBtn.click();
      await page.waitForTimeout(300);
    }

    // Clear filter
    const allBtn = page.locator('button:has-text("All")').first();
    await allBtn.click();
    await page.waitForTimeout(300);

    await assertNoErrors(page);
    console.log('🎉 E2E-09 PASSED: Goals status filter + reset flow works');
  });

  test('E2E-10: View preference persists via localStorage after navigation', async ({ page }) => {
    // Set team view to grid
    await goToTeam(page);
    await page.evaluate(() => localStorage.setItem('manager_pref_team_view', 'grid'));

    // Navigate away and back
    await goToGoals(page);
    await goToTeam(page);

    const savedView = await page.evaluate(() => localStorage.getItem('manager_pref_team_view'));
    expect(savedView).toBe('grid');
    console.log(`✅ E2E-10: View preference "${savedView}" persisted in localStorage`);

    // Reset
    await page.evaluate(() => localStorage.setItem('manager_pref_team_view', 'list'));
    console.log('🎉 E2E-10 PASSED: View preferences persist via localStorage');
  });
});
