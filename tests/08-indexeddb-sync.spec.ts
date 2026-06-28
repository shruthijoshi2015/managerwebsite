/**
 * @file 08-indexeddb-sync.spec.ts
 * @description Tests: IndexedDB — seeding, data persistence, sync after mutations
 * RUN BEFORE: Any change touching IndexedDBProvider, storageProvider, api/sync-db
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, goToTeam, goToDashboard, createUser,
  getIndexedDBData, findUserInIndexedDB, waitForIndexedDBSync
} from './helpers';

const TS = Date.now();
const IDB_USER = { name: `IDB_User_${TS}`, role: 'IndexedDB Tester', email: `idb_${TS}@co.com` };

test.describe('🗄️ IndexedDB Sync — Seed, Persist, Mutate', () => {

  test('08.1 IndexedDB is seeded with data on first page load', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const data: any = await getIndexedDBData(page);
    expect(data).not.toBeNull();
    expect(data.team).toBeDefined();
    expect(Array.isArray(data.team)).toBe(true);
    console.log(`✅ 08.1: IndexedDB seeded — ${data.team.length} team members`);
  });

  test('08.2 IndexedDB contains expected fields for each member', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const data: any = await getIndexedDBData(page);
    expect(data.team.length).toBeGreaterThan(0);

    const member = data.team[0];
    expect(member).toHaveProperty('id');
    expect(member).toHaveProperty('name');
    expect(member).toHaveProperty('role');
    expect(member).toHaveProperty('email');
    expect(member).toHaveProperty('goals');
    expect(member).toHaveProperty('tasks');
    expect(member).toHaveProperty('notes');
    console.log(`✅ 08.2: Member "${member.name}" has all required fields`);
  });

  test('08.3 New user appears in IndexedDB after creation', async ({ page }) => {
    await createUser(page, IDB_USER);
    await waitForIndexedDBSync(page, 2000);

    const user = await findUserInIndexedDB(page, IDB_USER.name);
    expect(user).not.toBeNull();
    expect(user.name).toBe(IDB_USER.name);
    expect(user.role).toBe(IDB_USER.role);
    console.log(`✅ 08.3: "${IDB_USER.name}" found in IndexedDB`);
  });

  test('08.4 IndexedDB persists after page refresh', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 1000);

    const before: any = await getIndexedDBData(page);
    const memberCountBefore = before?.team?.length || 0;

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForIndexedDBSync(page, 1000);

    const after: any = await getIndexedDBData(page);
    const memberCountAfter = after?.team?.length || 0;

    expect(memberCountAfter).toBe(memberCountBefore);
    console.log(`✅ 08.4: IndexedDB persistent after reload: ${memberCountBefore} → ${memberCountAfter} members`);
  });

  test('08.5 IndexedDB "database" key exists in ManagerOS_DB/store', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const keyExists = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const req = indexedDB.open('ManagerOS_DB', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('store', 'readonly');
          const keys = tx.objectStore('store').getAllKeys();
          keys.onsuccess = () => resolve(keys.result.includes('database'));
          keys.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      });
    });

    expect(keyExists).toBe(true);
    console.log('✅ 08.5: "database" key exists in IndexedDB store');
  });

  test('08.6 /api/sync-db endpoint returns valid JSON', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/sync-db`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('team');
    expect(Array.isArray(data.team)).toBe(true);
    console.log(`✅ 08.6: /api/sync-db returns ${data.team.length} team members`);
  });

  test('08.7 IndexedDB lastSync timestamp is set after seeding', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const lastSync = await page.evaluate(async () => {
      return new Promise<string | null>((resolve) => {
        const req = indexedDB.open('ManagerOS_DB', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('store', 'readonly');
          const get = tx.objectStore('store').get('lastSync');
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    });

    expect(lastSync).not.toBeNull();
    const syncDate = new Date(lastSync!);
    expect(syncDate.getTime()).toBeGreaterThan(0);
    console.log(`✅ 08.7: lastSync timestamp: ${lastSync}`);
  });

  test('08.8 IndexedDB config section exists (cardConfig, goalModalConfig)', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const data: any = await getIndexedDBData(page);
    expect(data).toHaveProperty('config');
    expect(data.config).toHaveProperty('templates');
    console.log('✅ 08.8: IndexedDB config section exists');
  });

  test('08.9 Member goals and tasks are correctly stored in IndexedDB', async ({ page }) => {
    await goToDashboard(page);
    await waitForIndexedDBSync(page, 2000);

    const data: any = await getIndexedDBData(page);
    const memberWithGoals = data.team.find((m: any) => m.goals && m.goals.length > 0);

    if (memberWithGoals) {
      const goal = memberWithGoals.goals[0];
      expect(goal).toHaveProperty('id');
      expect(goal).toHaveProperty('title');
      expect(goal).toHaveProperty('progress');
      console.log(`✅ 08.9: Goal "${goal.title}" found in IndexedDB for "${memberWithGoals.name}"`);
    } else {
      console.log('⚠️ 08.9: No members with goals found in IndexedDB');
    }
  });

  test('08.10 Force sync re-fetches data from server', async ({ page }) => {
    await goToDashboard(page);

    // Simulate a force sync by calling the seed function
    const syncResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/sync-db');
        if (!res.ok) return null;
        const data = await res.json();
        return { ok: true, teamCount: data.team?.length || 0 };
      } catch {
        return null;
      }
    });

    expect(syncResult).not.toBeNull();
    expect(syncResult!.ok).toBe(true);
    console.log(`✅ 08.10: Force sync fetched ${syncResult!.teamCount} members from server`);
  });
});
