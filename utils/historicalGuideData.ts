// Historical Guide Encyclopedia Data
// Damascus, 1348 AD - Comprehensive reference for all religions, ethnicities, professions, etc.

import { GuideEntry } from '../components/HistoricalGuide/types';

// ============================================================================
// RELIGIONS (13 entries)
// ============================================================================

const RELIGION_ENTRIES: GuideEntry[] = [
  {
    id: 'sunni-islam',
    category: 'religions',
    title: 'Sunni Islam',
    subtitle: 'The Majority Faith',
    shortDescription: 'The dominant Islamic tradition in Damascus, followed by approximately 85% of the Muslim population.',
    fullDescription: `Sunni Islam represents the largest branch of Islam, distinguished by its acceptance of the first four caliphs as legitimate successors to the Prophet Muhammad. In 14th-century Damascus, Sunni Muslims comprised the overwhelming majority of the population.

The Sunni community in Damascus followed one of four recognized legal schools (madhabs): Shafi'i, Hanafi, Maliki, or Hanbali. The Shafi'i school was particularly prominent in Syria, though Hanafi jurisprudence also had strong representation, especially among Turkish-speaking officials.`,
    historicalContext: `Under Mamluk rule, Damascus served as a major center of Sunni Islamic scholarship. The city boasted numerous madrasas, including the famous Umayyad Mosque complex. The ulama (religious scholars) wielded significant social and political influence, serving as judges, teachers, and advisors to the ruling elite.`,
    inGameRelevance: `Sunni NPCs form the majority population. They observe the five daily prayers, fast during Ramadan, and may reference religious obligations in conversation. Their dress, greetings ("As-salamu alaykum"), and daily routines reflect Islamic practice.`,
    wikipediaSearchTerm: 'Sunni Islam',
    relatedEntries: ['shia-islam', 'imam', 'qadi', 'islamic-prayer'],
    tags: ['islam', 'majority', 'religion'],
  },
  {
    id: 'shia-islam',
    category: 'religions',
    title: 'Shia Islam',
    subtitle: 'The Minority Tradition',
    shortDescription: 'A significant Muslim minority believing in the succession of Ali ibn Abi Talib, comprising 5-8% of Damascus Muslims.',
    fullDescription: `Shia Islam holds that leadership of the Muslim community should have passed directly to Ali ibn Abi Talib, the Prophet's cousin and son-in-law, and his descendants. In medieval Damascus, Shia Muslims constituted a notable minority.

Shia communities maintained their own religious practices and commemorations, including mourning rituals for Hussein ibn Ali during Muharram. Despite theological differences with Sunnis, day-to-day relations were generally peaceful, though Shia often lived in distinct neighborhoods.`,
    historicalContext: `Under Mamluk Sunni rule, Shia communities in Damascus faced periodic restrictions but maintained their identity. They tended to concentrate in specific quarters and often worked in particular trades. The Shia scholarly tradition continued, though with less official patronage than Sunni institutions.`,
    inGameRelevance: `Shia NPCs are more commonly found in poorer districts (hovels). They may reference different religious figures or express subtle theological distinctions. Their presence adds to the religious diversity of Damascus.`,
    wikipediaSearchTerm: 'Shia Islam',
    relatedEntries: ['sunni-islam', 'ismaili'],
    tags: ['islam', 'minority', 'religion'],
  },
  {
    id: 'ismaili',
    category: 'religions',
    title: 'Ismaili',
    subtitle: 'The Seveners',
    shortDescription: 'A branch of Shia Islam following a distinct line of Imams, with a small but historically significant presence in Syria.',
    fullDescription: `The Ismailis, sometimes called "Seveners," follow a different line of Imams than Twelver Shia. They trace their leadership through Ismail ibn Jafar rather than his brother Musa al-Kadhim. The Ismaili tradition emphasizes esoteric interpretation of Islamic texts.

In Syria, Ismailis were historically associated with the Nizari branch, once known as the "Assassins" (a corruption of "Hashishin"). By 1348, their former strongholds in the Syrian mountains had been conquered by the Mamluks, but small communities persisted.`,
    historicalContext: `The Ismaili fortresses in Syria, including Masyaf, had fallen to the Mamluks in the 1270s. Surviving communities maintained a low profile under Mamluk rule, often practicing taqiyya (religious dissimulation) to avoid persecution. Some integrated into urban life while preserving their distinct beliefs privately.`,
    inGameRelevance: `Ismaili NPCs are rare and tend to be circumspect about their beliefs. They may appear outwardly similar to Sunni Muslims but hold distinct theological views. Their historical association with political intrigue adds narrative potential.`,
    wikipediaSearchTerm: 'Ismailism',
    relatedEntries: ['shia-islam', 'sunni-islam'],
    tags: ['islam', 'minority', 'esoteric'],
  },
  {
    id: 'jewish',
    category: 'religions',
    title: 'Jewish',
    subtitle: 'The Ancient Community',
    shortDescription: 'An ancient religious community with continuous presence in Damascus for over a millennium, concentrated in specific trades.',
    fullDescription: `The Jewish community of Damascus traced its origins back centuries before Islam. Living under the dhimmi system of protected religious minorities, Jews maintained their religious practices, communal institutions, and distinct identity while participating in the broader urban economy.

Jewish Damascenes followed rabbinic Judaism, maintaining synagogues, religious courts, and educational institutions. The community spoke Judeo-Arabic in daily life while preserving Hebrew for religious purposes.`,
    historicalContext: `Jews in Mamluk Damascus paid the jizya (poll tax) and faced certain restrictions, such as dress codes and limitations on building new synagogues. However, they also enjoyed legal protection and communal autonomy. Many worked in specialized trades: dyeing, goldsmithing, money-changing, and medicine.`,
    inGameRelevance: `Jewish NPCs are concentrated in specific trades (40% chance of being in historically Jewish occupations like Dyer, Goldsmith, Money Changer, or Hakim). They live in or near the Jewish quarter and may reference distinct holidays and practices.`,
    wikipediaSearchTerm: 'History of the Jews in Syria',
    relatedEntries: ['samaritan', 'goldsmith', 'money-changer', 'dyer'],
    tags: ['dhimmi', 'minority', 'trades'],
  },
  {
    id: 'samaritan',
    category: 'religions',
    title: 'Samaritan',
    subtitle: 'The Ancient Israelites',
    shortDescription: 'A tiny community claiming descent from ancient Israelites, distinct from Jews, with unique scriptures and practices.',
    fullDescription: `Samaritans are an ethno-religious group claiming descent from the Israelites of the ancient northern Kingdom of Israel. They accept only the Torah (which they call the Samaritan Pentateuch) as scripture and worship at Mount Gerizim rather than Jerusalem.

By the 14th century, the Samaritan population had dwindled significantly from ancient times. Small communities persisted in Palestine and occasionally in major cities. They maintained strict endogamy and distinctive religious practices.`,
    historicalContext: `Samaritans in Damascus were extremely rare, typically associated with the Jewish quarter due to superficial similarities. Their relationship with Jews was complex—sharing scriptural roots but differing on fundamental points of practice and belief. They faced similar dhimmi restrictions as Jews.`,
    inGameRelevance: `Samaritan NPCs are very rare. They share occupational tendencies with Jewish NPCs (40% chance of historically Jewish trades). Their presence adds to the religious diversity and complexity of the medieval Levant.`,
    wikipediaSearchTerm: 'Samaritans',
    relatedEntries: ['jewish'],
    tags: ['dhimmi', 'minority', 'ancient'],
  },
  {
    id: 'eastern-orthodox',
    category: 'religions',
    title: 'Eastern Orthodox',
    subtitle: 'The Greek Church',
    shortDescription: 'The largest Christian denomination in Damascus, following Byzantine liturgical traditions under the Patriarch of Antioch.',
    fullDescription: `Eastern Orthodox Christians in Damascus followed the Byzantine liturgical tradition, using Greek in their services and looking to the Patriarch of Antioch as their spiritual leader. The community, often called "Rum" (Romans) by their Muslim neighbors, had deep roots in the region predating Islam.

Orthodox Christians maintained impressive churches in Damascus, including ancient foundations from the early Christian era. Their liturgy, iconography, and monastic traditions preserved Byzantine cultural heritage.`,
    historicalContext: `Under Mamluk rule, Orthodox Christians were dhimmis—protected but subject to certain restrictions and the jizya tax. The community maintained their churches, schools, and communal institutions. Many worked as merchants, craftsmen, and in administrative roles, sometimes serving as interpreters or scribes for Muslim authorities.`,
    inGameRelevance: `Eastern Orthodox NPCs are typically of Greek/Rum ethnicity. They may reference saints' days, church festivals, or distinctive practices like icon veneration. They are more common in wealthier districts where the established Christian community concentrated.`,
    wikipediaSearchTerm: 'Eastern Orthodox Church',
    relatedEntries: ['greek-rum', 'melkite', 'syriac-orthodox'],
    tags: ['christian', 'dhimmi', 'byzantine'],
  },
  {
    id: 'armenian-apostolic',
    category: 'religions',
    title: 'Armenian Apostolic',
    subtitle: 'The Armenian Church',
    shortDescription: 'The national church of the Armenian people, with a significant merchant diaspora presence in Damascus.',
    fullDescription: `The Armenian Apostolic Church is one of the oldest national churches in Christendom, tracing its foundation to the Apostles Thaddeus and Bartholomew. Armenian Christians follow distinct liturgical traditions, using Classical Armenian in their services.

The Armenian community in Damascus was largely composed of merchants and craftsmen who had settled along the major trade routes. They maintained their own churches, schools, and communal organizations, preserving Armenian language and culture far from their homeland.`,
    historicalContext: `Armenians in Damascus benefited from their reputation as skilled merchants and artisans. Many worked in the textile trade, importing and exporting luxury goods. The community maintained connections with Armenian communities across the Mamluk realm and beyond, forming an extensive commercial network.`,
    inGameRelevance: `Armenian NPCs are always Armenian Apostolic in religion. They are often merchants or skilled craftsmen. They speak Armenian among themselves and may reference their distinct church calendar and religious customs.`,
    wikipediaSearchTerm: 'Armenian Apostolic Church',
    relatedEntries: ['armenian', 'silk-merchant', 'textile-merchant'],
    tags: ['christian', 'dhimmi', 'diaspora'],
  },
  {
    id: 'syriac-orthodox',
    category: 'religions',
    title: 'Syriac Orthodox',
    subtitle: 'The Jacobite Church',
    shortDescription: 'An ancient Aramaic-speaking Christian church with roots in the earliest days of Christianity in Syria.',
    fullDescription: `The Syriac Orthodox Church (sometimes called Jacobite after the 6th-century bishop Jacob Baradaeus) preserves the oldest continuous Christian liturgical tradition in the Aramaic language—the language spoken by Jesus. The church follows miaphysite Christology.

Syriac Christians maintained a rich literary and scholarly tradition, having translated Greek philosophy and science into Syriac and later Arabic. Their monasteries served as centers of learning throughout the medieval period.`,
    historicalContext: `In Damascus, Syriac Orthodox Christians represented one of several Christian denominations. They maintained their own churches and monasteries, preserving the Syriac language and liturgical traditions. Many Syriac Christians had adopted Arabic for daily use while maintaining Syriac for religious purposes.`,
    inGameRelevance: `Syriac Orthodox NPCs represent the oldest continuous Christian presence in Syria. They may reference ancient church traditions and their Aramaic heritage. They are typically Arab or from traditionally Syriac-speaking backgrounds.`,
    wikipediaSearchTerm: 'Syriac Orthodox Church',
    relatedEntries: ['eastern-orthodox', 'melkite', 'nestorian'],
    tags: ['christian', 'dhimmi', 'aramaic'],
  },
  {
    id: 'melkite',
    category: 'religions',
    title: 'Melkite',
    subtitle: 'The Imperial Church',
    shortDescription: 'Byzantine-rite Christians who maintained communion with Constantinople, using Arabic in daily life.',
    fullDescription: `Melkites (from the Syriac word for "royal" or "imperial") were Christians who accepted the Council of Chalcedon and maintained communion with the Byzantine Empire's official church. They followed Byzantine liturgical practices but increasingly used Arabic alongside Greek.

The term distinguished them from miaphysite Christians (Syriac Orthodox, Coptic) who rejected Chalcedonian Christology. Melkites occupied a middle ground, culturally Arab but ecclesiastically Byzantine.`,
    historicalContext: `Melkites in Damascus shared churches and hierarchies with Greek Orthodox Christians but were increasingly Arabized in language and culture. Their position as "royalists" had complex implications under Mamluk rule—they were neither fully Byzantine nor fully integrated into the Arab-speaking miaphysite tradition.`,
    inGameRelevance: `Melkite NPCs are similar to Eastern Orthodox but may be more culturally Arab. They represent the complexity of Christian identity in the medieval Levant, where linguistic, ethnic, and theological categories overlapped in complicated ways.`,
    wikipediaSearchTerm: 'Melkite Greek Catholic Church',
    relatedEntries: ['eastern-orthodox', 'syriac-orthodox', 'greek-rum'],
    tags: ['christian', 'dhimmi', 'byzantine'],
  },
  {
    id: 'nestorian',
    category: 'religions',
    title: 'Nestorian',
    subtitle: 'The Church of the East',
    shortDescription: 'An ancient Christian church with Persian roots, following distinct Christological teachings.',
    fullDescription: `The Church of the East, often called "Nestorian" by Western Christians, follows a distinct theological tradition emphasizing the two natures of Christ. The church had its historical center in Persia and spread across Asia along the Silk Road, reaching as far as China and India.

Nestorian Christians used Syriac in their liturgy and maintained their own hierarchical structure headed by the Catholicos-Patriarch. Their missionaries had achieved remarkable geographical spread in earlier centuries.`,
    historicalContext: `By 1348, the Church of the East had suffered significant losses from Mongol invasions and subsequent Islamic consolidation. Small communities persisted in major trading cities like Damascus, often connected to long-distance trade networks. They maintained distinct liturgical practices and church organization.`,
    inGameRelevance: `Nestorian NPCs are relatively rare in Damascus. They may have connections to Eastern trade routes and can provide unique perspectives on the wider world. Their presence reflects the international character of medieval Damascus.`,
    wikipediaSearchTerm: 'Church of the East',
    relatedEntries: ['syriac-orthodox', 'persian'],
    tags: ['christian', 'dhimmi', 'persian'],
  },
  {
    id: 'latin-christian',
    category: 'religions',
    title: 'Latin Christian',
    subtitle: 'The Roman Church',
    shortDescription: 'Western European Christians following the Pope in Rome, mostly Italian merchants in Damascus.',
    fullDescription: `Latin Christians followed the Roman Catholic tradition, acknowledging the Pope as head of the Church and using Latin in their liturgy. In Damascus, they were almost exclusively European merchants—primarily Italians from Venice, Genoa, Pisa, and other trading cities.

The Crusader period had left a complex legacy. Although the Crusader states had fallen, Latin Christian merchants maintained commercial relationships with Mamluk authorities under negotiated treaties.`,
    historicalContext: `Latin merchants in Damascus operated under treaties (ahdnames) with the Mamluk sultans. They typically resided in fondachi (trading posts) in the caravanserai district. They could practice their religion privately but faced restrictions on public worship. Their presence was tolerated for the economic benefits of trade.`,
    inGameRelevance: `Latin Christian NPCs are almost always Italian (Venetian, Genoese, etc.) and engaged in long-distance trade. They speak Italian and may reference European news, the Pope, or commercial matters. They are restricted to wine merchant profession (the only religion allowed this trade in the simulation).`,
    wikipediaSearchTerm: 'Catholic Church',
    relatedEntries: ['venetian', 'genoese', 'wine-merchant'],
    tags: ['christian', 'european', 'merchant'],
  },
  {
    id: 'coptic-orthodox',
    category: 'religions',
    title: 'Coptic Orthodox',
    subtitle: 'The Egyptian Church',
    shortDescription: 'Egyptian Christians with ancient Pharaonic heritage, following miaphysite theology.',
    fullDescription: `The Coptic Orthodox Church is the native Christian church of Egypt, tracing its foundation to Saint Mark the Evangelist. Copts follow miaphysite Christology and use the Coptic language (descended from ancient Egyptian) in their liturgy, though Arabic had become the everyday language.

Coptic Christianity preserved distinctive traditions including unique iconographic styles, liturgical music, and monastic practices. The Coptic Pope in Alexandria led the church independently of both Rome and Constantinople.`,
    historicalContext: `Copts in Damascus were typically Egyptian travelers, merchants, or migrants. While not native to Syria, they shared the dhimmi status of other Christians. Their presence in Damascus reflected the close ties between Egypt and Syria under Mamluk rule—both regions were governed by the same sultanate.`,
    inGameRelevance: `Coptic NPCs are always of Coptic ethnicity. They are relatively rare in Damascus, representing Egyptian Christian visitors or settlers. They may reference Egypt, the Coptic Pope, or distinctive Coptic traditions.`,
    wikipediaSearchTerm: 'Coptic Orthodox Church',
    relatedEntries: ['coptic', 'syriac-orthodox'],
    tags: ['christian', 'dhimmi', 'egyptian'],
  },
  {
    id: 'druze',
    category: 'religions',
    title: 'Druze',
    subtitle: 'The Mountain People',
    shortDescription: 'A secretive monotheistic religion originating from Ismaili Islam, concentrated in mountain communities.',
    fullDescription: `The Druze faith emerged in 11th-century Egypt from Ismaili Islam but developed into a distinct religion. Druze theology incorporates elements of Neoplatonism, Gnosticism, and other philosophical traditions. The religion is closed to converts—one can only be born Druze.

Druze practice strict endogamy and maintain a distinction between the initiated (uqqal, who know the full teachings) and the uninitiated (juhhal). Their scriptures and full beliefs are kept secret from outsiders.`,
    historicalContext: `By 1348, Druze communities were concentrated in the mountains of Lebanon and Syria, where terrain provided protection. They had a complex relationship with Mamluk authorities—sometimes allied, sometimes in conflict. Druze in Damascus were rare, typically visiting from mountain communities.`,
    inGameRelevance: `Druze NPCs are uncommon in urban Damascus. They maintain strict community boundaries and may be reticent about their beliefs. Their mountain origins and distinct identity add to the religious diversity of the region.`,
    wikipediaSearchTerm: 'Druze',
    relatedEntries: ['ismaili'],
    tags: ['secretive', 'minority', 'mountain'],
  },
];

