/**
 * Türkiye 2.el pazarı için kanonik araç taksonomisi.
 *
 * İki işi var:
 *   1. Farklı kaynaklarda 5 ayrı şekilde yazılmış aynı aracı tek bir
 *      `canonicalKey` altında toplamak (bkz. normalize.ts).
 *   2. Arayüzdeki marka/model seçim kutusunu beslemek — galerici elle
 *      yazmasın, "vosvogen" yazınca Volkswagen çıksın.
 *
 * Paket (`trims`) listesi yalnızca çok satan modellerde dolu. Boş bırakılan
 * modellerde normalizer paketi eşleştirmiyor ama marka/model/yıl kohortu
 * yine kuruluyor — kısmi veri, veri yokluğundan iyi.
 */

export type FuelType = "benzin" | "dizel" | "lpg" | "hibrit" | "elektrik";
export type Transmission = "manuel" | "otomatik" | "yarı_otomatik";
export type BodyType =
  | "sedan"
  | "hatchback"
  | "station_wagon"
  | "suv"
  | "coupe"
  | "cabrio"
  | "mpv"
  | "pickup"
  | "panelvan";

export interface TrimDef {
  /** Kanonik paket adı */
  name: string;
  /** İlan metninde geçebilecek yazımlar (küçük harf, noktalama temizlenmiş) */
  aliases: string[];
  /** Segment içi donanım seviyesi — fiyat düzeltmesinde kullanılır (0-100) */
  tier: number;
}

export interface ModelDef {
  name: string;
  aliases: string[];
  body: BodyType[];
  trims: TrimDef[];
  segment: Segment;
}

export interface MakeDef {
  name: string;
  aliases: string[];
  models: ModelDef[];
}

export type Segment =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "SUV-B"
  | "SUV-C"
  | "SUV-D"
  | "spor"
  | "ticari";

/** Trim tanımını kısaltan yardımcı */
const t = (name: string, tier: number, ...aliases: string[]): TrimDef => ({
  name,
  tier,
  aliases: [name.toLowerCase(), ...aliases],
});

/** Model tanımını kısaltan yardımcı — dosyanın okunabilir kalması için */
const m = (
  name: string,
  segment: Segment,
  body: BodyType[],
  aliases: string[] = [],
  trims: TrimDef[] = [],
): ModelDef => ({ name, aliases: [name.toLowerCase(), ...aliases], body, segment, trims });

// ---------------------------------------------------------------------------
// Çok satan modellerin paket listeleri
// ---------------------------------------------------------------------------

const VW_GOLF_TRIMS: TrimDef[] = [
  t("Trendline", 20, "trend line", "trendlıne"),
  t("Comfortline", 45, "comfort line", "konforline", "comfortlıne"),
  t("Highline", 70, "high line", "hıghline"),
  t("R-Line", 85, "rline", "r line"),
  t("GTI", 95, "gtı"),
  t("GTD", 90),
];

const VW_TRIMS: TrimDef[] = [
  t("Trendline", 20, "trend line"),
  t("Comfortline", 45, "comfort line"),
  t("Highline", 70, "high line"),
  t("Elegance", 75),
  t("R-Line", 85, "rline", "r line"),
];

const RENAULT_TRIMS: TrimDef[] = [
  t("Joy", 15),
  t("Touch", 35),
  t("Icon", 60, "ıcon"),
  t("Iconic", 65, "ıconic"),
  t("Intens", 70, "ıntens"),
  t("Esprit Alpine", 80, "esprit"),
];

const FIAT_EGEA_TRIMS: TrimDef[] = [
  t("Street", 20),
  t("Easy", 30),
  t("Urban", 45),
  t("Mirror", 55),
  t("Lounge", 70),
  t("HB Cross", 60, "cross"),
];

const FORD_TRIMS: TrimDef[] = [
  t("Trend", 20, "trend x", "trendx"),
  t("Titanium", 65, "tıtanium", "titanyum"),
  t("ST-Line", 80, "stline", "st line"),
  t("Vignale", 90),
];

const OPEL_TRIMS: TrimDef[] = [
  t("Essentia", 20),
  t("Edition", 35, "edıtion"),
  t("Enjoy", 45),
  t("Design", 55, "desıgn"),
  t("Elegance", 70),
  t("GS Line", 80, "gsline", "gs-line"),
];

const TOYOTA_TRIMS: TrimDef[] = [
  t("Vision", 30, "vısion"),
  t("Dream", 55),
  t("Flame", 70),
  t("Passion", 80, "passıon"),
  t("Passion X-Pack", 90, "passion x pack", "xpack"),
];

const HONDA_TRIMS: TrimDef[] = [
  t("Eco Elegance", 35, "ecoelegance", "eco-elegance"),
  t("Elegance", 45),
  t("Executive", 70, "executıve"),
  t("Executive+", 80, "executive plus"),
  t("RS", 85),
];

const BMW_TRIMS: TrimDef[] = [
  t("Standart", 20, "standard", "base"),
  t("Techno Plus", 45, "technoplus", "techno"),
  t("Luxury Line", 70, "luxuryline", "luxury"),
  t("M Sport", 85, "msport", "m-sport", "m spor"),
];

const MERCEDES_TRIMS: TrimDef[] = [
  t("Comfort", 30),
  t("Avantgarde", 60, "avantgard", "avangarde"),
  t("Exclusive", 70, "exclusıve"),
  t("AMG", 90, "amg line", "amgline"),
];

const AUDI_TRIMS: TrimDef[] = [
  t("Attraction", 30, "attractıon"),
  t("Ambition", 50, "ambıtion"),
  t("Design Line", 60, "designline", "design"),
  t("Sport", 70),
  t("S-Line", 85, "sline", "s line"),
];

const HYUNDAI_TRIMS: TrimDef[] = [
  t("Jump", 25),
  t("Style", 50),
  t("Elite", 70),
  t("Elite Plus", 80, "eliteplus"),
];

const PEUGEOT_TRIMS: TrimDef[] = [
  t("Access", 20),
  t("Active", 45),
  t("Allure", 70),
  t("GT Line", 85, "gtline"),
];

const DACIA_TRIMS: TrimDef[] = [
  t("Essential", 25),
  t("Comfort", 45),
  t("Stepway", 60),
  t("Prestige", 70),
  t("Journey", 75),
];

const SKODA_TRIMS: TrimDef[] = [
  t("Ambition", 40),
  t("Elegance", 60),
  t("Style", 70),
  t("Premium", 75),
  t("RS", 90),
];

// ---------------------------------------------------------------------------
// Markalar
// ---------------------------------------------------------------------------

