# ManagerOS User Data Preservation & Deployment Guide

Congratulations on deploying **ManagerOS** for user testing and production! 

Because ManagerOS is architected as a **Local-First / Privacy-First** application (relying on client-side **IndexedDB**, **localStorage**, and the **File System Access API** for live cloud file sync), releasing source code updates to production does **not** erase or reset user data by default. 

However, as the application evolves, developers and AI coding assistants must strictly adhere to the guidelines below to ensure future updates **never corrupt, reset, or conflict** with existing user databases.

---

## 1. Always Make Backward-Compatible (Additive) Schema Changes
When introducing new features (e.g., adding a new setting, goal attribute, note tag, or reportee field), **never assume existing saved data payloads contain the new field**.

### ❌ Incorrect (Will Crash for Existing Users)
```typescript
// Assumes customTags exists on older user records:
const badges = goal.customTags.map(t => t.name);
```

### ✅ Correct (Safe Fallback)
```typescript
// Always provide fallback or optional chaining when reading stored structures:
const badges = (goal.customTags || []).map(t => t.name);
```

---

## 2. Guard Initial Seeding & Reset Logic
The application automatically seeds sample initial data (`seedIndexedDB`) **only if the user's database is completely empty** (`if (!data)`).

* **Strict Rule**: Never pass `force = true` or trigger a forced database re-seed (`seedIndexedDB(true)`) automatically during application load, component initialization, or version upgrade hooks.
* **Factory Resets**: Only ever execute a full data wipe or seed reset when the user explicitly triggers a destructive button (e.g., *"Reset to Factory Defaults"*) inside Settings with a double-confirmation modal.

---

## 3. Versioned Schema Migrations for Structural Changes
If you ever need to restructure existing nested arrays or change property types across the database:
1. Increment or check the schema version property stored inside the root database payload (`schemaVersion: 2`).
2. Run an in-memory transform function immediately after retrieving data from IndexedDB or the Live File Handle:

```typescript
export async function getIndexedDBData(): Promise<any> {
  let data = await fetchRawIndexedDB();
  if (data && (!data.schemaVersion || data.schemaVersion < 2)) {
    data = migrateV1ToV2(data);
    await saveIndexedDBData(data); // Save the upgraded format cleanly
  }
  return data;
}
```

---

## 4. Maintain Strict LocalStorage Namespacing (`manager_*`)
User UI states, layout preferences, and scratchpad notebooks stored in `localStorage` are isolated using the `manager_` prefix (e.g., `manager_sidebar_expanded`, `manager_storage_config`, `manager_generic_notebook_pages`).

* **Strict Rule**: When introducing new client-side toggles or settings, always prefix the `localStorage` key with `manager_`. This prevents key collisions with other tools or browser extensions.

---

## 5. Live File Sync (OneDrive / Google Drive) & Backups
To protect users against browser cache eviction (which browsers may trigger when device storage runs critically low):
* Keep the **Live File Sync** option prominent in Settings. When a user connects a file handle (`manager-os-data.json`) inside their OneDrive or Google Drive folder, ManagerOS automatically streams edits to disk every 5 seconds.
* Encourage regular JSON snapshot exports via the built-in **Export Backup** button before making major organizational changes.
