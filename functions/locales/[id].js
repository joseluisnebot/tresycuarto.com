const CIUDADES_SLUGS = {
  "madrid": "Madrid",
  "barcelona": "Barcelona",
  "valencia": "Valencia",
  "sevilla": "Sevilla",
  "bilbao": "Bilbao",
  "malaga": "Málaga",
  "zaragoza": "Zaragoza",
  "murcia": "Murcia",
  "cadiz": "Cádiz",
  "cartagena": "Cartagena",
  "cordoba": "Córdoba",
  "cuenca": "Cuenca",
  "granada": "Granada",
  "jerez": "Jerez de la Frontera",
  "jerez-de-la-frontera": "Jerez de la Frontera",
  "leon": "León",
  "lorca": "Lorca",
  "valladolid": "Valladolid",
  "zamora": "Zamora",
};

const CIUDADES = ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia"];

const CIUDAD_CONTENT = {
  "Madrid": {
    intro: "El tardeo madrileño tiene su propio ritmo. Entre las 16h y las 21h, la capital se llena de terrazas animadas, bares de vermut y cafés con carácter. Malasaña, La Latina, Chueca y Lavapiés son los epicentros de un ocio de tarde que Madrid ha convertido en seña de identidad.",
    barrios: ["Malasaña", "La Latina", "Chueca", "Lavapiés", "Salamanca"],
    faqs: [
      { q: "¿Dónde tardeear en Madrid?", a: "Los mejores barrios para tardeear en Madrid son Malasaña, La Latina y Chueca, con cientos de bares, terrazas y cafés abiertos desde las 16h." },
      { q: "¿A qué hora empieza el tardeo en Madrid?", a: "El tardeo madrileño suele arrancar entre las 16h y las 17h, especialmente los fines de semana, y se extiende hasta las 20h-21h." },
      { q: "¿Qué locales tienen terraza en Madrid?", a: "Madrid tiene una gran oferta de terrazas. En tresycuarto encontrarás todos los locales con terraza en Madrid filtrados por barrio y tipo." },
      { q: "¿Cuántos bares hay en Madrid para el tardeo?", a: `En tresycuarto tenemos más de 3.600 locales mapeados en Madrid entre bares, cafeterías, pubs y terrazas.` },
    ],
  },
  "Barcelona": {
    intro: "Barcelona combina la cultura del vermut con las terrazas del Mediterráneo. El Eixample, el Born y Gràcia son los epicentros del tardeo barcelonés, con una oferta que va desde los bares de toda la vida hasta los locales con más ambiente de la ciudad.",
    barrios: ["El Born", "Gràcia", "Eixample", "El Raval", "Barceloneta"],
    faqs: [
      { q: "¿Dónde tardeear en Barcelona?", a: "Los barrios más animados para el tardeo en Barcelona son El Born, Gràcia y el Eixample, con una enorme concentración de bares y terrazas." },
      { q: "¿Cuál es la mejor zona de vermut en Barcelona?", a: "El barrio de Gràcia y El Born son las zonas clásicas de vermut en Barcelona, con bares tradicionales abiertos desde el mediodía." },
      { q: "¿Hay terrazas en Barcelona para el tardeo?", a: "Sí, Barcelona tiene una de las mayores ofertas de terrazas de España. En tresycuarto encontrarás más de 500 locales con terraza en la ciudad." },
      { q: "¿A qué hora es el tardeo en Barcelona?", a: "El tardeo en Barcelona arranca habitualmente a partir de las 17h y se alarga hasta las 21h, especialmente en primavera y verano." },
    ],
  },
  "Valencia": {
    intro: "Valencia, cuna del agua de Valencia y los mercados de abastos, tiene una escena de tardeo vibrante. El Carmen, Ruzafa y el Cabanyal concentran los mejores bares y cafeterías para disfrutar de las tardes levantinas con buen clima casi todo el año.",
    barrios: ["El Carmen", "Ruzafa", "Cabanyal", "Benimaclet", "Centro"],
    faqs: [
      { q: "¿Dónde tardeear en Valencia?", a: "Ruzafa y El Carmen son los barrios de referencia para el tardeo en Valencia, con una gran concentración de bares modernos y terrazas." },
      { q: "¿Cuándo es el tardeo en Valencia?", a: "El tardeo valenciano es especialmente activo los fines de semana a partir de las 16h, aprovechando el buen clima mediterráneo." },
      { q: "¿Qué es el tardeo en Valencia?", a: "El tardeo en Valencia es la costumbre de salir a bares, cafeterías y terrazas entre la merienda y la cena, generalmente de 16h a 21h." },
      { q: "¿Cuáles son los mejores bares de tarde en Valencia?", a: "En tresycuarto tienes más de 750 locales de tardeo en Valencia con dirección, horario y fotos." },
    ],
  },
  "Sevilla": {
    intro: "Sevilla es la capital del tardeo andaluz. La Alameda de Hércules, Triana y el Casco Antiguo albergan cientos de bares donde el ambiente de tarde es una institución. El clima sevillano convierte el tardeo en una actividad de casi todo el año.",
    barrios: ["Alameda de Hércules", "Triana", "Casco Antiguo", "Macarena", "Los Remedios"],
    faqs: [
      { q: "¿Dónde tardeear en Sevilla?", a: "La Alameda de Hércules y Triana son las zonas más animadas para el tardeo en Sevilla, con bares y terrazas llenos a partir de las 17h." },
      { q: "¿Cuál es el mejor barrio de tapas de tarde en Sevilla?", a: "La Alameda de Hércules, Triana y el Casco Antiguo concentran la mayor oferta de bares de tapas para el tardeo sevillano." },
      { q: "¿A qué hora se sale de tarde en Sevilla?", a: "En Sevilla el tardeo empieza pronto, sobre las 16h-17h, y es especialmente vibrante los jueves, viernes y fines de semana." },
      { q: "¿Cuántos locales de tardeo hay en Sevilla?", a: "En tresycuarto tenemos más de 1.700 locales mapeados en Sevilla entre bares, cafeterías y terrazas." },
    ],
  },
  "Bilbao": {
    intro: "El tardeo bilbaíno gira en torno a los pintxos y el txakoli. El Casco Viejo y el Ensanche son los puntos de encuentro de una ciudad que entiende el ocio de tarde como una forma de vida, con bares que abren desde el mediodía y se llenan de ambiente.",
    barrios: ["Casco Viejo", "Ensanche", "Indautxu", "San Francisco", "Abando"],
    faqs: [
      { q: "¿Dónde tardeear en Bilbao?", a: "El Casco Viejo de Bilbao es el epicentro del tardeo, con cientos de bares de pintxos y txikiteos que se llenan cada tarde." },
      { q: "¿Qué es el txikiteo en Bilbao?", a: "El txikiteo es la tradición bilbaína de ir de bar en bar tomando txikitos (pequeños vasos de vino) con pintxos, especialmente por las tardes." },
      { q: "¿Cuándo es el mejor momento para tardeear en Bilbao?", a: "Los jueves y viernes por la tarde son especialmente animados en Bilbao, aunque el Casco Viejo tiene ambiente cualquier día de la semana." },
      { q: "¿Cuáles son los mejores bares de pintxos de tarde en Bilbao?", a: "En tresycuarto tienes casi 1.000 locales mapeados en Bilbao con toda la información para planificar tu tardeo." },
    ],
  },
  "Málaga": {
    intro: "Málaga, con su clima mediterráneo privilegiado, ofrece uno de los mejores tardeos de España. El Centro Histórico, el Soho y el barrio de El Perchel concentran una oferta de bares y terrazas que se disfrutan prácticamente todo el año bajo el sol malagueño.",
    barrios: ["Centro Histórico", "Soho", "El Perchel", "La Malagueta", "Pedregalejo"],
    faqs: [
      { q: "¿Dónde tardeear en Málaga?", a: "El Centro Histórico de Málaga y el Soho son las zonas más animadas para el tardeo, con terrazas y bares abiertos toda la tarde." },
      { q: "¿Cuándo es el tardeo en Málaga?", a: "En Málaga el tardeo se disfruta prácticamente todo el año gracias al clima. Los horarios habituales son de 16h a 21h." },
      { q: "¿Cuáles son las mejores terrazas de tarde en Málaga?", a: "Málaga tiene una gran oferta de terrazas en el Paseo Marítimo, el Centro Histórico y el barrio del Soho." },
      { q: "¿Qué hacer de tarde en Málaga?", a: "El tardeo en Málaga combina la cultura del vino de la tierra, las tapas y las terrazas al sol. En tresycuarto tienes más de 1.500 locales mapeados." },
    ],
  },
  "Zaragoza": {
    intro: "Zaragoza tiene una tradición de tardeo arraigada en el Casco Histórico y en El Tubo, la zona de tapas más conocida de la ciudad. Cafés con solera, bares de vinos y terrazas se suceden en un ambiente tranquilo y cercano que hace de Zaragoza una ciudad muy agradable para el ocio de tarde.",
    barrios: ["El Tubo", "Casco Histórico", "Centro", "Delicias", "Las Fuentes"],
    faqs: [
      { q: "¿Dónde tardeear en Zaragoza?", a: "El Tubo y el Casco Histórico de Zaragoza son las zonas de referencia para el tardeo, con una alta concentración de bares y tapas." },
      { q: "¿Qué es El Tubo en Zaragoza?", a: "El Tubo es la zona de bares más famosa de Zaragoza, un conjunto de calles del Casco Histórico repletas de bares de tapas y raciones." },
      { q: "¿A qué hora se sale de tarde en Zaragoza?", a: "El tardeo zaragozano empieza habitualmente a las 16h-17h y los bares del Tubo se llenan especialmente los fines de semana." },
      { q: "¿Cuántos locales de tardeo hay en Zaragoza?", a: "En tresycuarto tenemos más de 1.000 locales mapeados en Zaragoza con dirección, horario y contacto." },
    ],
  },
  "Murcia": {
    intro: "Murcia concentra su tardeo en el Barrio del Carmen y la Plaza de las Flores, dos de los puntos de encuentro más animados del sureste español. Con un clima cálido y una gran afición por las tapas, Murcia ofrece un tardeo auténtico y muy asequible.",
    barrios: ["Barrio del Carmen", "Plaza de las Flores", "Centro", "La Fama", "El Ranero"],
    faqs: [
      { q: "¿Dónde tardeear en Murcia?", a: "El Barrio del Carmen y la Plaza de las Flores son los centros del tardeo en Murcia, con bares y terrazas animadas cada tarde." },
      { q: "¿Cuándo es el tardeo en Murcia?", a: "El tardeo en Murcia es especialmente activo los jueves, viernes y fines de semana a partir de las 17h." },
      { q: "¿Qué tapas hay en el tardeo de Murcia?", a: "Murcia es famosa por sus tapas de ensaladilla, michirones y zarangollo, que acompañan el vino y la cerveza en el tardeo murciano." },
      { q: "¿Cuáles son los mejores bares de tarde en Murcia?", a: "En tresycuarto tienes más de 200 locales mapeados en Murcia para planificar tu tardeo con toda la información." },
    ],
  },
  "Cádiz": {
    intro: "Cádiz vive su Semana Santa como pocos lugares del mundo, y su tardeo antes y después de los desfiles es una experiencia única. El barrio del Pópulo, la Viña y el centro histórico albergan bares y tabernas donde se mezcla la tradición cofrade con el ambiente gaditano más genuino.",
    barrios: ["Pópulo", "La Viña", "Centro Histórico", "La Caleta", "Santa María"],
    faqs: [
      { q: "¿Dónde tardeear en Cádiz en Semana Santa?", a: "El barrio del Pópulo y La Viña son los mejores lugares para el tardeo en Cádiz durante la Semana Santa, con bares tradicionales y el ambiente cofrade." },
      { q: "¿Cuándo es la Semana Santa de Cádiz?", a: "La Semana Santa de Cádiz es una de las más emotivas de Andalucía, con procesiones que recorren el casco histórico entre el Domingo de Ramos y el Domingo de Resurrección." },
      { q: "¿Qué tapas tomar en el tardeo de Cádiz?", a: "El tardeo gaditano va acompañado de atún de almadraba, tortillitas de camarones y chicharrones, ideales con una copa de manzanilla." },
      { q: "¿Cuántos locales de tardeo hay en Cádiz?", a: "En tresycuarto tienes más de 170 locales mapeados en Cádiz para planificar tu tardeo durante la Semana Santa y el resto del año." },
    ],
  },
  "Cartagena": {
    intro: "Cartagena celebra una de las Semanas Santas más espectaculares de España, declarada de Interés Turístico Internacional. Entre procesión y procesión, la Calle Mayor y el barrio de Santa Lucía ofrecen bares y tabernas donde el tardeo cartagenero se vive con pasión cofrade.",
    barrios: ["Calle Mayor", "Santa Lucía", "Centro", "El Ensanche", "La Manga"],
    faqs: [
      { q: "¿Dónde tardeear en Cartagena en Semana Santa?", a: "La Calle Mayor y sus alrededores son el centro del tardeo en Cartagena, especialmente durante la Semana Santa con el ambiente cofrade en su apogeo." },
      { q: "¿Por qué es famosa la Semana Santa de Cartagena?", a: "La Semana Santa de Cartagena es Interés Turístico Internacional, conocida por sus espectaculares procesiones y la rivalidad entre los grupos marrajos y californios." },
      { q: "¿Qué tomar en el tardeo de Cartagena?", a: "El caldero cartagenero, los buenos vinos de la Región de Murcia y las tapas de la zona hacen del tardeo en Cartagena una experiencia gastronómica única." },
      { q: "¿Cuántos locales de tardeo hay en Cartagena?", a: "En tresycuarto tienes más de 300 locales mapeados en Cartagena con toda la información para tu tardeo." },
    ],
  },
  "Córdoba": {
    intro: "Córdoba vive su Semana Santa con una solemnidad y recogimiento únicos. La Mezquita-Catedral, la Judería y el barrio de San Basilio son el escenario de procesiones milenarias, y sus calles albergan tabernas y bodegas donde el tardeo cordobés se disfruta entre el aroma del azahar en primavera.",
    barrios: ["Judería", "San Basilio", "Centro Histórico", "La Corredera", "Cruz Conde"],
    faqs: [
      { q: "¿Dónde tardeear en Córdoba en Semana Santa?", a: "La zona de La Corredera y el Centro Histórico de Córdoba son perfectos para el tardeo durante la Semana Santa, con tabernas y bodegas tradicionales." },
      { q: "¿Cuándo es la Semana Santa de Córdoba?", a: "La Semana Santa de Córdoba es Interés Turístico Nacional, con procesiones que recorren el casco histórico junto a la Mezquita-Catedral." },
      { q: "¿Qué comer en el tardeo de Córdoba?", a: "El salmorejo, el flamenquín y los chocos a la plancha son imprescindibles en el tardeo cordobés, acompañados de un fino o una cerveza bien fría." },
      { q: "¿Cuántos locales de tardeo hay en Córdoba?", a: "En tresycuarto tienes más de 400 locales mapeados en Córdoba entre bares, tabernas y terrazas para planificar tu tardeo." },
    ],
  },
  "Cuenca": {
    intro: "Cuenca celebra una de las Semanas de Música Religiosa más importantes del mundo durante la Semana Santa, atrayendo a miles de visitantes. La Ciudad Alta y las Casas Colgadas son el escenario de un tardeo íntimo y tranquilo en bares con vistas únicas.",
    barrios: ["Ciudad Alta", "Ciudad Baja", "El Mangana", "Tiradores", "Buenavista"],
    faqs: [
      { q: "¿Qué hacer en Cuenca en Semana Santa?", a: "Cuenca celebra en Semana Santa la Semana de Música Religiosa, uno de los festivales más importantes del mundo, con conciertos en las iglesias históricas de la ciudad." },
      { q: "¿Dónde tardeear en Cuenca?", a: "La Ciudad Alta de Cuenca, junto a las Casas Colgadas, tiene bares y restaurantes con vistas espectaculares a la hoz del río Júcar." },
      { q: "¿Cuántos locales de tardeo hay en Cuenca?", a: "En tresycuarto tienes más de 60 locales mapeados en Cuenca para disfrutar del tardeo durante la Semana Santa y todo el año." },
      { q: "¿Cuándo es la Semana de Música Religiosa de Cuenca?", a: "La Semana de Música Religiosa de Cuenca se celebra coincidiendo con la Semana Santa, con conciertos en la Catedral y otros espacios históricos de la ciudad." },
    ],
  },
  "Granada": {
    intro: "Granada tiene una de las Semanas Santas más emocionantes de España, con procesiones que discurren bajo la Alhambra. El barrio del Realejo, Albaicín y el centro albergan bares donde el tardeo granadino se combina con la tradición de las tapas gratis con cada bebida.",
    barrios: ["Realejo", "Albaicín", "Centro", "Zaidín", "Ronda"],
    faqs: [
      { q: "¿Dónde tardeear en Granada en Semana Santa?", a: "El Realejo, el Albaicín y el centro de Granada son las mejores zonas para el tardeo durante la Semana Santa, con bares y terrazas con vistas a los monumentos." },
      { q: "¿Por qué es especial la Semana Santa de Granada?", a: "La Semana Santa de Granada destaca por sus procesiones que discurren bajo la Alhambra y por la participación de hermandades con siglos de historia." },
      { q: "¿En qué bares de Granada sirven tapas gratis?", a: "Granada mantiene la tradición de ofrecer una tapa gratuita con cada consumición. En tresycuarto encontrarás los mejores locales de tapas de Granada." },
      { q: "¿Cuántos locales de tardeo hay en Granada?", a: "En tresycuarto tienes más de 600 locales mapeados en Granada entre bares de tapas, terrazas y cafeterías para tu tardeo." },
    ],
  },
  "Jerez de la Frontera": {
    intro: "Jerez de la Frontera combina su Semana Santa con la tradición del jerez y la manzanilla. Las bodegas centenarias, la Calle Larga y el barrio de Santiago son el escenario de un tardeo jerezano donde el vino fino es protagonista absoluto.",
    barrios: ["Calle Larga", "Barrio de Santiago", "Centro", "El Arenal", "San Miguel"],
    faqs: [
      { q: "¿Dónde tardeear en Jerez en Semana Santa?", a: "La Calle Larga y el barrio de Santiago son los centros del tardeo en Jerez durante la Semana Santa, con bodegas y bares donde el jerez es el protagonista." },
      { q: "¿Por qué es famosa la Semana Santa de Jerez?", a: "La Semana Santa de Jerez es Interés Turístico Nacional, conocida por sus imponentes pasos tallados y el fervor cofrade que invade cada rincón de la ciudad." },
      { q: "¿Qué vino tomar en el tardeo de Jerez?", a: "El tardeo jerezano gira alrededor del fino, la manzanilla y el amontillado, los vinos de Jerez perfectos para acompañar tapas de jamón y mariscos." },
      { q: "¿Cuántos locales de tardeo hay en Jerez?", a: "En tresycuarto tienes más de 90 locales mapeados en Jerez de la Frontera para planificar tu tardeo durante la Semana Santa." },
    ],
  },
  "León": {
    intro: "León tiene una Semana Santa de procesiones austeras y solemnes, Interés Turístico Internacional, que contrasta con el ambiente animado del Barrio Húmedo. Esta zona legendaria de tapas y vinos convierte el tardeo leonés en una experiencia única en cualquier época del año.",
    barrios: ["Barrio Húmedo", "Barrio Romántico", "Centro", "Ensanche", "La Palomera"],
    faqs: [
      { q: "¿Dónde tardeear en León en Semana Santa?", a: "El Barrio Húmedo de León es el corazón del tardeo, con más de 60 bares concentrados en pocas calles que se llenan de vida después de las procesiones." },
      { q: "¿Por qué es famosa la Semana Santa de León?", a: "La Semana Santa de León es Interés Turístico Internacional, conocida por la procesión de las Capas Pardas y el sobrio recogimiento de sus cofradías." },
      { q: "¿Qué tapas hay en el Barrio Húmedo de León?", a: "En el Barrio Húmedo las tapas son gratis con cada consumición: cecina, morcilla, botillo y jamón son las más populares del tardeo leonés." },
      { q: "¿Cuántos locales de tardeo hay en León?", a: "En tresycuarto tienes más de 200 locales mapeados en León entre los bares del Barrio Húmedo, el Barrio Romántico y el centro." },
    ],
  },
  "Lorca": {
    intro: "La Semana Santa de Lorca es única en el mundo: los bordados son Patrimonio Cultural de la Humanidad y los desfiles bíblicos y de la antigüedad son espectaculares. Entre procesión y procesión, la calle Lope Gisbert y el centro de Lorca ofrecen bares para el tardeo lorquino.",
    barrios: ["Centro", "Calle Lope Gisbert", "San Diego", "El Calvario", "San Fernando"],
    faqs: [
      { q: "¿Por qué es famosa la Semana Santa de Lorca?", a: "La Semana Santa de Lorca es Patrimonio Cultural de la Humanidad, famosa por sus impresionantes bordados y los desfiles con representaciones bíblicas e históricas de gran espectacularidad." },
      { q: "¿Dónde tardeear en Lorca durante la Semana Santa?", a: "El centro de Lorca y la calle Lope Gisbert concentran los bares y cafeterías para el tardeo después de presenciar las procesiones." },
      { q: "¿Cuántos locales de tardeo hay en Lorca?", a: "En tresycuarto tienes locales mapeados en Lorca para planificar tu tardeo durante la espectacular Semana Santa lorquina." },
      { q: "¿Cuándo es la Semana Santa de Lorca?", a: "La Semana Santa de Lorca se celebra entre el Domingo de Ramos y el Domingo de Resurrección, con los grandes desfiles el Miércoles Santo y el Viernes Santo." },
    ],
  },
  "Valladolid": {
    intro: "Valladolid tiene la Semana Santa más importante de Castilla y León y una de las más relevantes de España. Sus pasos de Gregorio Fernández y Juan de Juni son obras maestras del arte, y el ambiente de tardeo en la Plaza Mayor y sus alrededores complementa perfectamente la experiencia cofrade.",
    barrios: ["Plaza Mayor", "Zona Centro", "El Val", "Delicias", "Huerta del Rey"],
    faqs: [
      { q: "¿Dónde tardeear en Valladolid en Semana Santa?", a: "La Plaza Mayor de Valladolid y el centro son los epicentros del tardeo durante la Semana Santa, con bares y restaurantes animados antes y después de las procesiones." },
      { q: "¿Por qué es famosa la Semana Santa de Valladolid?", a: "La Semana Santa de Valladolid es Interés Turístico Internacional y alberga el Museo Nacional de Escultura con los pasos originales de Gregorio Fernández, referente del barroco español." },
      { q: "¿Qué comer en el tardeo de Valladolid?", a: "El lechazo asado, los vinos de la Ribera del Duero y los pinchos del centro hacen del tardeo en Valladolid una experiencia gastronómica de primer nivel." },
      { q: "¿Cuántos locales de tardeo hay en Valladolid?", a: "En tresycuarto tienes más de 700 locales mapeados en Valladolid entre bares, cafeterías y restaurantes para tu tardeo." },
    ],
  },
  "Zamora": {
    intro: "Zamora tiene la Semana Santa más antigua de España, declarada de Interés Turístico Internacional. Sus calles medievales, la Catedral Románica y el barrio de la Horta son el escenario de unas procesiones únicas, y el tardeo zamorano en las zonas de pinchos completa una visita perfecta.",
    barrios: ["Casco Histórico", "La Horta", "Los Bloques", "La Lana", "Cabañales"],
    faqs: [
      { q: "¿Dónde tardeear en Zamora en Semana Santa?", a: "El casco histórico de Zamora y la zona de pinchos del centro son perfectos para el tardeo durante la Semana Santa más antigua de España." },
      { q: "¿Por qué es famosa la Semana Santa de Zamora?", a: "La Semana Santa de Zamora es la más antigua de España y tiene Interés Turístico Internacional, conocida por la sobriedad y el recogimiento de sus procesiones medievales." },
      { q: "¿Qué comer en el tardeo de Zamora?", a: "Los pinchos de bacalao, el vino de Toro y los productos de la matanza son imprescindibles en el tardeo zamorano durante la Semana Santa." },
      { q: "¿Cuántos locales de tardeo hay en Zamora?", a: "En tresycuarto tienes más de 140 locales mapeados en Zamora para planificar tu tardeo durante la Semana Santa." },
    ],
  },
};