// ============================================================================
// ETHNICITIES (18 entries)
// ============================================================================

const ETHNICITY_ENTRIES: GuideEntry[] = [
  {
    id: 'arab',
    category: 'ethnicities',
    title: 'Arab',
    subtitle: 'The Native Majority',
    shortDescription: 'The dominant ethnic group of Damascus, native Arabic speakers comprising the majority of the population.',
    fullDescription: `Arabs form the overwhelming majority of Damascus's population. They trace their presence in the city to the Islamic conquest of the 7th century, though Arabization of the local population was a gradual process over centuries.

Arabic serves as the primary language of administration, commerce, religion, and daily life. Arab Damascenes identify strongly with their city's illustrious history as a center of Islamic civilization, seat of the Umayyad Caliphate, and hub of trade and scholarship.`,
    historicalContext: `Under Mamluk rule, Arabs comprised the subject population while Mamluks (ethnically Turkic or Circassian military slaves) formed the ruling elite. Despite this, Arab culture and language dominated daily life. Arab scholars, merchants, and craftsmen formed the backbone of urban society.`,
    inGameRelevance: `Arab NPCs are the most common ethnicity. They are typically Sunni or Shia Muslim and speak Arabic as their native language. They work in all professions and social classes, from beggars to wealthy merchants to religious scholars.`,
    wikipediaSearchTerm: 'Arabs',
    relatedEntries: ['sunni-islam', 'shia-islam'],
    tags: ['majority', 'native', 'muslim'],
  },
  {
    id: 'kurdish',
    category: 'ethnicities',
    title: 'Kurdish',
    subtitle: 'Mountain Warriors',
    shortDescription: 'An Iranian-speaking people from the mountainous regions, with a strong military tradition.',
    fullDescription: `Kurds are an Iranian-speaking ethnic group originating from the mountainous regions of what is now eastern Turkey, northern Iraq, and western Iran. They have a distinct language (Kurdish), culture, and identity while predominantly following Sunni Islam.

The Kurdish military tradition made them valuable to various Islamic dynasties. The famous Saladin (Salah ad-Din), who recaptured Jerusalem from the Crusaders, was of Kurdish origin. Kurdish soldiers and officers served in various capacities under the Mamluks.`,
    historicalContext: `Kurds in Damascus included soldiers, merchants, and migrants from Kurdish regions. Some had risen to prominence in military or administrative roles. Kurdish quarters existed in various Syrian cities, maintaining elements of Kurdish language and culture while integrating into urban Arab society.`,
    inGameRelevance: `Kurdish NPCs often have military or guard professions. They are Sunni Muslims and may speak Kurdish among themselves. Their warrior reputation and distinct identity make them notable figures in Damascus society.`,
    wikipediaSearchTerm: 'Kurdish people',
    relatedEntries: ['sunni-islam', 'soldier', 'guard'],
    tags: ['minority', 'military', 'iranian'],
  },
  {
    id: 'persian',
    category: 'ethnicities',
    title: 'Persian',
    subtitle: 'Scholars and Merchants',
    shortDescription: 'Iranian people known for literary culture, scholarship, and participation in trade and administration.',
    fullDescription: `Persians are the dominant ethnic group of Iran, speakers of Farsi (Persian), and heirs to a rich literary and intellectual tradition. Persian culture profoundly influenced Islamic civilization, contributing poetry, philosophy, science, and administrative practices.

Persian scholars, merchants, and craftsmen were found throughout the Islamic world. The Persian language served as a prestigious literary and administrative language alongside Arabic, used from Anatolia to India.`,
    historicalContext: `Persians in Damascus included merchants trading goods from Iran and further east, scholars participating in the city's intellectual life, and craftsmen with specialized skills. Many worked in the bureaucracy or as scribes, where Persian administrative traditions remained influential.`,
    inGameRelevance: `Persian NPCs tend toward scholarly, administrative, or merchant professions. They are typically Sunni or Shia Muslim. They may reference Persian poetry, Iranian cities, or the prestige of Persian culture.`,
    wikipediaSearchTerm: 'Persian people',
    relatedEntries: ['sunni-islam', 'shia-islam', 'scholar', 'scribe'],
    tags: ['minority', 'scholarly', 'iranian'],
  },
  {
    id: 'turkic',
    category: 'ethnicities',
    title: 'Turkic',
    subtitle: 'The Ruling Caste',
    shortDescription: 'Central Asian peoples who dominate the Mamluk military elite, primarily Kipchaks and Cumans.',
    fullDescription: `Turkic peoples originated in Central Asia and include many distinct groups—Kipchaks, Cumans, Oghuz, and others. In the Mamluk context, "Turkic" primarily refers to the Kipchak and Cuman origins of most Bahri-period Mamluks.

Young Turkic boys, captured or purchased from the Eurasian steppes, were trained as elite military slaves (mamluks). This system produced the sultans and emirs who ruled Egypt and Syria. Their native Turkic languages coexisted with Arabic in military and court contexts.`,
    historicalContext: `In 1348, the Bahri Mamluk dynasty was at its height. Turkic (particularly Kipchak) Mamluks dominated the military-political elite. They maintained distinct cultural practices and often spoke Turkic among themselves while conducting official business in Arabic. Their dominance would later give way to Circassian Mamluks.`,
    inGameRelevance: `Turkic NPCs are primarily found in military roles and the ruling class. They are Sunni Muslims. Their presence represents the non-Arab character of the Mamluk elite—military rulers ethnically distinct from the majority population they governed.`,
    wikipediaSearchTerm: 'Turkic peoples',
    relatedEntries: ['circassian', 'mamluk-system', 'soldier'],
    tags: ['elite', 'military', 'mamluk'],
  },
  {
    id: 'circassian',
    category: 'ethnicities',
    title: 'Circassian',
    subtitle: 'The Rising Elite',
    shortDescription: 'Caucasian people increasingly prominent among the Mamluks, destined to dominate the later Burji dynasty.',
    fullDescription: `Circassians are a people from the northwestern Caucasus Mountains. Like Turkic peoples, Circassian boys were sold or captured into the Mamluk slave-soldier system. Known for their martial prowess and physical endurance, Circassians rose steadily through Mamluk ranks.

Circassian Mamluks were present from the early Mamluk period but would eventually dominate. In 1382, Circassians would seize power from the Turkic Bahri dynasty, establishing the Burji dynasty that ruled until the Ottoman conquest.`,
    historicalContext: `In 1348, Circassians represented perhaps 15% of the Mamluk elite—significant but not yet dominant. They were climbing the ranks, and discerning observers might note their increasing prominence. The transition to Circassian dominance lay decades in the future.`,
    inGameRelevance: `Circassian NPCs are found in military roles, slightly less common than Turkic Mamluks in 1348. They are Sunni Muslims. Their presence foreshadows the coming Circassian ascendancy in Mamluk politics.`,
    wikipediaSearchTerm: 'Circassians',
    relatedEntries: ['turkic', 'mamluk-system', 'soldier'],
    tags: ['elite', 'military', 'mamluk'],
  },
  {
    id: 'armenian',
    category: 'ethnicities',
    title: 'Armenian',
    subtitle: 'The Merchant Diaspora',
    shortDescription: 'A Christian people with an extensive merchant network spanning the medieval world.',
    fullDescription: `Armenians are a people from the highlands of eastern Anatolia and the Caucasus. They adopted Christianity in 301 AD, making Armenia the first officially Christian nation. Throughout the medieval period, Armenians maintained a vast commercial diaspora.

The Armenian language belongs to its own branch of the Indo-European family. Armenians developed their unique alphabet, literature, and artistic traditions. Their church (Armenian Apostolic) maintained independence from both Rome and Constantinople.`,
    historicalContext: `Armenian merchants in Damascus were part of an extensive trading network stretching from Europe to China. They dealt in silk, spices, and other luxury goods. The community maintained its own churches, schools, and neighborhood while participating actively in the city's commercial life.`,
    inGameRelevance: `Armenian NPCs are always Armenian Apostolic Christians. They often work as merchants or skilled craftsmen. They speak Armenian among themselves and represent the international character of Damascus's trading community.`,
    wikipediaSearchTerm: 'Armenians',
    relatedEntries: ['armenian-apostolic', 'silk-merchant', 'textile-merchant'],
    tags: ['christian', 'merchant', 'diaspora'],
  },
  {
    id: 'greek-rum',
    category: 'ethnicities',
    title: 'Greek/Rum',
    subtitle: 'Heirs of Byzantium',
    shortDescription: 'Greek-speaking Christians tracing heritage to the Byzantine Empire, called "Rum" (Romans) in Arabic.',
    fullDescription: `"Rum" (from "Roman") is the Arabic term for Greek-speaking Christians of Byzantine heritage. Though the Byzantine Empire had lost Syria to the Arabs in the 7th century, Greek Christian communities persisted, maintaining their language, liturgy, and connection to Constantinople.

Greek/Rum Christians preserved Byzantine culture in the Levant. Greek remained a liturgical and scholarly language, and Byzantine artistic and architectural traditions influenced local Christian communities.`,
    historicalContext: `The Rum community in Damascus maintained Eastern Orthodox churches and institutions. They had complex relationships with both the Mamluk authorities (who tolerated them as dhimmis) and Constantinople (which claimed spiritual authority). Many worked as merchants, craftsmen, or in roles requiring literacy.`,
    inGameRelevance: `Greek/Rum NPCs are Eastern Orthodox Christians. They are found more often in wealthier districts and in professions requiring education. They may reference Byzantine heritage or Constantinople ("the City").`,
    wikipediaSearchTerm: 'Rûm',
    relatedEntries: ['eastern-orthodox', 'melkite'],
    tags: ['christian', 'byzantine', 'minority'],
  },
  {
    id: 'berber',
    category: 'ethnicities',
    title: 'Berber',
    subtitle: 'North African Travelers',
    shortDescription: 'Indigenous North African people, occasional traders and travelers to Damascus from the Maghreb.',
    fullDescription: `Berbers (Amazigh) are the indigenous peoples of North Africa. Various Berber groups inhabited the Maghreb (Morocco, Algeria, Tunisia, Libya) before and after the Arab conquests. Many adopted Islam while maintaining distinct Berber languages and customs.

Berber dynasties such as the Almoravids and Almohads had once ruled vast empires. Berber merchants and scholars participated in trans-Saharan and Mediterranean trade networks.`,
    historicalContext: `Berbers in Damascus were typically travelers or merchants from the Maghreb. They might be performing the hajj (pilgrimage to Mecca), trading North African goods, or seeking knowledge at Damascus's famous madrasas. Their presence was transient rather than settled.`,
    inGameRelevance: `Berber NPCs are relatively rare in Damascus. They are Sunni Muslims and may reference North African origins, the Maghreb, or long journeys. Their presence highlights Damascus's role as a crossroads of the Islamic world.`,
    wikipediaSearchTerm: 'Berbers',
    relatedEntries: ['maghrebi', 'sunni-islam'],
    tags: ['muslim', 'traveler', 'north-african'],
  },
  {
    id: 'maghrebi',
    category: 'ethnicities',
    title: 'Maghrebi',
    subtitle: 'Western Lands',
    shortDescription: 'Arabized inhabitants of the western Islamic lands (Morocco, Algeria, Tunisia), visitors to Damascus.',
    fullDescription: `"Maghrebi" refers broadly to inhabitants of the Maghreb (the western Islamic lands of North Africa). While some were ethnically Berber, many were Arabized—speaking Arabic dialects and identifying with Arab culture while maintaining regional distinctiveness.

Maghrebi Arabic dialects differed significantly from Syrian Arabic. Maghrebi scholars, merchants, and pilgrims were common visitors to the eastern Islamic lands, and some settled permanently.`,
    historicalContext: `Maghrebis in Damascus included pilgrims, students at madrasas, merchants, and Sufi seekers. The great Maghrebi traveler Ibn Battuta passed through Damascus in the 1320s, providing a famous description of the city. Such travelers connected the far-flung parts of the Islamic world.`,
    inGameRelevance: `Maghrebi NPCs are Sunni Muslims from western Islamic lands. They speak Maghrebi Arabic dialects and may reference their homelands, travels, or the experience of being far from home. They add to Damascus's cosmopolitan character.`,
    wikipediaSearchTerm: 'Maghrebis',
    relatedEntries: ['berber', 'sunni-islam'],
    tags: ['muslim', 'traveler', 'north-african'],
  },
  {
    id: 'coptic',
    category: 'ethnicities',
    title: 'Coptic',
    subtitle: 'Egyptian Christians',
    shortDescription: 'Native Egyptian Christians with ancient Pharaonic heritage, occasional visitors from Egypt.',
    fullDescription: `Copts are the indigenous Christians of Egypt. Their name derives from the Greek word for Egypt (Aigyptos), reflecting their ancient roots. Coptic Christianity preserves the Coptic language (descended from ancient Egyptian) in its liturgy, though Arabic became the everyday language.

Coptic identity combines ancient Egyptian heritage with Christian faith. Copts maintained distinct traditions in art, music, and religious practice that showed continuity with Pharaonic Egypt.`,
    historicalContext: `Copts in Damascus were typically visitors from Egypt—merchants, pilgrims, or migrants. Under the same Mamluk Sultanate, travel between Egypt and Syria was common. Copts occupied a dhimmi status similar to other Christians but maintained their distinct Egyptian identity.`,
    inGameRelevance: `Coptic NPCs are always Coptic Orthodox Christians. They are rare in Damascus and may reference Egypt, the Coptic Pope, or the experience of being Egyptian Christians abroad. Their presence reflects ties between Mamluk Egypt and Syria.`,
    wikipediaSearchTerm: 'Copts',
    relatedEntries: ['coptic-orthodox'],
    tags: ['christian', 'egyptian', 'minority'],
  },
  {
    id: 'indian',
    category: 'ethnicities',
    title: 'Indian',
    subtitle: 'Eastern Traders',
    shortDescription: 'Rare merchants from the Indian subcontinent, representing the far end of maritime trade routes.',
    fullDescription: `Indian merchants in Damascus represented the far eastern extent of the trade networks that brought spices, textiles, and precious goods from Asia to the Mediterranean. They might be Hindu, Muslim, or from various other Indian traditions.

Indian textiles (particularly cotton and silk), spices (pepper, cinnamon, cardamom), and precious stones were highly valued commodities. While most such goods passed through Arab or Italian intermediaries, some Indian merchants ventured west themselves.`,
    historicalContext: `Indians in Damascus were extremely rare—most Indian goods reached the city through chains of intermediaries. Those who did travel so far west were typically wealthy merchants with extensive trading networks. They might speak Arabic, Persian, or rely on interpreters.`,
    inGameRelevance: `Indian NPCs are very rare, adding exotic variety to Damascus. They may be Hindu, Muslim, or other faiths. They represent the vast extent of medieval trade networks and might have unique goods or news from distant lands.`,
    wikipediaSearchTerm: 'Indian subcontinent',
    relatedEntries: ['spice-merchant', 'silk-merchant'],
    tags: ['rare', 'merchant', 'eastern'],
  },
  {
    id: 'venetian',
    category: 'ethnicities',
    title: 'Venetian',
    subtitle: 'The Serene Republic',
    shortDescription: 'Italian merchants from Venice, the dominant Latin Christian trading power in the Levant.',
    fullDescription: `Venetians came from the Most Serene Republic of Venice, a maritime trading empire that dominated Mediterranean commerce. Venice had grown wealthy on trade between Europe and the East, establishing colonies and trading posts throughout the Mediterranean.

Venetian merchants were renowned for their commercial sophistication, diplomatic skill, and vast trading networks. Their galleys connected Europe to Egypt, Syria, and the Byzantine Empire.`,
    historicalContext: `In Damascus, Venetians were the most prominent Latin Christian presence. They operated under treaties with the Mamluk sultans, trading in spices, silk, and luxury goods. They typically resided in fondachi (trading posts) in the caravanserai district, maintaining their own legal and commercial practices under Venetian consuls.`,
    inGameRelevance: `Venetian NPCs are wealthy Latin Christian merchants. They speak Italian and may reference Venice, European affairs, or commercial matters. They have access to European goods and news, making them valuable sources of information.`,
    wikipediaSearchTerm: 'Republic of Venice',
    relatedEntries: ['latin-christian', 'genoese', 'silk-merchant'],
    tags: ['italian', 'merchant', 'christian'],
  },
  {
    id: 'genoese',
    category: 'ethnicities',
    title: 'Genoese',
    subtitle: 'The Rival Republic',
    shortDescription: 'Italian merchants from Genoa, Venice\'s great commercial rival in Mediterranean trade.',
    fullDescription: `Genoese merchants came from the Republic of Genoa, Venice's great rival for Mediterranean commercial dominance. Genoa controlled colonies across the Mediterranean and Black Sea, competing fiercely with Venice for trade routes and markets.

The rivalry between Venice and Genoa was intense, occasionally erupting into open warfare. Both powers maintained trading posts in Mamluk lands, operating under similar treaty arrangements.`,
    historicalContext: `Genoese merchants in Damascus were fewer than Venetians but still significant. They engaged in similar trades—spices, silk, and luxury goods—and faced similar challenges operating as Latin Christians in Islamic territory. Relations with Venetian competitors could be tense.`,
    inGameRelevance: `Genoese NPCs are Latin Christian merchants, similar to Venetians but representing the rival republic. They may reference competition with Venice or Genoese commercial interests. They speak Italian (Genoese dialect).`,
    wikipediaSearchTerm: 'Republic of Genoa',
    relatedEntries: ['latin-christian', 'venetian', 'silk-merchant'],
    tags: ['italian', 'merchant', 'christian'],
  },
  {
    id: 'catalan',
    category: 'ethnicities',
    title: 'Catalan',
    subtitle: 'The Crown of Aragon',
    shortDescription: 'Spanish merchants from the Crown of Aragon, a growing Mediterranean commercial power.',
    fullDescription: `Catalans came from the Crown of Aragon, a confederation including Catalonia, Aragon, Valencia, and other territories. Barcelona was its commercial heart, increasingly competing with Italian cities for Mediterranean trade.

Catalan merchants and soldiers had spread across the Mediterranean. The Catalan Company of mercenaries had famously carved out a duchy in Greece. Catalan traders sought opportunities in Levantine commerce.`,
    historicalContext: `Catalans in Damascus were less numerous than Italians but represented the growing Iberian presence in Mediterranean trade. They traded in similar goods and faced similar challenges as other Latin Christians. Catalan was their native language, though many knew Italian or Arabic.`,
    inGameRelevance: `Catalan NPCs are Latin Christian merchants. They speak Catalan and may reference Spain, the Crown of Aragon, or competition with Italian traders. Their presence shows the expanding scope of European commerce.`,
    wikipediaSearchTerm: 'Crown of Aragon',
    relatedEntries: ['latin-christian', 'venetian'],
    tags: ['spanish', 'merchant', 'christian'],
  },
  {
    id: 'pisan',
    category: 'ethnicities',
    title: 'Pisan',
    subtitle: 'The Fading Republic',
    shortDescription: 'Italian merchants from the declining Republic of Pisa, once a major Mediterranean power.',
    fullDescription: `Pisans came from the Republic of Pisa, which had once been a major Mediterranean trading power. However, by the 14th century, Pisa was in decline—defeated by Genoa at the Battle of Meloria (1284) and increasingly dominated by Florence.

Despite their city's decline, Pisan merchants still participated in Mediterranean trade, though in diminishing numbers compared to their Venetian and Genoese competitors.`,
    historicalContext: `Pisan merchants in Damascus were rare compared to earlier centuries. Those who came often operated through Florentine or other Italian networks. They represented a declining but not yet extinct commercial tradition.`,
    inGameRelevance: `Pisan NPCs are rare Latin Christian merchants. They may reference Pisa's former glory, competition with other Italian cities, or Florentine encroachment. Their presence represents the shifting fortunes of Italian city-states.`,
    wikipediaSearchTerm: 'Republic of Pisa',
    relatedEntries: ['latin-christian', 'venetian', 'genoese'],
    tags: ['italian', 'merchant', 'christian'],
  },
  {
    id: 'ethiopian',
    category: 'ethnicities',
    title: 'Ethiopian',
    subtitle: 'From Abyssinia',
    shortDescription: 'Rare visitors from the Christian kingdom of Ethiopia, far to the south.',
    fullDescription: `Ethiopians came from the ancient Christian kingdom of Abyssinia (Ethiopia), which maintained an independent Christian civilization in the Horn of Africa. Ethiopian Christianity, following the Oriental Orthodox tradition, had developed unique practices and traditions.

Ethiopian pilgrims traveled to Jerusalem and sometimes beyond. Ethiopian merchants participated in Red Sea trade routes. The legend of Prester John—a mythical Christian king in the East—was sometimes associated with Ethiopia.`,
    historicalContext: `Ethiopians in Damascus were extremely rare. They might be pilgrims, diplomats, or merchants connected to Red Sea trade. Their presence was exotic enough to attract attention. They represented a distant Christian kingdom that had maintained independence despite Islamic expansion.`,
    inGameRelevance: `Ethiopian NPCs are very rare. They are typically Eastern Orthodox (Ethiopian Tewahedo). They may reference their distant homeland, Christian faith, or the long journey to Damascus. Their presence adds to the international diversity of the city.`,
    wikipediaSearchTerm: 'Ethiopian Empire',
    relatedEntries: ['eastern-orthodox'],
    tags: ['rare', 'christian', 'african'],
  },
  {
    id: 'nubian',
    category: 'ethnicities',
    title: 'Nubian',
    subtitle: 'From the Upper Nile',
    shortDescription: 'People from the Nubian kingdoms of the Upper Nile, historically Christian but increasingly Islamizing.',
    fullDescription: `Nubians came from the kingdoms of the Upper Nile (modern Sudan), where Christian kingdoms had flourished for centuries. By the 14th century, these kingdoms were in decline, gradually Islamizing, but Christian communities persisted.

Nubian languages were distinct from Arabic, and Nubian culture had developed unique Christian traditions. Nubian archers had been renowned in ancient times, and Nubians served in various capacities under Islamic rule.`,
    historicalContext: `Nubians in Damascus might be soldiers, slaves, or freemen. The Mamluk sultans employed Nubian soldiers and servants. Some Nubians had converted to Islam while others maintained Christianity. Their dark skin made them visibly distinct in Damascus.`,
    inGameRelevance: `Nubian NPCs are uncommon. They may be Muslim or Christian. They might serve as soldiers, servants, or in various urban occupations. Their presence reflects the extent of the Mamluk Sultanate's reach into Africa.`,
    wikipediaSearchTerm: 'Nubians',
    relatedEntries: [],
    tags: ['minority', 'african'],
  },
  {
    id: 'jewish-ethnicity',
    category: 'ethnicities',
    title: 'Jewish',
    subtitle: 'The Diaspora Community',
    shortDescription: 'Jews in Damascus formed an ancient ethno-religious community with distinct language and customs.',
    fullDescription: `Jews in Damascus represented both a religious and ethnic community. They maintained distinctive traditions, spoke Judeo-Arabic (Arabic written in Hebrew script with Hebrew loanwords), and lived according to rabbinical law while participating in the broader urban economy.

The Jewish community had its own internal hierarchy, led by community elders and rabbis. They maintained synagogues, religious courts, schools, and charitable institutions. Marriage was strictly within the community.`,
    historicalContext: `Damascus's Jewish community was ancient, predating Islam by centuries. Under Mamluk rule, Jews paid the jizya and faced certain restrictions but enjoyed protection and communal autonomy. They concentrated in specific trades where they had developed expertise: dyeing, goldsmithing, medicine, and money-changing.`,
    inGameRelevance: `Jewish NPCs are always Jewish by religion. They have a 40% chance of working in historically Jewish trades (Dyer, Goldsmith, Money Changer, Hakim, Jeweler, Pharmacist). They live in or near the Jewish quarter.`,
    wikipediaSearchTerm: 'History of the Jews in Syria',
    relatedEntries: ['jewish', 'goldsmith', 'money-changer', 'dyer'],
    tags: ['dhimmi', 'minority'],
  },
];

