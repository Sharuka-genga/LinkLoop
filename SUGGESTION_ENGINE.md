# Suggestion Engine — How It Works

The suggestion engine recommends users to invite when creating an event. It runs entirely in the database as a PostgreSQL function, called from the client via Supabase RPC.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  suggested-participants.tsx (UI)                    │
│  - Bubble layout (max 6 users in a circle)          │
│  - Tap to select → info panel → Invite button       │
│  - Tracks invite status per-session                 │
└──────────────────┬──────────────────────────────────┘
                   │ getSuggestedUsers(eventId, 6)
                   ▼
┌─────────────────────────────────────────────────────┐
│  events.ts → supabase.rpc('get_ranked_suggestions') │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  DB Function: get_ranked_suggestions(event_id, lim) │
│  SECURITY DEFINER — bypasses RLS                    │
│                                                     │
│  1. Looks up event → category_id, creator_id        │
│  2. Looks up creator → faculty                      │
│  3. Maps category → related interests               │
│  4. Scores & ranks all eligible profiles            │
│  5. Returns top N ordered by score + random tiebreak │
└─────────────────────────────────────────────────────┘
```

---

## Scoring Algorithm

Each candidate profile is scored on three axes. The total is the sum:

### 1. Interest Overlap (0–50 points)

The event's `category_id` is mapped to the `interests` reference table:

| Event Category        | Interest Group | Example Interest Names            |
|-----------------------|----------------|-----------------------------------|
| `sports`, `fitness`   | `sports`       | Cricket, Basketball, Tennis, etc.  |
| `study`               | `academics`    | AI & ML, Programming, UI/UX, etc. |
| `campus`, `trips`     | `events`       | Hackathons, Workshops, Career Fairs|
| `social`, `food`, `gaming` | `hobbies` | Music, Movies, Photography, etc.  |
| `custom`, `other`     | `hobbies`      | (fallback)                        |

Each matching interest in the user's profile earns **10 points**, capped at **50**.

**Example:** A `sports` event matches interest group `sports` (Cricket, Basketball, Tennis, Volleyball, Badminton). If a user has `["Cricket", "Basketball", "Web Dev"]`, they get `2 × 10 = 20 pts`.

### 2. Faculty Match (0 or 15 points)

If the candidate is in the **same faculty** as the event creator, they get **15 points**. The generic `"General"` faculty is excluded from matching to avoid false positives.

### 3. Engagement Score (0–20 points)

The user's `engagement_score` (earned from joining events, attending, etc.) is divided by 10 and capped at **20 points**. This rewards active campus participants.

### Final Score Formula

```
match_score = min(interest_overlap × 10, 50)
            + (same_faculty && faculty ≠ 'General' ? 15 : 0)
            + min(engagement_score / 10, 20)
```

**Maximum possible score: 85 points**

---

## Match Reason Labels

Each user gets a human-readable label shown in the UI:

| Condition                                        | Label                      |
|--------------------------------------------------|----------------------------|
| Has matching interests AND same non-General faculty | `Interest & Faculty Match` |
| Has matching interests                           | `Shared Interest`          |
| Same non-General faculty only                    | `Same Faculty`             |
| No interest or faculty match                     | `Suggested for You`        |

---

## Exclusion Rules

Users are excluded from suggestions if they:

1. **Are the event creator** (you don't suggest yourself)
2. **Already received an invitation** for this event (`event_invitations`)
3. **Already a participant** in this event (`event_participants`)
4. **Already sent a join request** for this event (`event_requests`)

---

## Tiebreaking

When multiple users have the same score, `random()` is used as a tiebreaker. This means pressing "Show different people" in the UI can reorder users with equal scores, giving a fresh feel.

---

## UI Flow

1. **Event created** → Alert with "View Participants" button
2. **Navigate to** `suggested-participants.tsx` with `eventId`, `categoryId`, etc.
3. **6 floating bubbles** appear in a circle with staggered entrance animations
4. **Tap a bubble** → info panel slides up showing: name, engagement rating, faculty, match reason
5. **Tap "Invite"** → calls `sendInvitation(eventId, userId)` → bubble shows checkmark overlay
6. **"Show different people"** → re-fetches from DB (randomized tiebreak gives variety)
7. **"Done" / "Skip for now"** → navigates to home tab
8. **Duplicate invite** → silently marks as sent (no error shown)

---

## Key Files

| File | Role |
|------|------|
| `src/lib/events.ts` → `getSuggestedUsers()` | RPC call to the DB function |
| `src/lib/events.ts` → `sendInvitation()` | Inserts into `event_invitations` |
| `src/app/suggested-participants.tsx` | Full suggestion UI with bubble layout |
| `src/app/event-form.tsx` | Event creation → navigates to suggestions |
| DB: `get_ranked_suggestions()` | Core ranking engine (PL/pgSQL) |
| DB: `interests` table | Reference table mapping interest names to categories |
| DB: `profiles.interests` | User's selected interests (text array) |
