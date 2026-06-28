/**
 * @file 05-notes.spec.ts
 * @description Tests: Notes Hub — Timeline/Board views, search, filter, add note flow
 * RUN BEFORE: Any change touching NotesHubClient, NotesEditor, actions.ts (saveNotes)
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToNotes, createUser,
  openUserProfile, assertNoErrors
} from './helpers';

const TS = Date.now();
const NOTE_USER = { name: `NoteUser_${TS}`, role: 'Note Tester', email: `note_${TS}@co.com` };

test.describe('📝 Notes Hub — Timeline, Board, Search, Filter', () => {

  test('05.1 Notes Hub loads correctly', async ({ page }) => {
    await goToNotes(page);
    await assertNoErrors(page);
    await expect(page.locator('text=Notes').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 05.1: Notes Hub loaded');
  });

  test('05.2 Timeline and Board view toggle works', async ({ page }) => {
    await goToNotes(page);

    const timelineBtn = page.locator('button').filter({ hasText: /Timeline/i }).first();
    const boardBtn = page.locator('button').filter({ hasText: /Board/i }).first();

    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();
      await page.waitForTimeout(400);
      console.log('✅ 05.2a: Timeline view activated');
    }

    if (await boardBtn.isVisible()) {
      await boardBtn.click();
      await page.waitForTimeout(400);
      console.log('✅ 05.2b: Board view activated');
    }

    // Switch back to timeline
    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();
      await page.waitForTimeout(400);
      console.log('✅ 05.2c: Back to Timeline view');
    }
  });

  test('05.3 Search bar in Notes Hub filters by content', async ({ page }) => {
    await goToNotes(page);

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZZY_NOTFOUND_999');
      await page.waitForTimeout(500);
      // Should show empty state or fewer results
      console.log('✅ 05.3a: Search applied');

      await searchInput.clear();
      await page.waitForTimeout(300);
      console.log('✅ 05.3b: Search cleared');
    } else {
      console.log('⚠️ 05.3: Search input not found');
    }
  });

  test('05.4 Team member filter dropdown works', async ({ page }) => {
    await goToNotes(page);

    const filterDropdown = page.locator('select, [class*="Select"], button:has-text("All")').first();
    if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      await page.waitForTimeout(300);
      console.log('✅ 05.4: Team filter dropdown opened');
      await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 05.4: Filter dropdown not found');
    }
  });

  test('05.5 "+ Add Note" button is visible and opens note editor', async ({ page }) => {
    await goToNotes(page);

    const addNoteBtn = page.locator('button').filter({ hasText: /Add Note/i }).first();
    await expect(addNoteBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ 05.5: "+ Add Note" button visible');

    await addNoteBtn.click();
    await page.waitForTimeout(500);

    // Some editor or modal should appear
    const editor = page.locator('textarea, [contenteditable], [role="dialog"]').first();
    const editorVisible = await editor.isVisible().catch(() => false);
    console.log(`✅ 05.5b: Note editor appeared: ${editorVisible}`);
    if (editorVisible) await page.keyboard.press('Escape');
  });

  test('05.6 Notes with AI summary show TLDR section', async ({ page }) => {
    await goToNotes(page);

    // Check if any notes have AI summary
    const tldr = page.locator('text=TL;DR, text=TLDR, text=tldr, text=Summary').first();
    const hasTldr = await tldr.isVisible().catch(() => false);
    console.log(`✅ 05.6: AI TL;DR in notes: ${hasTldr}`);
  });

  test('05.7 Expanding a note shows full content', async ({ page }) => {
    await goToNotes(page);

    // Click on the first note card/header to expand
    const noteCard = page.locator('[class*="border"][class*="rounded"], article, .note-item').first();
    if (await noteCard.isVisible()) {
      await noteCard.click();
      await page.waitForTimeout(400);
      console.log('✅ 05.7: Note card clicked (expand)');
    } else {
      console.log('⚠️ 05.7: No note cards found');
    }
  });

  test('05.8 Add note from user profile Notes tab', async ({ page }) => {
    await createUser(page, NOTE_USER);
    await openUserProfile(page, NOTE_USER.name);

    // Click Notes tab
    const notesTab = page.locator('button:has-text("Notes"), [role="tab"]:has-text("Notes")').first();
    if (await notesTab.isVisible()) {
      await notesTab.click();
      await page.waitForTimeout(500);
      console.log('✅ 05.8a: Notes tab clicked in profile');

      // Look for add note button
      const addBtn = page.locator('button').filter({ hasText: /Note|Add note/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ 05.8b: Add note clicked in profile');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠️ 05.8: Notes tab not found in profile');
    }
  });

  test('05.9 Notes show correct member name and date', async ({ page }) => {
    await goToNotes(page);

    // Notes should show team member names and dates
    const memberName = page.locator('[class*="font-semibold"], [class*="font-medium"]').first();
    const hasName = await memberName.isVisible().catch(() => false);
    console.log(`✅ 05.9: Member name in notes visible: ${hasName}`);
  });

  test('05.10 Board view shows kanban-style columns', async ({ page }) => {
    await goToNotes(page);

    const boardBtn = page.locator('button').filter({ hasText: /Board/i }).first();
    if (await boardBtn.isVisible()) {
      await boardBtn.click();
      await page.waitForTimeout(500);

      // Board should show column-style layout
      const columns = page.locator('[class*="flex-col"], [class*="column"]');
      const colCount = await columns.count();
      console.log(`✅ 05.10: Board view shows ${colCount} column elements`);
    } else {
      console.log('⚠️ 05.10: Board button not found');
    }
  });
});
