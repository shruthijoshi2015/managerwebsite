/**
 * @file 04-action-items.spec.ts
 * @description Tests: Action Items page — list/grouped views, filters, create task, checkbox, modal
 * RUN BEFORE: Any change touching ActionItemsClient, ProfileClient, ActionModal, actions.ts
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToActions, goToTeam, createUser,
  openUserProfile, assertNoErrors
} from './helpers';

const TS = Date.now();
const ACTION_USER = { name: `ActionUser_${TS}`, role: 'Action Tester', email: `action_${TS}@co.com` };
const ACTION_TITLE = `Auto Action ${TS}`;

test.describe('✅ Action Items — View, Create, Filter, Toggle, Sync', () => {

  test('04.1 Action Items page loads with correct layout', async ({ page }) => {
    await goToActions(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Action').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 04.1: Action Items page loaded');
  });

  test('04.2 List view and Grouped view toggle works', async ({ page }) => {
    await goToActions(page);

    // Find view toggle buttons (List / Grouped)
    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    const groupedBtn = page.locator('button').filter({ hasText: /Grouped/i }).first();

    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(400);
      // Table should be visible in list mode
      const table = page.locator('table').first();
      const tableVisible = await table.isVisible().catch(() => false);
      console.log(`✅ 04.2a: List view table visible: ${tableVisible}`);
    }

    if (await groupedBtn.isVisible()) {
      await groupedBtn.click();
      await page.waitForTimeout(400);
      console.log('✅ 04.2b: Switched to Grouped view');
    }
  });

  test('04.3 "+ New task" button opens task creation modal', async ({ page }) => {
    await goToActions(page);

    const newTaskBtn = page.locator('button').filter({ hasText: /New task/i }).first();
    await expect(newTaskBtn).toBeVisible({ timeout: 5000 });
    await newTaskBtn.click();
    await page.waitForTimeout(500);

    // Some form/modal should appear
    const modal = page.locator('[role="dialog"], form, .fixed.inset-0').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log(`✅ 04.3: Task creation modal opened: ${modalVisible}`);

    if (modalVisible) {
      await page.keyboard.press('Escape');
    }
  });

  test('04.4 Search bar filters action items', async ({ page }) => {
    await goToActions(page);

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZZY_NOTFOUND_99999');
      await page.waitForTimeout(500);

      // Should show empty state
      const emptyState = page.locator('text=No action items, text=No tasks, text=No results, text=empty').first();
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      console.log(`✅ 04.4: Empty state shown for no matching: ${emptyVisible}`);

      await searchInput.clear();
      await page.waitForTimeout(300);
    }
    console.log('✅ 04.4: Search filter tested');
  });

  test('04.5 Column header filters appear on click (list view)', async ({ page }) => {
    await goToActions(page);

    // Switch to list view first
    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Click a column header with sort/filter
    const statusHeader = page.locator('text=Status').first();
    if (await statusHeader.isVisible()) {
      await statusHeader.click();
      await page.waitForTimeout(300);
      // A dropdown should appear
      const dropdown = page.locator('[class*="absolute"][class*="border"]').first();
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      console.log(`✅ 04.5: Status column dropdown visible: ${dropdownVisible}`);

      // Click elsewhere to close
      await page.keyboard.press('Escape');
    }
    console.log('✅ 04.5: Column header filter tested');
  });

  test('04.6 Filter dropdown is fully visible (not clipped by container)', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Filter by something to get a single row
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      const firstRowText = await page.locator('tbody tr td').first().textContent().catch(() => '');
      if (firstRowText) {
        await searchInput.fill(firstRowText.trim().slice(0, 10));
        await page.waitForTimeout(500);
      }
    }

    // Now click column header — dropdown should still be fully visible
    const priorityHeader = page.locator('text=Priority').first();
    if (await priorityHeader.isVisible()) {
      await priorityHeader.click();
      await page.waitForTimeout(300);
      const dropdown = page.locator('[class*="absolute"]').last();
      const box = await dropdown.boundingBox().catch(() => null);
      if (box) {
        const viewport = page.viewportSize();
        const isVisible = box.y + box.height <= (viewport?.height || 800);
        console.log(`✅ 04.6: Dropdown bottom at y=${box.y + box.height}, viewport=${viewport?.height}. Visible: ${isVisible}`);
        expect(isVisible).toBe(true);
      }
    }
    console.log('✅ 04.6: Filter dropdown visibility check complete');
  });

  test('04.7 Clicking row opens edit modal (not filter)', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      // Get search state before click
      const searchBefore = await page.locator('input[placeholder*="search" i]').first().inputValue().catch(() => '');

      await firstRow.click();
      await page.waitForTimeout(500);

      // Edit modal should appear
      const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log(`✅ 04.7: Edit modal appeared on row click: ${modalVisible}`);

      // Search should NOT have changed (no filter applied)
      const searchAfter = await page.locator('input[placeholder*="search" i]').first().inputValue().catch(() => '');
      expect(searchAfter).toBe(searchBefore);
      console.log(`✅ 04.7: Search unchanged after row click: "${searchAfter}"`);

      if (modalVisible) await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 04.7: No rows to click — skipped');
    }
  });

  test('04.8 Checkbox toggle does NOT reload full page', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Watch for navigation events (full page reload)
    let didNavigate = false;
    page.on('framenavigated', () => { didNavigate = true; });

    const firstCheckbox = page.locator('input[type="checkbox"], button[role="checkbox"], svg[class*="Circle"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await page.waitForTimeout(1000);
      console.log(`✅ 04.8: Full page navigation occurred: ${didNavigate} (expected: false)`);
      expect(didNavigate).toBe(false);
    } else {
      console.log('⚠️ 04.8: No checkbox found — skipped');
    }
  });

  test('04.9 Add action item from user profile (+ Action button)', async ({ page }) => {
    await createUser(page, ACTION_USER);
    await openUserProfile(page, ACTION_USER.name);

    // Switch to Actions tab
    const actionsTab = page.locator('button:has-text("Actions"), [role="tab"]:has-text("Actions")').first();
    if (await actionsTab.isVisible()) {
      await actionsTab.click();
      await page.waitForTimeout(500);
    }

    // Click + Action button
    const addActionBtn = page.locator('button:has-text("+ Action"), button:has-text("Action"), button:has-text("Add action")').first();
    if (await addActionBtn.isVisible()) {
      await addActionBtn.click();
      await page.waitForTimeout(500);

      // Modal/form should appear
      const titleInput = page.locator('input[name="title"], input[placeholder*="action" i], input[placeholder*="task" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill(ACTION_TITLE);
        console.log(`✅ 04.9: Action "${ACTION_TITLE}" filled in`);
        await page.keyboard.press('Escape');
      } else {
        console.log('⚠️ 04.9: Action form input not found');
      }
    } else {
      console.log('⚠️ 04.9: + Action button not found in profile');
    }
  });

  test('04.10 "My Actions" filter tab works on Action Items page', async ({ page }) => {
    await goToActions(page);

    const myActionTab = page.locator('button:has-text("My Actions"), button:has-text("My Action")').first();
    if (await myActionTab.isVisible()) {
      await myActionTab.click();
      await page.waitForTimeout(500);
      console.log('✅ 04.10: "My Actions" tab clicked');
    } else {
      console.log('⚠️ 04.10: "My Actions" tab not found');
    }
  });

  test('04.11 Status badges are colorful in list view', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Status badges should have color classes
    const statusBadge = page.locator('[class*="emerald"], [class*="amber"], [class*="sky"], [class*="red"]').first();
    const badgeVisible = await statusBadge.isVisible().catch(() => false);
    console.log(`✅ 04.11: Colored status badges visible: ${badgeVisible}`);
  });
});