const CIUDAD_COORDS = {
  "Madrid":               { lat: 40.4168, lon: -3.7038 },
  "Barcelona":            { lat: 41.3851, lon: 2.1734 },
  "Valencia":             { lat: 39.4699, lon: -0.3763 },
  "Sevilla":              { lat: 37.3891, lon: -5.9845 },
  "Bilbao":               { lat: 43.2630, lon: -2.9350 },
  "Málaga":               { lat: 36.7213, lon: -4.4213 },
  "Zaragoza":             { lat: 41.6488, lon: -0.8891 },
  "Murcia":               { lat: 37.9922, lon: -1.1307 },
  "Cádiz":                { lat: 36.5271, lon: -6.2886 },
  "Cartagena":            { lat: 37.6257, lon: -0.9966 },
  "Córdoba":              { lat: 37.8882, lon: -4.7794 },
  "Cuenca":               { lat: 40.0704, lon: -2.1374 },
  "Granada":              { lat: 37.1773, lon: -3.5986 },
  "Jerez de la Frontera": { lat: 36.6864, lon: -6.1375 },
  "León":                 { lat: 42.5987, lon: -5.5671 },
  "Lorca":                { lat: 37.6709, lon: -1.6990 },
  "Valladolid":           { lat: 41.6523, lon: -4.7245 },
  "Zamora":               { lat: 41.5034, lon: -5.7447 },
};

