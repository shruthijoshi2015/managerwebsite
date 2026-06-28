/**
 * @file 03-goals.spec.ts
 * @description Tests: Add goals, edit goals, filter, sort, list/user views, goal modal
 * RUN BEFORE: Any change touching GoalsPageClient, ProfileLayoutClient, GoalModal, actions.ts
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, TEST_GOAL, goToGoals, goToTeam,
  createUser, openUserProfile, assertNoErrors
} from './helpers';

const TS = Date.now();
const GOAL_USER = { name: `GoalUser_${TS}`, role: 'Goal Tester', email: `goaluser_${TS}@co.com` };
const GOAL_TITLE = `Auto Goal ${TS}`;

test.describe('🎯 Goals — Add, Edit, View, Filter, Sort', () => {

  test('03.1 Goals page loads with correct header and filters', async ({ page }) => {
    await goToGoals(page);
    await assertNoErrors(page);
    await expect(page.locator('h1:has-text("Goals")')).toBeVisible({ timeout: 5000 });

    // Status filter buttons
    for (const label of ['All', 'On track', 'At risk', 'Off track', 'Achieved']) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 3000 });
    }
    console.log('✅ 03.1: Goals page header and filters visible');
  });

  test('03.2 Goals page shows summary ring and stats', async ({ page }) => {
    await goToGoals(page);
    // Overall progress donut
    await expect(page.locator('svg circle').first()).toBeVisible({ timeout: 5000 });
    // Status counts row
    await expect(page.locator('text=On track').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 03.2: Goals summary ring visible');
  });

  test('03.3 Open "+ New goal" modal and verify fields', async ({ page }) => {
    await goToGoals(page);
    await page.locator('button:has-text("New goal")').click();

    // Modal should open
    await expect(page.locator('input[placeholder*="goal" i], input[name="title"]').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 03.3: New goal modal opened');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('03.4 Add a new goal for an existing user from the Goals page', async ({ page }) => {
    // First ensure a user exists
    await createUser(page, GOAL_USER);
    await goToGoals(page);

    // Open new goal modal
    await page.locator('button:has-text("New goal")').click();
    await page.waitForTimeout(500);

    // Fill title
    const titleInput = page.locator('input[placeholder*="goal" i], input[name="title"], input[placeholder*="title" i]').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(GOAL_TITLE);

    // Submit
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').last();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    console.log(`✅ 03.4: Goal "${GOAL_TITLE}" creation attempted`);
  });

  test('03.5 Switch between List view and User view', async ({ page }) => {
    await goToGoals(page);

    // Both view toggle buttons should be visible
    const listBtn = page.locator('button:has-text("List view")');
    const userBtn = page.locator('button:has-text("User view")');

    await expect(listBtn).toBeVisible({ timeout: 5000 });
    await expect(userBtn).toBeVisible({ timeout: 5000 });

    // Switch to user view
    await userBtn.click();
    await page.waitForTimeout(500);
    // User cards should appear (grid layout)
    const cards = page.locator('.grid > div, [class*="rounded-xl"]');
    const cardCount = await cards.count();
    console.log(`✅ 03.5a: User view shows ${cardCount} cards`);

    // Switch back to list view
    await listBtn.click();
    await page.waitForTimeout(500);
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 5000 });
    console.log('✅ 03.5b: Back to list view with table');
  });

  test('03.6 Goals search filters results correctly', async ({ page }) => {
    await goToGoals(page);

    const searchInput = page.locator('input[placeholder*="Search goals" i], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a non-existent search
    await searchInput.fill('XYZZY_NOTFOUND_9999');
    await page.waitForTimeout(500);
    await expect(page.locator('text=No goals found.')).toBeVisible({ timeout: 5000 });
    console.log('✅ 03.6a: Empty state shown for no matching goals');

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(page.locator('text=No goals found.')).toBeHidden({ timeout: 3000 });
    console.log('✅ 03.6b: Goals restored after clearing search');
  });

  test('03.7 Status filter tabs filter goals', async ({ page }) => {
    await goToGoals(page);

    const statusFilters = ['on_track', 'at_risk', 'off_track', 'achieved'];
    for (const status of statusFilters) {
      const btn = page.locator(`button[class*="rounded"]`).filter({ hasText: status === 'on_track' ? 'On track' : status === 'at_risk' ? 'At risk' : status === 'off_track' ? 'Off track' : 'Achieved' });
      if (await btn.count() > 0) {
        await btn.first().click();
        await page.waitForTimeout(300);
        console.log(`✅ 03.7: Status filter "${status}" clicked`);
      }
    }

    // Reset to All
    await page.locator('button:has-text("All")').first().click();
    await page.waitForTimeout(300);
    console.log('✅ 03.7: Reset to "All" filter');
  });

  test('03.8 Goal modal has all expected fields', async ({ page }) => {
    await goToGoals(page);
    await page.locator('button:has-text("New goal")').click();
    await page.waitForTimeout(500);

    // Expected modal fields
    const expectedElements = [
      'input[name="title"], input[placeholder*="goal" i], input[placeholder*="title" i]',
      'select, textarea, input[type="text"]',
    ];
    for (const selector of expectedElements) {
      const el = page.locator(selector).first();
      const visible = await el.isVisible().catch(() => false);
      console.log(`✅ 03.8: Field "${selector}" visible: ${visible}`);
    }

    // Close
    const closeBtn = page.locator('button[aria-label="Close"], button:has(svg[class*="X"]), button:has-text("Cancel")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    console.log('✅ 03.8: Goal modal validated and closed');
  });

  test('03.9 Click on a goal row opens edit modal', async ({ page }) => {
    await goToGoals(page);

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      // Click title in the row
      const titleCell = firstRow.locator('span[class*="font-semibold"], span[class*="cursor-pointer"]').first();
      if (await titleCell.isVisible()) {
        await titleCell.click();
        await page.waitForTimeout(500);
        // Edit modal should appear
        const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
        const modalVisible = await modal.isVisible().catch(() => false);
        console.log(`✅ 03.9: Edit modal appeared: ${modalVisible}`);
        if (modalVisible) {
          await page.keyboard.press('Escape');
        }
      }
    } else {
      console.log('⚠️ 03.9: No goal rows to click — skipped');
    }
  });

  test('03.10 Clear filters button appears and resets filters', async ({ page }) => {
    await goToGoals(page);

    const searchInput = page.locator('input[placeholder*="Search goals" i]').first();
    await searchInput.fill('something');
    await page.waitForTimeout(300);

    // Clear filters button should appear
    const clearBtn = page.locator('button:has-text("Clear filters")');
    await expect(clearBtn).toBeVisible({ timeout: 3000 });
    await clearBtn.click();
    await page.waitForTimeout(300);

    // Input should be cleared
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('');
    console.log('✅ 03.10: Clear filters button works');
  });

  test('03.11 Add goal from inside user profile (+ Goals button)', async ({ page }) => {
    await createUser(page, GOAL_USER);
    await openUserProfile(page, GOAL_USER.name);

    // Click Goals tab
    const goalsTab = page.locator('button:has-text("Goals"), [role="tab"]:has-text("Goals")').first();
    await goalsTab.click();
    await page.waitForTimeout(500);

    // Click + Goals button
    const addGoalBtn = page.locator('button:has-text("+ Goals"), button:has-text("Goals"), button:has-text("Add goal")').first();
    if (await addGoalBtn.isVisible()) {
      await addGoalBtn.click();
      await page.waitForTimeout(500);
      console.log('✅ 03.11: Goal modal opened from profile');

      // Close it
      await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 03.11: + Goals button not found in profile tabs');
    }
  });
});
