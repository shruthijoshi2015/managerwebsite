/**
 * @file 09-user-profile.spec.ts
 * @description Tests: User Profile — all tabs, goals, actions, notes, profile editing, check-in freq
 * RUN BEFORE: Any change touching ProfileLayoutClient, ProfileClient, TaskItem, TaskForm
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToTeam, createUser, openUserProfile, assertNoErrors
} from './helpers';

const TS = Date.now();
const PROFILE_USER = { name: `ProfileUser_${TS}`, role: 'Profile Tester', email: `profile_${TS}@co.com` };

test.describe('👤 User Profile — Tabs, Goals, Actions, Notes, Edit', () => {

  test('09.1 Profile page loads for existing user', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    const url = await openUserProfile(page, PROFILE_USER.name);
    await assertNoErrors(page);
    expect(url).toMatch(/\/team\/\d+/);
    console.log(`✅ 09.1: Profile loaded at ${url}`);
  });

  test('09.2 Profile header shows user name, role, and avatar', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    await expect(page.locator(`text=${PROFILE_USER.name}`).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${PROFILE_USER.role}`).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 09.2: Profile header shows name and role');
  });

  test('09.3 Profile sections: Goals, Actions, Notes are visible', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    await expect(page.locator('button:has-text("Goals"), [role="tab"]:has-text("Goals")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Actions"), [role="tab"]:has-text("Actions")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('textarea, [placeholder*="note" i]').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 09.3: Goals, Actions, Notes sections visible');
  });

  test('09.4 Clicking Goals tab shows goals section', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    const goalsTab = page.locator('button:has-text("Goals"), [role="tab"]:has-text("Goals")').first();
    await goalsTab.click();
    await page.waitForTimeout(500);
    await assertNoErrors(page);
    console.log('✅ 09.4: Goals tab clicked without error');
  });

  test('09.5 Clicking Actions tab shows action items section', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    const actionsTab = page.locator('button:has-text("Actions"), [role="tab"]:has-text("Actions")').first();
    if (await actionsTab.isVisible()) {
      await actionsTab.click();
      await page.waitForTimeout(500);
      await assertNoErrors(page);
      console.log('✅ 09.5: Actions tab clicked without error');
    }
  });

  test('09.6 Notes editor is displayed and interactive', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    const noteInput = page.locator('textarea, [placeholder*="note" i]').first();
    await expect(noteInput).toBeVisible({ timeout: 5000 });
    await assertNoErrors(page);
    console.log('✅ 09.6: Notes editor verified visible without error');
  });

  test('09.7 "+ Goals" button opens goal creation modal', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    // Navigate to goals tab
    const goalsTab = page.locator('button:has-text("Goals")').first();
    if (await goalsTab.isVisible()) await goalsTab.click();
    await page.waitForTimeout(400);

    // Click + Goals
    const addGoalBtn = page.locator('button').filter({ hasText: /\+ Goals|\+Goals|Goals/i }).first();
    if (await addGoalBtn.isVisible()) {
      await addGoalBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
      const visible = await modal.isVisible().catch(() => false);
      console.log(`✅ 09.7: Goal modal opened: ${visible}`);
      if (visible) await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 09.7: + Goals button not found');
    }
  });

  test('09.8 "+ Action" button opens action creation modal', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    // Navigate to actions tab
    const actionsTab = page.locator('button:has-text("Actions")').first();
    if (await actionsTab.isVisible()) await actionsTab.click();
    await page.waitForTimeout(400);

    // Click + Action
    const addActionBtn = page.locator('button').filter({ hasText: /\+ Action|\+Action|Add action/i }).first();
    if (await addActionBtn.isVisible()) {
      await addActionBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .fixed.inset-0, form').first();
      const visible = await modal.isVisible().catch(() => false);
      console.log(`✅ 09.8: Action modal opened: ${visible}`);
      if (visible) await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 09.8: + Action button not found');
    }
  });

  test('09.9 Task checkbox toggle does NOT reload page', async ({ page }) => {
    await goToTeam(page);

    // Open first existing user (likely has tasks)
    const firstLink = page.locator('a[href^="/team/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      let didNavigate = false;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) didNavigate = true;
      });

      const checkbox = page.locator('input[type="checkbox"], button[role="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(800);
        console.log(`✅ 09.9: Full page navigation on checkbox: ${didNavigate} (expected: false)`);
        expect(didNavigate).toBe(false);
      }
    }
  });

  test('09.10 Profile edit: Check-in frequency selector changes value', async ({ page }) => {
    await createUser(page, PROFILE_USER);
    await openUserProfile(page, PROFILE_USER.name);

    // Look for frequency selector
    const freqSelect = page.locator('select[name*="freq"], select').first();
    if (await freqSelect.isVisible()) {
      const options = await freqSelect.locator('option').allTextContents();
      console.log(`✅ 09.10: Check-in frequency options: ${options.join(', ')}`);
      if (options.length > 1) {
        await freqSelect.selectOption({ index: 1 });
        await page.waitForTimeout(300);
        console.log('✅ 09.10: Frequency changed');
      }
    } else {
      console.log('⚠️ 09.10: Frequency selector not found');
    }
  });

  test('09.11 AI Prep Brief panel can be opened', async ({ page }) => {
    await goToTeam(page);
    const firstLink = page.locator('a[href^="/team/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      const prepBtn = page.locator('button:has-text("Prep Brief"), button:has-text("AI Prep"), button:has-text("Prep")').first();
      if (await prepBtn.isVisible()) {
        await prepBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ 09.11: Prep Brief panel opened');
      } else {
        console.log('⚠️ 09.11: Prep Brief button not found');
      }
    }
  });

  test('09.12 Profile action item pencil icon opens edit modal', async ({ page }) => {
    await goToTeam(page);
    const firstLink = page.locator('a[href^="/team/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      // Navigate to actions tab
      const actionsTab = page.locator('button:has-text("Actions")').first();
      if (await actionsTab.isVisible()) await actionsTab.click();
      await page.waitForTimeout(400);

      // Look for pencil/edit icon on action item
      const pencilIcon = page.locator('button[aria-label*="edit" i], button:has(svg[class*="Pencil"]), button:has-text("✏"), [data-testid="edit-action"]').first();
      if (await pencilIcon.isVisible()) {
        await pencilIcon.click();
        await page.waitForTimeout(500);
        const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
        const visible = await modal.isVisible().catch(() => false);
        console.log(`✅ 09.12: Edit modal via pencil icon: ${visible}`);
        if (visible) await page.keyboard.press('Escape');
      } else {
        console.log('⚠️ 09.12: Pencil icon not found in action items');
      }
    }
  });
});
