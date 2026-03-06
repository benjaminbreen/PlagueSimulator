import { AgentState, PlayerStats, PlagueType, SimulationStats, SocialClass } from '../types';
import { ConditionLogEntry, getPrimarySymptoms } from './condition';
import { getPlagueTypeLabel } from './plague';

export interface GameOverMetric {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'highlight';
}

export interface GameOverSummary {
  cause: 'plague' | 'fall';
  reason: string;
  description: string;
  dateLabel: string;
  locationLabel: string;
  districtLabel: string;
  periodView: string;
  historianView: string;
  remedyView: string;
  cityView: string;
  householdView: string;
  lessons: string[];
  metrics: GameOverMetric[];
  recentAttempts: ConditionLogEntry[];
}

interface BuildGameOverSummaryOptions {
  cause: 'plague' | 'fall';
  reason: string;
  description: string;
  player: PlayerStats;
  stats: SimulationStats;
  recentConditionLog: ConditionLogEntry[];
  locationLabel: string;
  districtLabel: string;
  infectedHouseholdsCount: number;
}

const formatHistoricalDate = (simTime: number) => {
  const startDate = new Date(1348, 5, 1);
  const currentDate = new Date(startDate.getTime() + simTime * 60 * 60 * 1000);
  return currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const cleanSymptomLabel = (label: string) => label.replace(/^[^A-Za-z]+/, '').trim();

const summarizePlagueType = (plagueType: PlagueType, symptoms: string[]) => {
  const symptomLine = symptoms.length > 0 ? ` In this run the dominant signs were ${symptoms.join(', ')}.` : '';
  switch (plagueType) {
    case PlagueType.BUBONIC:
      return `This was most consistent with bubonic plague: flea-borne infection marked by swelling, fever, and rapid weakness.${symptomLine}`;
    case PlagueType.PNEUMONIC:
      return `This was most consistent with pneumonic plague: a fast chest infection passed through close human contact, leaving little time for successful intervention.${symptomLine}`;
    case PlagueType.SEPTICEMIC:
      return `This was most consistent with septicemic plague: overwhelming infection of the blood with catastrophic progression and almost no meaningful medieval treatment.${symptomLine}`;
    default:
      return `This death occurred in the middle of a plague outbreak, even if the final mechanism was not uniquely diagnostic.${symptomLine}`;
  }
};

const getPeriodView = (player: PlayerStats) => {
  if (player.plague.state === AgentState.DECEASED) {
    if (player.plague.plagueType === PlagueType.PNEUMONIC) {
      return 'To people in Damascus in 1348, bloody coughing and collapse would have looked like pestilence entering the chest: a sign of corrupted air, divine trial, and a body thrown out of humoral balance.';
    }
    if (player.plague.plagueType === PlagueType.SEPTICEMIC) {
      return 'To contemporaries, dark bleeding and sudden collapse would have suggested total corruption of the blood, a calamity too fast for ordinary medicine to master.';
    }
    return 'To people around you in 1348, swellings, fever, and weakness would have signaled pestilence made visible: corrupted air, divine punishment, and humors slipping beyond control.';
  }

  if (player.plague.state === AgentState.INFECTED || player.plague.state === AgentState.INCUBATING) {
    return 'Contemporaries would have read this death as mischance in a city already under plague, while also seeing your weakened body as more vulnerable to sudden injury.';
  }

  return 'Contemporaries would have read this death as mischance or divine decree, but it still unfolded inside a city whose daily life had already been reshaped by plague.';
};

const getSocialContext = (socialClass: SocialClass) => {
  switch (socialClass) {
    case SocialClass.PEASANT:
      return 'As a poorer resident, you had less margin for delay, failed treatment, or missed work. Crowding and limited reserves made every bad turn more costly.';
    case SocialClass.MERCHANT:
      return 'As a middling urban resident, trade and movement increased exposure while money still bought some remedies, information, and temporary shelter.';
    case SocialClass.CLERGY:
      return 'Religious standing could bring trust and support, but it offered no immunity. Clerics died beside laborers and merchants in the same epidemic wave.';
    case SocialClass.NOBILITY:
      return 'Wealth could buy space, better food, and more treatment attempts, but plague crossed class lines. Privilege reduced risk unevenly; it did not erase it.';
    default:
      return 'Status shaped options, but not immunity.';
  }
};

const getDistrictContext = (districtLabel: string, infectedHouseholdsCount: number) => {
  const lower = districtLabel.toLowerCase();
  const householdLine = infectedHouseholdsCount > 0
    ? `${infectedHouseholdsCount} household${infectedHouseholdsCount === 1 ? '' : 's'} on this tile had already been marked by illness or death.`
    : 'Even where no household had yet been marked on this tile, the citywide wave was already pressing through homes and streets.';

  if (/market|souq|straight street|road|gate|caravan/.test(lower)) {
    return `This part of the city carried constant movement, crowding, and exchange. ${householdLine}`;
  }
  if (/cramped|alley|suburb|hovel/.test(lower)) {
    return `This quarter offered little space to withdraw and little insulation from neighbors. ${householdLine}`;
  }
  if (/wealthy|affluent|hillside|residential/.test(lower)) {
    return `This district offered more room and resources than the poorest lanes, but plague still crossed thresholds wealth could not fully seal. ${householdLine}`;
  }
  return `${householdLine}`;
};

const getHouseholdView = (player: PlayerStats) => {
  const familyCount = player.familyMembers?.length ?? 0;
  const deaths = player.familyMembers?.filter((member) => !member.alive).length ?? 0;

  if (familyCount === 0) {
    return 'Many Damascenes faced plague through dense household networks; even without named kin in this run, the home remained one of the main channels of exposure and care.';
  }
  if (deaths > 0) {
    return `${deaths} member${deaths === 1 ? '' : 's'} of your household had already died. In plague years, family care and family exposure were often the same thing.`;
  }
  return `Your household still mattered even without a recorded death in this run. In 1348, home was where care was improvised, where remedies were tried, and where infection often spread next.`;
};

const getRemedyNote = (titles: string[], plagueType: PlagueType, cause: 'plague' | 'fall') => {
  if (cause === 'fall' && titles.length === 0) {
    return 'This run ended in injury rather than treatment failure. The epidemic still matters historically, but no significant remedy attempt shaped the ending.';
  }

  const notes: string[] = [];
  const push = (text: string) => {
    if (!notes.includes(text)) notes.push(text);
  };

  if (titles.some((title) => /theriac/i.test(title))) {
    push('Theriac was famous as a universal antidote, but in plague it offered hope and occasional partial relief more often than cure.');
  }
  if (titles.some((title) => /opium/i.test(title))) {
    push('Opium could dull pain and panic, but it also left patients weaker and less able to endure crisis.');
  }
  if (titles.some((title) => /lancing/i.test(title))) {
    push('Lancing a mature bubo was one of the few medieval interventions that could sometimes help in bubonic cases, though it remained painful and risky.');
  }
  if (titles.some((title) => /bloodletting|cupping|leech|purging/i.test(title))) {
    push('Humoral procedures aimed to draw out corruption or restore balance, but they often weakened patients already close to collapse.');
  }
  if (titles.some((title) => /fumig|incense|frankincense|aromatic/i.test(title))) {
    push('Fumigation followed miasma logic: purify the air, ward off corruption. It may have changed behavior or comfort more than outcome once infection was established.');
  }
  if (titles.some((title) => /poultice|salve|balm|camphor|myrrh|rose water|mint|honey|oxymel/i.test(title))) {
    push('Local compounds and cooling remedies could soothe fever, swelling, or pain, but they rarely changed the basic course of plague.');
  }

  if (notes.length === 0) {
    if (plagueType === PlagueType.BUBONIC) {
      return 'Most medieval remedies in bubonic cases were palliative. Some drainage or local treatment might help a little, but there was no dependable cure.';
    }
    if (plagueType === PlagueType.PNEUMONIC) {
      return 'Pneumonic plague moved too quickly for most medieval remedies to matter beyond comfort, prayer, and desperate experimentation.';
    }
    if (plagueType === PlagueType.SEPTICEMIC) {
      return 'Septicemic plague usually outran treatment entirely. Medieval medicine had almost no chance to change the outcome once the blood was overwhelmed.';
    }
    return 'Most remedies in this world offered comfort, ritual meaning, or temporary relief rather than a reliable cure.';
  }

  return notes.slice(0, 2).join(' ');
};

const buildLessons = (player: PlayerStats, cause: 'plague' | 'fall') => {
  const classLesson = player.socialClass === SocialClass.PEASANT
    ? 'Poverty, crowding, and limited reserves made plague harder to survive.'
    : player.socialClass === SocialClass.NOBILITY
      ? 'Wealth could buy time and treatment attempts, but not immunity.'
      : 'Social position changed options and timing, even when it did not change the disease itself.';

  if (cause === 'fall') {
    return [
      'This run ended in injury, but it still unfolded inside an epidemic city where urgency and strain altered ordinary life.',
      'Medieval cities layered daily hazards on top of disease: rooftops, stairs, crowds, and narrow lanes all carried risk.',
      classLesson
    ];
  }

  return [
    'Plague spread through contact, mobility, and household proximity rather than personal virtue or rank alone.',
    'Most remedies in 1348 offered comfort, palliative relief, or hope; only a few procedures ever slightly improved odds in specific cases.',
    classLesson
  ];
};

export const buildGameOverSummary = ({
  cause,
  reason,
  description,
  player,
  stats,
  recentConditionLog,
  locationLabel,
  districtLabel,
  infectedHouseholdsCount
}: BuildGameOverSummaryOptions): GameOverSummary => {
  const recentAttempts = recentConditionLog
    .filter((entry) => entry.source !== 'plague')
    .slice(0, 3);
  const attemptTitles = recentAttempts.map((entry) => entry.title);
  const recentSymptoms = getPrimarySymptoms(player.plague).map(cleanSymptomLabel);
  const totalPopulation = stats.healthy + stats.incubating + stats.infected + stats.deceased;
  const deathRate = totalPopulation > 0 ? stats.deceased / totalPopulation : 0;
  const cityStage = deathRate >= 0.25
    ? 'The city was already deep in mass mortality.'
    : deathRate >= 0.1
      ? 'The outbreak had become severe and visible across many quarters.'
      : 'The wave was still building, but death was already established in the city.';
  const familyDeaths = player.familyMembers?.filter((member) => !member.alive).length ?? 0;

  let historianView = summarizePlagueType(player.plague.plagueType, recentSymptoms);
  if (cause === 'fall') {
    historianView = player.plague.state === AgentState.INFECTED || player.plague.state === AgentState.INCUBATING
      ? `This death was caused by blunt trauma from a fall, but the body was already compromised by illness. Weakness, fever, or confusion likely made such accidents more dangerous. ${summarizePlagueType(player.plague.plagueType, recentSymptoms)}`
      : 'This death was caused by blunt trauma from a fall rather than by plague itself. Even so, it occurred within an epidemic city whose stress and urgency changed ordinary patterns of movement and care.';
  }

  return {
    cause,
    reason,
    description,
    dateLabel: formatHistoricalDate(stats.simTime),
    locationLabel,
    districtLabel,
    periodView: getPeriodView(player),
    historianView,
    remedyView: getRemedyNote(attemptTitles, player.plague.plagueType, cause),
    cityView: `${cityStage} ${getDistrictContext(districtLabel, infectedHouseholdsCount)} ${getSocialContext(player.socialClass)}`,
    householdView: getHouseholdView(player),
    lessons: buildLessons(player, cause),
    metrics: [
      { label: 'City dead', value: `${stats.deceased}`, tone: 'danger' },
      { label: 'City ill', value: `${stats.infected + stats.incubating}`, tone: 'warning' },
      { label: 'Marked households', value: `${infectedHouseholdsCount}`, tone: infectedHouseholdsCount > 0 ? 'warning' : 'neutral' },
      { label: 'Family deaths', value: `${familyDeaths}`, tone: familyDeaths > 0 ? 'danger' : 'neutral' },
      { label: 'Remedies tried', value: `${recentAttempts.length}`, tone: recentAttempts.length > 0 ? 'highlight' : 'neutral' },
      { label: 'Plague type', value: cause === 'plague' || player.plague.state !== AgentState.HEALTHY ? getPlagueTypeLabel(player.plague.plagueType) : 'Not evident', tone: 'highlight' }
    ],
    recentAttempts
  };
};
