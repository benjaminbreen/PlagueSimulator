import { DistrictType, EventDefinition } from '../../types';

export const EVENT_CATALOG: EventDefinition[] = [
  {
    id: 'npc_dismissed_player',
    title: 'Conversation Ended',
    body: 'They have made clear they no longer wish to speak with you. Their expression is stern.',
    tags: ['conversation:dismissed'],
    options: [
      {
        id: 'walk_away',
        label: 'Walk away',
        outcomeText: 'You step back and let them go. Perhaps another time.',
        effects: [{ type: 'endConversation' }]
      },
      {
        id: 'insist_follow',
        label: 'Insist on following them',
        outcomeText: 'You pursue them. Their expression darkens with anger and fear.',
        effects: [{ type: 'worldFlag', key: 'insisted_after_dismissed', value: true }]
      }
    ]
  },
  {
    id: 'conversation_guard_warning',
    title: 'Guarded Warning',
    body: 'The other person stiffens and looks around, clearly unsettled by your words.',
    tags: ['conversation:threat'],
    options: [
      {
        id: 'back_off',
        label: 'Back off and apologize',
        effects: [{ type: 'endConversation' }]
      },
      {
        id: 'insist',
        label: 'Insist on your demand',
        effects: [{ type: 'worldFlag', key: 'escalated_threat', value: true }]
      },
      {
        id: 'leave',
        label: 'Leave without another word',
        effects: [{ type: 'endConversation' }]
      }
    ]
  },
  {
    id: 'event_district_market_first',
    title: 'Market Press',
    body: 'A spice seller calls out a new price as a child darts between baskets.',
    tags: ['district:market'],
    options: [
      {
        id: 'listen',
        label: 'Pause to listen',
        outcomeText: 'You catch the price and the seller’s keen glance.',
        effects: [{ type: 'worldFlag', key: 'heard_market_call', value: true }]
      },
      {
        id: 'ask',
        label: 'Ask about the price',
        outcomeText: 'The seller replies quickly and goes back to work.',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'move',
        label: 'Move on',
        outcomeText: 'You slip through the crowd without delay.',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_hovels_first',
    title: 'Thin Broth',
    body: 'Smoke and damp hang low. A family shares a thin broth by the doorway.',
    tags: ['district:hovels'],
    options: [
      {
        id: 'offer',
        label: 'Offer a small coin',
        effects: [{ type: 'playerStat', stat: 'currency', delta: -1 }]
      },
      {
        id: 'pray',
        label: 'Offer a brief prayer',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'leave',
        label: 'Move on quietly',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_wealthy_first',
    title: 'Measured Gaze',
    body: "A guard's eyes follow you for a moment longer than is polite.",
    tags: ['district:wealthy'],
    options: [
      {
        id: 'nod',
        label: 'Nod and pass on',
        effects: [{ type: 'worldFlag', key: 'nodded_guard', value: true }]
      },
      {
        id: 'avoid',
        label: 'Keep your distance',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_civic_first',
    title: 'Clerks at Work',
    body: 'Clerks hurry past with tablets and reed pens tucked behind their ears.',
    tags: ['district:civic'],
    options: [
      {
        id: 'ask',
        label: 'Ask for directions',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'observe',
        label: 'Observe from a distance',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_salhiyya_first',
    title: 'Cooler Air',
    body: 'Terraces and gardens soften the heat. You smell damp earth and mint.',
    tags: ['district:salhiyya'],
    options: [
      {
        id: 'pause',
        label: 'Pause for a breath',
        effects: [{ type: 'worldFlag', key: 'rested_in_salhiyya', value: true }]
      },
      {
        id: 'continue',
        label: 'Continue on',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_umayyad_first',
    title: 'Courtyard Hush',
    body: 'The courtyard is quiet; sandals line the edge and soft steps echo.',
    tags: ['district:umayyad'],
    options: [
      {
        id: 'lower',
        label: 'Lower your voice',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'watch',
        label: 'Watch from a distance',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_umayyad_second',
    title: 'Water Offered',
    body: 'A caretaker offers a small cup of water without a word.',
    tags: ['district:umayyad'],
    options: [
      {
        id: 'accept',
        label: 'Accept the water',
        effects: [{ type: 'worldFlag', key: 'accepted_water', value: true }]
      },
      {
        id: 'decline',
        label: 'Decline politely',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_caravanserai_first',
    title: 'Arrivals',
    body: 'Bells and dust announce new arrivals. Pack animals shift and snort.',
    tags: ['district:caravanserai'],
    options: [
      {
        id: 'offer',
        label: 'Offer a hand',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'clear',
        label: 'Keep clear',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_desert_first',
    title: 'Desert Wind',
    body: 'Wind carries grit across your face and into your sleeves.',
    tags: ['district:desert'],
    options: [
      {
        id: 'wrap',
        label: 'Wrap your scarf tighter',
        effects: [{ type: 'worldFlag', key: 'wrapped_scarf', value: true }]
      },
      {
        id: 'press',
        label: 'Press on',
        effects: []
      }
    ]
  },
  {
    id: 'event_district_southern_road_first',
    title: 'Rutted Road',
    body: 'Wagon ruts cut deep grooves in the road, dusting your hems.',
    tags: ['district:southern_road'],
    options: [
      {
        id: 'wall',
        label: 'Walk close to the wall',
        effects: []
      },
      {
        id: 'center',
        label: 'Take the open track',
        effects: []
      }
    ]
  },
  {
    id: 'event_npc_astrologer_first',
    title: 'Tracing Stars',
    body: 'The astrologer traces a path across the sky and notices your gaze.',
    tags: ['npc:astrologer'],
    options: [
      {
        id: 'ask',
        label: 'Ask about an omen',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'nod',
        label: 'Nod and move on',
        effects: []
      }
    ]
  },
  {
    id: 'event_npc_astrologer_second',
    title: 'A Familiar Face',
    body: 'He seems to remember you, pausing his charting.',
    tags: ['npc:astrologer'],
    options: [
      {
        id: 'question',
        label: 'Ask a question',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'decline',
        label: 'Politely decline',
        effects: []
      }
    ]
  },
  {
    id: 'event_npc_scribe_first',
    title: 'Smudged Wax',
    body: 'A seal is pressed too soon; wax smudges the edge of the letter.',
    tags: ['npc:scribe'],
    options: [
      {
        id: 'offer',
        label: 'Offer help with the seal',
        outcomeText: 'He nods once and lets you hold the wax steady.',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'leave',
        label: 'Leave him to his work',
        outcomeText: 'You step aside; the scribe’s pen resumes its scratch.',
        effects: []
      }
    ]
  },
  {
    id: 'event_npc_snake_charmer_first',
    title: 'Flute Paused',
    body: 'The reed flute quiets. The snake lifts its head and sways.',
    tags: ['npc:snake_charmer'],
    options: [
      {
        id: 'watch',
        label: 'Watch a moment longer',
        effects: [{ type: 'worldFlag', key: 'watched_snake', value: true }]
      },
      {
        id: 'move',
        label: 'Move on',
        effects: []
      }
    ]
  },
  {
    id: 'event_interior_first_any',
    title: 'Indoor Shade',
    body: 'Cool shade and the scent of hearth smoke replace the street heat.',
    tags: ['interior:first'],
    options: [
      {
        id: 'respect',
        label: 'Move with respect',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'observe',
        label: 'Look around quietly',
        effects: []
      }
    ]
  },
  {
    id: 'event_interior_first_religious',
    title: 'Quiet Threshold',
    body: 'Incense lingers and the room is spare, set aside for prayer.',
    tags: ['interior:religious'],
    options: [
      {
        id: 'bow',
        label: 'Lower your head',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'stand',
        label: 'Stand quietly',
        effects: []
      }
    ]
  },
  {
    id: 'event_interior_first_civic',
    title: 'Quiet Ledger',
    body: 'A clerk looks up from a ledger, then returns to his work.',
    tags: ['interior:civic'],
    options: [
      {
        id: 'ask',
        label: 'Ask for assistance',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'wait',
        label: 'Wait silently',
        effects: []
      }
    ]
  },
  {
    id: 'event_interior_first_wealthy',
    title: 'Soft Carpets',
    body: 'Carved wood and soft carpets soften your footsteps.',
    tags: ['interior:wealthy'],
    options: [
      {
        id: 'remove',
        label: 'Remove your sandals',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'keep',
        label: 'Keep them on',
        effects: []
      }
    ]
  },
  {
    id: 'event_merchant_first_trade',
    title: 'Measured Words',
    body: 'The merchant weighs your words before your coin.',
    tags: ['merchant:first'],
    options: [
      {
        id: 'ask',
        label: 'Ask for a fair price',
        outcomeText: 'He leans in, considering your request.',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: 1 }]
      },
      {
        id: 'accept',
        label: 'Accept the first offer',
        outcomeText: 'The merchant seems pleased by your haste.',
        effects: []
      }
    ]
  },
  {
    id: 'event_merchant_second_trade',
    title: 'Recognized',
    body: 'He remembers you and watches your hands closely.',
    tags: ['merchant:second'],
    options: [
      {
        id: 'discount',
        label: 'Ask for a small discount',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: -1 }]
      },
      {
        id: 'nod',
        label: 'Nod and proceed',
        effects: []
      }
    ]
  },
  {
    id: 'conversation_summon_market_authority',
    title: 'Summons the Market Inspector',
    body: 'The merchant steps back and calls for the muhtasib. A nearby guard turns toward you.',
    tags: ['conversation:authority', 'biome:marketplace'],
    options: [
      {
        id: 'back_off',
        label: 'Back off and leave',
        outcomeText: 'You slip away before the muhtasib arrives.',
        effects: [{ type: 'endConversation' }]
      },
      {
        id: 'bribe',
        label: 'Offer a bribe',
        outcomeText: 'The guard hesitates, then accepts without a word.',
        effects: [{ type: 'playerStat', stat: 'currency', delta: -3 }]
      },
      {
        id: 'flee',
        label: 'Flee into the crowd',
        outcomeText: 'You disappear into the press, but quick footsteps follow.',
        followupEventId: 'event_pursuit_alley',
        effects: [{ type: 'triggerEvent', eventId: 'event_pursuit_alley' }]
      }
    ]
  },
  {
    id: 'conversation_summon_household_guard',
    title: 'Household Guard Approaches',
    body: 'A servant hurries away. Moments later, a household guard steps in, hand on his belt.',
    tags: ['conversation:authority', 'biome:wealthy'],
    options: [
      {
        id: 'apologize',
        label: 'Apologize and withdraw',
        effects: [{ type: 'endConversation' }]
      },
      {
        id: 'plead',
        label: 'Plead your case',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: -1 }]
      },
      {
        id: 'run',
        label: 'Run',
        effects: [{ type: 'worldFlag', key: 'fled_household_guard', value: true }]
      }
    ]
  },
  {
    id: 'conversation_summon_watch',
    title: 'The Watch Takes Notice',
    body: 'Your raised voice draws attention. A watchman nearby watches your every move.',
    tags: ['conversation:authority'],
    options: [
      {
        id: 'leave',
        label: 'Leave at once',
        effects: [{ type: 'endConversation' }]
      },
      {
        id: 'explain',
        label: 'Explain yourself',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: -1 }]
      },
      {
        id: 'linger',
        label: 'Linger a moment longer',
        effects: [{ type: 'worldFlag', key: 'ignored_watch', value: true }]
      }
    ]
  },
  {
    id: 'event_pursuit_alley',
    title: 'Pursuit in the Alleys',
    body: 'Footsteps echo behind you. The crowd presses close, and narrow turns appear ahead.',
    tags: ['followup:pursuit'],
    options: [
      {
        id: 'hide',
        label: 'Slip into a doorway and hide',
        outcomeText: 'You wait in shadow until the footsteps fade.',
        effects: [{ type: 'worldFlag', key: 'hid_from_pursuit', value: true }]
      },
      {
        id: 'run',
        label: 'Run hard and do not look back',
        outcomeText: 'You outpace the pursuit, breath burning in your chest.',
        effects: [{ type: 'worldFlag', key: 'escaped_pursuit', value: true }]
      },
      {
        id: 'stop',
        label: 'Stop and surrender',
        outcomeText: 'You raise your hands and the shouting stops.',
        effects: [{ type: 'worldFlag', key: 'surrendered', value: true }]
      }
    ]
  },
  {
    id: 'market_lost_purse',
    title: 'Lost Purse',
    body: 'A small leather purse lies under a stall, the string freshly snapped.',
    tags: ['biome:marketplace'],
    options: [
      {
        id: 'return',
        label: 'Return it to the nearest merchant',
        effects: [
          { type: 'playerStat', stat: 'piety', delta: 1 },
          { type: 'playerStat', stat: 'reputation', delta: 2 }
        ]
      },
      {
        id: 'keep',
        label: 'Keep it',
        effects: [
          { type: 'playerStat', stat: 'currency', delta: 5 },
          { type: 'playerStat', stat: 'wealth', delta: 2 }
        ]
      },
      {
        id: 'ask',
        label: 'Ask around first',
        effects: [{ type: 'worldFlag', key: 'asked_about_purse', value: true }]
      }
    ]
  },
  {
    id: 'market_injured_kitten',
    title: 'Injured Kitten',
    body: 'A kitten limps between baskets, one paw raw from the stones.',
    tags: ['biome:marketplace'],
    options: [
      {
        id: 'carry',
        label: 'Carry it aside and offer scraps',
        effects: [
          { type: 'playerStat', stat: 'piety', delta: 1 },
          { type: 'playerStat', stat: 'reputation', delta: 1 }
        ]
      },
      {
        id: 'ignore',
        label: 'Ignore and move on',
        effects: [{ type: 'playerStat', stat: 'reputation', delta: -1 }]
      },
      {
        id: 'water',
        label: 'Ask a vendor for water',
        effects: [
          { type: 'worldFlag', key: 'kitten_helped', value: true },
          { type: 'playerStat', stat: 'reputation', delta: 1 }
        ]
      }
    ]
  },
  {
    id: 'market_tainted_scales',
    title: 'Tainted Scales',
    body: "A vendor's scales wobble oddly; a bystander whispers about cheating.",
    tags: ['biome:marketplace'],
    options: [
      {
        id: 'confront',
        label: 'Confront the vendor',
        effects: [{ type: 'playerStat', stat: 'charisma', delta: -1 }]
      },
      {
        id: 'alert',
        label: 'Alert a market inspector',
        effects: [{ type: 'worldFlag', key: 'reported_scales', value: true }]
      },
      {
        id: 'silence',
        label: 'Say nothing',
        effects: []
      }
    ]
  },
  {
    id: 'wealthy_stray_falcon',
    title: 'Stray Falcon',
    body: 'A hooded falcon sits on a low wall, jesses tangled, restless.',
    tags: ['biome:wealthy'],
    options: [
      {
        id: 'free',
        label: 'Free it and let it fly',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'guard',
        label: 'Carry it to a guard',
        effects: [{ type: 'worldFlag', key: 'returned_falcon', value: true }]
      },
      {
        id: 'leave',
        label: 'Leave it alone',
        effects: []
      }
    ]
  },
  {
    id: 'wealthy_fountain_offerings',
    title: 'Fountain Offerings',
    body: 'Coins glint in a shallow fountain, offered for blessing or luck.',
    tags: ['biome:wealthy'],
    options: [
      {
        id: 'offer',
        label: 'Add a coin and whisper a prayer',
        effects: [{ type: 'playerStat', stat: 'currency', delta: -1 }]
      },
      {
        id: 'take',
        label: 'Take a coin',
        effects: [{ type: 'playerStat', stat: 'currency', delta: 1 }]
      },
      {
        id: 'pass',
        label: 'Walk past',
        effects: []
      }
    ]
  },
  {
    id: 'hovels_broken_jar',
    title: 'Broken Water Jar',
    body: 'A cracked jar spills precious water into the dust, a child staring in shock.',
    tags: ['biome:hovels'],
    options: [
      {
        id: 'share',
        label: 'Share water',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'patch',
        label: 'Help patch the jar',
        effects: [{ type: 'worldFlag', key: 'patched_jar', value: true }]
      },
      {
        id: 'move',
        label: 'Move on quickly',
        effects: []
      }
    ]
  },
  {
    id: 'hovels_rat_bite',
    title: 'Rat Bite',
    body: 'A rat skitters from a heap of refuse and bites your ankle before vanishing.',
    tags: ['biome:hovels'],
    options: [
      {
        id: 'wash',
        label: 'Wash the wound',
        effects: [
          { type: 'worldFlag', key: 'rat_bite_washed', value: true },
          { type: 'playerStat', stat: 'health', delta: 1 }
        ]
      },
      {
        id: 'bind',
        label: 'Bind it and keep moving',
        effects: [
          { type: 'worldFlag', key: 'rat_bite_bound', value: true },
          { type: 'playerStat', stat: 'health', delta: -2 }
        ]
      },
      {
        id: 'healer',
        label: 'Seek a healer',
        effects: [
          { type: 'worldFlag', key: 'sought_healer', value: true },
          { type: 'playerStat', stat: 'health', delta: 2 }
        ]
      }
    ]
  },
  {
    id: 'desert_bat_graze',
    title: 'Bat in the Ruins',
    body: 'A bat flutters from a crumbled wall and grazes your face as it passes.',
    tags: ['biome:desert'],
    options: [
      {
        id: 'ignore',
        label: 'Ignore it',
        effects: [{ type: 'playerStat', stat: 'health', delta: -3 }]
      },
      {
        id: 'clean',
        label: 'Clean your face and hands',
        effects: [
          { type: 'playerStat', stat: 'piety', delta: 1 },
          { type: 'playerStat', stat: 'health', delta: -1 }
        ]
      },
      {
        id: 'remedy',
        label: 'Ask locals for a remedy',
        effects: [
          { type: 'worldFlag', key: 'asked_remedy', value: true },
          { type: 'playerStat', stat: 'health', delta: 1 }
        ]
      }
    ]
  },
  {
    id: 'desert_lost_waterskin',
    title: 'Lost Waterskin',
    body: 'A half-buried waterskin lies in the sand, still cool to the touch.',
    tags: ['biome:desert'],
    options: [
      {
        id: 'keep',
        label: 'Keep it',
        effects: [
          { type: 'playerStat', stat: 'currency', delta: 2 },
          { type: 'playerStat', stat: 'wealth', delta: 1 }
        ]
      },
      {
        id: 'owner',
        label: 'Look for its owner',
        effects: [
          { type: 'worldFlag', key: 'sought_owner', value: true },
          { type: 'playerStat', stat: 'reputation', delta: 1 }
        ]
      },
      {
        id: 'empty',
        label: 'Empty it and move on',
        effects: []
      }
    ]
  },
  {
    id: 'civic_petition_scroll',
    title: 'Petitioner\'s Scroll',
    body: 'A folded petition lies by the steps, its seal broken, ink still fresh.',
    tags: ['biome:civic'],
    options: [
      {
        id: 'deliver',
        label: 'Deliver it to a scribe',
        effects: [{ type: 'playerStat', stat: 'piety', delta: 1 }]
      },
      {
        id: 'read',
        label: 'Read it',
        effects: [{ type: 'worldFlag', key: 'read_petition', value: true }]
      },
      {
        id: 'leave',
        label: 'Leave it untouched',
        effects: []
      }
    ]
  }
];

export function getEventsForBiome(biome: string): EventDefinition[] {
  return EVENT_CATALOG.filter(event => event.tags?.includes(`biome:${biome}`));
}

export function getEventById(eventId: string): EventDefinition | undefined {
  return EVENT_CATALOG.find(event => event.id === eventId);
}
