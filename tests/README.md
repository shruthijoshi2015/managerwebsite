# 🧪 ManagerOS Test Suite

Comprehensive Playwright UI tests covering all critical user flows.

## 📁 Test Files

| File | Suite | Tests | Coverage |
|------|-------|-------|----------|
| `helpers.ts` | Shared utils | — | Common helpers, IndexedDB queries, nav helpers |
| `01-navigation.spec.ts` | Navigation | 10 | All pages load, sidebar links, 404 handling |
| `02-user-management.spec.ts` | User Mgmt | 10 | Create, refresh, profile, IndexedDB sync |
| `03-goals.spec.ts` | Goals | 11 | Add goal, list/user views, search, filters, modal |
| `04-action-items.spec.ts` | Actions | 11 | List/grouped views, create, filter, checkbox, modal |
| `05-notes.spec.ts` | Notes | 10 | Timeline/board, search, filter, add note |
| `06-dashboard.spec.ts` | Dashboard | 12 | Me/Team tabs, widgets, layout, persistence |
| `07-settings.spec.ts` | Settings | 10 | All tabs, card config, goal modal, save |
| `08-indexeddb-sync.spec.ts` | IndexedDB | 10 | Seed, persist, mutate, sync, API |
| `09-user-profile.spec.ts` | Profile | 12 | Tabs, goals, actions, notes, checkbox, AI prep |
| `10-full-e2e-flows.spec.ts` | E2E | 10 | Golden-path regression flows |
| `11-regression.spec.ts` | Regression | 9+ | All previously fixed bugs |

**Total: 115+ test cases**

---

## ⚡ Quick Start

### 1. Install Playwright (one-time)
```bash
cd managerweb
npm install
npx playwright install chromium
```

### 2. Run All Tests (dev server auto-starts)
```bash
npm test
```

### 3. Run Specific Suite
```bash
npm run test:nav          # Navigation only
npm run test:users        # User creation only
npm run test:goals        # Goals only
npm run test:actions      # Action Items only
npm run test:notes        # Notes Hub only
npm run test:dashboard    # Dashboard only
npm run test:settings     # Settings only
npm run test:idb          # IndexedDB sync only
npm run test:profile      # User Profile only
npm run test:e2e          # Full E2E golden flows
npm run test:regression   # Regression bugs only
```

### 4. Run with Visual Browser (see it happening)
```bash
npm run test:headed
```

### 5. Interactive UI Mode
```bash
npm run test:ui
```

### 6. View HTML Report After Run
```bash
npm run test:report
```

---

## 📋 When to Run What

| Scenario | Command |
|----------|---------|
| **Before any code change** | `npm run test:regression` |
| **After touching navigation/routing** | `npm run test:nav && npm run test:e2e` |
| **After touching user creation** | `npm run test:users && npm run test:regression` |
| **After touching Goals page** | `npm run test:goals` |
| **After touching Action Items** | `npm run test:actions && npm run test:regression` |
| **After touching Notes** | `npm run test:notes` |
| **After touching Dashboard** | `npm run test:dashboard` |
| **After touching Settings** | `npm run test:settings` |
| **After touching IndexedDB/storageProvider** | `npm run test:idb` |
| **After touching ProfileLayoutClient** | `npm run test:profile` |
| **Before every release** | `npm test` (all 115 tests) |

---

## ➕ Adding New Tests (Convention)

### For a bug fix:
Add to `11-regression.spec.ts`:
```typescript
test('REG-XX [YYYY-MM-DD]: <bug description>', async ({ page }) => {
  // Reproduce the bug scenario
  // Assert it does NOT happen anymore
});
```

### For a new feature:
Add to the relevant spec file (01-10), or create a new numbered file:
```typescript
// 12-my-new-feature.spec.ts
test.describe('🔔 My New Feature', () => {
  test('XX.1 Feature works correctly', async ({ page }) => { ... });
});
```

### Always:
1. Use helpers from `helpers.ts` (don't repeat navigation code)
2. Add `console.log('✅ X.Y: description')` for each passing assertion
3. Use `⚠️` prefix for skipped/conditional steps
4. Update this README table

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `Error: browserType.launch` | Run `npx playwright install chromium` |
| Tests fail with "server not running" | Start `npm run dev` manually first |
| IndexedDB tests return null | Wait longer — add `await page.waitForTimeout(3000)` |
| Tests flaky on slow machines | Increase `timeout` in `playwright.config.ts` |
| Full page reload detected unexpectedly | Check `framenavigated` listener scope |
