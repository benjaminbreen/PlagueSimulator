# Visual Mockup: Plague System

## Infected Building Marker Design

### Red Crescent Symbol (3D)

```
                    ╔══════════════════════════════╗
                    ║  INFECTED BUILDING MARKER    ║
                    ╚══════════════════════════════╝

                            ┌───────┐
                          ╱           ╲
                        ╱   🌙 RED      ╲
                      ╱    CRESCENT       ╲
                    ╱      (GLOWING)        ╲
                  ╱                           ╲
                 │         Emissive Red        │
                 │      Pulsing 0.5-1.0x       │
                  ╲        intensity           ╱
                    ╲                         ╱
                      ╲                     ╱
                        ╲                 ╱
                          ╲             ╱
                            └─────────┘
                                 │
                                 │  Floats 8 units high
                                 │  Bobs ±0.3 units
                                 │  2-second cycle
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │    BUILDING     │  ← Infected/Deceased
                        │  (Residential)  │     residential building
                        │                 │
                        └─────────────────┘
```

### Color Variations

**INFECTED** (Active plague cases inside):
- Base color: `#cc0000` (bright red)
- Emissive: `#ff0000` (pure red glow)
- Pulse speed: 1.5 Hz (faster pulse = active threat)

**DECEASED** (Dead residents, house in mourning):
- Base color: `#8a0000` (darker red/burgundy)
- Emissive: `#aa0000` (dimmer glow)
- Pulse speed: 0.8 Hz (slower pulse = somber)

### Geometry Details

```
Side view (crescent shape):

      ╱─────────╲
    ╱             ╲     ← Outer arc (radius 0.5)
   │               │
   │    ╱─────╲    │    ← Inner arc (radius 0.35)
   │   │       │   │       offset +0.1 Y
    ╲  │       │  ╱
      ╲│       │╱
        ╲─────╱

Extrusion depth: 0.1 units
Bevel: 0.02 units (smooth edges)
Total size: ~1 unit diameter
```

### Animation Behavior

```
Time: 0s    1s    2s    3s    4s
      │     │     │     │     │
Y:    8.0   8.3   8.0   7.7   8.0  ← Bob animation
      │     │     │     │     │
Glow: 0.5   1.0   0.5   1.0   0.5  ← Pulse (emissiveIntensity)
```

---

## Mourning Clothes Visual Examples

### Normal vs. Mourning Color Comparison

```
┌──────────────────────────────────────────────────────────┐
│                    NORMAL MERCHANT                        │
│                                                           │
│          👤  Robe: #7a5a42 (warm brown)                  │
│         ╱│╲  Accent: #d6c8a8 (cream)                     │
│        ╱ │ ╲ Turban: #4a3f35 (dark brown)                │
│          │                                                │
│         ╱╲                                                │
└──────────────────────────────────────────────────────────┘

                        ↓
              (Building has deceased NPC)
                        ↓

┌──────────────────────────────────────────────────────────┐
│              MOURNING MERCHANT (Day 1-7)                  │
│                                                           │
│          👤  Robe: #1a1a1a (near-black)                  │
│         ╱│╲  Accent: #3a3a3a (dark charcoal)             │
│        ╱ │ ╲ Turban: #4a3f35 (unchanged)                 │
│          │                                                │
│         ╱╲                                                │
└──────────────────────────────────────────────────────────┘

                        ↓
                   (Day 7-14)
                        ↓

┌──────────────────────────────────────────────────────────┐
│          PARTIAL MOURNING (Fading to Normal)              │
│                                                           │
│          👤  Robe: #3a2f28 (dark brown)                  │
│         ╱│╲  Accent: #6a5a4a (muted tan)                 │
│        ╱ │ ╲ Colors gradually lighten                    │
│          │    as mourning period ends                    │
│         ╱╲                                                │
└──────────────────────────────────────────────────────────┘
```

---

## Protective Accessories Visual

### Prayer Beads (Tasbih)

```
        👤  NPC with HIGH awareness (>40)
       ╱│╲
      ╱ │ ╲
        │
       ╱╲

    Waist level →  ◯ Small torus geometry
                      (0.05 radius, brown)
                      Hangs at position [0.3, 0.9, 0.1]
```

### Protective Amulet

```
        👤  NPC with VERY HIGH awareness (>60)
       ╱│╲
      ╱ │ ╲
   Chest→ ▭  Small box (0.08 × 0.08 × 0.02)
        │     Leather color #8b7355
       ╱╲     Position [0, 1.1, 0.25]
```

### Perfumed Cloth (Wealthy NPCs)

```
        👤  MERCHANT/NOBILITY in infected building
       ╱│╲
      ╱ │ ╲
        │
  Hand→ ▬   Held item (replace staff/ledger)
       ╱╲    White/cream cloth held to face
             Indicates miasma protection
```

---

## Scene Composition Example

