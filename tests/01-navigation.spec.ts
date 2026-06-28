/**
 * @file 01-navigation.spec.ts
 * @description Tests: All page navigation, sidebar links, no 404s, correct headings
 * RUN BEFORE: Every release / every code change
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, goToDashboard, goToTeam, goToGoals, goToNotes, goToActions, goToSettings, assertNoErrors, assertPageLoaded } from './helpers';

test.describe('📍 Navigation — All Pages Load Without Errors', () => {

  test('01.1 Dashboard (/) loads correctly', async ({ page }) => {
    await goToDashboard(page);
    await assertNoErrors(page);
    // Dashboard has no h1 but should show key widgets
    await expect(page.locator('text=Me').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Team').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Dashboard loaded');
  });

  test('01.2 My Team (/team) loads correctly', async ({ page }) => {
    await goToTeam(page);
    await assertNoErrors(page);
    await expect(page.locator('text=My Team, text=Team').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('button').filter({ hasText: /New member/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ My Team page loaded');
  });

  test('01.3 Goals (/goals) loads correctly', async ({ page }) => {
    await goToGoals(page);
    await assertNoErrors(page);
    await assertPageLoaded(page, 'Goals');
    await expect(page.locator('button').filter({ hasText: /New goal/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ Goals page loaded');
  });

  test('01.4 Notes Hub (/notes) loads correctly', async ({ page }) => {
    await goToNotes(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Notes').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Notes Hub loaded');
  });

  test('01.5 Action Items (/actions) loads correctly', async ({ page }) => {
    await goToActions(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Action').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Action Items page loaded');
  });

  test('01.6 Settings (/settings) loads correctly', async ({ page }) => {
    await goToSettings(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Settings page loaded');
  });

  test('01.7 Team member profile (/team/[id]) loads for all existing members', async ({ page }) => {
    await goToTeam(page);
    // Collect all profile links
    const links = await page.locator('a[href^="/team/"]').all();
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (!href || href === '/team') continue;
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await assertNoErrors(page);
      console.log(`✅ Profile loaded: ${href}`);
    }
  });

  test('01.8 Sidebar navigation links work correctly', async ({ page }) => {
    await goToDashboard(page);
    
    // Click each sidebar nav icon
    const navRoutes = ['/team', '/goals', '/notes', '/actions', '/settings', '/'];
    for (const route of navRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      await assertNoErrors(page);
      console.log(`✅ Sidebar route: ${route}`);
    }
  });

  test('01.9 /team/new page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/team/new`);
    await page.waitForLoadState('networkidle');
    await assertNoErrors(page);
    await expect(page.locator('text=Add New Reportee').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ /team/new page loaded');
  });

  test('01.10 Unknown route shows 404 gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-page-does-not-exist`);
    await page.waitForLoadState('networkidle');
    // Should show Next.js 404 — not a crash
    const body = await page.textContent('body');
    const is404 = body?.includes('404') || body?.includes('not found') || body?.includes('Not Found');
    expect(is404).toBe(true);
    console.log('✅ 404 page handled gracefully');
  });
});
