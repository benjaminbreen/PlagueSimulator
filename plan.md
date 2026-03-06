# Damascus 1348 Redesign Plan

## Product Goal

Turn the project from a broad historical sandbox with plague systems into a coherent playable teaching tool centered on:

1. bodily experience of plague
2. historical uncertainty and failed remedies
3. navigation through a living medieval city in search of help
4. observation of social reaction, household risk, and unequal outcomes

The player should feel:

- what it is like to become ill in Damascus in 1348
- how people interpreted plague without germ theory
- why remedies were sought despite low efficacy
- how class, district, crowding, and mobility shaped risk

## Diagnosis

The current build already contains strong systems:

- plague progression with differentiated symptom tracks
- item consumption and temporary relief/protection
- medical treatment and apothecary compounding
- LLM narrator with memory and scene grounding
- household/family context
- district and NPC ecology

The main issue is not lack of mechanics. It is competition between loops:

- profession/errand play
- sandbox exploration
- dialogue/narrator play
- plague/treatment play

These loops currently share the same visual weight. The result is a game that feels rich but not legible.

## New Core Loop

### Phase 1: Ordinary Life

The player begins with a profession and a simple routine. This establishes place, social identity, and district texture.

### Phase 2: Exposure

The ordinary loop is interrupted by unease, rumor, and bodily ambiguity.

### Phase 3: Symptom Recognition

The game foregrounds symptoms, treatment decisions, and household danger.

### Phase 4: Search For Relief

The player uses inventory, narrator guidance, and the city to seek barbers, physicians, hospitals, and apothecaries.

### Phase 5: Hopeful Failure

Treatments may soothe, buy time, shift odds, or harm the player. They should not reliably cure plague.

### Phase 6: Historical Reflection

At death or session end, the player receives a clear modern debrief on spread, treatment limits, and social context.

## Design Priorities

### Expand

- persistent condition tracking
- medical inventory visibility
- narrator as practical guide
- illness-driven tasks after onset
- household and city outbreak visibility

### Simplify

- profession errands as the long-term main loop
- parallel UI surfaces competing for focus
- decorative NPC inspection details in primary panels
- separate observe mode for work the narrator can handle directly

## Implementation Plan

### 1. Persistent Condition Surface

Replace the current compact sickness meter with a more expressive condition panel that remains visible once the player has meaningful bodily information.

The panel should show:

- current condition label
- top symptoms
- disease course
- survival outlook in period-facing language
- active protections
- recent remedies or procedures
- what the player should try next

This panel becomes the main bodily interface. The dossier health tab remains the detailed reference view.

### 2. Inventory As Medical Satchel

When plague matters, inventory should foreground:

- consumable remedies
- protective fumigants
- ingredients for compounds
- notable rare medicines

This should be visible in both:

- the bottom quick-access tray
- the dossier inventory tab

Items should be sorted by medical usefulness during illness rather than alphabetically by default.

### 3. Narrator As Consultation Layer

The narrator should answer two classes of questions:

#### Deterministic questions

Handled instantly in local code:

- Where is the nearest apothecary?
- Where can I get treatment?
- How am I feeling?
- What remedies do I carry?
- What should I try next?
- Where is home?

#### Interpretive questions

Handled by the LLM:

- What do people here think is happening?
- What does this district feel like?
- Why are people afraid?
- How might a hakim understand my condition?

The narrator prompt should include richer bodily and remedy context so the prose remains grounded.

### 4. Task System Shift

Profession errands should remain only as the opening texture of ordinary life.

Once the player becomes incubating or infected, the task system should pivot to illness-driven urgency:

- seek a barber-surgeon
- find a physician
- locate a bimaristan
- gather fumigants
- return home to check the household
- obtain stronger compounds

This keeps direction without turning the game into arbitrary questing.

### 5. Treatment Rebalance

Treatments and compounds should feel historically plausible:

- temporary relief
- palliative comfort
- rare meaningful improvements
- costs and side effects
- misleading confidence

Messaging should avoid implying that miracle cures reliably work.

### 6. UI Simplification

The UI should center three questions:

1. What is happening to me?
2. What help is near?
3. What can I try now?

Everything else becomes secondary or contextual.

### 7. Performance Gains

The redesign should improve responsiveness by:

- routing practical narrator questions locally instead of through the network
- surfacing critical information directly rather than opening multiple heavy modals
- reducing unnecessary competition between always-on panels

## Implementation Scope For This Pass

This implementation pass focuses on the highest-leverage changes that fit the current architecture:

1. add a persistent condition panel
2. add narrator intent routing for practical questions
3. enrich narrator context with symptom/remedy state
4. sort inventory around treatment usefulness during illness
5. pivot tasks to illness-driven urgent needs after exposure/onset
6. soften remedy messaging so the historical lesson remains intact

## Follow-Up Work

After this pass, the next improvements should be:

1. end-of-run historian debrief
2. dedicated household risk panel
3. stronger medical district/path guidance
4. fuller rebalance of remedy and treatment numbers
5. reducing overlap between observe mode and narrator guidance
