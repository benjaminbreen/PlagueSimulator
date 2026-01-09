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
    ],
    STRAIGHT_STREET: [
      'Shopkeepers open their doors along the ancient colonnade.',
      'The street fills with traders and clerks moving between shops.',
      'Business is brisk along the straight thoroughfare.',
      'The colonnades provide welcome shade from the midday sun.',
      'Afternoon trade resumes with renewed vigor.',
      'Merchants begin closing their stalls as evening approaches.',
      'Only a few lanterns light the long straight way.',
      'Early merchants prepare for another day of trade.'
    ],
    SOUQ_AXIS: [
      'The covered bazaar comes alive with the first merchants.',
      'Shoppers crowd the narrow lanes between stalls.',
      'The souq hums with haggling and commerce.',
      'Even in the shade, the heat slows the pace of trade.',
      'Business picks up as the afternoon cools.',
      'Merchants pack away their finest wares.',
      'The covered market is dim and quiet.',
      'Early vendors arrange their goods in the dark.'
    ],
    MIDAN: [
      'Caravans gather near the southern gate for departure.',
      'Handlers load goods onto patient camels and donkeys.',
      'The gate road is busy with arriving and departing travelers.',
      'The midday heat stills the caravan traffic.',
      'Late afternoon brings a flurry of preparation.',
      'The last caravans depart before nightfall.',
      'Guards patrol the quiet gate road.',
      'Early caravans prepare for the journey south.'
    ],
    BAB_SHARQI: [
      'The eastern gate opens to early travelers.',
      'Merchants from the Christian quarter begin their day.',
      'Trade flows through the ancient gate.',
      'The heat quiets the gate traffic.',
      'Afternoon brings renewed movement.',
      'The gate prepares to close for the night.',
      'Guards watch over the quiet eastern approach.',
      'Early travelers wait for the gate to open.'
    ],
    CEMETERY: [
      'Mourners gather in the quiet of early morning.',
      'A few visitors tend to family graves.',
      'The cemetery sees occasional visitors with offerings.',
      'The graves lie still under the hot sun.',
      'A few late visitors pay their respects.',
      'The cemetery grows quiet as evening falls.',
      'Only the watchmen remain among the tombs.',
      'The cemetery is silent before dawn.'
    ],
    OUTSKIRTS_SCRUBLAND: [
      'Shepherds lead their flocks toward sparse grazing.',
      'A few travelers pass along the dusty paths.',
      'The scrubland is quiet but for distant calls.',
      'The heat shimmers over the rocky ground.',
      'Shepherds begin to gather their flocks.',
      'The last travelers hurry toward shelter.',
      'Only wind moves through the scrub.',
      'The scrubland is still before dawn.'
    ],
    ROADSIDE: [
      'Roadside vendors prepare their simple stalls.',
      'Travelers stop briefly for water and rest.',
      'The settlement sees steady passing traffic.',
      'The heat empties the roadside of activity.',
      'Traffic resumes as the day cools.',
      'Vendors pack away their goods.',
      'Only a few lights mark the roadside dwellings.',
      'Early travelers stir in the settlement.'
    ],
    QAYMARIYYA: [
      'The wealthy quarter awakens with quiet elegance.',
      'Servants cross between grand houses on errands.',
      'The quarter maintains its refined composure.',
      'Shutters close against the midday heat.',
      'Afternoon visits resume among the notable families.',
      'Lamps are lit in ornate doorways.',
      'The quarter is still under watchful guards.',
      'Early servants prepare the great houses.'
    ],
    AMARA: [
      'The residential quarter stirs with morning routines.',
      'Neighbors exchange greetings on their way to work.',
      'The streets are busy with daily errands.',
      'The heat drives residents indoors.',
      'Children return from their lessons.',
      'Families gather for the evening meal.',
      'The quarter settles into peaceful darkness.',
      'Early risers begin their preparations.'
    ],
    QUBAYBAT: [
      'The domed tombs stand quiet in the morning light.',
      'Visitors come to honor the departed.',
      'The tombs area sees occasional pilgrims.',
      'The domes shimmer in the heat.',
      'A few late visitors arrive.',
      'The tombs fall silent as evening comes.',
      'Only caretakers remain among the little domes.',
      'The tombs are silent before dawn.'
    ],
    QANAWAT: [
      'Water flows through the ancient canals.',
      'Workers maintain the irrigation channels.',
      'The district is alive with the sound of water.',
      'The canals provide some respite from the heat.',
      'Afternoon work resumes along the waterways.',
      'The canal district grows quiet.',
      'Only the sound of flowing water remains.',
      'Early workers check the water levels.'
    ],
    SHAGHOUR_OUTER: [
      'The outer suburb awakens slowly.',
      'Workers head toward the city for labor.',
      'The crowded lanes buzz with activity.',
      'The heat intensifies in the cramped streets.',
      'Workers return tired from the city.',
      'Families gather in small courtyards.',
      'The suburb grows dark and quiet.',
      'Early workers prepare for another day.'
    ],
    AMIN: [
      'The eastern quarter begins its day.',
      'Craftsmen open their workshops.',
      'The streets fill with local trade.',
      'The heat slows the pace of work.',
      'Afternoon business resumes.',
      'Workshops close as evening approaches.',
      'The quarter settles into quiet.',
      'Early craftsmen prepare their tools.'
    ],
    LOWER_SALHIYYA: [
      'The lower slopes come alive with morning activity.',
      'Residents climb the paths to upper districts.',
      'Trade flows between the hillside and city.',
      'The slopes grow quiet in the heat.',
      'Movement resumes on the terraced paths.',
      'Evening light catches the hillside homes.',
      'Lamps dot the slopes.',
      'Early movement begins on the lower paths.'
    ],
    BAB_FARADIS: [
      'The Paradise Gate district awakens.',
      'Travelers pass through toward the northern orchards.',
      'The gate area bustles with commerce.',
      'The heat quiets the gate traffic.',
      'Afternoon brings renewed activity.',
      'The gate prepares for night.',
      'Guards watch the northern approach.',
      'Early travelers gather at the gate.'
    ],
    RABWE: [
      'The river gorge is cool and peaceful.',
      'Gardens along the Barada come alive.',
      'Workers tend the riverside orchards.',
      'The gorge provides relief from the heat.',
      'Afternoon work continues in the gardens.',
      'The gorge grows quiet as light fades.',
      'Only the river breaks the silence.',
      'Early gardeners begin their work.'
    ],
    UQAYBA: [
      'The northern suburb stirs quietly.',
      'Residents head toward the city.',
      'The suburb maintains its steady rhythm.',
      'The heat slows the pace of life.',
      'Residents return from their labors.',
      'The suburb settles for the evening.',
      'Quiet darkness falls over the homes.',
      'Early movement begins in the suburb.'
    ],
    DARAYA_ROAD: [
      'Travelers begin the journey toward Daraya.',
      'Carts loaded with goods head toward the village.',
      'The road sees steady traffic.',
      'The heat shimmers over the road.',
      'Afternoon travelers make their way.',
      'The road empties as darkness approaches.',
      'Only distant lights mark the way.',
      'Early travelers set out on the road.'
    ],
    JABIYA_ROAD: [
      'The western road comes alive with morning traffic.',
      'Caravans approach from the west.',
      'Trade flows along the ancient route.',
      'The heat quiets the road.',
      'Afternoon caravans arrive.',
      'The road grows quiet as night falls.',
      'Guards patrol the western approach.',
      'Early caravans prepare for departure.'
    ],
    QASSIOUN_CAVES: [
      'The sacred caves are still in the early light.',
      'Pilgrims begin the climb to the holy sites.',
      'Prayers echo softly in the mountain air.',
      'The caves provide cool refuge.',
      'A few devoted visitors remain.',
      'The last pilgrims descend the mountain.',
      'The caves are dark and sacred.',
      'Only wind whispers among the rocks.'
    ],
    NORTH_GHOUTA: [
      'Farmers tend the irrigated orchards.',
      'The rich soil yields abundant produce.',
      'Workers carry baskets toward the city.',
      'The orchards provide shade from the heat.',
      'Afternoon harvesting continues.',
      'Workers head home as light fades.',
      'The orchards are still and fragrant.',
      'Early farmers begin their work.'
    ],
    SOUTH_GHOUTA: [
      'The southern orchards come alive.',
      'Apricot and olive trees are tended carefully.',
      'Produce is loaded for the city markets.',
      'The groves provide welcome shade.',
      'Afternoon labor continues.',
      'Workers return to their villages.',
      'The orchards grow dark and still.',
      'Early workers arrive in the groves.'
    ],
    EAST_GHOUTA: [
      'The eastern orchards stretch toward the desert.',
      'Farmers work the last irrigated fields.',
      'The contrast of green and sand is stark.',
      'Heat rises from both orchard and desert.',
      'Afternoon work continues where water flows.',
      'The orchards quiet as night approaches.',
      'Stars appear over the eastern groves.',
      'Early farmers tend the precious water.'
    ]
  };

  const fallback = 'The city holds its breath, uncertain what the next hour will bring.';
  const timeText = timeSlices[bucket] ?? timeSlices[0];
  const districtText = districtSlices[district]?.[bucket];
  return `${timeText} ${districtText ?? fallback}`;
};