```
                        🌙 (glowing red)    🌙 (glowing dark red)
                         │                   │
                         │                   │
          ┌──────────┐   │   ┌──────────┐   │
          │          │   ▼   │          │   ▼
          │ HEALTHY  │       │ INFECTED │       │ DECEASED │
          │ BUILDING │       │ BUILDING │       │ BUILDING │
          └──────────┘       └──────────┘       └──────────┘
               │                   │                   │
               ▼                   ▼                   ▼
            👤 NPC              👤 NPC              👤 NPC
         Normal colors       Normal colors      BLACK mourning
         No accessories      + Prayer beads     + Amulet
         Regular behavior    Worried            Somber
```

---

## Distance Culling Visualization

```
                        PLAYER POSITION
                              ☻
                              │
                              │ 100 unit radius
                       ┌──────┼──────┐
                       │      │      │
    Outside culling →  │   🌙 │ 🌙   │  ← Visible markers
                       │      │      │    (rendered)
                       └──────┴──────┘
                              │
    🌙                        │                      🌙
    ↑                         │                      ↑
    Not rendered          Player view            Not rendered
    (too far)                                    (too far)


Performance: Only ~20 markers rendered at once
             vs. potentially 100+ infected buildings citywide
```

---

## Color Palette Reference

### Marker Colors
```
INFECTED:    #cc0000  ████  Bright red (active)
DECEASED:    #8a0000  ████  Dark red/burgundy (somber)
GLOW:        #ff0000  ████  Pure red emissive

Pulse range: 0.5 → 1.0 → 0.5 (emissiveIntensity)
```

### Mourning Colors
```
FULL MOURNING:
  Base:      #1a1a1a  ████  Near-black
  Accent:    #3a3a3a  ████  Dark charcoal

EXAMPLE TRANSITIONS:
  Original:  #7a5a42  ████  Warm brown merchant robe
     ↓ (intensity 1.0)
  Day 1-7:   #1a1a1a  ████  Full mourning black
     ↓ (intensity 0.5)
  Day 7-10:  #3a2f28  ████  Dark brown (lerp 50%)
     ↓ (intensity 0.2)
  Day 10-14: #5a4a38  ████  Darkened original
     ↓ (intensity 0.0)
  Day 14+:   #7a5a42  ████  Back to normal
```

### Accessory Colors
```
Prayer beads:    #2a1810  ████  Dark wood/leather
Amulet:          #8b7355  ████  Tanned leather
Perfumed cloth:  #e8e8e0  ████  Off-white linen
```

---

## Implementation Priorities

### Must-Have (Week 1)
1. ✅ Floating crescent markers
2. ✅ Mourning color transitions
3. ✅ Distance culling (100 units)
4. ✅ Bob + pulse animations

### Should-Have (Week 2)
5. ☐ Protective accessories rendering
6. ☐ Different colors for infected vs. deceased
7. ☐ Prayer beads geometry
8. ☐ Mourning fade over time

### Nice-to-Have (Week 3+)
9. ☐ Bloom post-processing on markers
10. ☐ Sound effects near infected buildings
11. ☐ Minimap integration
12. ☐ Smoke particles from deceased buildings

---

## Technical Notes

**Crescent Geometry**:
- Uses `THREE.ExtrudeGeometry` for 3D depth
- Shape created from two arcs (outer - inner)
- Bevel for smooth edges
- ~40 vertices total (very cheap)

**Material Settings**:
```typescript
new THREE.MeshStandardMaterial({
  color: '#cc0000',           // Base diffuse color
  emissive: '#ff0000',        // Glow color
  emissiveIntensity: 0.8,     // Animated 0.5-1.0
  roughness: 0.3,             // Slight shine
  metalness: 0.1,             // Not metal
  toneMapped: false,          // Preserve bright glow
})
```

**Animation Performance**:
- Bob: Simple sine wave, 1 vector update per marker
- Pulse: Material property update, 1 float per marker
- Total: ~4 ops per marker per frame = 80 ops for 20 markers
- Cost: <0.5ms on modern GPU

**Memory Footprint**:
- Geometry: Shared instance (40 verts × 4 bytes = 160 bytes)
- Material: One per marker (negligible)
- Transform: 16 floats per marker = 64 bytes
- Total: ~100 bytes per marker × 30 markers = 3KB

**Render Cost**:
- Draw calls: 1 per marker (could batch with instancing)
- Triangles: ~40 per marker × 20 visible = 800 triangles
- Texture samples: 0 (solid color)
- Shader complexity: Low (standard material)

---

## Alternative Designs Comparison

| Design | Triangles | Draw Calls | Visual Impact | Cultural Fit | Recommendation |
|--------|-----------|------------|---------------|--------------|----------------|
| **Crescent** | 40 | 1 | High | Excellent | ⭐ **BEST** |
| Billboard | 2 | 1 | Medium | Good | Fallback |
| Particle Ring | 0 | 1 | Very High | Poor | Avoid |
| Light Beam | 16 | 1 | Very High | Poor | Avoid |
| Floating Orb | 32 | 1 | Medium | Poor | Avoid |

**Winner**: Red Crescent - Best balance of performance, visual appeal, and historical appropriateness.