// ============================================================================
// PROFESSIONS (selected key entries - 25 most important)
// ============================================================================

const PROFESSION_ENTRIES: GuideEntry[] = [
  {
    id: 'hakim',
    category: 'professions',
    title: 'Hakim',
    subtitle: 'Physician',
    shortDescription: 'Islamic physicians trained in the Galenic-Arabic medical tradition, among the most learned professionals.',
    fullDescription: `The hakim (physician) represented the height of Islamic medical tradition. Trained in the works of Galen, Hippocrates, and Islamic medical scholars like Ibn Sina (Avicenna) and al-Razi (Rhazes), hakims practiced a sophisticated system of medicine based on humoral theory.

Hakims diagnosed illness through pulse-taking and urine examination, prescribed compound medicines, and might perform surgery. Many also had philosophical and astronomical training.`,
    historicalContext: `Damascus was a center of medical learning with famous hospitals (bimaristans) where physicians trained and practiced. The most renowned was the Nuri Hospital. Hakims served all social classes, from the sultan's court to ordinary citizens. During plague outbreaks, they were in desperate demand.`,
    inGameRelevance: `Hakim NPCs are highly educated and may provide medical information. They understand disease through humoral theory (not germ theory). During the plague, they struggle to explain and treat the illness, leading to crisis of confidence in traditional medicine.`,
    wikipediaSearchTerm: 'Islamic medicine',
    relatedEntries: ['pharmacist', 'medieval-medicine'],
    tags: ['medical', 'scholarly', 'high-status'],
  },
  {
    id: 'midwife',
    category: 'professions',
    title: 'Midwife',
    subtitle: 'Daya',
    shortDescription: 'Female birth attendants essential to every community, with specialized knowledge of childbirth and women\'s health.',
    fullDescription: `The daya (midwife) held an essential role in medieval Damascus. Childbirth was exclusively women's domain, and skilled midwives attended births across all social classes. Their knowledge passed from generation to generation.

Midwives also provided postnatal care, treated women's ailments, and sometimes served as informal advisors on marital and family matters. Their access to women's quarters gave them unique social roles.`,
    historicalContext: `Midwifery was one of few professions open to women. Experienced midwives were highly valued, and wealthy families might retain a particular daya. During plague times, midwives faced terrible risks attending births in infected households.`,
    inGameRelevance: `Midwife is a female-only profession. These NPCs have access to women's spaces and knowledge of birth, health, and domestic matters. They are trusted figures in their communities.`,
    wikipediaSearchTerm: 'Midwifery',
    relatedEntries: ['hakim', 'birth-attendant'],
    tags: ['female', 'medical', 'essential'],
  },
  {
    id: 'silk-merchant',
    category: 'professions',
    title: 'Silk Merchant',
    subtitle: 'Tajir al-Harir',
    shortDescription: 'Wealthy traders in the most valuable textile, connecting Damascus to China via the Silk Road.',
    fullDescription: `Silk merchants dealt in the most prestigious textile of the medieval world. Chinese silk had traveled to Damascus for over a millennium, though local production also developed. Damascus itself was famous for damask silk weaving.

The silk trade required substantial capital, extensive networks, and knowledge of markets across continents. Successful silk merchants were among the wealthiest civilians in Damascus.`,
    historicalContext: `Damascus was a crucial node in the silk trade, where Eastern goods met Mediterranean markets. Silk merchants negotiated with caravan masters, Italian traders, and local weavers. The coming of the plague would devastate these trade networks.`,
    inGameRelevance: `Silk Merchant NPCs are wealthy and well-connected. They have knowledge of distant lands and trade routes. The plague's disruption of trade networks threatens their livelihood.`,
    wikipediaSearchTerm: 'Silk Road',
    relatedEntries: ['textile-merchant', 'venetian', 'caravanserai'],
    tags: ['merchant', 'wealthy', 'trade'],
  },
  {
    id: 'money-changer',
    category: 'professions',
    title: 'Money Changer',
    subtitle: 'Sarraf',
    shortDescription: 'Financial specialists exchanging currencies from across the medieval world, essential to international trade.',
    fullDescription: `The sarraf (money changer) performed essential financial services. With dozens of different currencies circulating—Mamluk dinars, Venetian ducats, Byzantine coins, and more—expert knowledge of exchange rates and coin quality was indispensable.

Money changers also provided banking services: holding deposits, extending credit, and facilitating long-distance transfers through bills of exchange.`,
    historicalContext: `Money changers operated in the major markets and caravanserais of Damascus. Many were Jewish, continuing a long tradition of Jewish expertise in finance. Christian and Muslim money changers also practiced. They formed a crucial link in international commerce.`,
    inGameRelevance: `Money Changer NPCs have deep knowledge of trade and finance. They may be Jewish or from other backgrounds. They can provide information about commerce and the economic effects of the plague.`,
    wikipediaSearchTerm: 'Money changer',
    relatedEntries: ['jewish', 'goldsmith'],
    tags: ['finance', 'trade', 'jewish-associated'],
  },
  {
    id: 'dyer',
    category: 'professions',
    title: 'Dyer',
    subtitle: 'Sabbagh',
    shortDescription: 'Skilled craftsmen who colored textiles using closely guarded techniques and exotic materials.',
    fullDescription: `Dyeing was a highly skilled craft requiring knowledge of chemistry, materials, and technique. Dyers worked with precious substances—indigo, madder, kermes, and exotic imports like Indian lac—to produce the vibrant colors prized in medieval textiles.

The dyeing process involved complex sequences of mordanting, immersion, and fixing. Master dyers guarded their recipes as trade secrets.`,
    historicalContext: `Damascus was renowned for textile production, and its dyers were integral to this industry. Many dyers were Jewish, a pattern common across the medieval Mediterranean. The craft required substantial investment in materials and equipment.`,
    inGameRelevance: `Dyer NPCs are skilled craftsmen, often Jewish. They work with valuable materials and have specialized knowledge. Their stained hands and distinctive workshop smells make them recognizable.`,
    wikipediaSearchTerm: 'Dyeing',
    relatedEntries: ['weaver', 'jewish', 'textile-merchant'],
    tags: ['craft', 'textile', 'jewish-associated'],
  },
  {
    id: 'goldsmith',
    category: 'professions',
    title: 'Goldsmith',
    subtitle: 'Sayigh',
    shortDescription: 'Highly skilled artisans working precious metals into jewelry, vessels, and decorative objects.',
    fullDescription: `Goldsmiths transformed precious metals into objects of beauty and value. They crafted jewelry, vessels, decorative elements, and luxury goods for the wealthy. Their work required artistic skill, technical knowledge, and absolute trustworthiness given the value of their materials.

Goldsmithing was often associated with money-changing and jewelry dealing, as expertise in precious metals overlapped across these fields.`,
    historicalContext: `Goldsmithing in Damascus had a long tradition. Many goldsmiths were Jewish, though Muslims and Christians also practiced the craft. They worked in specialized market sections (suqs) where precious goods concentrated under close supervision.`,
    inGameRelevance: `Goldsmith NPCs are skilled artisans, often Jewish or of high status. They work with valuable materials and may have insights into wealth and luxury. Their expertise makes them trusted assessors of precious items.`,
    wikipediaSearchTerm: 'Goldsmith',
    relatedEntries: ['jeweler', 'money-changer', 'jewish'],
    tags: ['craft', 'luxury', 'jewish-associated'],
  },
  {
    id: 'imam',
    category: 'professions',
    title: 'Imam',
    subtitle: 'Prayer Leader',
    shortDescription: 'Religious leaders who lead prayers and provide spiritual guidance to Muslim communities.',
    fullDescription: `The imam leads the five daily prayers at the mosque and delivers the Friday sermon (khutba). Beyond liturgical duties, imams often serve as community leaders, mediators, and teachers. They may also perform marriages, funerals, and other religious ceremonies.

Imams range from humble neighborhood prayer leaders to the imam of the great Umayyad Mosque, one of the most prestigious positions in the Islamic world.`,
    historicalContext: `Damascus's many mosques each had their imams. The Umayyad Mosque's imam was a figure of great importance. During the plague, imams led prayers for deliverance, performed countless funeral prayers, and struggled to explain divine purpose in the catastrophe.`,
    inGameRelevance: `Imam NPCs are respected religious figures. They can discuss Islamic theology, offer spiritual perspectives on the plague, and reflect community morale. Higher-ranking imams are influential leaders.`,
    wikipediaSearchTerm: 'Imam',
    relatedEntries: ['muezzin', 'qadi', 'sunni-islam', 'islamic-prayer'],
    tags: ['religious', 'leadership', 'muslim'],
  },
  {
    id: 'qadi',
    category: 'professions',
    title: 'Qadi',
    subtitle: 'Islamic Judge',
    shortDescription: 'Islamic judges who apply sharia law to resolve disputes, crimes, and civil matters.',
    fullDescription: `The qadi (judge) administered Islamic law in the courts. Qadis heard cases involving contracts, property, family law, and crimes. They were typically trained scholars of Islamic jurisprudence, having studied for years under established masters.

The qadi's court was central to urban governance. All disputes—commercial, domestic, criminal—could come before the qadi for resolution according to sharia.`,
    historicalContext: `Damascus had multiple qadis, each following one of the four Sunni legal schools (madhabs). The chief qadi was a powerful figure. During the plague, qadis dealt with inheritance disputes from mass deaths and unprecedented legal questions about the crisis.`,
    inGameRelevance: `Qadi NPCs are highly educated and influential. They represent Islamic legal authority and can speak to issues of justice, inheritance, and community order. The plague creates many inheritance cases as families are wiped out.`,
    wikipediaSearchTerm: 'Qadi',
    relatedEntries: ['imam', 'mufti', 'scholar'],
    tags: ['religious', 'legal', 'authority'],
  },
  {
    id: 'sufi-shaykh',
    category: 'professions',
    title: 'Sufi Shaykh',
    subtitle: 'Mystic Master',
    shortDescription: 'Spiritual masters of Islamic mysticism who guide disciples on the inner path to divine knowledge.',
    fullDescription: `Sufi shaykhs are masters of tasawwuf (Islamic mysticism), guiding disciples (murids) on the spiritual path. They lead Sufi orders (tariqas), conduct dhikr ceremonies (remembrance of God), and transmit mystical knowledge through direct instruction.

Major Sufi orders like the Qadiriyya, Shadhiliyya, and Rifa'iyya had strong presences in Damascus. Sufi shrines and lodges (zawiyas) dotted the city.`,
    historicalContext: `Damascus was a major center of Sufi activity. Shaykhs like Ibn Arabi had made the city famous. Sufi practices—including ecstatic worship, visiting saints' tombs, and belief in karamat (miracles)—flourished. During the plague, Sufis sought spiritual meaning in the catastrophe.`,
    inGameRelevance: `Sufi Shaykh NPCs offer mystical perspectives on events. They may interpret the plague spiritually, suggest devotional practices, or provide comfort to the afflicted. They are revered by their followers.`,
    wikipediaSearchTerm: 'Sufism',
    relatedEntries: ['sufi-dervish', 'sunni-islam'],
    tags: ['religious', 'mystical', 'spiritual'],
  },
  {
    id: 'blacksmith',
    category: 'professions',
    title: 'Blacksmith',
    subtitle: 'Haddad',
    shortDescription: 'Essential craftsmen forging iron tools, weapons, and implements for all sectors of society.',
    fullDescription: `The blacksmith worked iron and steel, producing everything from horseshoes to door hinges to weapons. Their forges were essential to urban life, providing tools for agriculture, construction, and crafts, as well as weapons for soldiers.

Blacksmithing required strength, skill, and years of training. Master smiths could produce fine weapons and intricate metalwork.`,
    historicalContext: `Damascus was legendary for its steel—"Damascene steel" was prized across the medieval world for sword blades. Whether or not Damascus smiths still produced this legendary material by 1348, the city's metalworking traditions remained strong.`,
    inGameRelevance: `Blacksmith NPCs are strong, practical craftsmen. They produce essential goods and may have knowledge of weapons and tools. Their forges are recognizable landmarks in commercial districts.`,
    wikipediaSearchTerm: 'Blacksmith',
    relatedEntries: ['brass-worker', 'coppersmith'],
    tags: ['craft', 'essential', 'metalwork'],
  },
  {
    id: 'weaver',
    category: 'professions',
    title: 'Weaver',
    subtitle: 'Nassaj',
    shortDescription: 'Skilled textile artisans producing cloth on looms, from everyday fabrics to luxury silks.',
    fullDescription: `Weavers transformed thread into cloth using various loom types. Damascus weavers produced everything from coarse woolen fabrics to the legendary damask silk that bore the city's name. The best weavers were highly valued artisans.

Weaving could be practiced by both men and women, at home or in workshops. It ranged from cottage industry to organized manufacture.`,
    historicalContext: `Textile production was central to Damascus's economy. Weavers worked with silk, cotton, wool, and linen. They collaborated with dyers, embroiderers, and merchants in a complex production chain. Damask patterns remain famous to this day.`,
    inGameRelevance: `Weaver NPCs produce essential goods. They may work alone or in workshops. Their knowledge of textiles reflects Damascus's fame in this craft. Both men and women may be weavers.`,
    wikipediaSearchTerm: 'Weaving',
    relatedEntries: ['dyer', 'silk-merchant', 'textile-merchant'],
    tags: ['craft', 'textile'],
  },
  {
    id: 'baker',
    category: 'professions',
    title: 'Baker',
    subtitle: 'Khabbaz',
    shortDescription: 'Essential food providers producing bread, the staple of medieval diet, in commercial ovens.',
    fullDescription: `Bread was the foundation of the medieval diet, and bakers provided this essential food. Most people did not bake at home but bought from commercial bakeries or brought their dough to be baked in professional ovens.

Bakers worked through the night to have fresh bread ready for morning. They were subject to careful price and quality regulation by market inspectors (muhtasibs).`,
    historicalContext: `Bakeries clustered in specific market areas. The quality and price of bread were politically sensitive—bread shortages or price increases could cause riots. During the plague, disruption of grain supply and baker deaths threatened food security.`,
    inGameRelevance: `Baker NPCs are common and essential. They rise early and know neighborhood gossip. Bread prices and availability may reflect broader crises. Their health is crucial to food supply.`,
    wikipediaSearchTerm: 'Baker',
    relatedEntries: ['butcher', 'cook'],
    tags: ['food', 'essential', 'common'],
  },
  {
    id: 'butcher',
    category: 'professions',
    title: 'Butcher',
    subtitle: 'Qassab',
    shortDescription: 'Providers of meat, slaughtering animals according to halal requirements.',
    fullDescription: `Butchers slaughtered animals and sold meat in dedicated market areas. Islamic law required halal slaughter (dhabihah), with specific prayers and techniques. Butchers therefore performed a quasi-religious function.

Meat was expensive and not eaten daily by most people. Butchers sold lamb, goat, beef, and sometimes camel meat. Their shops clustered together in specific suqs.`,
    historicalContext: `Butchery was carefully regulated. Market inspectors ensured halal compliance and fair weights. During the plague, meat supply could become erratic as herds and herders were affected. Disposing of plague-killed animals was a serious concern.`,
    inGameRelevance: `Butcher NPCs work in specific market areas. They know about meat supply and animal health. During plague outbreaks, animal die-offs might precede human infections (foreshadowing for players).`,
    wikipediaSearchTerm: 'Butcher',
    relatedEntries: ['baker', 'cook'],
    tags: ['food', 'essential'],
  },
  {
    id: 'bath-house-owner',
    category: 'professions',
    title: 'Bathhouse Owner',
    subtitle: 'Sahib al-Hammam',
    shortDescription: 'Proprietors of public baths, essential institutions for hygiene and social life.',
    fullDescription: `Bathhouse owners operated the hammams that were central to urban life. The hammam served hygienic, religious, and social functions. Muslims performed ritual ablutions there, and everyone used the baths for cleanliness. They were also places of relaxation and socializing.

Running a hammam required managing fuel, water, staff, and maintaining the complex heating systems.`,
    historicalContext: `Damascus had numerous hammams serving different neighborhoods and clientele. They operated on gendered schedules (men and women at different times or in different facilities). Bathhouse owners were respectable businesspeople. During the plague, hammams were potential disease transmission sites.`,
    inGameRelevance: `Bathhouse Owner NPCs run important social institutions. They know neighborhood gossip and may observe early signs of illness among their customers. The question of whether hammams spread disease is historically debated.`,
    wikipediaSearchTerm: 'Hammam',
    relatedEntries: ['hammam', 'bathhouse-attendant'],
    tags: ['service', 'social', 'hygiene'],
  },
  {
    id: 'innkeeper',
    category: 'professions',
    title: 'Innkeeper',
    subtitle: 'Funduqi',
    shortDescription: 'Operators of caravanserais and urban inns serving travelers and merchants.',
    fullDescription: `Innkeepers managed accommodations for travelers. These ranged from simple urban inns to the great caravanserais that hosted merchant caravans. They provided lodging, stabling, storage, and sometimes food.

Innkeepers saw travelers from across the known world and often served as informal information brokers, knowing who had arrived, what goods they carried, and what news they brought.`,
    historicalContext: `Damascus's location on major trade routes meant a constant flow of travelers. The caravanserai district bustled with merchants, pilgrims, and travelers. Innkeepers knew the rhythms of trade and travel. During plague times, they might be first to note disrupted caravan schedules.`,
    inGameRelevance: `Innkeeper NPCs have knowledge of travelers and trade. They may provide information about distant lands, arriving caravans, or news from other cities. They see early signs of trade disruption.`,
    wikipediaSearchTerm: 'Caravanserai',
    relatedEntries: ['funduq-keeper', 'caravanserai'],
    tags: ['service', 'trade', 'information'],
  },
  {
    id: 'guard',
    category: 'professions',
    title: 'Guard',
    subtitle: 'Haris',
    shortDescription: 'Security personnel protecting property, maintaining order, and serving authorities.',
    fullDescription: `Guards provided security for markets, warehouses, wealthy residences, and public order. They might work for private employers, merchant guilds, or Mamluk authorities. Some guards were professional soldiers; others were hired muscle.

The shurta (police force) maintained public order under Mamluk authority, while private guards protected commercial interests.`,
    historicalContext: `Damascus required substantial security forces. Guards protected the suqs at night, accompanied valuable shipments, and served wealthy households. During the plague, guards might be tasked with enforcing quarantines or controlling panicked crowds.`,
    inGameRelevance: `Guard NPCs represent authority and security. They may restrict player movement, provide order information, or be encountered enforcing plague measures. Their presence indicates valuable areas or social control.`,
    wikipediaSearchTerm: 'Guard',
    relatedEntries: ['soldier'],
    tags: ['security', 'authority'],
  },
  {
    id: 'soldier',
    category: 'professions',
    title: 'Soldier',
    subtitle: 'Jundi',
    shortDescription: 'Military personnel serving in Mamluk armies, often ethnically Turkic or Circassian.',
    fullDescription: `The Mamluk military system was unique. Soldiers (and ultimately sultans) were originally military slaves, purchased as boys, converted to Islam, and trained as elite warriors. This system produced formidable armies that had defeated both Crusaders and Mongols.

Ordinary soldiers formed the core of military forces, while elite Mamluks rose to command and political power.`,
    historicalContext: `Damascus was a major military base. Turkic and Circassian Mamluks dominated the military elite, while Arab soldiers served in lesser roles. The presence of military forces maintained Mamluk control over Syria. During the plague, military units were hard-hit, potentially weakening the sultanate.`,
    inGameRelevance: `Soldier NPCs are often Turkic or Circassian Mamluks. They represent military authority and power. Their presence varies by district. They may be arrogant toward civilians or surprisingly vulnerable to plague.`,
    wikipediaSearchTerm: 'Mamluk',
    relatedEntries: ['turkic', 'circassian', 'mamluk-system', 'guard'],
    tags: ['military', 'authority', 'mamluk'],
  },
  {
    id: 'scribe',
    category: 'professions',
    title: 'Scribe',
    subtitle: 'Katib',
    shortDescription: 'Literate professionals who write documents, correspondence, and official records.',
    fullDescription: `Scribes provided essential literacy services in a society where most people could not read or write. They drafted contracts, wrote letters, copied manuscripts, and maintained official records. The most accomplished scribes served in government administration.

Scribal skills included beautiful calligraphy, knowledge of proper formulae for different document types, and often familiarity with multiple languages.`,
    historicalContext: `Scribes were essential to commerce, government, and religion. They worked in markets (writing contracts), courts (recording proceedings), mosques (copying religious texts), and private households. The art of calligraphy was highly valued in Islamic culture.`,
    inGameRelevance: `Scribe NPCs are educated and often have knowledge of official matters. They may record player transactions, provide information about legal matters, or serve as sources of written information. They are common in markets and administrative areas.`,
    wikipediaSearchTerm: 'Scribe',
    relatedEntries: ['calligrapher', 'scholar'],
    tags: ['literate', 'administrative'],
  },
  {
    id: 'beggar',
    category: 'professions',
    title: 'Beggar',
    subtitle: 'Mutasawwil',
    shortDescription: 'Those surviving through alms, ranging from the truly destitute to professional mendicants.',
    fullDescription: `Beggars represented the lowest social stratum, dependent on charity for survival. Islamic emphasis on alms-giving (zakat and sadaqa) meant that giving to beggars was a religious duty, creating a recognized social role.

Beggars ranged from the genuinely destitute—orphans, the disabled, those fallen on hard times—to professional mendicants who chose or were forced into begging as a way of life.`,
    historicalContext: `Beggars congregated around mosques, markets, and wealthy areas where alms might be obtained. Some were organized into groups with their own hierarchies. During the plague, many newly impoverished joined their ranks as families and livelihoods were destroyed.`,
    inGameRelevance: `Beggar NPCs are common in poor areas and near mosques. They may observe much while being ignored by others. The plague swells their numbers as survivors lose everything. They are especially vulnerable to disease.`,
    wikipediaSearchTerm: 'Begging',
    relatedEntries: [],
    tags: ['poor', 'vulnerable', 'common'],
  },
  {
    id: 'water-carrier',
    category: 'professions',
    title: 'Water Carrier',
    subtitle: 'Saqqa',
    shortDescription: 'Essential workers delivering water throughout the city from wells and fountains.',
    fullDescription: `Water carriers provided an essential service, bringing water from public fountains and wells to homes and businesses. They carried water in goatskin bags, making countless trips daily. It was hard, low-status work but absolutely necessary.

Some water carriers served fixed routes; others worked on demand. Public fountains (sabils) were charitable installations designed to provide water to all.`,
    historicalContext: `Damascus was famous for its water, with the Barada River and sophisticated irrigation systems. But individual homes needed water delivery. Water carriers were ubiquitous figures, their distinctive calls echoing through streets. During plague times, their intimate contact with many households posed infection risks.`,
    inGameRelevance: `Water Carrier NPCs are common and mobile. They enter many homes and know neighborhoods intimately. They may spread or carry news of illness. Their work is essential even during outbreaks.`,
    wikipediaSearchTerm: 'Water carrier',
    relatedEntries: [],
    tags: ['service', 'essential', 'common'],
  },
  {
    id: 'wine-merchant',
    category: 'professions',
    title: 'Wine Merchant',
    subtitle: 'Khammar',
    shortDescription: 'Christian traders in wine, a profession forbidden to Muslims.',
    fullDescription: `Wine production and sale were forbidden to Muslims but permitted to dhimmi Christians (and sometimes Jews). Christian wine merchants supplied the non-Muslim population and, discreetly, Muslim customers who ignored Islamic prohibitions.

Wine trading was often associated with taverns and a somewhat disreputable atmosphere by Islamic standards, though it was a legitimate Christian profession.`,
    historicalContext: `Damascus's Christian community maintained wine production and trade. European merchants also dealt in wine. The trade operated in a legal gray area—tolerated but sometimes restricted. It was one of few professions where religious minorities had advantages over Muslims.`,
    inGameRelevance: `Wine Merchant NPCs are exclusively Christian (Latin, Orthodox, etc.). They operate in specific areas and may have dubious reputations in Muslim eyes. They represent the economic niches of religious minorities.`,
    wikipediaSearchTerm: 'Wine',
    relatedEntries: ['latin-christian', 'eastern-orthodox'],
    tags: ['christian-only', 'merchant', 'controversial'],
  },
];

