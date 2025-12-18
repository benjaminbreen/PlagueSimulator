# TODO Proposals

## Graphics / 3D Rendering
- Add texture variety (albedo/normal/roughness) for buildings/ground with a small atlas to avoid repeated noise-only surfaces.
- Implement LOD for buildings/agents and frustum-based culling for distant NPCs to stabilize FPS at higher counts.
- Improve lighting with a sun/sky model plus color-graded dusk/dawn; add soft shadow cascades or baked lightmaps for static geometry.
- Add post-processing pass (subtle bloom, SSAO, tone mapping) to give depth without over-saturating the scene.
- Swap simple geometry for a few hero assets (mosque, well, market stalls) to create recognizable landmarks.

## UI Improvements
- Consolidate controls into a single bottom panel with tabs (Simulation, Map, Camera, Info) to reduce visual clutter.
- Add an in-world legend/tooltip for interaction prompts (enter building, fast travel) with consistent iconography.
- Improve mobile layout: collapse the top bar to a single button and move stats to a slide-out panel.
- Provide keybind remapping and a settings "preview" mode for camera changes.
- Add subtle UI feedback when parameters change (mini toast or dial animations) to reinforce state.

## Other Suggestions
- Unify simulation timekeeping (use one source of truth) and expose it to UI/lighting/NPCs.
- Implement click-to-move and a real overhead camera behavior for the "Overhead Map" mode.
- Add audio layers (market ambience, distant calls, disease cues) tied to time of day and infection rate.
- Add simple save/load of `SimulationParams` to restore sessions.
- Add a lightweight performance overlay and a `debug` toggle for agent counts and infection tracing.
