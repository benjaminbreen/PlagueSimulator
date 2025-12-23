# Environment Refactor Smoke Test Checklist

Run this checklist after each refactor phase to ensure no regressions.

## Phase 0 Baseline (Before Refactor)

- [ ] Build completes without errors
- [ ] All districts load without console errors
- [ ] Note baseline FPS for each district (check DevStats)
- [ ] Take screenshots of each district for visual comparison

## District Rendering Tests

### MARKET
- [ ] Central fountain renders with water jets
- [ ] Market stalls appear with awnings
- [ ] Food displays visible on stalls
- [ ] NPCs can interact with merchants
- [ ] Ground texture correct

### WEALTHY
- [ ] Buildings have proper architecture
- [ ] Decorative elements present (pots, benches)
- [ ] Pathways visible
- [ ] Ground texture correct

### HOVELS
- [ ] Cramped building layout
- [ ] Shabby decorations
- [ ] Ground texture correct

### ALLEYS
- [ ] Narrow passages
- [ ] Decorative elements present
- [ ] Ground texture correct

### RESIDENTIAL
- [ ] Mixed building sizes
- [ ] Decorative elements present
- [ ] Ground texture correct

### CIVIC
- [ ] Larger civic buildings
- [ ] Open spaces
- [ ] Ground texture correct

### SALHIYYA (Hilly)
- [ ] Buildings follow terrain heightmap
- [ ] Paths follow terrain
- [ ] No floating buildings
- [ ] Trees and decorations at correct heights
- [ ] Boulders present and rolling (if implemented)

### OUTSKIRTS
- [ ] Sparse decorations
- [ ] Open terrain
- [ ] Ground texture correct

### MOUNTAIN_SHRINE
- [ ] Shrine structure visible
- [ ] Mountain decorations (rocks, trees)
- [ ] Heightmap terrain working
- [ ] No floating elements

### CARAVANSERAI
- [ ] Courtyard layout
- [ ] Caravanserai walls and structures
- [ ] Ground texture correct

## Shared Features

- [ ] Laundry lines render and animate
- [ ] Pushable objects (pots, benches, jars) present
- [ ] Items can be picked up (coins, produce)
- [ ] Collision detection working
- [ ] Lighting correct (torches, ambient)

## Performance Tests

- [ ] FPS within 5% of baseline for each district
- [ ] No memory leaks (check DevTools memory over 2 minutes)
- [ ] No excessive re-renders (check React DevTools)
- [ ] Build size not significantly increased

## After Each Phase

1. Run `npm run build` - must succeed
2. Test each district visually
3. Check console for warnings/errors
4. Compare FPS to baseline
5. Check dev logging output (if Phase 0 complete)
6. Take screenshots and compare

## Rollback Criteria

If ANY of these occur, rollback the phase:
- Build fails
- Any district fails to render
- FPS drops >10% in any district
- Console errors appear
- Visual elements missing
- Collision/interaction broken

## Notes Section

Record any observations or anomalies here during testing:

---

**Date**: [Fill in]
**Phase**: [Fill in]
**Tester**: [Fill in]
**Status**: [Pass/Fail/Notes]