// ============================================================================
// DISTRICTS (6 entries)
// ============================================================================

const DISTRICT_ENTRIES: GuideEntry[] = [
  {
    id: 'market-district',
    category: 'districts',
    title: 'Market District',
    subtitle: 'The Suqs',
    shortDescription: 'The commercial heart of Damascus, a maze of specialized markets where goods from across the world change hands.',
    fullDescription: `The suqs (markets) of Damascus formed an intricate network of covered streets, each specializing in particular goods: the silk suq, the spice suq, the goldsmiths' suq, and dozens more. This was the commercial engine of the city.

The great suqs near the Umayyad Mosque were the most prestigious, dealing in luxury goods. Lesser markets served everyday needs. The market inspector (muhtasib) regulated prices, weights, and quality.`,
    historicalContext: `Damascus's position on trade routes made its markets famous. Goods from China, India, Africa, and Europe all found buyers here. The suqs buzzed with activity from dawn to dusk, falling quiet only for prayers. During the plague, empty market stalls signaled economic collapse.`,
    inGameRelevance: `The Market District is the most diverse and active area. All professions and ethnicities mix here. It's the best place to find goods, information, and contacts. During plague outbreaks, the crowds make it dangerous.`,
    wikipediaSearchTerm: 'Souq',
    relatedEntries: ['silk-merchant', 'spice-merchant', 'money-changer'],
    tags: ['commercial', 'diverse', 'central'],
  },
  {
    id: 'residential-quarter',
    category: 'districts',
    title: 'Residential Quarter',
    subtitle: 'The Haras',
    shortDescription: 'Middle-class neighborhoods where artisans and merchants live in courtyard houses along quiet lanes.',
    fullDescription: `Residential quarters (haras) were relatively homogeneous neighborhoods organized around shared identities—religious, ethnic, or professional. Narrow streets and cul-de-sacs provided security and privacy. Courtyard houses faced inward, presenting blank walls to the street.

Neighborhoods often had their own small mosques, baths, and shops serving local needs. Gates could be closed at night for security.`,
    historicalContext: `Damascus was organized into distinct quarters with strong neighborhood identities. Residents knew their neighbors and strangers were noticed. This social cohesion could help during crises but also facilitated disease spread within closely-connected communities.`,
    inGameRelevance: `Residential quarters are more homogeneous than markets. NPCs here are neighbors who know each other. Community bonds are strong but so is disease transmission once plague enters a neighborhood.`,
    wikipediaSearchTerm: 'Damascus#Architecture',
    relatedEntries: [],
    tags: ['residential', 'community'],
  },
  {
    id: 'wealthy-quarter',
    category: 'districts',
    title: 'Wealthy Quarter',
    subtitle: 'Al-Salihiyya',
    shortDescription: 'Prosperous neighborhoods with grand mansions, gardens, and the homes of elite families.',
    fullDescription: `Wealthy quarters featured spacious mansions with elaborate courtyards, gardens, and fountains. Here lived the elite: high officials, wealthy merchants, and religious notables. The architecture reflected their status with fine decoration and ample space.

These areas often clustered around prestigious mosques and madrasas, where wealthy patrons demonstrated piety through endowments.`,
    historicalContext: `Damascus's wealthy quarters, like al-Salihiyya on Mount Qasiyun's slopes, housed the most privileged residents. They had better sanitation and less crowding than poor areas. However, the plague proved no respecter of wealth—elites died alongside the poor.`,
    inGameRelevance: `Wealthy quarters have higher-status NPCs: nobles, rich merchants, high clergy. Security is better and disease may spread more slowly due to less crowding. But elite households are not immune to plague.`,
    wikipediaSearchTerm: 'Damascus',
    relatedEntries: ['nobility', 'clergy'],
    tags: ['elite', 'prosperous'],
  },
  {
    id: 'slums',
    category: 'districts',
    title: 'Slums',
    subtitle: 'The Hovels',
    shortDescription: 'Impoverished areas with crowded housing, poor sanitation, and the most vulnerable populations.',
    fullDescription: `The poorest areas of Damascus featured overcrowded housing, inadequate sanitation, and desperate poverty. Here lived laborers, beggars, recent migrants, and the destitute. Multiple families might share single rooms.

These areas lacked the infrastructure of wealthier quarters: no gardens, minimal water access, and inadequate waste disposal. Disease spread rapidly in such conditions.`,
    historicalContext: `Every medieval city had its slums, and Damascus was no exception. The poor were most vulnerable to famine, disease, and violence. During the plague, death rates in poor quarters far exceeded those in wealthy areas—though the plague killed everywhere.`,
    inGameRelevance: `Slums have the highest disease transmission. NPCs here are poor and desperate. Shia Muslims are more common. This is where the plague hits hardest and where social breakdown first becomes visible.`,
    wikipediaSearchTerm: 'Slum',
    relatedEntries: ['beggar', 'shia-islam'],
    tags: ['poor', 'vulnerable', 'crowded'],
  },
  {
    id: 'caravanserai',
    category: 'districts',
    title: 'Caravanserai',
    subtitle: 'Khan',
    shortDescription: 'The commercial district hosting traveling merchants, with warehouses, inns, and international trade.',
    fullDescription: `The caravanserai district centered on the great khans—fortified inns with central courtyards where merchant caravans rested and traded. These massive structures provided lodging, stabling, storage, and commercial facilities all in one complex.

The area bustled with foreign merchants: Venetians, Armenians, Persians, and traders from across the Islamic world. Different languages and customs mingled.`,
    historicalContext: `Damascus was a crucial stop on trans-continental trade routes. The caravanserai district was the most international part of the city, where European merchants had their fondachi and Eastern goods met Western buyers. This internationalism also meant potential disease importation from distant lands.`,
    inGameRelevance: `The caravanserai is the most international district. Italian, Armenian, Persian, and other foreign NPCs are common. It's where plague might first arrive from infected trade routes. News from distant cities comes here first.`,
    wikipediaSearchTerm: 'Caravanserai',
    relatedEntries: ['venetian', 'armenian', 'silk-merchant', 'innkeeper'],
    tags: ['commercial', 'international', 'travel'],
  },
  {
    id: 'religious-district',
    category: 'districts',
    title: 'Religious District',
    subtitle: 'Around the Umayyad Mosque',
    shortDescription: 'The spiritual heart of Damascus, centered on the great Umayyad Mosque with its madrasas and shrines.',
    fullDescription: `The area around the Umayyad Mosque—one of Islam's holiest sites—formed the spiritual center of Damascus. Madrasas, Sufi lodges, and shrines clustered nearby. Scholars, students, and pilgrims filled the streets.

The mosque itself was magnificent, incorporating the former Cathedral of St. John the Baptist and containing what was believed to be John the Baptist's head. It remained a site of Christian as well as Muslim veneration.`,
    historicalContext: `The Umayyad Mosque dated to the early Islamic period and symbolized Damascus's importance in Islamic history. The caliphs had ruled from here. The religious district attracted scholars and pilgrims from across the Islamic world, making it a center of learning and piety.`,
    inGameRelevance: `The religious district has high-status religious NPCs: scholars, Sufi shaykhs, pilgrims. It's a place of learning and piety. During the plague, it becomes a center of prayer, interpretation, and funeral rites.`,
    wikipediaSearchTerm: 'Umayyad Mosque',
    relatedEntries: ['imam', 'qadi', 'sufi-shaykh', 'scholar', 'sunni-islam'],
    tags: ['religious', 'prestigious', 'scholarly'],
  },
];

