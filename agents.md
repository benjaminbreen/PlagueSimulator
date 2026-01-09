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

## District System

The game uses a two-layer district system to render the 7×7 grid of historical Damascus:

### Layer 1: District Type Assignment (`types.ts`)
`getDistrictType(mapX, mapY)` maps each grid tile to a `DistrictType` enum value based on 14th-century Damascus geography. There are ~30 district types defined, but many are aliases that should map to a smaller set of functional biomes.

### Layer 2: Rendering
Districts are rendered via two mechanisms:
1. **Ground Palette** (`Environment.tsx` lines 3121-3138): Sets ground color/texture based on district
2. **Decor Components** (`components/environment/districts/*.tsx`): Add district-specific props, landmarks, vegetation

### Functional Districts (Full Rendering)

| District Type | Ground Palette | Decor Component | Description |
|--------------|----------------|-----------------|-------------|
| MARKET | MARKET | MarketplaceDecor | Central bazaar (Al-Buzuriyah) |
| SOUQ_AXIS | MARKET | SouqDecor | Covered souq corridor |
| JEWISH_QUARTER | JEWISH_QUARTER | JewishQuarterDecor | Harat al-Yahud |
| CHRISTIAN_QUARTER | DEFAULT | ChristianQuarterDecor | Bab Touma |
| UMAYYAD_MOSQUE | (special) | UmayyadMosqueDistrict | Great Mosque complex |
| SALHIYYA | SALHIYYA | SalhiyyaDecor | Scholarly quarter on Qassioun slopes |
| CEMETERY | CEMETERY | CemeteryDecor | Bab al-Saghir / Mamluk tombs |
| HOVELS | HOVELS | HovelsDecor | Midan al-Hasa (poor district) |
| WEALTHY | WEALTHY | (none) | Souq Sarouja (officers' quarter) |
| ALLEYS | ALLEYS | (none) | Al-Shaghour inner alleys |
| CIVIC | CIVIC | (none) | The Citadel |
| BAB_SHARQI | ALLEYS | BabSharqiGate | Eastern Gate |
| MIDAN | MARKET | (none) | Southern gate/caravan district |
| STRAIGHT_STREET | MARKET | (none) | Via Recta |
| CARAVANSERAI | CARAVANSERAI | CaravanseraiComplex | Khan al-Harir |
| MOUNTAIN_SHRINE | MOUNTAIN_SHRINE | MountainShrineDecor | Maqam Ibrahim |
| QASSIOUN_CAVES | QASSIOUN_CAVES | QassiounCavesDecor | Sacred caves |
| SOUTHERN_ROAD | SOUTHERN_ROAD | SouthernRoadDecor | Hajj/Hauran roads |
| ROADSIDE | ROADSIDE | RoadsideDecor | Generic road tiles |
| OUTSKIRTS_FARMLAND | OUTSKIRTS_FARMLAND | OutskirtsFarmlandDecor | Ghouta orchards |
| EAST_GHOUTA | OUTSKIRTS_FARMLAND | OutskirtsFarmlandDecor | Eastern orchards |
| SOUTH_GHOUTA | OUTSKIRTS_FARMLAND | OutskirtsFarmlandDecor | Southern orchards |
| NORTH_GHOUTA | OUTSKIRTS_FARMLAND | OutskirtsFarmlandDecor | Northern orchards |
| OUTSKIRTS_DESERT | OUTSKIRTS_DESERT | OutskirtsDesertDecor | Eastern badlands |
| OUTSKIRTS_SCRUBLAND | OUTSKIRTS_SCRUBLAND | OutskirtsScrublandDecor | Western rocky hills |
| QANAWAT | QANAWAT | WaterwayDecor | Canal district with norias |
| QUBAYBAT | QUBAYBAT | QubaybatDecor | "Little Domes" - Mamluk mausoleum complex |

### Alias Districts (Map to Functional Districts)

These specialized historical names should fall back to appropriate functional biomes:

| Alias District | Maps To | Historical Location |
| LOWER_SALHIYYA | SALHIYYA | Lower scholarly quarter (-2,1) |
| RABWE | OUTSKIRTS_FARMLAND | River gorge orchards (-2,3), (-1,3) |
| JABIYA_ROAD | ROADSIDE | Western approach (-3,0) |
| DARAYA_ROAD | SOUTHERN_ROAD | Road to Daraya (-1,-3) |
| QAYMARIYYA | WEALTHY | Wealthy area near mosque (1,2) |
| AMARA | WEALTHY | Central residential (1,1) |
| BAB_FARADIS | WEALTHY | Paradise Gate district (2,2), (2,3) |
| AMIN | ALLEYS | Eastern quarter edge (2,-1) |
| SHAGHOUR_OUTER | ALLEYS | Outer Shaghour suburb (-1,-2) |
| UQAYBA | ALLEYS | Northern suburb (1,3) |

### Adding a New District
1. Add type to `DistrictType` union in `types.ts`
2. Add mapping in `getDistrictType()` for grid coordinates
3. (Optional) Add ground palette entry in `Environment.tsx`
4. (Optional) Create decor component in `components/environment/districts/`

## Best Practices / Tips
- Avoid TDZ errors: don't reference state or functions before they're defined; keep hooks ordered and use hooks to isolate dependency scopes.
- Keep Canvas isolated: changes to UI state should not re‑render the R3F tree; prefer `SimulationShell`/`AppShell` split.
- Memoize hot props: pass stable objects via `useMemo` and handlers via `useCallback` to reduce re‑renders.
- Use refs for high‑frequency values (sim time, time of day) and commit to state at throttled intervals.
- Don't do heavy work in render: move procedural generation and expensive math to memoized helpers.
- Prefer instancing for repeated props/ornaments; avoid per‑frame allocations.
- Maintain strict historical tone in prompts; avoid generic RPG phrasing or stage directions.
