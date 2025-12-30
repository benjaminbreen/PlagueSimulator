# Agents Overview

Damascus 1348 is a historically grounded, real‑time simulation of a living city: procedurally generated neighborhoods, agents with evolving health and memory, and a plague model that spreads across people and buildings. The player explores a dynamic map, enters interiors, and engages NPCs through context‑aware dialogue and an AI‑driven “observe” mode that describes the immediate scene. The UI blends modern legibility with period texture to keep complex systems readable without breaking immersion.

## Architecture Snapshot
- Stack: Vite + React 19 + @react-three/fiber/drei/three. Tailwind via CDN in `index.html`. Fonts: Cinzel + Lato.
- Entry points: `index.tsx` mounts `App.tsx`. `App.tsx` now composes `SimulationShell` (Canvas/R3F) + `AppShell` (UI/overlays).
- Canvas shell: `components/SimulationShell.tsx` owns `<Canvas>` and renders `components/Simulation.tsx` (outdoor) or `components/InteriorScene.tsx` (interior).
- UI shell: `components/AppShell.tsx` renders `components/UI.tsx`, modals, toasts, and observe/plague overlays.
- Core hooks:
  - `hooks/useSimulationClock.ts` – sim time + time of day ticking, throttled commits.
  - `hooks/useEventSystem.ts` – event queue, triggers, LLM event augmentation.
  - `hooks/useModalState.ts`, `hooks/useEncounterState.ts` – modal & encounter state.
  - `hooks/useInventoryInteractions.ts` – drop/pickup flow and drop requests.
  - `hooks/useObserveMode.ts` – observe mode LLM calls + fallback.
  - `hooks/usePlagueMonitor.ts` – player plague state transitions & notifications.
- Scene graph: `components/Simulation.tsx` wires lights, fog, sky/stars, environment, agents, rats, and player; lighting shifts by `params.timeOfDay`.
- World generation: `components/Environment.tsx` generates ground/buildings/landmarks per tile using `utils/procedural.ts` metadata. Refactor in progress:
  - helpers extracted into `utils/environment/*`
  - courtyard rendering moved to `components/environment/buildings/CourtyardBuilding.tsx`
  - building ornaments moved to `components/environment/buildings/BuildingOrnaments.tsx`
- Agents: `components/Agents.tsx` seeds NPC pool; `components/NPC.tsx` handles movement/infection/hover; `components/Rats.tsx` instanced rats tied to hygiene.
- Player: `components/Player.tsx` handles movement and camera; `components/Humanoid.tsx` is shared rig.
- Simulation data: enums/constants in `types.ts`.

## LLM Integration
- Serverless endpoints (Vercel): `/api/chat` (encounters), `/api/event` (dynamic events), `/api/observe` (scene descriptions).
- Keys: `GEMINI_API_KEY` set in Vercel UI. Local dev uses `.env.local` (git‑ignored). Do not expose API keys client‑side.
- Local dev for API: use `vercel dev` to serve `/api/*` routes.

## Best Practices / Tips
- Avoid TDZ errors: don’t reference state or functions before they’re defined; keep hooks ordered and use hooks to isolate dependency scopes.
- Keep Canvas isolated: changes to UI state should not re‑render the R3F tree; prefer `SimulationShell`/`AppShell` split.
- Memoize hot props: pass stable objects via `useMemo` and handlers via `useCallback` to reduce re‑renders.
- Use refs for high‑frequency values (sim time, time of day) and commit to state at throttled intervals.
- Don’t do heavy work in render: move procedural generation and expensive math to memoized helpers.
- Prefer instancing for repeated props/ornaments; avoid per‑frame allocations.
- Maintain strict historical tone in prompts; avoid generic RPG phrasing or stage directions.