// ============================================================================
// DAILY LIFE (8 entries)
// ============================================================================

const DAILY_LIFE_ENTRIES: GuideEntry[] = [
  {
    id: 'islamic-prayer',
    category: 'dailyLife',
    title: 'Islamic Prayer Times',
    subtitle: 'The Five Pillars',
    shortDescription: 'The five daily prayers (salat) that structure Muslim life, called from minarets across the city.',
    fullDescription: `Five times daily, the muezzin's call echoes from minarets across Damascus, summoning the faithful to prayer. These prayers—Fajr (dawn), Dhuhr (noon), Asr (afternoon), Maghrib (sunset), and Isha (night)—structure the rhythm of daily life.

Prayer is one of the Five Pillars of Islam. Muslims may pray individually or gather at mosques, especially for Friday noon prayers. The ritual involves prescribed movements and recitations.`,
    historicalContext: `The call to prayer (adhan) was a defining sound of Damascus. Markets might pause briefly for prayer; devout shopkeepers prayed in their stalls. Friday noon prayer drew large congregations to mosques, where the imam's sermon (khutba) addressed community concerns.`,
    inGameRelevance: `Prayer times affect NPC behavior. Activity may pause briefly for prayers; Friday is the main congregational day. During plague, prayers for deliverance intensify. Time of day can be gauged by prayer calls.`,
    wikipediaSearchTerm: 'Salat',
    relatedEntries: ['imam', 'muezzin', 'sunni-islam'],
    tags: ['religion', 'daily-rhythm'],
  },
  {
    id: 'hammam',
    category: 'dailyLife',
    title: 'The Hammam',
    subtitle: 'Public Baths',
    shortDescription: 'Public bathhouses essential for hygiene, ritual purity, and social life in Islamic cities.',
    fullDescription: `The hammam (bathhouse) was central to Islamic urban life. Muslims required ritual purity for prayer, and the hammam provided both spiritual cleanliness and physical hygiene. Beyond religious function, hammams were social spaces for relaxation and conversation.

Hammams operated on gendered schedules—men and women at different times or in separate facilities. They featured hot rooms, cold rooms, and massage services.`,
    historicalContext: `Damascus had numerous hammams serving different neighborhoods. A visit might include hours of bathing, socializing, and relaxation. Special occasions—weddings, births—often involved hammam visits. The institution continued Roman/Byzantine bathing traditions adapted to Islamic requirements.`,
    inGameRelevance: `The hammam is a social gathering place where NPCs from various backgrounds mingle. It's a source of gossip and community information. Whether hammams spread or prevent disease during plague was historically debated.`,
    wikipediaSearchTerm: 'Hammam',
    relatedEntries: ['bathhouse-owner', 'bathhouse-attendant'],
    tags: ['social', 'hygiene', 'daily-life'],
  },
  {
    id: 'medieval-medicine',
    category: 'dailyLife',
    title: 'Medieval Medicine',
    subtitle: 'Humoral Theory',
    shortDescription: 'The Galenic-Arabic medical tradition based on balancing the four bodily humors.',
    fullDescription: `Medieval Islamic medicine followed the humoral theory inherited from Greek physicians via Arabic translations. Health depended on balance among four humors: blood, phlegm, yellow bile, and black bile. Disease resulted from imbalance.

Treatment aimed to restore balance through diet, drugs, bloodletting, and other interventions. Islamic physicians had developed sophisticated pharmacology and surgical techniques.`,
    historicalContext: `Damascus's bimaristans (hospitals) and medical schools produced learned physicians. But when plague struck, humoral medicine failed. The disease didn't respond to standard treatments, challenging medical theory. Physicians died alongside their patients.`,
    inGameRelevance: `NPCs understand disease through humoral theory, not germ theory. They may blame plague on corrupted air (miasma), astrological influences, or divine punishment. Medical efforts are largely ineffective against plague.`,
    wikipediaSearchTerm: 'Humorism',
    relatedEntries: ['hakim', 'pharmacist'],
    tags: ['medicine', 'knowledge'],
  },
  {
    id: 'mamluk-system',
    category: 'dailyLife',
    title: 'The Mamluk System',
    subtitle: 'Slave Soldiers as Rulers',
    shortDescription: 'The unique system where military slaves became the ruling elite of Egypt and Syria.',
    fullDescription: `The Mamluk system was remarkable: young boys, purchased as slaves from the Eurasian steppes or Caucasus, were trained as elite soldiers, converted to Islam, and freed upon completing their training. These manumitted slaves then formed the military elite, and their commanders became sultans.

Mamluks couldn't pass their status to their sons—each generation was recruited anew. This prevented hereditary aristocracy but also meant constant competition for power.`,
    historicalContext: `In 1348, the Bahri Mamluk dynasty ruled, dominated by Turkic Mamluks. The sultan in Cairo controlled both Egypt and Syria. Local Mamluk commanders governed Damascus. The system had proved militarily effective—Mamluks had stopped both Crusaders and Mongols.`,
    inGameRelevance: `The Mamluk system explains why Turkic and Circassian soldiers rule over Arabic-speaking populations. It's essential context for understanding social hierarchy. Mamluk power depended on military strength—plague losses threatened the system.`,
    wikipediaSearchTerm: 'Mamluk',
    relatedEntries: ['turkic', 'circassian', 'soldier'],
    tags: ['politics', 'military', 'society'],
  },
  {
    id: 'womens-lives',
    category: 'dailyLife',
    title: 'Women\'s Lives',
    subtitle: 'The Harem and Beyond',
    shortDescription: 'The world of women in medieval Damascus, largely domestic but with economic and social roles.',
    fullDescription: `Women's lives in medieval Damascus centered on the domestic sphere but were not limited to it. The harem (women's quarters) was a private family space, not the Western fantasy of a "harem." Women managed households, raised children, and participated in family business.

Women could own property, conduct business, and appear in court. Some worked as midwives, mourners, bathhouse attendants, or in textile production. Wealthy women wielded influence through family networks.`,
    historicalContext: `Gender segregation varied by class—poor women had more mobility by necessity. Women of different religions faced similar expectations adapted to their faith traditions. The veil was common for respectable women in public.`,
    inGameRelevance: `Female NPCs have specific profession options and social constraints. They may be encountered in markets (often with male relatives), at hammams (women's hours), or in their roles as midwives, mourners, etc. Gender affects interaction norms.`,
    wikipediaSearchTerm: 'Women in Islam',
    relatedEntries: ['midwife', 'washer-of-the-dead', 'matchmaker'],
    tags: ['gender', 'society', 'daily-life'],
  },
  {
    id: 'trade-routes',
    category: 'dailyLife',
    title: 'Trade Routes',
    subtitle: 'Crossroads of the World',
    shortDescription: 'Damascus\'s position at the intersection of major trade routes connecting three continents.',
    fullDescription: `Damascus sat at a crucial intersection of medieval trade routes. The Silk Road brought Chinese silk and Central Asian goods. Indian Ocean trade via the Red Sea delivered spices and textiles. Mediterranean routes connected to Europe. Overland routes linked Egypt, Iraq, and Anatolia.

This position made Damascus one of the medieval world's great commercial centers. Caravans arrived constantly, their goods distributed through the city's markets.`,
    historicalContext: `Trade was Damascus's lifeblood. The city prospered when routes were secure and suffered when they were disrupted. Mongol invasions, Crusader conflicts, and now plague all threatened the commerce that sustained urban life.`,
    inGameRelevance: `Trade routes explain the diversity of goods and people in Damascus. They also explain how plague arrived—following merchant routes from Central Asia. Disrupted trade means economic collapse and scarcity.`,
    wikipediaSearchTerm: 'Silk Road',
    relatedEntries: ['caravanserai', 'silk-merchant', 'spice-merchant'],
    tags: ['commerce', 'international', 'economy'],
  },
  {
    id: 'food-cuisine',
    category: 'dailyLife',
    title: 'Food and Cuisine',
    subtitle: 'The Damascus Table',
    shortDescription: 'The rich culinary traditions of medieval Damascus, from street food to elite banquets.',
    fullDescription: `Damascus offered diverse foods: bread (the staple), rice, legumes, vegetables, fruits, and for those who could afford it, meat. Spices from India flavored dishes. Sweets included pastries, dried fruits, and the honey-based confections later known as Turkish delight.

Street vendors sold ready-to-eat foods. Cookshops served those without home kitchens. Elite households employed cooks for elaborate meals.`,
    historicalContext: `Diet varied enormously by wealth. The poor ate mostly bread and vegetables; the rich enjoyed meat, fruits, and spices. Islamic dietary laws (halal) shaped food preparation. Christians and Jews had their own requirements. Communal meals reinforced social bonds.`,
    inGameRelevance: `Food scarcity is a plague symptom as farmers die and trade collapses. Street food vendors may be early casualties. Diet can indicate social class. Feeding the sick and burying the dead competed for community resources.`,
    wikipediaSearchTerm: 'Arab cuisine',
    relatedEntries: ['baker', 'butcher', 'cook'],
    tags: ['food', 'daily-life', 'economy'],
  },
  {
    id: 'clothing-fashion',
    category: 'dailyLife',
    title: 'Clothing and Fashion',
    subtitle: 'Robes of Damascus',
    shortDescription: 'The textiles and garments that clothed Damascus\'s diverse population, from rough wool to fine silk.',
    fullDescription: `Clothing marked identity in medieval Damascus. Muslims, Christians, and Jews wore distinguishing garments or colors (though enforcement varied). Social class showed in fabric quality—fine silk for the wealthy, rough wool or cotton for the poor.

Men typically wore robes (thawbs) with turbans or caps. Women wore long garments and veils of varying styles. Regional and ethnic variations added diversity.`,
    historicalContext: `Damascus was famous for its textiles, especially damask silk. The clothing trade employed weavers, dyers, tailors, and merchants. Religious law and sumptuary regulations aimed to maintain visual distinctions between groups.`,
    inGameRelevance: `NPC appearance reflects religion, ethnicity, and social class through clothing. Wealthy NPCs wear fine textiles; poor ones wear rough fabric. Religious minorities may have distinctive elements. The textile trade is economically central.`,
    wikipediaSearchTerm: 'Arab dress',
    relatedEntries: ['weaver', 'dyer', 'silk-merchant', 'textile-merchant'],
    tags: ['fashion', 'identity', 'economy'],
  },
];

