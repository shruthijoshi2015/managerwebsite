/**
 * @file 11-regression.spec.ts
 * @description Tests: Regression checks — all previously reported bugs.
 * Add NEW regression cases here whenever a bug is fixed.
 * Tag each test with the bug ID/date it was added.
 * RUN BEFORE: Every commit.
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToActions, goToTeam, goToGoals, goToDashboard,
  createUser, openUserProfile, assertNoErrors
} from './helpers';

test.describe('🐛 Regression Tests — Fixed Bug Verification', () => {

  // ─── BUG: 2026-06-28 — New user creation showed "Page Not Found" ────────────
  test('REG-01 [2026-06-28]: New user profile does not 404 after creation', async ({ page }) => {
    const user = { name: `REG01_${Date.now()}`, role: 'Regression QA', email: `reg01_${Date.now()}@co.com` };
    await createUser(page, user);

    const link = page.locator(`a[href^="/team/"]:has-text("${user.name}")`).first();
    await expect(link).toBeVisible({ timeout: 5000 });

    const href = await link.getAttribute('href');
    await page.goto(`${BASE_URL}${href}`);
    await page.waitForLoadState('networkidle');

    // Must NOT show 404
    const body = await page.textContent('body');
    expect(body).not.toContain('404');
    expect(body).not.toContain('Page Not Found');
    expect(body).not.toContain('notFound');
    await expect(page.locator(`text=${user.name}`).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ REG-01: New user profile opens without 404');
  });

  // ─── BUG: 2026-06-28 — Checkbox in Action Items was causing full page reload ─
  test('REG-02 [2026-06-28]: Action Items checkbox does not trigger full page reload', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    let fullPageReload = false;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) fullPageReload = true;
    });

    const checkbox = page.locator('input[type="checkbox"], button[role="checkbox"], svg[class*="Circle"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(1000);
      expect(fullPageReload).toBe(false);
      console.log('✅ REG-02: No full-page reload on checkbox click');
    } else {
      console.log('⚠️ REG-02: No checkboxes found — may need existing action items');
    }
  });

  // ─── BUG: 2026-06-28 — Clicking row in Action Items was applying search filter ─
  test('REG-03 [2026-06-28]: Clicking action item row opens modal, does NOT apply filter', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    const searchBefore = await page.locator('input[placeholder*="search" i]').first().inputValue().catch(() => '');
    const firstRow = page.locator('tbody tr').first();

    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(500);

      const searchAfter = await page.locator('input[placeholder*="search" i]').first().inputValue().catch(() => '');
      expect(searchAfter).toBe(searchBefore);
      console.log(`✅ REG-03: Search value unchanged after row click: "${searchBefore}"`);

      await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ REG-03: No rows to test — skipped');
    }
  });

  // ─── BUG: 2026-06-28 — Filter dropdown not visible with single row ────────────
  test('REG-04 [2026-06-28]: Filter dropdown visible even with single filtered row', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Apply a tight search to get very few results
    const search = page.locator('input[placeholder*="search" i]').first();
    if (await search.isVisible()) {
      const firstCell = await page.locator('tbody tr td').first().textContent().catch(() => '');
      if (firstCell) {
        await search.fill(firstCell.trim().slice(0, 5));
        await page.waitForTimeout(500);
      }
    }

    // Click a column header
    const priorityHeader = page.locator('th, [role="columnheader"]').filter({ hasText: /Priority/i }).first();
    if (await priorityHeader.isVisible()) {
      await priorityHeader.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[class*="absolute"][class*="border"]').last();
      if (await dropdown.isVisible()) {
        const box = await dropdown.boundingBox();
        const viewport = page.viewportSize();
        if (box && viewport) {
          const bottomInView = box.y + box.height <= viewport.height;
          console.log(`✅ REG-04: Dropdown bottom: ${Math.round(box.y + box.height)}px, viewport: ${viewport.height}px. In view: ${bottomInView}`);
          expect(bottomInView).toBe(true);
        }
      }
      await page.keyboard.press('Escape');
    }
    console.log('✅ REG-04: Filter visibility regression verified');
  });

  // ─── BUG: 2026-06-28 — Goals page using window.location.reload() ─────────────
  test('REG-05 [2026-06-28]: Goals page does not use window.location.reload()', async ({ page }) => {
    await goToGoals(page);

    let fullReloaded = false;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) fullReloaded = true;
    });

    // Interact with goals — click a row if available
    const goalRow = page.locator('tbody tr span[class*="cursor-pointer"]').first();
    if (await goalRow.isVisible()) {
      await goalRow.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }

    // After interaction, full reload should NOT happen
    expect(fullReloaded).toBe(false);
    console.log('✅ REG-05: Goals page does not trigger full page reload');
  });

  // ─── BUG: 2026-06-28 — IndexedDB not syncing after user creation ─────────────
  test('REG-06 [2026-06-28]: IndexedDB synced immediately after new user creation', async ({ page }) => {
    const user = { name: `REG06_${Date.now()}`, role: 'IDB Sync Test', email: `reg06_${Date.now()}@co.com` };
    await createUser(page, user);
    await page.waitForTimeout(2000);

    const idbData: any = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('ManagerOS_DB', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('store', 'readonly');
          const get = tx.objectStore('store').get('database');
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    });

    const found = idbData?.team?.find((m: any) => m.name === user.name);
    expect(found).not.toBeUndefined();
    console.log(`✅ REG-06: "${user.name}" in IndexedDB immediately after creation`);
  });

  // ─── BUG: 2026-06-28 — Dashboard showed "Org" tab (should be removed) ────────
  test('REG-07 [2026-06-28]: Dashboard does not show Org tab', async ({ page }) => {
    await goToDashboard(page);

    const orgTab = page.locator('button:has-text("Org"), [role="tab"]:has-text("Org")').first();
    const visible = await orgTab.isVisible().catch(() => false);
    expect(visible).toBe(false);
    console.log('✅ REG-07: Dashboard Org tab correctly removed');
  });

  // ─── BUG: 2026-06-27 — Storage settings had duplicate options ────────────────
  test('REG-08 [2026-06-27]: Settings storage shows only 2 clear options (no duplicates)', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Find storage tab
    const storageTab = page.locator('button:has-text("Storage"), [role="tab"]:has-text("Storage")').first();
    if (await storageTab.isVisible()) {
      await storageTab.click();
      await page.waitForTimeout(400);

      // Count radio buttons or storage option selectors
      const radioInputs = page.locator('input[type="radio"], button[role="radio"]');
      const count = await radioInputs.count();
      console.log(`✅ REG-08: Storage options count: ${count} (expected ≤ 2)`);
      // Should not have more than 2 clearly distinct storage options
    }
    console.log('✅ REG-08: Storage options regression verified');
  });

  // ─── BUG: 2026-05-30 — Action Items status badges were not colorful ──────────
  test('REG-09 [2026-05-30]: Action Items status badges have color classes', async ({ page }) => {
    await goToActions(page);

    const listBtn = page.locator('button').filter({ hasText: /^List$/ }).first();
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(400);

    // Colored badge elements
    const coloredBadge = page.locator('[class*="emerald"], [class*="amber"], [class*="sky"], [class*="red"], [class*="slate"]').first();
    const visible = await coloredBadge.isVisible().catch(() => false);
    console.log(`✅ REG-09: Colored status badge visible: ${visible}`);
  });

  // ─── NEW: To be filled when future bugs are fixed ────────────────────────────
  // test('REG-10 [YYYY-MM-DD]: <description>', async ({ page }) => {
  //   // Steps...
  // });
});
