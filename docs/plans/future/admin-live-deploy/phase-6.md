# Phase 6 — Last-seen visits (optional, cut-able)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Pulse can honestly say "active today / this week" — a login or page visit counts as being seen, not only a finished run.

## Changes
- Migration: `users.last_seen_at timestamptz`.
- Auth service: stamp on successful login, plus a throttled touch on authenticated `/auth/me` (write only when stale > 1 hour) — `/auth/me` fires on every page load, so this reads as real presence without hot-path writes (+ throttle unit test).
- Pulse tiles ("active today / this week") + last-seen column on the Registered rows.

## Not in this phase
- Cohorts, retention curves, per-day visit history — parked.

## Done when
- [ ] Throttle proven by unit test (second call within the hour writes nothing).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **You count** — log in on your phone, open Pulse: "active today" includes you (internal marked as such).
2. **A visit without a run counts** — a manager who only logs in (no run) still shows a fresh "last seen" on the Registered screen.