// ============================================================================
// THE PLAGUE (4 entries)
// ============================================================================

const PLAGUE_ENTRIES: GuideEntry[] = [
  {
    id: 'black-death-overview',
    category: 'thePlague',
    title: 'The Black Death',
    subtitle: 'The Great Mortality',
    shortDescription: 'The devastating pandemic of 1346-1353 that killed perhaps half of the Old World\'s population.',
    fullDescription: `The Black Death was the deadliest pandemic in recorded history. Beginning in Central Asia in the 1340s, it spread along trade routes, reaching the Mediterranean by 1347 and spreading throughout Europe, the Middle East, and North Africa by 1348-1350.

The disease killed with terrifying speed. Victims developed buboes (swollen lymph nodes), fever, and often died within days. Death rates in affected areas reached 30-60%.`,
    historicalContext: `The plague arrived in the Mamluk Sultanate in 1347-1348, devastating Egypt and Syria. Damascus was hit hard. The catastrophe challenged all existing frameworks—religious, medical, social. Nothing in experience prepared people for such mortality.`,
    inGameRelevance: `The Black Death is the central crisis of the game. It transforms the thriving city into a charnel house. Understanding that this is a historical catastrophe of unprecedented scale helps contextualize the horror NPCs experience.`,
    wikipediaSearchTerm: 'Black Death',
    relatedEntries: ['plague-in-damascus', 'plague-theories', 'plague-social-impact'],
    tags: ['disease', 'catastrophe', 'history'],
  },
  {
    id: 'plague-in-damascus',
    category: 'thePlague',
    title: 'Plague in Damascus',
    subtitle: '1348 AD',
    shortDescription: 'The arrival and devastation of the Black Death in Damascus during the year 1348.',
    fullDescription: `The plague reached Damascus in 1348, probably arriving via trade routes from Egypt or Anatolia. The city was unprepared. Death toll estimates suggest a third to half of the population perished in waves of mortality.

Mass graves filled. Funeral services became impossible as corpses accumulated faster than they could be buried. Economic life collapsed as workers died and markets emptied.`,
    historicalContext: `Contemporary accounts describe the horror: bodies in the streets, abandoned homes, overwhelmed gravediggers. The famous Damascene scholar Ibn Kathir chronicled the disaster. Religious processions sought divine mercy. Society strained and sometimes broke.`,
    inGameRelevance: `The game depicts Damascus as the plague strikes and spreads. Players witness the transformation from bustling city to death zone. Historical accounts provide reference for the game's portrayal of catastrophe.`,
    wikipediaSearchTerm: 'Black Death in the Middle East',
    relatedEntries: ['black-death-overview', 'plague-theories', 'plague-social-impact'],
    tags: ['disease', 'damascus', 'history'],
  },
  {
    id: 'plague-theories',
    category: 'thePlague',
    title: 'Medieval Plague Theories',
    subtitle: 'Miasma, Humors, and Divine Wrath',
    shortDescription: 'How medieval people understood and explained the plague without knowledge of bacteria.',
    fullDescription: `Medieval people had no knowledge of bacteria or disease transmission as we understand it. They explained plague through available frameworks: corrupted air (miasma), imbalanced humors, astrological influences, and divine punishment for sin.

"Miasma theory" held that foul air—from swamps, decaying matter, or unknown sources—caused disease. The remedy was flight or purifying the air with aromatics. Humoral medicine tried to rebalance the body. Religious interpretations saw plague as God's punishment.`,
    historicalContext: `All these explanations failed to stop the plague. Physicians' advice was useless. Prayer and procession didn't halt mortality. This failure of all frameworks—medical, religious, social—was part of the plague's trauma. Faith persisted but was tested.`,
    inGameRelevance: `NPCs interpret plague through these historical frameworks. They blame bad air, divine anger, or astrological conjunctions—not bacteria. Their responses (flight, aromatics, prayer, scapegoating) reflect historical behavior, not modern understanding.`,
    wikipediaSearchTerm: 'Miasma theory',
    relatedEntries: ['black-death-overview', 'medieval-medicine', 'hakim'],
    tags: ['medicine', 'religion', 'theory'],
  },
  {
    id: 'plague-social-impact',
    category: 'thePlague',
    title: 'Social Impact',
    subtitle: 'A World Transformed',
    shortDescription: 'How the Black Death disrupted families, economics, religion, and social order.',
    fullDescription: `The plague shattered social bonds. Families fled infected members. Corpses lay unburied as gravediggers died. The economy collapsed as workers perished and markets closed. Inheritance disputes multiplied as entire families died.

The psychological trauma was immense. Survivors faced grief, guilt, and existential crisis. Religious faith was both strengthened and challenged. Social order strained but did not entirely collapse.`,
    historicalContext: `In the Islamic world, religious leaders debated whether flight from plague was permissible (the Prophet had forbidden it). Sufi interpretations saw plague as martyrdom. Economic recovery took generations. The political impacts weakened the Mamluk Sultanate.`,
    inGameRelevance: `Social breakdown is visible as plague progresses: abandoned shops, unburied dead, desperate survivors. NPCs show psychological impacts: panic, despair, resignation, or intensified faith. The game depicts a society under extreme stress.`,
    wikipediaSearchTerm: 'Consequences of the Black Death',
    relatedEntries: ['black-death-overview', 'plague-in-damascus'],
    tags: ['society', 'psychology', 'consequences'],
  },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const GUIDE_ENTRIES: GuideEntry[] = [
  ...RELIGION_ENTRIES,
  ...ETHNICITY_ENTRIES,
  ...PROFESSION_ENTRIES,
  ...DISTRICT_ENTRIES,
  ...DAILY_LIFE_ENTRIES,
  ...PLAGUE_ENTRIES,
];

// Helper function to find entry by title (case-insensitive)
export function findGuideEntry(title: string): GuideEntry | undefined {
  return GUIDE_ENTRIES.find(
    entry => entry.title.toLowerCase() === title.toLowerCase() ||
             entry.id === title.toLowerCase().replace(/\s+/g, '-')
  );
}

// Helper function to get entries by category
export function getEntriesByCategory(category: GuideEntry['category']): GuideEntry[] {
  return GUIDE_ENTRIES.filter(entry => entry.category === category);
}
