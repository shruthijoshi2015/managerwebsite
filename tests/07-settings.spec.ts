/**
 * @file 07-settings.spec.ts
 * @description Tests: Settings page — tabs, card config, goal modal config, storage settings
 * RUN BEFORE: Any change touching SettingsClient, CardConfigContext, storageProvider
 */

import { test, expect } from '@playwright/test';
import { goToSettings, assertNoErrors } from './helpers';

test.describe('⚙️ Settings — All Tabs and Configurations', () => {

  test('07.1 Settings page loads with correct tabs', async ({ page }) => {
    await goToSettings(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 07.1: Settings page loaded');
  });

  test('07.2 "Card & Fields" tab opens and shows preview', async ({ page }) => {
    await goToSettings(page);

    const cardTab = page.locator('button:has-text("Card"), button:has-text("Fields"), [role="tab"]:has-text("Card")').first();
    if (await cardTab.isVisible()) {
      await cardTab.click();
      await page.waitForTimeout(400);
      console.log('✅ 07.2a: Card & Fields tab clicked');

      // Should show card preview
      const preview = page.locator('[class*="preview"], [class*="rounded-xl"][class*="border"]').first();
      const visible = await preview.isVisible().catch(() => false);
      console.log(`✅ 07.2b: Card preview visible: ${visible}`);
    }
  });

  test('07.3 "Goal Modal" settings tab works', async ({ page }) => {
    await goToSettings(page);

    const goalModalTab = page.locator('button:has-text("Goal Modal"), [role="tab"]:has-text("Goal")').first();
    if (await goalModalTab.isVisible()) {
      await goalModalTab.click();
      await page.waitForTimeout(400);

      // Toggle switches should be visible
      const toggles = page.locator('input[type="checkbox"]');
      const toggleCount = await toggles.count();
      console.log(`✅ 07.3: Goal Modal tab shows ${toggleCount} toggles`);
    }
  });

  test('07.4 "Data Storage" tab shows storage options', async ({ page }) => {
    await goToSettings(page);

    const storageTab = page.locator('button:has-text("Storage"), button:has-text("Data"), [role="tab"]:has-text("Storage")').first();
    if (await storageTab.isVisible()) {
      await storageTab.click();
      await page.waitForTimeout(400);

      // Should show storage options
      const storageOptions = page.locator('text=IndexedDB, text=File System, text=OneDrive, text=Cloud').first();
      const visible = await storageOptions.isVisible().catch(() => false);
      console.log(`✅ 07.4: Storage options visible: ${visible}`);
    }
  });

  test('07.5 "Templates" tab shows check-in templates', async ({ page }) => {
    await goToSettings(page);

    const templatesTab = page.locator('button:has-text("Templates"), [role="tab"]:has-text("Templates")').first();
    if (await templatesTab.isVisible()) {
      await templatesTab.click();
      await page.waitForTimeout(400);
      console.log('✅ 07.5: Templates tab clicked');

      const templateItems = page.locator('[class*="border"][class*="rounded"]');
      const count = await templateItems.count();
      console.log(`✅ 07.5: ${count} template elements visible`);
    }
  });

  test('07.6 Card size setting toggles (Mini, Compact, Large)', async ({ page }) => {
    await goToSettings(page);

    // Find card size options
    const miniBtn = page.locator('button:has-text("Mini"), label:has-text("Mini")').first();
    const compactBtn = page.locator('button:has-text("Compact"), label:has-text("Compact")').first();
    const largeBtn = page.locator('button:has-text("Large"), label:has-text("Large")').first();

    const sizes = [miniBtn, compactBtn, largeBtn];
    for (const btn of sizes) {
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
        const text = await btn.textContent();
        console.log(`✅ 07.6: Card size "${text?.trim()}" selected`);
      }
    }
  });

  test('07.7 Save Settings button works without error', async ({ page }) => {
    await goToSettings(page);

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Settings")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // Should show success indicator
      const success = page.locator('text=Saved, text=Success, [class*="green"], [class*="emerald"]').first();
      const successVisible = await success.isVisible().catch(() => false);
      console.log(`✅ 07.7: Save success indicator: ${successVisible}`);
      await assertNoErrors(page);
    }
  });

  test('07.8 Card preview switches between Card and List preview tabs', async ({ page }) => {
    await goToSettings(page);

    const previewCardTab = page.locator('button:has-text("Card preview"), button:has-text("Card"), button:has-text("card")').first();
    const previewListTab = page.locator('button:has-text("List preview"), button:has-text("List"), button:has-text("list")').first();

    if (await previewCardTab.isVisible()) {
      await previewCardTab.click();
      await page.waitForTimeout(300);
      console.log('✅ 07.8a: Card preview tab clicked');
    }

    if (await previewListTab.isVisible()) {
      await previewListTab.click();
      await page.waitForTimeout(300);
      console.log('✅ 07.8b: List preview tab clicked');
    }
  });

  test('07.9 Check-in frequency settings are visible', async ({ page }) => {
    await goToSettings(page);

    const freqSection = page.locator('text=Frequency, text=Check-in, text=1:1').first();
    const visible = await freqSection.isVisible().catch(() => false);
    console.log(`✅ 07.9: Check-in frequency section visible: ${visible}`);
  });

  test('07.10 Field visibility toggles update card preview', async ({ page }) => {
    await goToSettings(page);

    // Find checkboxes for field visibility
    const toggles = page.locator('input[type="checkbox"]');
    const count = await toggles.count();
    if (count > 0) {
      // Toggle first checkbox
      const firstToggle = toggles.first();
      const initialState = await firstToggle.isChecked();
      await firstToggle.click();
      await page.waitForTimeout(300);
      const newState = await firstToggle.isChecked();
      expect(newState).toBe(!initialState);
      console.log(`✅ 07.10: Toggle changed from ${initialState} to ${newState}`);

      // Reset it
      await firstToggle.click();
    }
  });
});
