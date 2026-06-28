# UI Test: New User Creation Flow
> Category: End-to-End | Priority: Critical | Author: QA | Updated: 2026-06-28

---

## Pre-conditions
- App is running at `http://localhost:3000` (run `npm run dev`)
- Browser is **Chrome** or **Edge** (required for File System Access API)
- IndexedDB is either empty (fresh) or already seeded from a prior session
- At least 0 existing team members (clean state is preferred)

---

## Test Steps

### Step 1 — Navigate to My Team & Open "Add Member"
| # | Action | Expected Result |
|---|--------|-----------------|
| 1.1 | Open `http://localhost:3000/team` | My Team page loads, showing existing member cards or an empty grid/list |
| 1.2 | Verify the header shows `+ New member` button | Button is visible in top-right with indigo background |
| 1.3 | Click `+ New member` | A modal dialog slides in titled **"Add Team Member"** |

---

### Step 2 — Fill in New Member Details
| # | Action | Expected Result |
|---|--------|-----------------|
| 2.1 | Enter **Full Name**: `Test User3` | Text appears in the Name field |
| 2.2 | Enter **Job Role**: `QA Engineer` | Text appears in the Role field |
| 2.3 | Enter **Email**: `test.user3@company.com` | Text appears in the Email field |
| 2.4 | Click **Create Profile** button | Button shows `Creating...` disabled state briefly, then modal closes |

---

### Step 3 — Verify User Appears Immediately in My Team
| # | Action | Expected Result |
|---|--------|-----------------|
| 3.1 | Observe the My Team page after modal closes | **Test User3** card or row is immediately visible without a page reload |
| 3.2 | Confirm no "Page Not Found" error | UI remains on `/team` — no error page or blank state |

---

### Step 4 — Refresh Page & Verify Persistence
| # | Action | Expected Result |
|---|--------|-----------------|
| 4.1 | Press **F5** or browser refresh | Page reloads completely |
| 4.2 | Verify **Test User3** is still listed | Member card/row for Test User3 is present after reload |
| 4.3 | Confirm the count of members increased by 1 | e.g., "2 members" → "3 members" reflected in member count |

---

### Step 5 — Open User Profile (Route `/team/[id]`)
| # | Action | Expected Result |
|---|--------|-----------------|
| 5.1 | Click on **Test User3** card or row | Navigates to `/team/<new-user-id>` (a numeric timestamp-based ID) |
| 5.2 | Verify profile page loads without error | ProfileLayoutClient renders with name "Test User3", role "QA Engineer" |
| 5.3 | Confirm tabs are present: Goals, Action Items, Notes | All 3 tabs visible in the profile header |
| 5.4 | Confirm no console error mentioning "notFound" or "404" | Browser DevTools → Console shows no red errors |

---

### Step 6 — Verify IndexedDB is Synced
| # | Action | Expected Result |
|---|--------|-----------------|
| 6.1 | Open Chrome DevTools → **Application** tab | DevTools panel opens |
| 6.2 | Navigate to **Storage → IndexedDB → ManagerOS_DB → store** | The IndexedDB store is listed |
| 6.3 | Click on the **`database`** key | A JSON object appears in the right panel |
| 6.4 | Expand the **`team`** array | Team array is visible |
| 6.5 | Verify **Test User3** is present in the array | An object with `name: "Test User3"`, `role: "QA Engineer"`, `email: "test.user3@company.com"` is found |
| 6.6 | Check the `id` field — it should be a timestamp number (e.g., `1719571200000`) | A valid numeric ID exists |
| 6.7 | Verify `notes`, `goals`, `tasks` arrays are empty `[]` | New user starts with empty data |

---

### Step 7 — Verify OneDrive Live File Sync (If Connected)
> **Only applicable if user has previously connected a live file via Settings → Storage**

| # | Action | Expected Result |
|---|--------|-----------------|
| 7.1 | Open Windows Explorer → navigate to the connected `.json` file location | File is visible (e.g., `manager-os-data.json` in OneDrive folder) |
| 7.2 | Open the file in Notepad or VS Code | JSON structure is visible |
| 7.3 | Search for `Test User3` in the file | Entry exists in the `team` array of the file |
| 7.4 | Verify this happened WITHOUT needing to press Save | File was auto-updated by the 5s auto-sync interval |

---

## Pass / Fail Criteria

| Criterion | Pass Condition |
|-----------|---------------|
| User creation | Form submits, member appears on `/team` immediately |
| Route resolution | `/team/<id>` opens without 404 or "Page Not Found" |
| IndexedDB sync | `database.team` in `ManagerOS_DB` contains new user entry |
| Page refresh persistence | User still visible after F5 reload |
| No full-page reload | Checkbox/status updates don't cause disruptive reloads |

---

## Known Limitations & Notes

> ⚠️ **OneDrive Sync — Security Clarification (See section below)**

> ✅ This test uses the **`+ New member` modal** in the My Team page — NOT the `/team/new` standalone page (both paths have been fixed to sync IndexedDB properly).

---
