import { DistrictType } from '../types';

export const getNarratorTextForDistrict = (district: DistrictType, timeOfDay: number) => {
  const bucket = Math.max(0, Math.min(7, Math.floor(timeOfDay / 3)));
  const timeSlices = [
    'At dawn, the city stirs with careful routines and a quiet sense of purpose.',
    'This morning, the streets are active but orderly, with small groups clustering at key points.',
    'By late morning, trade and errands are in full motion across the district.',
    'At midday, the pace slows as heat gathers and people seek shade.',
    'In the afternoon, traffic resumes in waves, with brief bursts of activity.',
    'By early evening, the flow thins and conversations shift to domestic matters.',
    'At night, lanterns glow and only essential movement continues.',
    'Before sunrise, the city is still, with only watchmen and early risers abroad.'
  ];

  const districtSlices: Record<DistrictType, string[]> = {
    MARKET: [
      'Merchants open their stalls and sort produce into neat stacks.',
      'The marketplace is less crowded than usual, though clusters remain at the fountain.',
      'Buyers move through the lanes, pausing to haggle over spices and cloth.',
      'The heat drives people to the shaded arcades, and trade slows.',
      'Porters return, and a few late bargains are struck.',
      'Stalls close in sequence; shopkeepers settle accounts with quiet care.',
      'Only guards and late vendors remain, packing away their goods.',
      'A handful of workers prepare for the day, sweeping and arranging stands.'
    ],
    WEALTHY: [
      'Courtyards are swept and water jugs refilled before the day grows hot.',
      'Servants pass with covered trays and bundles of fine textiles.',
      'Visitors arrive in pairs; conversation stays low and measured.',
      'The quarter is quiet, with shutters drawn against the sun.',
      'A few retainers move between houses with sealed messages.',
      'Lamps are lit along entryways as households settle in.',
      'The streets are nearly empty, guarded by a few watchmen.',
      'Only a few early households show signs of activity.'
    ],
    HOVELS: [
      'Families share small hearths while the morning air remains cool.',
      'Water carriers and neighbors gather at cisterns to trade news.',
      'Children weave through the lanes as work begins.',
      'The narrow alleys empty as heat drives people indoors.',
      'Neighbors return with bundles of fuel and food.',
      'Doorways fill with quiet talk before dusk.',
      'The quarter is dark, with only a few lanterns and watchmen.',
      'Early movement begins as people prepare for the day.'
    ],
    CIVIC: [
      'Scribes arrive and unroll documents in the civic halls.',
      'Petitions are queued and attendants direct people to the proper desks.',
      'Clerks move between chambers with registers and seals.',
      'The court slows as officials withdraw from the heat.',
      'Messages are carried out; a few late cases are heard.',
      'Offices close in order, and guards take position.',
      'Only patrols remain near the main doors.',
      'A handful of officials prepare the halls for the day.'
    ],
    RESIDENTIAL: [
      'Households wake to sweep thresholds and tend small courtyards.',
      'Neighbors exchange brief greetings and errands begin.',
      'Workmen and apprentices pass through in steady lines.',
      'The heat empties the streets for a time.',
      'Residents return with small purchases and water jars.',
      'The quarter quiets as dinner preparations begin.',
      'Lanterns appear along doorways, and the lanes grow still.',
      'Early movement begins as people ready for another day.'
    ],
    ALLEYS: [
      'The alleys are quiet, with only a few steps echoing.',
      'Vendors cut through the lanes on their way to the market.',
      'Shortcuts fill with foot traffic and whispered exchanges.',
      'The passages empty under the midday sun.',
      'The alleys see brief bursts of movement between districts.',
      'Shadows lengthen and the footfalls soften.',
      'The lanes darken, with only the occasional patrol.',
      'A few early travelers move through in silence.'
    ],
    JEWISH_QUARTER: [
      'Synagogue courtyards open and neighbors gather quietly.',
      'Merchants arrange goods specific to the quarter.',
      'Trade picks up along narrow streets and small shops.',
      'The quarter grows quiet during the hottest hour.',
      'Families return with small bundles and water jars.',
      'The lanes settle as homes prepare the evening meal.',
      'Only a few lamps and watchmen remain visible.',
      'Early movement begins near the synagogue and shops.'
    ],
    CHRISTIAN_QUARTER: [
      'Church courtyards open and neighbors pass in small groups.',
      'Workshops open and small trade resumes along the street.',
      'Apprentices carry supplies between homes and shops.',
      'The quarter quiets under the midday sun.',
      'Streets refill as errands resume.',
      'Lamps are lit and the pace eases toward evening.',
      'Only a few lights and patrols remain.',
      'Early movement begins around the churches.'
    ],
    UMAYYAD_MOSQUE: [
      'The courtyard is swept and a few early worshippers arrive.',
      'Visitors cross the courtyard in steady, quiet lines.',
      'Clerics and students gather near the colonnades.',
      'The sun drives movement into the shaded arcades.',
      'The crowd thins as the heat recedes.',
      'Evening prayer draws a small, orderly gathering.',
      'The courtyard is dim and nearly empty.',
      'Only a few early figures cross the stone.'
    ],
    SALHIYYA: [
      'The hillside quarter stirs with small groups and quiet movement.',
      'Water carriers climb the lanes toward upper homes.',
      'Travelers pass between shops and hillside dwellings.',
      'The slopes quiet as the heat builds.',
      'Movement resumes in short bursts along the stairways.',
      'The hillside grows calm as evening arrives.',
      'Only a few lanterns mark the paths.',
      'Early activity begins along the lower slopes.'
    ],
    OUTSKIRTS_FARMLAND: [
      'Farmers move among the orchards and irrigation channels.',
      'Field work begins in earnest as the day warms.',
      'Workers carry baskets toward the city road.',
      'The fields grow quiet in the heat.',
      'Work resumes near the irrigation ditches.',
      'Carts return toward the city as the light fades.',
      'Only a few watchfires and distant voices remain.',
      'Early movement begins along the grove paths.'
    ],
    OUTSKIRTS_DESERT: [
      'The outskirts are cool and still at first light.',
      'A few travelers move along the edge of the road.',
      'The sun sharpens the landscape and movement slows.',
      'The desert edge grows harsh and quiet at midday.',
      'A few riders appear in the distance.',
      'Travelers seek shelter as the light fades.',
      'Only wind and distant patrols break the silence.',
      'The horizon is still before dawn.'
    ],
    CARAVANSERAI: [
      'Caravan animals are watered and feed is laid out.',
      'Merchants check loads and prepare for travel.',
      'Trade resumes around the courtyard with quiet negotiation.',
      'The compound slows in the heat, with animals resting.',
      'Activity resumes as supplies are counted.',
      'Travelers secure gear and settle in for the night.',
      'Only guards and late arrivals remain.',
      'Early activity begins at the stable doors.'
    ],
    MOUNTAIN_SHRINE: [
      'The shrine is quiet and nearly empty.',
      'A few pilgrims arrive with caretakers.',
      'Visits are brief and prayers are hushed.',
      'Visitors linger briefly on the warm stone.',
      'The path clears and the shrine grows still.',
      'The last visitors descend toward the city.',
      'The shrine is dark and silent.',
      'Only wind and distant calls reach this place.'
    ],
    SOUTHERN_ROAD: [
      'Only a few carts are in sight.',
      'Travelers head toward the city gates.',
      'Small caravans pass at a measured pace.',
      'Movement slows in the heat.',
      'Traffic returns in short intervals.',
      'Travelers seek shelter and the road empties.',
      'The road is dark with only watchmen nearby.',
      'Early travelers gather on the roadside.'
    ]
  };

  const fallback = 'The city holds its breath, uncertain what the next hour will bring.';
  const timeText = timeSlices[bucket] ?? timeSlices[0];
  const districtText = districtSlices[district]?.[bucket];
  return `${timeText} ${districtText ?? fallback}`;
};