const WMO_ICON = (code) => {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
};

const WMO_DESC = (code) => {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Poco nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Niebla";
  if (code <= 55) return "Llovizna";
  if (code <= 65) return "Lluvia";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chubascos";
  return "Tormenta";
};

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

async function fetchWeather(ciudad) {
  const coords = CIUDAD_COORDS[ciudad];
  if (!coords) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FMadrid&forecast_days=5`;
    const res = await fetch(url, { cf: { cacheTtl: 1800 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function renderWeatherNav(ciudad, data) {
  if (!data?.daily) return "";
  const { time, temperature_2m_max, weathercode } = data.daily;
  const chips = time.slice(0, 5).map((t, i) => {
    const d = new Date(t + "T12:00:00");
    const dia = i === 0 ? "Hoy" : DIAS_ES[d.getDay()];
    return `<span class="wchip"><span class="wicon">${WMO_ICON(weathercode[i])}</span><span class="wtemp">${Math.round(temperature_2m_max[i])}°</span><span class="wdia">${dia}</span></span>`;
  }).join("");
  return `<span class="weather-nav"><span class="weather-label">Previsión en ${ciudad}</span>${chips}</span>`;
}

function commonHeadLinks() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon-192.png" />`;
}

function commonNavHtml() {
  return `<nav>
    <a href="/" class="logo">tres<span style="color:#FB923C">y</span>cuarto</a>
    <a href="/para-locales" class="nav-cta">Soy propietario</a>
  </nav>`;
}

