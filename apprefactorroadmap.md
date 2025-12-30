# App Refactor Roadmap

This roadmap refactors `App.tsx` for maintainability **and** measurable performance gains, while preventing TDZ/ordering bugs. It is staged so each phase is safe and reversible.

## Goals
- Reduce `App.tsx` size and cognitive load.
- Prevent initialization-order/TDZ errors.
- Isolate Canvas rendering from UI state changes.
- Maintain current behavior and game feel.
- Keep refactor incremental with smoke‑tests per phase.

---

## Phase 0 — Baseline checks (no code changes)
**Purpose:** establish a stable validation checklist.

**Smoke test checklist (run after each phase):**
- Spawn, move, sprint, jump, fall.
- Climb ladder and descend.
- Open encounter, merchant, dossier.
- Drop item + pickup item.
- Enter/exit interior.
- Trigger observe and exit.
- Weather update appears in UI and visuals.
- Plague modal + notifications still trigger.

---

## Phase 1 — Order safety + audit (no behavior change)
**Purpose:** prevent TDZ bugs and clarify dependencies.

**Actions:**
- Audit `App.tsx` for `useMemo`/`useEffect` that reference variables declared later.
- Move derived calculations into dedicated hooks (local dependency scope).
- Add a brief dependency-order comment at top of `App.tsx` (no runtime effect).

**Edge cases to protect:**
- `observePrompt` depends on `playerStats`, `currentWeather`, `tileBuildings`.
- Any `interiorInfo`-like derived values must not be used before declaration.

**Exit criteria:**
- No `Cannot access ... before initialization` errors.
- Behavior identical.

---

## Phase 2 — Domain hooks (preserve behavior)
**Purpose:** split state logic into stable domains while keeping rendering unchanged.

**Hooks to extract:**
1) `useSimulationClock`
   - RAF sim time + time of day updates
   - throttled state commits

2) `useModalState`
   - all modal booleans
   - common close helpers
   - ensures correct priority (merchant > encounter, etc.)

3) `useEncounterState`
   - selected NPC, nearby NPC, encounter open/close flows
   - “NPC initiated” tracking

4) `useInventoryDrops`
   - `dropRequests`, drop handlers
   - inventory decrement logic

**Edge cases to protect:**
- Modal blocking logic (open encounter only when no other modals).
- Event triggers tied to modal open/close.

**Exit criteria:**
- `App.tsx` compiles with same behavior.
- No user-visible changes.

---

## Phase 3 — Rendering split (performance win)
**Purpose:** avoid Canvas re-render on UI changes.

**New components:**
- `SimulationShell.tsx` — owns `<Canvas>`, `<Simulation>`/`<InteriorScene>`, performance monitor.
- `AppShell.tsx` — owns `<UI>`, modals, overlays, prompts.

**Performance changes:**
- `SimulationShell` wrapped in `React.memo`.
- Group and memoize large prop bundles (`simProps`, `uiProps`).
- Ensure UI state changes do **not** rerender canvas.

**Edge cases to protect:**
- `observeMode` must hide UI but not break Canvas.
- `r3fRef` and pointer handlers must remain bound correctly.

**Exit criteria:**
- Canvas renders identically.
- UI changes do not trigger Canvas rerender (verified in React devtools).

---

## Phase 4 — State separation for performance
**Purpose:** reduce state churn and rendering pressure.

**Actions:**
- Move high‑frequency values to refs where possible (e.g. simTime/timeOfDay).
- Commit UI-facing state at lower frequency (already partially done).
- Ensure render props are stable via `useMemo`/`useCallback`.

**Edge cases to protect:**
- Observe/LLM prompts use the latest values.
- Weather and plague state remain responsive.

**Exit criteria:**
- FPS improves or at least no regression.
- No stale UI values.

---

## Phase 5 — Verify and stabilize
**Purpose:** finalize and harden refactor.

**Actions:**
- Run smoke test checklist.
- Optional: add minimal logging around map transitions and observe state for regression detection.

**Exit criteria:**
- No regressions after several play sessions.

---

## Phase 6 — Event system extraction
**Purpose:** move event orchestration and LLM event handling out of `App.tsx`.

**Actions:**
- Extract event queue + LLM event builder to `useEventSystem`.
- Move conversation-triggered event logic into the hook.
- Keep `App.tsx` using `tryTriggerEvent`/`resolveEvent` from the hook.

**Exit criteria:**
- Event modals still trigger correctly.
- No behavioral changes in event outcomes.

---

## Tracking / TODO
- [x] Phase 1 complete
- [x] Phase 2 complete (hooks extracted: `useSimulationClock`, `useModalState`, `useInventoryInteractions`, `useEncounterState`)
- [x] Phase 3 complete (SimulationShell + AppShell split, memoized)
- [x] Phase 4 complete (stable prop bundles, hot-path callbacks memoized)
- [ ] Phase 5 complete
- [x] Phase 6 complete (event system moved to hook)
