# UX Fixes — SeroMVP Web App

## Context
Full UX audit identified heading inconsistencies, missing buttons, and missing/broken stages across the SeroMVP web app. Fixes are ordered: headings (safe text changes) → missing buttons (UI additions) → missing stages (structural additions).

---

## Phase 1 — Heading Fixes

### 1.1 Sidebar vs page heading mismatches

| Fix | File | Change |
|---|---|---|
| "General settings" → "My Profile" | client/src/pages/profile.tsx:219, 234 | Change H1 text and Header title prop |
| "Team context" → "Team focus" | client/src/pages/focus.tsx:889, 894 | Change H1 and MobileLayout title |
| "1:1 calendar" → "1:1 Calendar" | client/src/components/sidebar.tsx:49 | Capitalise 'C' in sidebar label to match page |
| "My requests" → "Requests" | client/src/pages/requests.tsx:319 | Remove "My" prefix from page H2 |
| "Work With Me" naming | client/src/pages/work-with-me.tsx | Align page heading to match sidebar label ("Leadership style" for managers, "My working style" for individuals) |

### 1.2 Button label inconsistencies

| Fix | File | Change |
|---|---|---|
| "Add goal" → "Create goal" | client/src/pages/goals.tsx:174 | Match dialog title "Create goal" |
| "Schedule a 1:1" (dialog) → "Schedule new 1:1" | client/src/pages/manager-oneonones.tsx | Match button that opens dialog |

### 1.3 Step 8 naming — standardise to "Private notes"

Three different names exist: "Review" (step bar), "Offline review" (step heading), "Private notes" (view tab).
Chosen standard: **"Private notes"** (clearest to managers, consistent with what it actually contains).

| File | Change |
|---|---|
| client/src/pages/oneonone/runner-config.ts:14 | `label: 'Review'` → `label: 'Private notes'` |
| client/src/components/oneonone-bottom-stages.tsx:48 | Update tooltip text |
| client/src/components/oneonone/AdvancedOfflineReviewStep.tsx | Update step heading |
| client/src/pages/oneonone-view.tsx | Align tab label to match |

### 1.4 Building Blocks — standardise to "Building blocks"

| File | Note |
|---|---|
| client/src/components/oneonone/RatingsStep.tsx | Check heading, align to "Building blocks" |
| client/src/pages/oneonone-view.tsx:551 | "Building Block Ratings" → "Building blocks" |
| client/src/pages/focus.tsx:1035 | "Building block history" — already correct casing |

### 1.5 Casing in Goals page tabs

- `goals.tsx:201-207` — "Active Goals" → "Active goals", "Archived" stays as is (already sentence case)

---

## Phase 2 — Missing Buttons

### 2.1 Fix duplicate icon (Step 1 & 8 both use ClipboardList)

**File:** `client/src/components/oneonone-bottom-stages.tsx:29-38`

Change step 8 icon from `ClipboardList` to `Lock` (or `EyeOff`) to visually signal that it's private/manager-only.

```ts
// Before
8: ClipboardList,
// After
8: Lock,   // import Lock from @/lib/icons
```

### 2.2 Remove hardcoded Google Meet link

**File:** `client/src/components/oneonone-session-detail.tsx:207`

The link `https://meet.google.com/kdb-aukf-gdx` is hardcoded. Two options:
- If meeting URL is stored on the session object: render it conditionally when present
- If not yet integrated: hide the section entirely (don't show a fake link)

Chosen approach: **hide if no real URL exists** — show a placeholder "No meeting link" or remove the row.

### 2.3 Delete option in completed session view

**File:** `client/src/pages/oneonone-view.tsx`

Add a `DropdownMenu` or icon button in the view's top action area (near the "Back" button) with a "Delete session" option behind a confirmation AlertDialog. Reuse the existing delete mutation from the runner (`DELETE /api/oneonones/{id}`).

### 2.4 "Schedule next 1:1" CTA after session completion

After a session is marked complete, the runner redirects to `/individuals/{id}?tab=past-1:1s&completed={sessionId}`. 

Add a toast or banner in `individual-profile.tsx` (or wherever the redirect lands) that shows: 
> "1:1 complete. Schedule the next one?" with a "Schedule" button.

Alternatively, add it as the final moment in the runner before redirect — a simple card shown after the completion animation:
> "Session saved. Ready to schedule the next 1:1?" [Schedule] [Go to profile]

### 2.5 Skip affordance on optional steps (guided mode)

**File:** `client/src/components/one-on-one-steps.tsx` (or individual guided step components)

In guided mode, steps where data is optional (Catch-up, Requests, Goals) should have a secondary "Skip" or "Nothing to add →" link below the main content. This should call the same `onNextStep` function as the "Next" button — just with a different visual weight (ghost/text link, not a primary button).

Steps where skip should be available: 2 (Catch-up), 3 (Requests), 5 (Feedback), 6 (Goals).
Steps where skip should NOT be available: 1 (Preparing — read-only), 7 (Summary), 8 (Private notes).

---

## Phase 3 — Missing Stages

### 3.1 Explain removed steps in catch-up mode

**File:** `client/src/components/oneonone-bottom-stages.tsx`

When in catch-up mode, steps 4 (Rating) and 5 (Feedback) are excluded. Currently they just disappear. 

Add a visual indicator: render steps 4 and 5 as greyed-out, non-clickable pills with a tooltip: "Not included in catch-up sessions." This preserves the 8-step mental model while making the exclusion explicit.

Implementation: pass `allSteps` alongside `steps` (active steps) to the component. For each step in `allSteps` not in `steps`, render a `disabled` pill.

### 3.2 Action Items step (deferred — separate feature)

The lack of a dedicated "Action Items" step is a genuine gap but requires:
- New step definition in runner-config.ts
- New step component
- Likely a new API endpoint to persist action items

This is scoped as a **separate feature** to avoid scope creep here. Flag for follow-up.

### 3.3 Post-completion wrap-up moment

Covered in Phase 2.4 above (the "Schedule next 1:1" CTA).

---

## Verification

After all changes:
1. Walk the full 8-step runner (full mode) — check every step label, heading, and tooltip is consistent
2. Walk catch-up mode — verify steps 4 & 5 show as greyed-out, not hidden
3. Check the sidebar vs page heading for all 8 nav items
4. Open a completed session view — confirm delete option is present and hardcoded Meet link is gone
5. Complete a session and verify the "Schedule next 1:1" CTA appears
6. Check goals page — "Create goal" button, "Active goals" tab (sentence case)

## Files Changed

- `client/src/components/sidebar.tsx`
- `client/src/pages/profile.tsx`
- `client/src/pages/focus.tsx`
- `client/src/pages/requests.tsx`
- `client/src/pages/goals.tsx`
- `client/src/pages/manager-oneonones.tsx`
- `client/src/pages/work-with-me.tsx`
- `client/src/pages/oneonone-view.tsx`
- `client/src/pages/oneonone/runner-config.ts`
- `client/src/components/oneonone-bottom-stages.tsx`
- `client/src/components/oneonone-session-detail.tsx`
- `client/src/components/oneonone/AdvancedOfflineReviewStep.tsx`
- `client/src/components/one-on-one-steps.tsx`
