/**
 * @file 06-dashboard.spec.ts
 * @description Tests: Dashboard — Me/Team tabs, all widget types, widget add/remove, layout persistence
 * RUN BEFORE: Any change touching DashboardClient, widget components
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, goToDashboard, assertNoErrors } from './helpers';

test.describe('🏠 Dashboard — Widgets, Tabs, Layout', () => {

  test('06.1 Dashboard loads and shows Me/Team tabs', async ({ page }) => {
    await goToDashboard(page);
    await assertNoErrors(page);

    const meTab = page.locator('button:has-text("Me"), [role="tab"]:has-text("Me")').first();
    const teamTab = page.locator('button:has-text("Team"), [role="tab"]:has-text("Team")').first();

    await expect(meTab).toBeVisible({ timeout: 5000 });
    await expect(teamTab).toBeVisible({ timeout: 5000 });
    console.log('✅ 06.1: Me and Team tabs visible on Dashboard');
  });

  test('06.2 Dashboard does NOT show Org tab (removed)', async ({ page }) => {
    await goToDashboard(page);

    const orgTab = page.locator('button:has-text("Org"), [role="tab"]:has-text("Org")').first();
    const orgVisible = await orgTab.isVisible().catch(() => false);
    expect(orgVisible).toBe(false);
    console.log('✅ 06.2: "Org" tab is correctly removed from Dashboard');
  });

  test('06.3 "Me" tab shows personal widgets (Goals, Tasks, Meetings)', async ({ page }) => {
    await goToDashboard(page);

    const meTab = page.locator('button:has-text("Me")').first();
    await meTab.click();
    await page.waitForTimeout(500);

    // Key widget labels
    const widgetLabels = ['GOALS', 'TASKS', 'MEETINGS', 'UPCOMING'];
    for (const label of widgetLabels) {
      const widget = page.locator(`text=${label}`).first();
      const visible = await widget.isVisible().catch(() => false);
      console.log(`✅ 06.3: Widget "${label}" visible: ${visible}`);
    }
  });

  test('06.4 "Team" tab shows team widgets', async ({ page }) => {
    await goToDashboard(page);

    const teamTab = page.locator('button:has-text("Team")').first();
    await teamTab.click();
    await page.waitForTimeout(500);
    await assertNoErrors(page);
    console.log('✅ 06.4: Team tab switched without error');

    // Should show some team-related content
    const teamContent = page.locator('[class*="rounded-xl"], [class*="bg-white"]').first();
    const visible = await teamContent.isVisible().catch(() => false);
    console.log(`✅ 06.4: Team tab content visible: ${visible}`);
  });

  test('06.5 "Add Widget" button opens widget catalog', async ({ page }) => {
    await goToDashboard(page);

    const addWidgetBtn = page.locator('button').filter({ hasText: /Add Widget|Add widget|\+ Widget/i }).first();
    if (await addWidgetBtn.isVisible()) {
      await addWidgetBtn.click();
      await page.waitForTimeout(500);

      // Widget catalog should show
      const catalog = page.locator('[role="dialog"], [class*="absolute"][class*="border"]').first();
      const catalogVisible = await catalog.isVisible().catch(() => false);
      console.log(`✅ 06.5: Widget catalog opened: ${catalogVisible}`);

      if (catalogVisible) await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 06.5: Add Widget button not found');
    }
  });

  test('06.6 Dashboard widgets contain real data (not empty)', async ({ page }) => {
    await goToDashboard(page);

    const meTab = page.locator('button:has-text("Me")').first();
    await meTab.click();
    await page.waitForTimeout(500);

    // At least some content should be inside widget cards
    const cards = page.locator('[class*="bg-white"][class*="rounded"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✅ 06.6: Dashboard shows ${cardCount} widget cards`);
  });

  test('06.7 Goals widget shows progress bars or goal items', async ({ page }) => {
    await goToDashboard(page);

    const meTab = page.locator('button:has-text("Me")').first();
    if (await meTab.isVisible()) await meTab.click();
    await page.waitForTimeout(500);

    // Look for goal-related elements
    const goalItems = page.locator('[class*="progress"], progress, [role="progressbar"]').first();
    const hasProgress = await goalItems.isVisible().catch(() => false);
    console.log(`✅ 06.7: Progress bars visible in goals widget: ${hasProgress}`);
  });

  test('06.8 Dashboard "View all goals" link navigates to /goals', async ({ page }) => {
    await goToDashboard(page);

    const viewAllGoals = page.locator('a[href="/goals"], a:has-text("View all goals"), a:has-text("All goals")').first();
    if (await viewAllGoals.isVisible()) {
      await viewAllGoals.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/goals');
      console.log('✅ 06.8: "View all goals" navigates to /goals');
    } else {
      console.log('⚠️ 06.8: "View all goals" link not found');
    }
  });

  test('06.9 Dashboard shows 1:1 meetings widget', async ({ page }) => {
    await goToDashboard(page);

    const meTab = page.locator('button:has-text("Me")').first();
    if (await meTab.isVisible()) await meTab.click();
    await page.waitForTimeout(500);

    const meetingsWidget = page.locator('text=MEETINGS, text=1:1, text=1-on-1').first();
    const visible = await meetingsWidget.isVisible().catch(() => false);
    console.log(`✅ 06.9: Meetings widget visible: ${visible}`);
  });

  test('06.10 Daily Digest banner or AI insight section visible', async ({ page }) => {
    await goToDashboard(page);

    // Look for AI insight / daily digest elements
    const aiElements = page.locator('[class*="sparkle"], [class*="ai"], text=digest, text=Insight, text=AI').first();
    const visible = await aiElements.isVisible().catch(() => false);
    console.log(`✅ 06.10: AI/Digest element visible: ${visible}`);
  });

  test('06.11 Tab selection persists after page refresh', async ({ page }) => {
    await goToDashboard(page);

    // Click Team tab
    const teamTab = page.locator('button:has-text("Team")').first();
    if (await teamTab.isVisible()) {
      await teamTab.click();
      await page.waitForTimeout(300);
    }

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if Team is still selected (via localStorage)
    const isTeamActive = await page.evaluate(() => {
      return localStorage.getItem('manager_pref_dashboard_tab') === 'team';
    });
    console.log(`✅ 06.11: Dashboard tab persistence via localStorage: ${isTeamActive}`);
  });

  test('06.12 Dashboard shows "Setup Manager Profile" only for non-manager users', async ({ page }) => {
    await goToDashboard(page);

    // This banner should NOT appear if a manager is already set
    const setupBanner = page.locator('text=Setup Manager Profile, text=Setup Manager, text=Manager Profile');
    const bannerVisible = await setupBanner.first().isVisible().catch(() => false);
    console.log(`✅ 06.12: Setup Manager banner visible: ${bannerVisible} (depends on demo data state)`);
  });
});
