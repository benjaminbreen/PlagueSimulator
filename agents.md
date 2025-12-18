# Agents Overview

- Stack: Vite + React 19 with @react-three/fiber/drei/three; Tailwind via CDN in `index.html`; fonts from Google (Cinzel, Lato).
- Entry points: `index.tsx` mounts `App.tsx`, which owns simulation params/stats, time-of-day, map transitions, and the UI overlay.
- Scene graph: `components/Simulation.tsx` wires lights, fog, sky/stars, environment, agents, rats, and player; lighting shifts by `params.timeOfDay`.
- World generation: `components/Environment.tsx` procedurally builds ground, buildings, and landmarks per map tile; metadata comes from `utils/procedural.ts`.
- Agents: `components/Agents.tsx` seeds NPC pool; `components/NPC.tsx` handles movement, infection state, and hover card; `components/Rats.tsx` instanced rats tied to hygiene.
- Player: `components/Player.tsx` provides third/first-person movement and camera controls; `components/Humanoid.tsx` is the shared character rig.
- Simulation data: enums and constants live in `types.ts`.