function commonNavCss() {
  return `nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #F5E6D3;background:rgba(255,248,239,0.9);position:sticky;top:0;backdrop-filter:blur(8px);z-index:10}
    nav a.logo{text-decoration:none;font-size:1.25rem;font-weight:800;letter-spacing:-0.03em;color:#1C1917}
    nav a.logo span{color:#FB923C}
    nav a.nav-cta{text-decoration:none;font-size:0.85rem;font-weight:600;color:#78716C;padding:0.4rem 0.9rem;border-radius:0.6rem;border:1px solid #F5E6D3;background:white}`;
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function tipoLabel(tipo) {
  const map = { bar: "Bar", cafe: "Cafetería", pub: "Pub", biergarten: "Terraza" };
  return map[tipo] || "Local";
}

function ciudadSlug(ciudad) {
  return ciudad.toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u")
    .replace(/ü/g,"u").replace(/ñ/g,"n");
}

// ── CITY LISTING ──────────────────────────────────────────────────────────────

function renderCiudad(ciudad, locales, total, offset, limit, stats, filtro = "", weather = null) {
  const slug = ciudadSlug(ciudad);
  const content = CIUDAD_CONTENT[ciudad] || {};
  const pagina = Math.floor(offset / limit) + 1;
  const totalPaginas = Math.ceil(total / limit);
  const prevOffset = offset - limit;
  const nextOffset = offset + limit;

  const cards = locales.map(l => `
    <a href="/locales/${escHtml(l.id)}" class="card">
      <div class="card-top">
        <span class="badge">${escHtml(tipoLabel(l.tipo))}</span>
        ${l.terraza ? '<span class="terraza-badge">☀️ Terraza</span>' : ""}
      </div>
      <h2>${escHtml(l.nombre)}</h2>
      ${l.direccion ? `<p class="dir">📍 ${escHtml(l.direccion)}</p>` : ""}
      ${l.horario ? `<p class="hora">🕒 ${escHtml(l.horario)}</p>` : ""}
    </a>`).join("");

  const selectorCiudades = CIUDADES.map(c =>
    `<a href="/locales/${ciudadSlug(c)}" class="ciudad-pill ${c === ciudad ? "active" : ""}">${escHtml(c)}</a>`
  ).join("");

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "tresycuarto", item: "https://tresycuarto.com" },
      { "@type": "ListItem", position: 2, name: `Tardeo en ${ciudad}`, item: `https://tresycuarto.com/locales/${slug}` },
    ],
  });

  const faqSchema = content.faqs ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }) : null;

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Bares y locales de tardeo en ${ciudad}`,
    description: `Los mejores bares, cafés y terrazas para tardeear en ${ciudad}`,
    url: `https://tresycuarto.com/locales/${slug}`,
    numberOfItems: total,
    itemListElement: locales.map((l, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      url: `https://tresycuarto.com/locales/${l.id}`,
      name: l.nombre,
    })),
  });

  const canonicalUrl = `https://tresycuarto.com/locales/${slug}${offset > 0 ? `?offset=${offset}` : ""}`;
  const robotsMeta = offset > 0
    ? `<meta name="robots" content="noindex, follow" />`
    : `<link rel="canonical" href="https://tresycuarto.com/locales/${slug}" />`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tardeo en ${escHtml(ciudad)} — Bares y locales de tarde | tresycuarto</title>
  <meta name="description" content="Descubre los mejores bares, cafés y terrazas para tardeear en ${escHtml(ciudad)}. ${total} locales mapeados con dirección, horario e Instagram."/>
  <meta property="og:title" content="Tardeo en ${escHtml(ciudad)} — bares, cafés y terrazas" />
  <meta property="og:description" content="Descubre los mejores locales de tardeo en ${escHtml(ciudad)}. ${total} bares, cafés y terrazas mapeados." />
  <meta property="og:image" content="https://tresycuarto.com/og/${slug}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="tresycuarto" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://tresycuarto.com/og/${slug}.png" />
  ${commonHeadLinks()}
  ${robotsMeta}
  <script type="application/ld+json">${breadcrumbSchema}</script>
  ${faqSchema ? `<script type="application/ld+json">${faqSchema}</script>` : ""}
  <script type="application/ld+json">${itemListSchema}</script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#FFF8EF;color:#1C1917;min-height:100vh}
    ${commonNavCss()}
    .container{max-width:900px;margin:0 auto;padding:2rem 1.5rem}
    h1{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:900;letter-spacing:-0.03em;margin-bottom:0.4rem}
    .subtitle{color:#78716C;font-size:1rem;margin-bottom:1.75rem}
    .ciudades{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:2rem}
    .ciudad-pill{text-decoration:none;font-size:0.82rem;font-weight:600;padding:0.35rem 0.9rem;border-radius:999px;background:#EDE9FE;color:#7C3AED;border:1.5px solid transparent;transition:all .15s}
    .ciudad-pill.active,.ciudad-pill:hover{background:#7C3AED;color:white}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-bottom:2rem}
    .card{display:block;text-decoration:none;background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:1.25rem;transition:box-shadow .15s,transform .15s;color:inherit}
    .card:hover{box-shadow:0 8px 24px rgba(0,0,0,0.08);transform:translateY(-2px)}
    .card-top{display:flex;gap:0.4rem;margin-bottom:0.6rem;flex-wrap:wrap}
    .badge{font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FB923C;background:#FEF0DC;padding:0.25rem 0.6rem;border-radius:999px}
    .terraza-badge{font-size:0.68rem;font-weight:700;color:#059669;background:#D1FAE5;padding:0.25rem 0.6rem;border-radius:999px}
    .card h2{font-size:1rem;font-weight:700;margin-bottom:0.4rem;line-height:1.3}
    .dir,.hora{font-size:0.8rem;color:#78716C;margin-top:0.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .paginacion{display:flex;align-items:center;justify-content:center;gap:1rem;padding:1rem 0}
    .paginacion a{text-decoration:none;color:#FB923C;font-weight:600;font-size:0.9rem}
    .paginacion span{color:#78716C;font-size:0.875rem}
    .intro-section{background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:1.5rem;margin-bottom:1.75rem}
    .intro-text{font-size:0.95rem;color:#57534E;line-height:1.7;margin-bottom:1rem}
    .barrios{display:flex;flex-wrap:wrap;gap:0.4rem}
    .barrio-pill{font-size:0.78rem;font-weight:600;color:#7C3AED;background:#EDE9FE;padding:0.2rem 0.7rem;border-radius:999px}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1.75rem}
    .stat-card{display:block;text-decoration:none;background:white;border:1.5px solid #F5E6D3;border-radius:1rem;padding:1rem;text-align:center;transition:all .15s;cursor:pointer}
    .stat-card:hover{border-color:#FB923C;box-shadow:0 4px 16px rgba(251,146,60,0.12)}
    .stat-card.active{background:#FEF0DC;border-color:#FB923C}
    .stat-num{font-size:1.6rem;font-weight:900;color:#FB923C;letter-spacing:-0.03em}
    .stat-label{font-size:0.72rem;color:#78716C;margin-top:0.2rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em}
    .faq-section{margin-top:2.5rem}
    .faq-title{font-size:1rem;font-weight:800;color:#1C1917;margin-bottom:1rem;letter-spacing:-0.02em}
    .faq-item{background:white;border:1px solid #F5E6D3;border-radius:1rem;padding:1.1rem 1.25rem;margin-bottom:0.6rem}
    .faq-q{font-size:0.9rem;font-weight:700;color:#1C1917;margin-bottom:0.4rem}
    .faq-a{font-size:0.85rem;color:#57534E;line-height:1.6}
    footer{text-align:center;padding:2rem 1rem;font-size:0.8rem;color:#A8A29E;border-top:1px solid #F5E6D3;margin-top:1rem}
    .weather-nav{display:flex;align-items:center;gap:0.75rem;flex-wrap:nowrap;overflow:hidden}
    .weather-label{font-size:0.78rem;font-weight:600;color:#A8A29E;white-space:nowrap;margin-right:0.1rem}
    .wchip{display:flex;align-items:center;gap:0.25rem;white-space:nowrap;font-size:0.88rem;color:#57534E}
    .wicon{font-size:1.1rem;line-height:1}
    .wtemp{font-weight:700;color:#1C1917;font-size:0.88rem}
    .wdia{font-size:0.75rem;color:#A8A29E;font-weight:500}
    @media(max-width:900px){.weather-label{display:none}.wchip:nth-child(n+3){display:none}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">tres<span style="color:#FB923C">y</span>cuarto</a>
    ${renderWeatherNav(ciudad, weather)}
    <a href="/para-locales" class="nav-cta">Soy propietario</a>
  </nav>

  <div class="container">
    <h1>Tardeo en ${escHtml(ciudad)}</h1>
    <p class="subtitle">${total} locales mapeados — bares, cafés, pubs y terrazas</p>

    <div class="ciudades">${selectorCiudades}</div>

    ${content.intro && offset === 0 ? `
    <div class="intro-section">
      <p class="intro-text">${escHtml(content.intro)}</p>
      ${content.barrios ? `<div class="barrios">${content.barrios.map(b => `<span class="barrio-pill">📍 ${escHtml(b)}</span>`).join("")}</div>` : ""}
    </div>` : ""}

    ${stats && offset === 0 ? `
    <div class="stats-grid">
      <a href="/locales/${escHtml(slug)}" class="stat-card${!filtro ? " active" : ""}">
        <div class="stat-num">${stats.total}</div>
        <div class="stat-label">Todos los locales</div>
      </a>
      <a href="/locales/${escHtml(slug)}?filtro=terraza" class="stat-card${filtro === "terraza" ? " active" : ""}">
        <div class="stat-num">${stats.terrazas}</div>
        <div class="stat-label">Con terraza ☀️</div>
      </a>
      <a href="/locales/${escHtml(slug)}?filtro=web" class="stat-card${filtro === "web" ? " active" : ""}">
        <div class="stat-num">${stats.conWeb}</div>
        <div class="stat-label">Con web 🌐</div>
      </a>
    </div>` : ""}

    <div class="grid">${cards}</div>

    <div class="paginacion">
      ${prevOffset >= 0 ? `<a href="/locales/${slug}?offset=${prevOffset}${filtro ? `&filtro=${filtro}` : ""}">← Anterior</a>` : "<span></span>"}
      <span>Página ${pagina} de ${totalPaginas}</span>
      ${nextOffset < total ? `<a href="/locales/${slug}?offset=${nextOffset}${filtro ? `&filtro=${filtro}` : ""}">Siguiente →</a>` : "<span></span>"}
    </div>

    ${content.faqs && offset === 0 ? `
    <div class="faq-section">
      <h2 class="faq-title">Preguntas frecuentes sobre el tardeo en ${escHtml(ciudad)}</h2>
      ${content.faqs.map(f => `
      <div class="faq-item">
        <div class="faq-q">${escHtml(f.q)}</div>
        <div class="faq-a">${escHtml(f.a)}</div>
      </div>`).join("")}
    </div>` : ""}
  </div>

  <footer>© 2025 tresycuarto.com — Los mejores locales de tardeo en España</footer>
</body>
</html>`;
}

// ── LOCAL DETAIL ──────────────────────────────────────────────────────────────

function renderLocal(local) {
  const title = `${local.nombre} — Tardeo en ${local.ciudad} | tresycuarto`;
  const desc = [
    `${tipoLabel(local.tipo)} en ${local.ciudad}.`,
    local.direccion ? `${local.direccion}.` : "",
    local.terraza ? "Con terraza." : "",
    local.horario ? `Horario: ${local.horario}.` : "",
    `Descubre los mejores locales de tardeo en ${local.ciudad} en tresycuarto.`,
  ].filter(Boolean).join(" ");

  const slug = ciudadSlug(local.ciudad);

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: local.nombre,
    image: local.photo_url || undefined,
    description: local.descripcion_google || undefined,
    address: local.direccion ? {
      "@type": "PostalAddress",
      streetAddress: local.direccion,
      postalCode: local.codigo_postal,
      addressLocality: local.ciudad,
      addressCountry: "ES",
    } : undefined,
    telephone: local.telefono || undefined,
    url: local.web || undefined,
    openingHours: local.horario || undefined,
    priceRange: local.price_level || undefined,
    aggregateRating: (local.rating && local.rating > 0) ? {
      "@type": "AggregateRating",
      ratingValue: local.rating,
      reviewCount: local.rating_count || 1,
      bestRating: 5,
    } : undefined,
    geo: local.lat ? {
      "@type": "GeoCoordinates",
      latitude: local.lat,
      longitude: local.lon,
    } : undefined,
    sameAs: local.instagram ? [`https://www.instagram.com/${local.instagram}/`] : undefined,
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "tresycuarto", item: "https://tresycuarto.com" },
      { "@type": "ListItem", position: 2, name: `Tardeo en ${local.ciudad}`, item: `https://tresycuarto.com/locales/${slug}` },
      { "@type": "ListItem", position: 3, name: local.nombre, item: `https://tresycuarto.com/locales/${local.id}` },
    ],
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(desc)}" />
  <meta property="og:title" content="${escHtml(local.nombre)} — ${escHtml(local.ciudad)} | tresycuarto" />
  <meta property="og:description" content="${escHtml(desc)}" />
  <meta property="og:image" content="${local.photo_url || local.foto_perfil || `https://tresycuarto.com/og/${ciudadSlug(local.ciudad)}.png`}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="place" />
  <meta property="og:site_name" content="tresycuarto" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${local.photo_url || local.foto_perfil || `https://tresycuarto.com/og/${ciudadSlug(local.ciudad)}.png`}" />
  <link rel="canonical" href="https://tresycuarto.com/locales/${local.id}" />
  ${commonHeadLinks()}
  <script type="application/ld+json">${schema}</script>
  <script type="application/ld+json">${breadcrumb}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #FFF8EF; color: #1C1917; min-height: 100vh; }
    ${commonNavCss()}
    .container { max-width: 680px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .badge { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FB923C; background: #FEF0DC; padding: 0.3rem 0.8rem; border-radius: 999px; margin-bottom: 1rem; }
    h1 { font-size: clamp(1.8rem, 5vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 0.5rem; }
    .ciudad { color: #A78BFA; font-weight: 600; font-size: 1rem; margin-bottom: 2rem; }
    .card { background: white; border-radius: 1.25rem; border: 1px solid #F5E6D3; padding: 1.75rem; margin-bottom: 1rem; }
    .row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #FEF0DC; }
    .row:last-child { border-bottom: none; }
    .icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
    .label { font-size: 0.75rem; color: #78716C; text-transform: uppercase; letter-spacing: 0.06em; }
    .value { font-size: 0.95rem; color: #1C1917; font-weight: 500; }
    a.value { color: #FB923C; text-decoration: none; }
    a.value:hover { text-decoration: underline; }
    .back { display: inline-flex; align-items: center; gap: 0.4rem; color: #78716C; font-size: 0.875rem; text-decoration: none; margin-top: 2rem; }
    .back:hover { color: #FB923C; }
    footer { text-align: center; padding: 2rem 1rem; font-size: 0.8rem; color: #A8A29E; border-top: 1px solid #F5E6D3; margin-top: 2rem; }
    .photo-header { width: 100%; height: 220px; object-fit: cover; border-radius: 1.25rem; margin-bottom: 1.5rem; display: block; }
    .rating-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .stars { color: #F59E0B; font-size: 1.1rem; letter-spacing: 0.05em; }
    .rating-num { font-weight: 700; font-size: 1rem; color: #1C1917; }
    .rating-count { font-size: 0.85rem; color: #78716C; }
    .price-badge { display: inline-block; font-size: 0.8rem; font-weight: 700; color: #059669; background: #ECFDF5; padding: 0.2rem 0.6rem; border-radius: 999px; }
    .feature-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .feature-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.7rem; border-radius: 999px; }
    .badge-terraza { background: #FEF9C3; color: #92400E; }
    .badge-musica { background: #EDE9FE; color: #5B21B6; }
    .descripcion { font-size: 0.95rem; color: #44403C; line-height: 1.6; margin-bottom: 1.5rem; font-style: italic; }
    .horario-list { font-size: 0.9rem; color: #1C1917; line-height: 1.8; }
  </style>
</head>
<body>
  ${commonNavHtml()}

  <div class="container">

    ${local.photo_url ? `<img src="${escHtml(local.photo_url)}" alt="${escHtml(local.nombre)}" class="photo-header" loading="lazy" />` : ""}

    <div class="badge">${escHtml(tipoLabel(local.tipo))}</div>
    <h1>${escHtml(local.nombre)}</h1>
    <div class="ciudad">📍 ${escHtml(local.ciudad)}</div>

    ${(local.rating && local.rating > 0) || local.price_level ? `
    <div class="rating-row">
      ${(local.rating && local.rating > 0) ? `
        <span class="stars">${"★".repeat(Math.min(5, Math.round(local.rating)))}${"☆".repeat(Math.max(0, 5 - Math.round(local.rating)))}</span>
        <span class="rating-num">${local.rating.toFixed(1)}</span>
        ${local.rating_count ? `<span class="rating-count">(${local.rating_count.toLocaleString("es-ES")} reseñas)</span>` : ""}
      ` : ""}
      ${local.price_level ? `<span class="price-badge">${escHtml(local.price_level)}</span>` : ""}
    </div>` : ""}

    ${(local.outdoor_seating || local.terraza || local.live_music) ? `
    <div class="feature-badges">
      ${(local.outdoor_seating || local.terraza) ? `<span class="feature-badge badge-terraza">☀️ Terraza</span>` : ""}
      ${local.live_music ? `<span class="feature-badge badge-musica">🎵 Música en directo</span>` : ""}
    </div>` : ""}

    ${local.descripcion_google ? `<p class="descripcion">"${escHtml(local.descripcion_google)}"</p>` : ""}

    <div class="card">
      ${local.direccion ? `
      <div class="row">
        <span class="icon">🗺️</span>
        <div>
          <div class="label">Dirección</div>
          <div class="value">${escHtml(local.direccion)}${local.codigo_postal ? `, ${escHtml(local.codigo_postal)}` : ""}</div>
        </div>
      </div>` : ""}

      ${(local.horario || local.horario_google) ? `
      <div class="row">
        <span class="icon">🕒</span>
        <div>
          <div class="label">Horario</div>
          ${local.horario_google ? `
          <div class="horario-list">${local.horario_google.split(" | ").map(d => `<div>${escHtml(d)}</div>`).join("")}</div>
          ` : `<div class="value">${escHtml(local.horario)}</div>`}
        </div>
      </div>` : ""}

      ${local.telefono ? `
      <div class="row">
        <span class="icon">📞</span>
        <div>
          <div class="label">Teléfono</div>
          <a class="value" href="tel:${escHtml(local.telefono)}">${escHtml(local.telefono)}</a>
        </div>
      </div>` : ""}


      ${local.web ? `
      <div class="row">
        <span class="icon">🌐</span>
        <div>
          <div class="label">Web</div>
          <a class="value" href="${escHtml(local.web)}" target="_blank" rel="noopener">${escHtml(local.web.replace(/^https?:\/\//, ""))}</a>
        </div>
      </div>` : ""}

      ${local.instagram ? `
      <div class="row">
        <span class="icon">📸</span>
        <div>
          <div class="label">Instagram</div>
          <a class="value" href="https://instagram.com/${escHtml(local.instagram)}" target="_blank" rel="noopener">@${escHtml(local.instagram)}</a>
        </div>
      </div>` : ""}

      ${local.lat && local.lon ? `
      <div class="row">
        <span class="icon">🧭</span>
        <div>
          <div class="label">Cómo llegar</div>
          <a class="value" href="https://maps.google.com/maps?daddr=${local.lat},${local.lon}" target="_blank" rel="noopener">Abrir navegación</a>
        </div>
      </div>` : ""}
    </div>

    ${local.lat && local.lon ? `
    <div style="margin-top:1rem;border-radius:1.25rem;overflow:hidden;border:1px solid #F5E6D3">
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=${local.lon - 0.005},${local.lat - 0.005},${local.lon + 0.005},${local.lat + 0.005}&layer=mapnik&marker=${local.lat},${local.lon}"
        style="width:100%;height:280px;border:none;display:block"
        loading="lazy"
        title="Mapa de ${escHtml(local.nombre)}"
      ></iframe>
    </div>` : ""}

    <a href="/locales/${slug}" class="back">← Más locales en ${escHtml(local.ciudad)}</a>
  </div>

  <footer>© 2025 tresycuarto.com — Los mejores locales de tardeo en España</footer>
</body>
</html>`;
}

// ── ROUTER ────────────────────────────────────────────────────────────────────

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const id = params.id;
  const ciudad = CIUDADES_SLUGS[id];

  // Es una página de ciudad: /locales/madrid
  if (ciudad) {
    const url = new URL(request.url);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
    const filtro = url.searchParams.get("filtro") || ""; // "terraza" | "web" | ""
    const limit = 48;

    // Condición SQL según filtro activo
    const filtroWhere = filtro === "terraza"
      ? "AND terraza = 1"
      : filtro === "web"
        ? "AND web IS NOT NULL AND web != ''"
        : "";

    const [{ results: locales }, { results: countRes }, { results: statsRes }, weather] = await Promise.all([
      env.DB.prepare(`SELECT id, nombre, tipo, ciudad, direccion, horario, terraza FROM locales WHERE ciudad = ? ${filtroWhere} ORDER BY nombre LIMIT ? OFFSET ?`)
        .bind(ciudad, limit, offset).all(),
      env.DB.prepare(`SELECT COUNT(*) as total FROM locales WHERE ciudad = ? ${filtroWhere}`)
        .bind(ciudad).all(),
      env.DB.prepare("SELECT COUNT(*) as total, SUM(terraza) as terrazas, SUM(CASE WHEN web IS NOT NULL AND web != '' THEN 1 ELSE 0 END) as conWeb FROM locales WHERE ciudad = ?")
        .bind(ciudad).all(),
      fetchWeather(ciudad),
    ]);

    const stats = { total: statsRes[0].total, terrazas: statsRes[0].terrazas || 0, conWeb: statsRes[0].conWeb || 0 };

    return new Response(renderCiudad(ciudad, locales, countRes[0].total, offset, limit, stats, filtro, weather), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  }

  // Es una ficha de local: /locales/osm_node_123456
  const { results } = await env.DB.prepare(
    "SELECT * FROM locales WHERE id = ? LIMIT 1"
  ).bind(id).all();

  // Si tiene slug, redirigir a la URL limpia permanentemente
  if (results.length && results[0].slug) {
    const cSlug = ciudadSlug(results[0].ciudad);
    return Response.redirect(`https://tresycuarto.com/locales/${cSlug}/${results[0].slug}`, 301);
  }

  if (!results.length) {
    // Si el slug no parece un ID de OSM, probablemente es una ciudad sin datos aún
    const esCiudad = !id.startsWith("osm_") && !id.includes("_node_") && !id.includes("_way_") && !id.includes("_relation_");
    const nombreCiudad = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");
    const html = esCiudad ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Próximamente en ${escHtml(nombreCiudad)} | tresycuarto</title>
  <meta name="robots" content="noindex" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #FFF8EF; min-height: 100vh;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           text-align: center; padding: 2rem; gap: 1rem; }
    .logo { font-size: 1.3rem; font-weight: 800; color: #1C1917; margin-bottom: 0.5rem; }
    .logo span { color: #FB923C; }
    .icon { font-size: 3rem; }
    h1 { font-size: 1.6rem; font-weight: 800; color: #1C1917; }
    p { color: #78716C; font-size: 1rem; max-width: 380px; line-height: 1.6; }
    a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #FB923C, #F59E0B); color: white;
        border-radius: 0.875rem; text-decoration: none; font-weight: 700; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="logo">tres<span>y</span>cuarto</div>
  <div class="icon">📍</div>
  <h1>${escHtml(nombreCiudad)} — Próximamente</h1>
  <p>Estamos mapeando los mejores locales de tardeo en ${escHtml(nombreCiudad)}. ¡Vuelve pronto!</p>
  <a href="mailto:hola@tresycuarto.com?subject=Quiero%20${encodeURIComponent(nombreCiudad)}%20en%20tresycuarto&body=Hola%2C%20me%20gustar%C3%ADa%20que%20agregaseis%20${encodeURIComponent(nombreCiudad)}%20a%20tresycuarto.">📩 Pídenos que agreguemos ${escHtml(nombreCiudad)}</a>
  <a href="/" style="background:transparent;color:#78716C;border:1.5px solid #F5E6D3;margin-top:0.25rem;">Ver ciudades disponibles</a>
</body>
</html>` : `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Local no encontrado | tresycuarto</title>
  <meta name="robots" content="noindex" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #FFF8EF; min-height: 100vh;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           text-align: center; padding: 2rem; gap: 1rem; }
    .logo { font-size: 1.3rem; font-weight: 800; color: #1C1917; margin-bottom: 0.5rem; }
    .logo span { color: #FB923C; }
    .icon { font-size: 3rem; }
    h1 { font-size: 1.6rem; font-weight: 800; color: #1C1917; }
    p { color: #78716C; font-size: 1rem; max-width: 380px; line-height: 1.6; }
    a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #FB923C, #F59E0B); color: white;
        border-radius: 0.875rem; text-decoration: none; font-weight: 700; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="logo">tres<span>y</span>cuarto</div>
  <div class="icon">🔍</div>
  <h1>Local no encontrado</h1>
  <p>No hemos encontrado este local. Puede que haya sido eliminado o que la URL sea incorrecta.</p>
  <a href="/">Volver al inicio</a>
</body>
</html>`;
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response(renderLocal(results[0]), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
