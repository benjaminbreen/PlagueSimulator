# Environment Refactor Plan

Goal: reduce `components/Environment.tsx` size/complexity without changing visuals or behavior. Start with low‑risk extraction of pure helpers.

## Phase A — Extract pure helpers (safe, mechanical)
**Objective:** move non‑React helper logic out of `Environment.tsx`.

### Candidates to extract
- Courtyard footprint/layout helpers.
- Ornament/pattern selection helpers (tile bands, lattice, lintels).
- Building metadata shaping (size/height scaling, wing placement).
- Color palette utilities for walls/trim.
- Small math helpers (noise, lerp, clamp if local).

### New files (suggested)
- `utils/environment/courtyard.ts`
- `utils/environment/ornaments.ts`
- `utils/environment/buildingVariants.ts`
- `utils/environment/palette.ts`
- `utils/environment/math.ts` (only if Environment has its own mini math helpers)

### Guardrails
- Keep function signatures stable.
- No behavioral changes.
- Keep ASCII‑only in new files.

### Exit criteria
- `Environment.tsx` compiles and renders identically.
- No changes to public props or component behavior.

## Phase B — Split JSX into subcomponents
**Objective:** extract rendering blocks into small components.

### Components to create
- `Environment/Buildings.tsx`
- `Environment/Courtyards.tsx`
- `Environment/Landmarks.tsx`
- `Environment/Vegetation.tsx`
- `Environment/Props.tsx`

## Phase C — Optional performance pass
**Objective:** reduce draw calls for repeated props.

### Options
- Instanced meshes for pots/trees/lamps.
- Merge static geometry by district.

---

## Tracking
- [x] Phase A (extract helpers)
- [ ] Phase B (split components)
  - [x] CourtyardBuilding extracted
  - [x] BuildingOrnaments extracted
- [ ] Phase C (perf pass)
