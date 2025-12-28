# Event System Plan (Final)

## Goals
- Provide one shared pipeline for prewritten/procedural and LLM-generated events.
- Keep it simple, deterministic, and low overhead.
- Integrate cleanly with the existing modal system (encounter, merchant, enter building).
- Allow player opt-in/out of LLM events while keeping the same UI and data model.
- Preserve historical realism and tone consistency with existing NPC prompts.
- Favor modular components and small, testable utilities.

## Core Concept
An event is a short, modal decision moment with 2-4 choices. Each choice applies a small, explicit effect to player/NPC/world state or triggers a follow-up event. Procedural and LLM events share the same structure, UI, and resolution logic.

## Scope and Sources
Events can be triggered by:
- Conversation outcomes (threats, repeated harassment, offense).
- Player actions (warn/encourage/observe) in dense areas.
- Environment interactions (interior encounters, pickups, plague exposure prompts).
- Random low-frequency biome events (deterministic by tile/time/seed).

## Data Model (Types)
Add to `types.ts` or `types/events.ts`:
- EventOption:
  - id: string
  - label: string
  - consequenceText?: string
  - requirements?: { stat: 'charisma' | 'piety' | 'health' | 'currency', min?: number, max?: number }
  - effects: EventEffect[]
- EventEffect (minimal union):
  - { type: 'playerStat', stat: 'health' | 'piety' | 'charisma' | 'currency', delta: number }
  - { type: 'npcStat', npcId: string, stat: 'disposition' | 'panic', delta: number }
  - { type: 'worldFlag', key: string, value: boolean | number | string }
  - { type: 'triggerEvent', eventId: string }
  - { type: 'endConversation' }
- EventDefinition (prewritten/procedural):
  - id: string
  - title: string
  - body: string
  - options: EventOption[]
  - tags?: string[]
  - conditions?: { district?: string, timeOfDay?: [number, number], socialClassMin?: SocialClass }
- EventInstance (runtime):
  - id: string
  - source: 'conversation' | 'environment' | 'action' | 'system'
  - context: EventContextSnapshot
  - content: { title: string; body: string; options: EventOption[] }
  - definitionId?: string
  - resolvedAt?: number

## Event Context Snapshot
Keep it small and deterministic:
- player: id, name, socialClass, stats (charisma, piety, health, currency)
- npc: id, name, profession, socialClass, disposition, panic, religion (optional if no NPC)
- environment: district, timeOfDay, weather
- conversation: last N player/NPC messages (if relevant)
- flags: recentEvents, threatMemory

## State and Flow (App-owned)
Keep this centralized in `App.tsx`:
- `eventQueue: EventInstance[]`
- `activeEvent: EventInstance | null`
- `llmEventsEnabled: boolean`
- `enqueueEvent(event)`
- `resolveEvent(option)`
- `applyEffects(effects)`
- `eventCooldowns` map to prevent repeated triggers

No separate manager module until needed.

## UI Integration
Create new components (keep existing ones clean):
- `components/EventModal.tsx` for the modal layout.
- `components/EventOptionButton.tsx` for consistent, elegant choice buttons.

UI requirements:
- Visual style aligned with `EncounterModal` and `MerchantModal`.
- Concise copy; avoid paragraph walls.
- Option requirements clearly indicated (disabled state, short reason).
- Minimal animation (fade/slide) to stay calm and readable.

### Modal Priority Rules
- Event modal supersedes encounter/merchant/enter modals.
- When an event triggers, close lower-priority modals before opening the event modal.
- Centralize modal priority in `App.tsx` to avoid conflicting ESC handlers.

## Trigger Logic
Create a small utility module (no heavy system):
- `utils/eventTriggers.ts`
  - `checkConversationTriggers(context)` returns EventInstance | null
  - `checkActionTriggers(context)` returns EventInstance | null
  - `checkBiomeRandomEvent(context)` returns EventInstance | null

Key rules:
- Always return at most one event per tick.
- Use event cooldowns and recent history to prevent duplicates.
- Snapshot context at trigger time, not at render time.
- Deterministic random events: seed by tile + simDay + eventId.