export const TAXONOMY: MakeDef[] = [
  {
    name: "Volkswagen",
    aliases: ["vw", "volkswagen", "wolksvagen", "volswagen", "vosvagen", "vosvogen", "wolkswagen"],
    models: [
      m("Golf", "C", ["hatchback"], [], VW_GOLF_TRIMS),
      m("Passat", "D", ["sedan", "station_wagon"], ["pasat"], VW_TRIMS),
      m("Polo", "B", ["hatchback"], [], VW_TRIMS),
      m("Jetta", "C", ["sedan"], ["jeta"], VW_TRIMS),
      m("Bora", "C", ["sedan"]),
      m("Arteon", "E", ["sedan"], [], VW_TRIMS),
      m("Scirocco", "spor", ["coupe"], ["sirocco"]),
      m("Beetle", "C", ["hatchback"], ["new beetle"]),
      m("up!", "A", ["hatchback"], ["up"]),
      m("Tiguan", "SUV-C", ["suv"], ["tıguan"], VW_TRIMS),
      m("T-Roc", "SUV-B", ["suv"], ["troc", "t roc"], VW_TRIMS),
      m("T-Cross", "SUV-B", ["suv"], ["tcross", "t cross"], VW_TRIMS),
      m("Taigo", "SUV-B", ["suv"]),
      m("Touareg", "SUV-D", ["suv"], ["tuareg"]),
      m("Touran", "C", ["mpv"]),
      m("Sharan", "D", ["mpv"]),
      m("Caddy", "ticari", ["panelvan", "mpv"]),
      m("Transporter", "ticari", ["panelvan"], ["t5", "t6", "t7"]),
      m("Caravelle", "ticari", ["mpv"]),
      m("Multivan", "ticari", ["mpv"]),
      m("Crafter", "ticari", ["panelvan"]),
      m("Amarok", "ticari", ["pickup"]),
      m("ID.3", "C", ["hatchback"], ["id3", "id 3"]),
      m("ID.4", "SUV-C", ["suv"], ["id4", "id 4"]),
    ],
  },
  {
    name: "Renault",
    aliases: ["renault", "renaut", "reno", "renolt"],
    models: [
      m("Clio", "B", ["hatchback"], ["klio"], RENAULT_TRIMS),
      m("Megane", "C", ["sedan", "hatchback"], ["megan"], RENAULT_TRIMS),
      m("Symbol", "B", ["sedan"], ["sembol"], RENAULT_TRIMS),
      m("Taliant", "B", ["sedan"], ["talyant"], RENAULT_TRIMS),
      m("Fluence", "C", ["sedan"], ["fluans"], RENAULT_TRIMS),
      m("Laguna", "D", ["sedan", "hatchback"]),
      m("Talisman", "D", ["sedan"], [], RENAULT_TRIMS),
      m("Latitude", "D", ["sedan"]),
      m("Twingo", "A", ["hatchback"]),
      m("Captur", "SUV-B", ["suv"], ["kaptur"], RENAULT_TRIMS),
      m("Kadjar", "SUV-C", ["suv"], ["kadjer"], RENAULT_TRIMS),
      m("Austral", "SUV-C", ["suv"], [], RENAULT_TRIMS),
      m("Arkana", "SUV-C", ["suv"], [], RENAULT_TRIMS),
      m("Koleos", "SUV-D", ["suv"]),
      m("Scenic", "C", ["mpv"], ["senic"]),
      m("Espace", "D", ["mpv"]),
      m("Kangoo", "ticari", ["panelvan", "mpv"], ["kango"]),
      m("Trafic", "ticari", ["panelvan"], ["traffic"]),
      m("Master", "ticari", ["panelvan"]),
      m("Zoe", "B", ["hatchback"]),
    ],
  },
  {
    name: "Fiat",
    aliases: ["fiat", "fıat"],
    models: [
      m("Egea", "C", ["sedan", "hatchback", "station_wagon"], ["egae", "tipo"], FIAT_EGEA_TRIMS),
      m("Linea", "C", ["sedan"], ["lınea"]),
      m("Albea", "B", ["sedan"]),
      m("Palio", "B", ["hatchback", "station_wagon"]),
      m("Punto", "B", ["hatchback"], ["grande punto"]),
      m("Panda", "A", ["hatchback"]),
      m("500", "A", ["hatchback"], ["500c"]),
      m("500L", "B", ["mpv"], ["500 l"]),
      m("500X", "SUV-B", ["suv"], ["500 x"]),
      m("Bravo", "C", ["hatchback"]),
      m("Freemont", "SUV-D", ["suv"]),
      m("Fiorino", "ticari", ["panelvan", "mpv"], ["fıorino"]),
      m("Doblo", "ticari", ["panelvan", "mpv"], ["doblò"]),
      m("Ducato", "ticari", ["panelvan"]),
      m("Scudo", "ticari", ["panelvan"]),
    ],
  },
  {
    name: "Ford",
    aliases: ["ford"],
    models: [
      m("Focus", "C", ["sedan", "hatchback", "station_wagon"], ["fokus"], FORD_TRIMS),
      m("Fiesta", "B", ["hatchback"], ["fıesta"], FORD_TRIMS),
      m("Mondeo", "D", ["sedan", "station_wagon"], [], FORD_TRIMS),
      m("Escort", "C", ["sedan"]),
      m("C-Max", "C", ["mpv"], ["cmax", "c max"]),
      m("S-Max", "D", ["mpv"], ["smax", "s max"]),
      m("Puma", "SUV-B", ["suv"], [], FORD_TRIMS),
      m("EcoSport", "SUV-B", ["suv"], ["eco sport"], FORD_TRIMS),
      m("Kuga", "SUV-C", ["suv"], [], FORD_TRIMS),
      m("Explorer", "SUV-D", ["suv"]),
      m("Mustang", "spor", ["coupe", "cabrio"]),
      m("Ranger", "ticari", ["pickup"]),
      m("Transit", "ticari", ["panelvan"]),
      m("Transit Custom", "ticari", ["panelvan"], ["custom", "tourneo custom"]),
      m("Transit Courier", "ticari", ["panelvan"], ["tourneo courier", "courier"]),
      m("Tourneo Connect", "ticari", ["mpv"], ["connect", "transit connect"]),
    ],
  },
  {
    name: "Opel",
    aliases: ["opel"],
    models: [
      m("Astra", "C", ["hatchback", "sedan", "station_wagon"], [], OPEL_TRIMS),
      m("Corsa", "B", ["hatchback"], ["korsa"], OPEL_TRIMS),
      m("Vectra", "D", ["sedan", "hatchback"]),
      m("Insignia", "D", ["sedan", "station_wagon"], ["ınsignia"], OPEL_TRIMS),
      m("Adam", "A", ["hatchback"]),
      m("Karl", "A", ["hatchback"]),
      m("Meriva", "B", ["mpv"]),
      m("Zafira", "C", ["mpv"]),
      m("Mokka", "SUV-B", ["suv"], ["mokka x"], OPEL_TRIMS),
      m("Crossland", "SUV-B", ["suv"], ["crossland x"], OPEL_TRIMS),
      m("Grandland", "SUV-C", ["suv"], ["grandland x"], OPEL_TRIMS),
      m("Antara", "SUV-C", ["suv"]),
      m("Combo", "ticari", ["panelvan", "mpv"]),
      m("Vivaro", "ticari", ["panelvan"]),
    ],
  },
  {
    name: "Toyota",
    aliases: ["toyota", "toyata", "toyoto"],
    models: [
      m("Corolla", "C", ["sedan", "hatchback", "station_wagon"], ["corola", "korola"], TOYOTA_TRIMS),
      m("Auris", "C", ["hatchback"], [], TOYOTA_TRIMS),
      m("Yaris", "B", ["hatchback"], ["yarıs"], TOYOTA_TRIMS),
      m("Aygo", "A", ["hatchback"]),
      m("Avensis", "D", ["sedan", "station_wagon"]),
      m("Camry", "E", ["sedan"], [], TOYOTA_TRIMS),
      m("Prius", "C", ["hatchback"]),
      m("Verso", "C", ["mpv"]),
      m("C-HR", "SUV-B", ["suv"], ["chr", "c hr"], TOYOTA_TRIMS),
      m("Yaris Cross", "SUV-B", ["suv"], ["yariscross"], TOYOTA_TRIMS),
      m("RAV4", "SUV-C", ["suv"], ["rav 4"], TOYOTA_TRIMS),
      m("Land Cruiser", "SUV-D", ["suv"], ["landcruiser", "prado"]),
      m("Hilux", "ticari", ["pickup"], ["hi-lux"]),
      m("Proace", "ticari", ["panelvan", "mpv"], ["proace city"]),
      m("Supra", "spor", ["coupe"]),
      m("bZ4X", "SUV-C", ["suv"], ["bz4x"]),
    ],
  },
  {
    name: "Honda",
    aliases: ["honda"],
    models: [
      m("Civic", "C", ["sedan", "hatchback"], ["cıvic", "sivik"], HONDA_TRIMS),
      m("City", "B", ["sedan"], ["cıty"], HONDA_TRIMS),
      m("Jazz", "B", ["hatchback"], [], HONDA_TRIMS),
      m("Accord", "D", ["sedan"], [], HONDA_TRIMS),
      m("HR-V", "SUV-B", ["suv"], ["hrv", "hr v"], HONDA_TRIMS),
      m("ZR-V", "SUV-C", ["suv"], ["zrv"], HONDA_TRIMS),
      m("CR-V", "SUV-C", ["suv"], ["crv", "cr v"], HONDA_TRIMS),
    ],
  },
  {
    name: "BMW",
    aliases: ["bmw", "b m w", "bemve"],
    models: [
      m("1 Serisi", "C", ["hatchback"], ["1 series", "116i", "118i", "120i", "116d", "118d", "seri 1"], BMW_TRIMS),
      m("2 Serisi", "C", ["coupe", "mpv"], ["2 series", "218i", "220i", "216d", "seri 2"], BMW_TRIMS),
      m("3 Serisi", "D", ["sedan", "station_wagon"], ["3 series", "320i", "320d", "318i", "316i", "330i", "seri 3"], BMW_TRIMS),
      m("4 Serisi", "D", ["coupe", "cabrio"], ["4 series", "420i", "430i", "seri 4"], BMW_TRIMS),
      m("5 Serisi", "E", ["sedan", "station_wagon"], ["5 series", "520i", "520d", "530i", "525d", "seri 5"], BMW_TRIMS),
      m("6 Serisi", "E", ["coupe"], ["6 series", "630i", "640i", "seri 6"], BMW_TRIMS),
      m("7 Serisi", "F", ["sedan"], ["7 series", "730i", "740i", "750i", "seri 7"], BMW_TRIMS),
      m("8 Serisi", "F", ["coupe"], ["8 series", "840i", "seri 8"], BMW_TRIMS),
      m("X1", "SUV-C", ["suv"], ["x 1"], BMW_TRIMS),
      m("X2", "SUV-C", ["suv"], ["x 2"], BMW_TRIMS),
      m("X3", "SUV-C", ["suv"], ["x 3"], BMW_TRIMS),
      m("X4", "SUV-C", ["suv"], ["x 4"], BMW_TRIMS),
      m("X5", "SUV-D", ["suv"], ["x 5"], BMW_TRIMS),
      m("X6", "SUV-D", ["suv"], ["x 6"], BMW_TRIMS),
      m("X7", "SUV-D", ["suv"], ["x 7"], BMW_TRIMS),
      m("Z4", "spor", ["cabrio"], ["z 4"]),
      m("i3", "B", ["hatchback"], ["i 3"]),
      m("i4", "D", ["sedan"], ["i 4"]),
      m("iX", "SUV-D", ["suv"], ["ix3"]),
      m("M3", "spor", ["sedan"], ["m 3"]),
      m("M4", "spor", ["coupe"], ["m 4"]),
    ],
  },
  {
    name: "Mercedes-Benz",
    aliases: ["mercedes", "mercedes-benz", "mercedes benz", "merdeces", "mb", "merso"],
    models: [
      m("A-Serisi", "C", ["hatchback", "sedan"], ["a serisi", "a180", "a200", "a 180", "a class", "a-class"], MERCEDES_TRIMS),
      m("B-Serisi", "C", ["mpv"], ["b serisi", "b180", "b200", "b class"], MERCEDES_TRIMS),
      m("C-Serisi", "D", ["sedan", "station_wagon", "coupe"], ["c serisi", "c180", "c200", "c220", "c 180", "c 200", "c class", "c-class"], MERCEDES_TRIMS),
      m("E-Serisi", "E", ["sedan", "station_wagon", "coupe"], ["e serisi", "e180", "e200", "e220", "e 200", "e class", "e-class"], MERCEDES_TRIMS),
      m("S-Serisi", "F", ["sedan"], ["s serisi", "s320", "s350", "s500", "s class"], MERCEDES_TRIMS),
      m("CLA", "C", ["sedan", "coupe"], ["cla180", "cla200"], MERCEDES_TRIMS),
      m("CLS", "E", ["coupe"], [], MERCEDES_TRIMS),
      m("GLA", "SUV-B", ["suv"], ["gla180", "gla200"], MERCEDES_TRIMS),
      m("GLB", "SUV-C", ["suv"], [], MERCEDES_TRIMS),
      m("GLC", "SUV-C", ["suv"], ["glc200", "glc220"], MERCEDES_TRIMS),
      m("GLE", "SUV-D", ["suv"], [], MERCEDES_TRIMS),
      m("GLS", "SUV-D", ["suv"], [], MERCEDES_TRIMS),
      m("GLK", "SUV-C", ["suv"]),
      m("ML", "SUV-D", ["suv"], ["ml350", "ml250"]),
      m("SLK", "spor", ["cabrio"]),
      m("AMG GT", "spor", ["coupe"], ["amggt"]),
      m("V-Serisi", "ticari", ["mpv"], ["v serisi", "v220", "v250", "v class"]),
      m("Vito", "ticari", ["panelvan", "mpv"], ["vıto"]),
      m("Citan", "ticari", ["panelvan"]),
      m("Sprinter", "ticari", ["panelvan"]),
      m("EQC", "SUV-D", ["suv"]),
      m("EQE", "E", ["sedan"]),
    ],
  },
  {
    name: "Audi",
    aliases: ["audi", "audı", "avdi"],
    models: [
      m("A1", "B", ["hatchback"], ["a 1"], AUDI_TRIMS),
      m("A3", "C", ["sedan", "hatchback"], ["a 3"], AUDI_TRIMS),
      m("A4", "D", ["sedan", "station_wagon"], ["a 4"], AUDI_TRIMS),
      m("A5", "D", ["coupe", "hatchback"], ["a 5"], AUDI_TRIMS),
      m("A6", "E", ["sedan", "station_wagon"], ["a 6"], AUDI_TRIMS),
      m("A7", "E", ["hatchback"], ["a 7"], AUDI_TRIMS),
      m("A8", "F", ["sedan"], ["a 8"], AUDI_TRIMS),
      m("Q2", "SUV-B", ["suv"], ["q 2"], AUDI_TRIMS),
      m("Q3", "SUV-C", ["suv"], ["q 3"], AUDI_TRIMS),
      m("Q5", "SUV-C", ["suv"], ["q 5"], AUDI_TRIMS),
      m("Q7", "SUV-D", ["suv"], ["q 7"], AUDI_TRIMS),
      m("Q8", "SUV-D", ["suv"], ["q 8"], AUDI_TRIMS),
      m("TT", "spor", ["coupe"]),
      m("e-tron", "SUV-D", ["suv"], ["etron", "e tron"]),
    ],
  },
  {
    name: "Hyundai",
    aliases: ["hyundai", "hyundaı", "hunday", "hyunday"],
    models: [
      m("i10", "A", ["hatchback"], ["i 10"], HYUNDAI_TRIMS),
      m("i20", "B", ["hatchback"], ["i 20"], HYUNDAI_TRIMS),
      m("i30", "C", ["hatchback", "station_wagon"], ["i 30"], HYUNDAI_TRIMS),
      m("Accent", "B", ["sedan"], ["accent era", "accent blue", "aksent"], HYUNDAI_TRIMS),
      m("Elantra", "C", ["sedan"], [], HYUNDAI_TRIMS),
      m("Getz", "B", ["hatchback"]),
      m("Bayon", "SUV-B", ["suv"], [], HYUNDAI_TRIMS),
      m("Kona", "SUV-B", ["suv"], [], HYUNDAI_TRIMS),
      m("Tucson", "SUV-C", ["suv"], ["tuscon"], HYUNDAI_TRIMS),
      m("ix35", "SUV-C", ["suv"], ["ix 35"]),
      m("Santa Fe", "SUV-D", ["suv"], ["santafe"]),
      m("Ioniq", "C", ["hatchback"], ["ıoniq"]),
      m("Ioniq 5", "SUV-C", ["suv"], ["ioniq5"]),
      m("Staria", "ticari", ["mpv"]),
      m("H100", "ticari", ["panelvan"], ["h 100"]),
    ],
  },
  {
    name: "Peugeot",
    aliases: ["peugeot", "pejo", "peguot", "peugot"],
    models: [
      m("106", "B", ["hatchback"]),
      m("107", "A", ["hatchback"]),
      m("108", "A", ["hatchback"]),
      m("205", "B", ["hatchback"]),
      m("206", "B", ["hatchback"], ["206+"]),
      m("207", "B", ["hatchback"]),
      m("208", "B", ["hatchback"], [], PEUGEOT_TRIMS),
      m("301", "B", ["sedan"], [], PEUGEOT_TRIMS),
      m("306", "C", ["hatchback"]),
      m("307", "C", ["hatchback"]),
      m("308", "C", ["hatchback", "station_wagon"], [], PEUGEOT_TRIMS),
      m("407", "D", ["sedan"]),
      m("508", "D", ["sedan"], [], PEUGEOT_TRIMS),
      m("2008", "SUV-B", ["suv"], [], PEUGEOT_TRIMS),
      m("3008", "SUV-C", ["suv"], [], PEUGEOT_TRIMS),
      m("5008", "SUV-C", ["suv"], [], PEUGEOT_TRIMS),
      m("Partner", "ticari", ["panelvan", "mpv"]),
      m("Rifter", "ticari", ["mpv"]),
      m("Bipper", "ticari", ["panelvan"]),
      m("Expert", "ticari", ["panelvan"]),
      m("Traveller", "ticari", ["mpv"]),
      m("Boxer", "ticari", ["panelvan"]),
    ],
  },
  {
    name: "Dacia",
    aliases: ["dacia", "dacya", "daçya"],
    models: [
      m("Sandero", "B", ["hatchback"], [], DACIA_TRIMS),
      m("Logan", "B", ["sedan", "station_wagon"], ["logan mcv"], DACIA_TRIMS),
      m("Duster", "SUV-B", ["suv"], [], DACIA_TRIMS),
      m("Jogger", "C", ["mpv"], [], DACIA_TRIMS),
      m("Lodgy", "C", ["mpv"], [], DACIA_TRIMS),
      m("Dokker", "ticari", ["panelvan", "mpv"], [], DACIA_TRIMS),
      m("Spring", "A", ["hatchback"]),
    ],
  },
  {
    name: "Skoda",
    aliases: ["skoda", "şkoda", "škoda", "skota"],
    models: [
      m("Fabia", "B", ["hatchback"], [], SKODA_TRIMS),
      m("Rapid", "C", ["hatchback"], ["rapid spaceback"], SKODA_TRIMS),
      m("Scala", "C", ["hatchback"], [], SKODA_TRIMS),
      m("Octavia", "C", ["sedan", "station_wagon"], ["oktavia"], SKODA_TRIMS),
      m("Superb", "D", ["sedan", "station_wagon"], ["süperb"], SKODA_TRIMS),
      m("Kamiq", "SUV-B", ["suv"], [], SKODA_TRIMS),
      m("Karoq", "SUV-C", ["suv"], [], SKODA_TRIMS),
      m("Kodiaq", "SUV-D", ["suv"], [], SKODA_TRIMS),
      m("Yeti", "SUV-C", ["suv"]),
      m("Roomster", "B", ["mpv"]),
      m("Enyaq", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Nissan",
    aliases: ["nissan", "nisan"],
    models: [
      m("Micra", "B", ["hatchback"]),
      m("Note", "B", ["mpv"]),
      m("Almera", "C", ["sedan", "hatchback"]),
      m("Primera", "D", ["sedan"]),
      m("Juke", "SUV-B", ["suv"]),
      m("Qashqai", "SUV-C", ["suv"], ["kashkai"]),
      m("X-Trail", "SUV-C", ["suv"], ["xtrail", "x trail"]),
      m("Pathfinder", "SUV-D", ["suv"]),
      m("Navara", "ticari", ["pickup"]),
      m("Leaf", "C", ["hatchback"]),
      m("Ariya", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Kia",
    aliases: ["kia", "kıa"],
    models: [
      m("Picanto", "A", ["hatchback"]),
      m("Rio", "B", ["sedan", "hatchback"]),
      m("Ceed", "C", ["hatchback", "station_wagon"], ["cee'd", "proceed"]),
      m("Cerato", "C", ["sedan"]),
      m("Venga", "B", ["mpv"]),
      m("Carens", "C", ["mpv"]),
      m("Soul", "SUV-B", ["suv"]),
      m("Stonic", "SUV-B", ["suv"]),
      m("Sportage", "SUV-C", ["suv"]),
      m("Niro", "SUV-C", ["suv"]),
      m("Sorento", "SUV-D", ["suv"]),
      m("EV6", "SUV-C", ["suv"], ["ev 6"]),
    ],
  },
  {
    name: "Citroën",
    aliases: ["citroen", "citroën", "sitroen", "citroon"],
    models: [
      m("C1", "A", ["hatchback"], ["c 1"]),
      m("C3", "B", ["hatchback"], ["c 3"]),
      m("C3 Aircross", "SUV-B", ["suv"]),
      m("C4", "C", ["hatchback"], ["c 4"]),
      m("C4 Cactus", "C", ["hatchback"], ["cactus"]),
      m("C5", "D", ["sedan"], ["c 5"]),
      m("C5 Aircross", "SUV-C", ["suv"]),
      m("C-Elysee", "B", ["sedan"], ["celysee", "c elysee"]),
      m("Berlingo", "ticari", ["panelvan", "mpv"]),
      m("Nemo", "ticari", ["panelvan"]),
      m("Jumpy", "ticari", ["panelvan"]),
      m("Jumper", "ticari", ["panelvan"]),
    ],
  },
  {
    name: "Seat",
    aliases: ["seat", "seyat"],
    models: [
      m("Ibiza", "B", ["hatchback"], ["ıbiza"]),
      m("Cordoba", "B", ["sedan"]),
      m("Leon", "C", ["hatchback", "station_wagon"]),
      m("Toledo", "C", ["sedan"]),
      m("Altea", "C", ["mpv"]),
      m("Alhambra", "D", ["mpv"]),
      m("Arona", "SUV-B", ["suv"]),
      m("Ateca", "SUV-C", ["suv"]),
      m("Tarraco", "SUV-D", ["suv"]),
    ],
  },
  {
    name: "Cupra",
    aliases: ["cupra", "kupra"],
    models: [
      m("Leon", "C", ["hatchback"]),
      m("Formentor", "SUV-C", ["suv"]),
      m("Ateca", "SUV-C", ["suv"]),
      m("Born", "C", ["hatchback"]),
    ],
  },
  {
    name: "Suzuki",
    aliases: ["suzuki", "suzukı"],
    models: [
      m("Alto", "A", ["hatchback"]),
      m("Swift", "B", ["hatchback"]),
      m("Baleno", "B", ["hatchback"]),
      m("SX4", "SUV-B", ["suv", "hatchback"], ["sx 4"]),
      m("S-Cross", "SUV-C", ["suv"], ["scross"]),
      m("Vitara", "SUV-B", ["suv"]),
      m("Grand Vitara", "SUV-C", ["suv"], ["grandvitara"]),
      m("Jimny", "SUV-B", ["suv"]),
    ],
  },
  {
    name: "Mitsubishi",
    aliases: ["mitsubishi", "mitsubisi", "mitsibushi"],
    models: [
      m("Colt", "B", ["hatchback"]),
      m("Space Star", "A", ["hatchback"], ["spacestar"]),
      m("Lancer", "C", ["sedan"]),
      m("ASX", "SUV-B", ["suv"], ["as x"]),
      m("Eclipse Cross", "SUV-C", ["suv"], ["eclipse"]),
      m("Outlander", "SUV-C", ["suv"]),
      m("Pajero", "SUV-D", ["suv"], ["pajero sport"]),
      m("L200", "ticari", ["pickup"], ["l 200"]),
    ],
  },
  {
    name: "Mazda",
    aliases: ["mazda", "mazde"],
    models: [
      m("2", "B", ["hatchback"], ["mazda2", "mazda 2"]),
      m("3", "C", ["sedan", "hatchback"], ["mazda3", "mazda 3"]),
      m("6", "D", ["sedan", "station_wagon"], ["mazda6", "mazda 6"]),
      m("CX-3", "SUV-B", ["suv"], ["cx3"]),
      m("CX-30", "SUV-B", ["suv"], ["cx30"]),
      m("CX-5", "SUV-C", ["suv"], ["cx5"]),
      m("MX-5", "spor", ["cabrio"], ["mx5", "miata"]),
    ],
  },
  {
    name: "Volvo",
    aliases: ["volvo", "wolvo"],
    models: [
      m("S40", "C", ["sedan"], ["s 40"]),
      m("S60", "D", ["sedan"], ["s 60"]),
      m("S80", "E", ["sedan"], ["s 80"]),
      m("S90", "E", ["sedan"], ["s 90"]),
      m("V40", "C", ["hatchback"], ["v 40"]),
      m("V60", "D", ["station_wagon"], ["v 60"]),
      m("XC40", "SUV-B", ["suv"], ["xc 40"]),
      m("XC60", "SUV-C", ["suv"], ["xc 60"]),
      m("XC90", "SUV-D", ["suv"], ["xc 90"]),
    ],
  },
  {
    name: "Jeep",
    aliases: ["jeep", "cip"],
    models: [
      m("Renegade", "SUV-B", ["suv"]),
      m("Avenger", "SUV-B", ["suv"]),
      m("Compass", "SUV-C", ["suv"]),
      m("Cherokee", "SUV-D", ["suv"]),
      m("Grand Cherokee", "SUV-D", ["suv"], ["grandcherokee"]),
      m("Wrangler", "SUV-D", ["suv"]),
    ],
  },
  {
    name: "Land Rover",
    aliases: ["land rover", "landrover", "range rover", "rangerover"],
    models: [
      m("Range Rover", "SUV-D", ["suv"], ["rangerover"]),
      m("Range Rover Sport", "SUV-D", ["suv"], ["rr sport"]),
      m("Range Rover Evoque", "SUV-C", ["suv"], ["evoque", "evoq"]),
      m("Range Rover Velar", "SUV-D", ["suv"], ["velar"]),
      m("Discovery", "SUV-D", ["suv"]),
      m("Discovery Sport", "SUV-C", ["suv"]),
      m("Defender", "SUV-D", ["suv"]),
      m("Freelander", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Porsche",
    aliases: ["porsche", "porshe", "porş"],
    models: [
      m("911", "spor", ["coupe", "cabrio"], ["carrera"]),
      m("Boxster", "spor", ["cabrio"]),
      m("Cayman", "spor", ["coupe"]),
      m("Panamera", "F", ["hatchback"]),
      m("Macan", "SUV-C", ["suv"]),
      m("Cayenne", "SUV-D", ["suv"], ["kayen"]),
      m("Taycan", "E", ["sedan"]),
    ],
  },
  {
    name: "Lexus",
    aliases: ["lexus", "leksus"],
    models: [
      m("IS", "D", ["sedan"], ["is200", "is250", "is300"]),
      m("ES", "E", ["sedan"], ["es250", "es300"]),
      m("GS", "E", ["sedan"]),
      m("LS", "F", ["sedan"]),
      m("UX", "SUV-B", ["suv"]),
      m("NX", "SUV-C", ["suv"]),
      m("RX", "SUV-D", ["suv"]),
      m("LX", "SUV-D", ["suv"]),
    ],
  },
  {
    name: "Mini",
    aliases: ["mini", "mini cooper"],
    models: [
      m("Cooper", "B", ["hatchback"], ["one", "cooper s", "cooper d"]),
      m("Clubman", "C", ["station_wagon"]),
      m("Countryman", "SUV-B", ["suv"]),
      m("Paceman", "SUV-B", ["suv"]),
    ],
  },
  {
    name: "Alfa Romeo",
    aliases: ["alfa romeo", "alfaromeo", "alfa"],
    models: [
      m("MiTo", "B", ["hatchback"]),
      m("147", "C", ["hatchback"]),
      m("156", "D", ["sedan"]),
      m("159", "D", ["sedan", "station_wagon"]),
      m("Giulietta", "C", ["hatchback"], ["julietta"]),
      m("Giulia", "D", ["sedan"], ["julia"]),
      m("Stelvio", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Chevrolet",
    aliases: ["chevrolet", "şevrole", "chevy"],
    models: [
      m("Spark", "A", ["hatchback"]),
      m("Kalos", "B", ["hatchback", "sedan"]),
      m("Aveo", "B", ["sedan", "hatchback"]),
      m("Lacetti", "C", ["sedan", "hatchback"]),
      m("Cruze", "C", ["sedan", "hatchback"]),
      m("Trax", "SUV-B", ["suv"]),
      m("Captiva", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Isuzu",
    aliases: ["isuzu", "ısuzu"],
    models: [
      m("D-Max", "ticari", ["pickup"], ["dmax", "d max"]),
      m("NPR", "ticari", ["panelvan"]),
      m("Novo", "ticari", ["panelvan"]),
    ],
  },
  {
    name: "SsangYong",
    aliases: ["ssangyong", "sangyong", "ssang yong"],
    models: [
      m("Tivoli", "SUV-B", ["suv"]),
      m("Korando", "SUV-C", ["suv"]),
      m("Actyon", "SUV-C", ["suv"]),
      m("Rexton", "SUV-D", ["suv"]),
      m("Musso", "ticari", ["pickup"]),
    ],
  },
  {
    name: "Subaru",
    aliases: ["subaru", "sibaru"],
    models: [
      m("Impreza", "C", ["sedan", "hatchback"]),
      m("XV", "SUV-B", ["suv"]),
      m("Forester", "SUV-C", ["suv"]),
      m("Legacy", "D", ["sedan"]),
      m("Outback", "D", ["station_wagon"]),
    ],
  },
  {
    name: "Tesla",
    aliases: ["tesla"],
    models: [
      m("Model 3", "D", ["sedan"], ["model3"]),
      m("Model Y", "SUV-C", ["suv"], ["modely"]),
      m("Model S", "F", ["hatchback"], ["models"]),
      m("Model X", "SUV-D", ["suv"], ["modelx"]),
    ],
  },
  {
    name: "Togg",
    aliases: ["togg", "tog"],
    models: [
      m("T10X", "SUV-C", ["suv"], ["t10 x", "t 10 x"]),
      m("T10F", "D", ["sedan"], ["t10 f"]),
    ],
  },
  {
    name: "MG",
    aliases: ["mg", "m g"],
    models: [
      m("MG3", "B", ["hatchback"], ["mg 3"]),
      m("MG4", "C", ["hatchback"], ["mg 4"]),
      m("MG5", "C", ["sedan", "station_wagon"], ["mg 5"]),
      m("ZS", "SUV-B", ["suv"]),
      m("HS", "SUV-C", ["suv"]),
      m("Marvel R", "SUV-C", ["suv"], ["marvelr"]),
    ],
  },
  {
    name: "BYD",
    aliases: ["byd", "b y d"],
    models: [
      m("Atto 3", "SUV-B", ["suv"], ["atto3", "atto"]),
      m("Dolphin", "B", ["hatchback"]),
      m("Seal", "D", ["sedan"]),
      m("Song", "SUV-C", ["suv"], ["song plus"]),
      m("Han", "E", ["sedan"]),
    ],
  },
  {
    name: "Chery",
    aliases: ["chery", "çeri", "cherry"],
    models: [
      m("Tiggo 2", "SUV-B", ["suv"], ["tiggo2"]),
      m("Tiggo 7 Pro", "SUV-C", ["suv"], ["tiggo7", "tiggo 7"]),
      m("Tiggo 8 Pro", "SUV-D", ["suv"], ["tiggo8", "tiggo 8"]),
      m("Omoda 5", "SUV-B", ["suv"], ["omoda5", "omoda"]),
    ],
  },
  {
    name: "Geely",
    aliases: ["geely", "cily"],
    models: [m("Emgrand", "C", ["sedan"]), m("Coolray", "SUV-B", ["suv"])],
  },
  {
    name: "DS Automobiles",
    aliases: ["ds automobiles", "ds otomobil"],
    models: [
      m("DS3", "B", ["hatchback"], ["ds 3"]),
      m("DS4", "C", ["hatchback"], ["ds 4"]),
      m("DS7 Crossback", "SUV-C", ["suv"], ["ds7", "ds 7"]),
      m("DS9", "E", ["sedan"], ["ds 9"]),
    ],
  },
  {
    name: "Lada",
    aliases: ["lada"],
    models: [
      m("Samara", "B", ["hatchback"]),
      m("Granta", "B", ["sedan"]),
      m("Vesta", "C", ["sedan"]),
      m("Niva", "SUV-B", ["suv"], ["niva 4x4"]),
    ],
  },
  {
    name: "Jaguar",
    aliases: ["jaguar", "jagular"],
    models: [
      m("XE", "D", ["sedan"], ["x e"]),
      m("XF", "E", ["sedan"], ["x f"]),
      m("XJ", "F", ["sedan"], ["x j"]),
      m("E-Pace", "SUV-C", ["suv"], ["epace"]),
      m("F-Pace", "SUV-D", ["suv"], ["fpace"]),
      m("I-Pace", "SUV-C", ["suv"], ["ipace"]),
    ],
  },
  {
    name: "Maserati",
    aliases: ["maserati", "maseratti"],
    models: [
      m("Ghibli", "E", ["sedan"]),
      m("Quattroporte", "F", ["sedan"]),
      m("Levante", "SUV-D", ["suv"]),
      m("Grecale", "SUV-C", ["suv"]),
    ],
  },
  {
    name: "Ferrari",
    aliases: ["ferrari", "ferari"],
    models: [
      m("488", "spor", ["coupe"], ["488 gtb", "488 spider"]),
      m("F8", "spor", ["coupe"], ["f8 tributo"]),
      m("Roma", "spor", ["coupe"]),
      m("Portofino", "spor", ["cabrio"]),
      m("California", "spor", ["cabrio"]),
      m("812", "spor", ["coupe"], ["812 superfast"]),
    ],
  },
  {
    name: "Lamborghini",
    aliases: ["lamborghini", "lamborgini"],
    models: [
      m("Huracan", "spor", ["coupe"], ["huracán"]),
      m("Aventador", "spor", ["coupe"]),
      m("Urus", "SUV-D", ["suv"]),
    ],
  },
  {
    name: "Bentley",
    aliases: ["bentley", "bently"],
    models: [
      m("Continental", "F", ["coupe"], ["continental gt"]),
      m("Flying Spur", "F", ["sedan"], ["flyingspur"]),
      m("Bentayga", "SUV-D", ["suv"]),
    ],
  },
  {
    name: "Aston Martin",
    aliases: ["aston martin", "astonmartin"],
    models: [m("DB11", "spor", ["coupe"]), m("Vantage", "spor", ["coupe"]), m("DBX", "SUV-D", ["suv"])],
  },
  {
    name: "Infiniti",
    aliases: ["infiniti", "ınfiniti"],
    models: [m("Q30", "C", ["hatchback"]), m("Q50", "D", ["sedan"]), m("QX70", "SUV-D", ["suv"])],
  },
  {
    name: "Lancia",
    aliases: ["lancia", "lancya"],
    models: [m("Ypsilon", "B", ["hatchback"], ["ipsilon"]), m("Delta", "C", ["hatchback"])],
  },
  {
    name: "Smart",
    aliases: ["smart"],
    models: [
      m("Fortwo", "A", ["hatchback"], ["for two"]),
      m("Forfour", "A", ["hatchback"], ["for four"]),
    ],
  },
  {
    name: "Daihatsu",
    aliases: ["daihatsu", "dayhatsu"],
    models: [m("Sirion", "B", ["hatchback"]), m("Materia", "B", ["mpv"]), m("Terios", "SUV-B", ["suv"])],
  },
  {
    name: "Dodge",
    aliases: ["dodge", "doç"],
    models: [m("Caliber", "C", ["hatchback"]), m("Journey", "SUV-D", ["suv"]), m("Nitro", "SUV-D", ["suv"])],
  },
  {
    name: "Chrysler",
    aliases: ["chrysler", "krayslır"],
    models: [
      m("300C", "E", ["sedan"], ["300 c"]),
      m("Voyager", "D", ["mpv"]),
      m("PT Cruiser", "C", ["hatchback"], ["ptcruiser"]),
    ],
  },
  {
    name: "Rover",
    aliases: ["rover"],
    models: [m("214", "C", ["hatchback"]), m("416", "C", ["sedan"]), m("620", "D", ["sedan"])],
  },
  {
    name: "Saab",
    aliases: ["saab", "sab"],
    models: [m("9-3", "D", ["sedan"], ["93"]), m("9-5", "E", ["sedan"], ["95"])],
  },
  {
    name: "Proton",
    aliases: ["proton"],
    models: [m("Gen-2", "C", ["hatchback"], ["gen2"]), m("Savvy", "A", ["hatchback"])],
  },
  {
    name: "DFSK",
    aliases: ["dfsk", "dongfeng"],
    models: [
      m("Glory 500", "SUV-B", ["suv"], ["glory500"]),
      m("Glory 580", "SUV-C", ["suv"], ["glory580"]),
    ],
  },
  {
    name: "Leapmotor",
    aliases: ["leapmotor", "leap motor"],
    models: [m("T03", "A", ["hatchback"], ["t 03"]), m("C10", "SUV-C", ["suv"], ["c 10"])],
  },
  {
    name: "Iveco",
    aliases: ["iveco", "ıveco"],
    models: [m("Daily", "ticari", ["panelvan"])],
  },
];

// ---------------------------------------------------------------------------
// Marka geneli paket listeleri
// ---------------------------------------------------------------------------

/**
 * Markanın tüm modellerinde ortak kullandığı donanım paketleri.
 *
 * Üreticiler paket adlarını model bazında değil marka bazında belirliyor
 * (Kia'nın "Prestige"i, Nissan'ın "Tekna"sı her modelde aynı). Bu yüzden
 * yukarıda modele özel paket verilmemişse marka geneli liste devreye giriyor —
 * 300+ modele tek tek paket yazmak yerine gerçeğe daha uygun bir eşleme.
 */
const BRAND_TRIMS: Record<string, TrimDef[]> = {
  Volkswagen: VW_TRIMS,
  Renault: RENAULT_TRIMS,
  Ford: FORD_TRIMS,
  Opel: OPEL_TRIMS,
  Toyota: TOYOTA_TRIMS,
  Honda: HONDA_TRIMS,
  BMW: BMW_TRIMS,
  "Mercedes-Benz": MERCEDES_TRIMS,
  Audi: AUDI_TRIMS,
  Hyundai: HYUNDAI_TRIMS,
  Peugeot: PEUGEOT_TRIMS,
  Dacia: DACIA_TRIMS,
  Skoda: SKODA_TRIMS,

  Fiat: [t("Pop", 20), t("Easy", 35), t("Urban", 45), t("Premio", 60), t("Lounge", 70), t("Safeline", 25)],
  Nissan: [t("Visia", 25), t("Acenta", 45), t("N-Connecta", 65, "nconnecta"), t("Tekna", 80), t("Platinum", 85)],
  Kia: [t("Cool", 25), t("Comfort", 40), t("Feel", 50), t("Elegance", 60), t("Prestige", 75), t("GT-Line", 85, "gtline")],
  "Citroën": [t("Live", 20), t("Attraction", 30), t("Feel", 45), t("Shine", 70), t("C-Series", 60, "cseries")],
  Seat: [t("Reference", 25), t("Style", 50), t("Xcellence", 70), t("FR", 80), t("Excellence", 75)],
  Cupra: [t("VZ", 70), t("VZ2", 80), t("VZ3", 90)],
  Suzuki: [t("GL", 30), t("GL+", 40, "gl plus"), t("GLX", 60), t("GLX Premium", 75)],
  Mitsubishi: [t("Inform", 25), t("Invite", 45), t("Intense", 65), t("Instyle", 80)],
  Mazda: [t("Motion", 30), t("Sense", 45), t("Power", 60), t("Power Sense", 70), t("Revolution", 80)],
  Volvo: [t("Kinetic", 30), t("Core", 40), t("Momentum", 55), t("Plus", 65), t("R-Design", 80, "rdesign"), t("Inscription", 85), t("Ultimate", 90)],
  Jeep: [t("Sport", 30), t("Longitude", 50), t("Limited", 70), t("S", 75), t("Trailhawk", 80), t("Summit", 90)],
  Chevrolet: [t("LS", 25), t("LT", 50), t("LTZ", 70), t("Sport", 60)],
  "Alfa Romeo": [t("Progression", 30), t("Super", 50), t("Sprint", 60), t("Ti", 75), t("Veloce", 85)],
  Mini: [t("One", 25), t("Cooper", 50), t("Cooper S", 75, "coopers"), t("John Cooper Works", 95, "jcw")],
  Lexus: [t("Comfort", 35), t("Business", 55), t("Premium", 70), t("Executive", 85), t("F Sport", 90, "fsport")],
  "Land Rover": [t("S", 35), t("SE", 55), t("HSE", 75), t("R-Dynamic", 80, "rdynamic"), t("Autobiography", 95)],
  Jaguar: [t("Pure", 30), t("Prestige", 55), t("R-Sport", 70, "rsport"), t("Portfolio", 80), t("R-Dynamic", 85)],
  Porsche: [t("Base", 30), t("S", 60), t("4S", 70), t("GTS", 85), t("Turbo", 95)],
  Tesla: [t("Standard Range", 40, "sr"), t("Long Range", 70, "lr"), t("Performance", 90)],
  Togg: [t("V1", 40), t("V2", 60), t("V2 Uzun Menzil", 80, "uzun menzil", "long range")],
  MG: [t("Comfort", 40), t("Excite", 50), t("Luxury", 70), t("Exclusive", 80)],
  BYD: [t("Active", 35), t("Boost", 50), t("Comfort", 60), t("Design", 75)],
  Chery: [t("Style", 35), t("Luxury", 60), t("Premium", 75)],
  Geely: [t("Comfort", 45), t("Premium", 70)],
  Smart: [t("Passion", 45), t("Pulse", 55), t("Prime", 70), t("Brabus", 90)],
  SsangYong: [t("Modern", 35), t("Prime", 55), t("Platinum", 75)],
  Subaru: [t("Comfort", 35), t("Premium", 55), t("Sport", 70), t("Limited", 80)],
  Infiniti: [t("Premium", 50), t("Premium Tech", 70, "premiumtech"), t("Sport", 75)],
  Maserati: [t("GT", 50), t("Modena", 70), t("Trofeo", 90)],
  Lada: [t("Standard", 25), t("Comfort", 45), t("Luxe", 65)],
  Isuzu: [t("Standard", 30), t("Premium", 60)],
  Daihatsu: [t("SX", 40), t("SXi", 60)],
  Lancia: [t("Silver", 35), t("Gold", 55), t("Platinum", 75)],
  Dodge: [t("SE", 30), t("SXT", 55), t("Limited", 75)],
  Chrysler: [t("SE", 30), t("SXT", 55), t("Limited", 75)],
  "DS Automobiles": [t("So Chic", 45, "sochic"), t("Performance Line", 70, "performanceline"), t("Grand Chic", 80), t("Rivoli", 85)],
  DFSK: [t("Comfort", 40), t("Premium", 65)],
  Leapmotor: [t("Comfort", 40), t("Premium", 65)],
  Proton: [t("Base", 30), t("Premium", 55)],
  Rover: [t("Base", 30), t("Vector", 55)],
  Saab: [t("Linear", 35), t("Vector", 55), t("Aero", 80)],
  Iveco: [t("Standard", 35), t("Premium", 60)],
  Ferrari: [t("Base", 50), t("Spider", 70), t("Pista", 90)],
  Lamborghini: [t("Base", 50), t("Performante", 85), t("STO", 95)],
  Bentley: [t("V8", 55), t("Speed", 75), t("Mulliner", 95)],
  "Aston Martin": [t("Base", 50), t("S", 70), t("AMR", 90)],
};

/**
 * Modele özel paket verilmemişse marka geneli listeyi uygula.
 * Taksonomi dışa verilmeden önce tek seferde çalışıyor.
 */
for (const make of TAXONOMY) {
  const fallback = BRAND_TRIMS[make.name];
  if (!fallback) continue;
  for (const model of make.models) {
    if (model.trims.length === 0) model.trims = fallback;
  }
}

/** Yakıt tipi eşleştirme sözlüğü */
export const FUEL_ALIASES: Record<string, FuelType> = {
  benzin: "benzin",
  benzinli: "benzin",
  petrol: "benzin",
  gasoline: "benzin",
  dizel: "dizel",
  dizell: "dizel",
  diesel: "dizel",
  tdi: "dizel",
  cdi: "dizel",
  hdi: "dizel",
  crdi: "dizel",
  dci: "dizel",
  multijet: "dizel",
  bluehdi: "dizel",
  lpg: "lpg",
  "benzin & lpg": "lpg",
  "benzin lpg": "lpg",
  otogaz: "lpg",
  hibrit: "hibrit",
  hybrid: "hibrit",
  hev: "hibrit",
  phev: "hibrit",
  elektrik: "elektrik",
  elektrikli: "elektrik",
  electric: "elektrik",
  ev: "elektrik",
};

/** Vites tipi eşleştirme sözlüğü */
export const TRANSMISSION_ALIASES: Record<string, Transmission> = {
  manuel: "manuel",
  manual: "manuel",
  düz: "manuel",
  duz: "manuel",
  "düz vites": "manuel",
  otomatik: "otomatik",
  automatic: "otomatik",
  auto: "otomatik",
  tiptronic: "otomatik",
  dsg: "yarı_otomatik",
  "yarı otomatik": "yarı_otomatik",
  "yari otomatik": "yarı_otomatik",
  edc: "yarı_otomatik",
  dct: "yarı_otomatik",
  amt: "yarı_otomatik",
  cvt: "otomatik",
  steptronic: "otomatik",
  "s-tronic": "yarı_otomatik",
  multitronic: "otomatik",
};

/** Kasa tipi eşleştirme sözlüğü */
export const BODY_ALIASES: Record<string, BodyType> = {
  sedan: "sedan",
  hatchback: "hatchback",
  "hatchback 5 kapı": "hatchback",
  "hatchback 3 kapı": "hatchback",
  hb: "hatchback",
  "station wagon": "station_wagon",
  "station vagon": "station_wagon",
  sw: "station_wagon",
  vagon: "station_wagon",
  suv: "suv",
  "arazi suv pick-up": "suv",
  crossover: "suv",
  coupe: "coupe",
  kupe: "coupe",
  cabrio: "cabrio",
  kabrio: "cabrio",
  mpv: "mpv",
  minivan: "mpv",
  "pick-up": "pickup",
  pickup: "pickup",
  kamyonet: "pickup",
  panelvan: "panelvan",
  "panel van": "panelvan",
};

/** İl listesi — normalizasyon ve filtreleme için */
export const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya",
  "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu",
  "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır",
  "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep",
  "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", "İstanbul",
  "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli",
  "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla",
  "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt",
  "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa",
  "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova",
  "Karabük", "Kilis", "Osmaniye", "Düzce",
] as const;

/** Arayüzdeki seçim kutusu için marka listesi (Türkçe sıralı) */
export const MAKE_NAMES: string[] = TAXONOMY.map((mk) => mk.name).sort((a, b) =>
  a.localeCompare(b, "tr"),
);

/** Marka -> model adları; seçim kutusu markaya göre daraltıyor */
export const MODELS_BY_MAKE: Record<string, string[]> = Object.fromEntries(
  TAXONOMY.map((mk) => [mk.name, mk.models.map((md) => md.name)]),
);

/** Markanın yazım varyantları — seçim kutusundaki arama bunları da tarıyor */
export const MAKE_ALIASES: Record<string, string[]> = Object.fromEntries(
  TAXONOMY.map((mk) => [mk.name, mk.aliases]),
);

/** "Marka|Model" -> paket adları; paket seçim kutusu buradan besleniyor */
export const TRIMS_BY_MODEL: Record<string, string[]> = Object.fromEntries(
  TAXONOMY.flatMap((mk) =>
    mk.models.map((md) => [`${mk.name}|${md.name}`, md.trims.map((tr) => tr.name)]),
  ),
);

/** Marka geneli paketler — model seçilmeden de paket önerebilmek için */
export const TRIMS_BY_MAKE: Record<string, string[]> = Object.fromEntries(
  TAXONOMY.map((mk) => [
    mk.name,
    [...new Set(mk.models.flatMap((md) => md.trims.map((tr) => tr.name)))],
  ]),
);

/** İlan ve stok formlarında kullanılan renk listesi */
export const COLORS = [
  "Beyaz", "Siyah", "Gri", "Gümüş Gri", "Füme", "Antrasit", "Lacivert", "Mavi",
  "Açık Mavi", "Kırmızı", "Bordo", "Yeşil", "Kahverengi", "Bej", "Şampanya",
  "Turuncu", "Sarı", "Mor", "Titanyum", "Bronz", "Altın", "Pembe", "Diğer",
] as const;

/** Yaygın motor hacimleri — serbest giriş de kabul ediliyor */
export const ENGINE_SIZES = [
  "1.0", "1.2", "1.3", "1.4", "1.5", "1.6", "1.8", "2.0", "2.2", "2.3",
  "2.5", "2.7", "3.0", "3.5", "4.0", "4.4", "5.0", "Elektrik",
] as const;

/** Yakıt seçenekleri (arayüz etiketleri) */
export const FUEL_OPTIONS = [
  "Dizel", "Benzin", "Benzin & LPG", "Hibrit", "Elektrik",
] as const;

/** Vites seçenekleri (arayüz etiketleri) */
export const TRANSMISSION_OPTIONS = ["Manuel", "Otomatik", "Yarı Otomatik"] as const;

/** Kasa tipi seçenekleri (arayüz etiketleri) */
export const BODY_OPTIONS = [
  "Sedan", "Hatchback", "Station Wagon", "SUV", "Coupe", "Cabrio",
  "MPV", "Pick-up", "Panelvan",
] as const;
