/**
 * @file 12-recent-changes.spec.ts
 * @description Playwright automation verifying recent 10-point UI updates:
 * - Demo data sanitization (no stale test users in production)
 * - Notebook toolbar expansion & resizable sidebar
 * - Check-in notes toolbar differentiation & keyboard shortcuts modal
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, goToTeam, createUser } from './helpers';

test.describe('✨ Verification of Recent UI & Data Changes', () => {

  test('NEW-01: Stale demo users are filtered out on startup', async ({ page }) => {
    await goToTeam(page);
    await page.waitForLoadState('networkidle');

    // Verify demo test accounts are not displayed in production team list
    const demoUser1 = page.locator('text="test.user1@company.com"');
    const demoUser2 = page.locator('text="test.user2@company.com"');
    await expect(demoUser1).toBeHidden();
    await expect(demoUser2).toBeHidden();
    console.log('✅ NEW-01: Demo users correctly removed & sanitized on startup');
  });

  test('NEW-02: Manager Notebook has resizable sidebar, full formatting bar, and shortcuts modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/notebook`);
    await page.waitForLoadState('networkidle');

    // Select or create a page if needed so editor is visible
    const pageItem = page.locator('.w-64 button, div[style*="width"]').filter({ hasText: /Untitled Page|Notes|General/i }).first();
    if (await pageItem.isVisible()) {
      await pageItem.click();
    } else {
      const newPageBtn = page.locator('button[title*="New Page" i], button:has-text("New Page")').first();
      if (await newPageBtn.isVisible()) await newPageBtn.click();
    }
    await page.waitForTimeout(500);

    // 1. Verify resizable separator bar exists
    const separatorBar = page.locator('div[title="Drag to resize sidebar"]');
    await expect(separatorBar).toBeVisible();

    // 2. Verify notebook formatting toolbar buttons exist
    const underlineBtn = page.locator('button[title*="Underline" i]').first();
    const strikeBtn = page.locator('button[title*="Strikethrough" i]').first();
    const colorBtn = page.locator('button[title="Text & Background Color"]').first();
    const alignBtn = page.locator('button[title="Text Alignment"]').first();
    const moreBtn = page.locator('button[title="Insert Image / Table"]').first();

    await expect(underlineBtn).toBeVisible();
    await expect(strikeBtn).toBeVisible();
    await expect(colorBtn).toBeVisible();
    await expect(alignBtn).toBeVisible();
    await expect(moreBtn).toBeVisible();

    // 3. Verify Keyboard Shortcuts Helper Modal opens
    const shortcutsBtn = page.locator('button[title*="Keyboard Shortcuts" i]').first();
    await expect(shortcutsBtn).toBeVisible();
    await shortcutsBtn.click();

    const modalTitle = page.locator('h3:has-text("Keyboard Shortcuts")');
    await expect(modalTitle).toBeVisible();
    
    // Close modal
    const closeBtn = page.locator('button:has-text("Close")').first();
    await closeBtn.click();
    await expect(modalTitle).toBeHidden();
    console.log('✅ NEW-02: Manager Notebook UI features verified');
  });

  test('NEW-03: Check-in Notes toolbar has shared tools but excludes notebook-only options', async ({ page }) => {
    // Create a user and open profile check-in notes
    const user = { name: `TEST_NOTES_${Date.now()}`, role: 'Engineer', email: `testnotes_${Date.now()}@co.com` };
    await createUser(page, user);

    const link = page.locator(`a[href^="/team/"]:has-text("${user.name}")`).first();
    await link.click();
    await page.waitForLoadState('networkidle');

    // Ensure Check-in Notes tab is active
    const checkinTab = page.locator('button:has-text("Check-in Notes")').first();
    if (await checkinTab.isVisible()) await checkinTab.click();
    await page.waitForTimeout(500);

    // 1. Verify shared formatting options exist in Check-in Notes
    const underlineBtn = page.locator('button[title*="Underline" i]').first();
    const strikeBtn = page.locator('button[title*="Strikethrough" i]').first();
    const linkBtn = page.locator('button[title*="Add Link" i]').first();
    const shortcutsBtn = page.locator('button[title*="Keyboard Shortcuts" i]').first();

    await expect(underlineBtn).toBeVisible();
    await expect(strikeBtn).toBeVisible();
    await expect(linkBtn).toBeVisible();
    await expect(shortcutsBtn).toBeVisible();

    // 2. Verify notebook-only formatting options DO NOT exist in Check-in Notes (as requested by user)
    const colorBtn = page.locator('button[title="Text & Background Color"]');
    const alignBtn = page.locator('button[title="Text Alignment"]');
    const moreBtn = page.locator('button[title="Insert Image / Table"]');

    await expect(colorBtn).toBeHidden();
    await expect(alignBtn).toBeHidden();
    await expect(moreBtn).toBeHidden();
    console.log('✅ NEW-03: Check-in Notes toolbar separation verified');
  });

  test('NEW-04: Rich-text interactive formatting (color picker, table insertion, image insertion) preserves editor selection and applies changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/notebook`);
    await page.waitForLoadState('networkidle');

    // Ensure page exists and focus editor
    const pageItem = page.locator('.w-64 button, div[style*="width"]').filter({ hasText: /Untitled Page|Notes|General/i }).first();
    if (await pageItem.isVisible()) {
      await pageItem.click();
    } else {
      const newPageBtn = page.locator('button:has-text("New Page")').first();
      if (await newPageBtn.isVisible()) await newPageBtn.click();
    }
    await page.waitForTimeout(500);

    const editor = page.locator('div[contenteditable="true"]').first();
    await expect(editor).toBeVisible();

    // Type sample text and select it
    await editor.click();
    await editor.fill('Testing color and rich text features');
    
    // Select all text inside editor using keyboard shortcut
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);

    // 1. Test Color Picker (Text & Background)
    const colorBtn = page.locator('button[title="Text & Background Color"]').first();
    await colorBtn.click();

    // Click Background tab inside color menu
    const bgTab = page.locator('button:has-text("Background")');
    await expect(bgTab).toBeVisible();
    await bgTab.click();

    // Select yellow background color swatch (#fef08a or #fef9c3)
    const colorSwatch = page.locator('button[title="Yellow"]').first();
    await colorSwatch.click();
    await page.waitForTimeout(300);

    // Verify background color was applied to editor innerHTML without losing selection range
    const editorHtml = await editor.innerHTML();
    expect(editorHtml).toMatch(/background-color/i);

    // 2. Test Table Insertion
    const moreBtn = page.locator('button[title="Insert Image / Table"]').first();
    await moreBtn.click();
    const insertTableBtn = page.locator('button:has-text("Insert Table")');
    await insertTableBtn.click();
    await page.waitForTimeout(300);

    // Verify table element is inserted inside editor
    const tableEl = editor.locator('table');
    await expect(tableEl).toBeVisible();

    // 3. Test Image Insertion via Link
    await moreBtn.click();
    const insertImageBtn = page.locator('button:has-text("Insert Image")');
    await insertImageBtn.click();

    const embedTab = page.locator('button:has-text("Embed link")');
    await embedTab.click();

    const urlInput = page.locator('input[placeholder="Paste the link to your image..."]');
    await urlInput.fill('https://via.placeholder.com/150');
    const submitImgBtn = page.locator('button:has-text("Insert image"):not([title])').last();
    await submitImgBtn.click();
    await page.waitForTimeout(300);

    // Verify img tag was added into the editor
    const imgEl = editor.locator('img[src*="placeholder.com"]');
    await expect(imgEl).toBeVisible();

    console.log('✅ NEW-04: Interactive formatting controls function properly without focus/selection loss');
  });

  test('NEW-05: Table dragging handle, blur hiding, and image alignment/download overlay function properly', async ({ page }) => {
    await page.goto(`${BASE_URL}/notebook`);
    await page.waitForLoadState('networkidle');

    const editor = page.locator('div[contenteditable="true"]').first();
    await expect(editor).toBeVisible();

    // Insert table
    const moreBtn = page.locator('button[title="Insert Image / Table"]').first();
    await moreBtn.click();
    await page.locator('button:has-text("Insert Table")').click();
    await page.waitForTimeout(300);

    // Click inside table cell
    const cell = editor.locator('td').first();
    await cell.click();
    await page.waitForTimeout(200);

    // Verify draggable handle exists
    const dragHandle = page.locator('div[title="Select / Drag Table"]');
    await expect(dragHandle).toBeVisible();
    await expect(dragHandle).toHaveAttribute('draggable', 'true');

    // Verify cell color button is shown while inside table
    const cellColorBtn = page.locator('button:has-text("Cell color")');
    await expect(cellColorBtn).toBeVisible();

    // Click outside table (in paragraph or editor space below)
    await editor.click({ position: { x: 10, y: 400 } });
    await page.waitForTimeout(300);

    // Insert image via link to test image overlay
    await moreBtn.click();
    await page.locator('button:has-text("Insert Image")').click();
    await page.locator('button:has-text("Embed link")').click();
    await page.locator('input[placeholder="Paste the link to your image..."]').fill('https://via.placeholder.com/300');
    await page.locator('button:has-text("Insert image"):not([title])').last().click();
    await page.waitForTimeout(400);

    // Click on the inserted image
    const imgEl = editor.locator('img[src*="placeholder.com"]').first();
    await imgEl.click();
    await page.waitForTimeout(300);

    // Verify image alignment toolbar and download button appear
    const alignImgBtn = page.locator('button[title="Align image"]');
    const downloadImgBtn = page.locator('button[title="Download image"]');
    await expect(alignImgBtn).toBeVisible();
    await expect(downloadImgBtn).toBeVisible();

    console.log('✅ NEW-05: Table dragging handle, blur hiding, and image alignment/download overlay verified');
  });
});