## LLM Generation (Optional Path)
Serverless route: `api/event.ts`:
- Input: `EventContextSnapshot`, optional `eventSeed`
- Output: title/body/options with effect keys only (no freeform deltas)
- If LLM fails or invalid schema, fall back to prewritten/procedural event

Safety:
- Validate strict schema on the server.
- Map `effectKey` to known effects only.
- Never allow LLM to set raw numeric deltas.

## Historical Authority Model (1348 Damascus)
- Authorities include the shurta (city watch), muhtasib (market inspector), and household guards.
- Use district + NPC social class to pick the authority response:
  - Market: muhtasib or nearby guards
  - Wealthy quarters: household guards or retainers
  - Residential: local notables or watch on patrol

## Example: Merchant Calls Authorities
Trigger:
- Threat/offense from conversation + repeated harassment.
Event:
- title: "Shouts for the watch"
- body: "The merchant steps back and calls for the shurta. Nearby guards turn toward you."
- options: Back off; Flee; Offer a bribe; Appeal to the muhtasib

## Random Biome Events (Prewritten)
These are deterministic, low-frequency events by biome:
1) Marketplace: Lost Purse
- "A small leather purse lies under a stall, the string freshly snapped."
- Return it; Keep it; Ask around first.
2) Marketplace: Injured Kitten
- "A kitten limps between baskets, one paw raw from the stones."
- Carry it aside; Ignore; Ask for water.
3) Marketplace: Tainted Scales
- "A vendor's scales wobble oddly; a bystander whispers about cheating."
- Confront; Alert a market inspector; Say nothing.
4) Wealthy: Stray Falcon
- "A hooded falcon sits on a low wall, jesses tangled, restless."
- Free it; Carry to a guard; Leave it.
5) Wealthy: Fountain Offerings
- "Coins glint in a shallow fountain, offered for blessing or luck."
- Add a coin; Take a coin; Walk past.
6) Hovels: Broken Water Jar
- "A cracked jar spills precious water into the dust, a child staring in shock."
- Share water; Help patch the jar; Move on.
7) Hovels: Rat Bite
- "A rat skitters from a heap of refuse and bites your ankle before vanishing."
- Wash wound; Bind and go; Seek a healer.
8) Desert: Bat in the Ruins
- "A bat flutters from a crumbled wall and grazes your face as it passes."
- Ignore; Clean up; Ask locals for remedy.
9) Desert: Lost Waterskin
- "A half-buried waterskin lies in the sand, still cool to the touch."
- Keep it; Look for owner; Empty and move on.
10) Civic: Petitioner's Scroll
- "A folded petition lies by the steps, its seal broken, ink still fresh."
- Deliver to a scribe; Read it; Leave it untouched.

## Implementation Sequence (Concrete)
1) Types and state:
   - Add event types, `activeEvent/eventQueue`, `llmEventsEnabled` in `App.tsx`.
2) UI:
   - Build `EventModal` and `EventOptionButton`.
   - Wire into `components/UI.tsx` with priority rules.
3) Triggers:
   - Extend `analyzeConversationImpact` with `threatLevel`/`offenseLevel`.
   - Add `utils/eventTriggers.ts` with throttling and deterministic random events.
4) Procedural catalog:
   - Add `utils/events/catalog.ts` with prewritten events and simple resolver.
5) LLM optional:
   - Add `api/event.ts` and use only when `llmEventsEnabled` is true and no prewritten event was selected.
6) Content pass:
   - Seed a small, historically grounded event library.

## Testing Strategy
- Unit test `applyEffects` with a small fixture.
- Simulate a threat conversation and verify event triggers only once.
- Confirm modal priority by opening encounter + event.
- Confirm LLM off uses only prewritten events.

## Notes
- Keep event text concise and in-period, aligned with `utils/conversationContext.ts`.
- Do not run trigger checks per frame; tie to explicit interaction points or time ticks.
- Keep the UI calm and readable; avoid competing animations.
