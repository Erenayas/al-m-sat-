/**
 * Türkiye 2.el pazarı için kanonik araç taksonomisi.
 *
 * Amaç: farklı kaynaklarda 5 ayrı şekilde yazılmış aynı aracı tek bir
 * `canonicalKey` altında toplamak. Fiyat istatistiği ancak kohortlar
 * doğru kurulursa anlamlı oluyor.
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
  /** Bu modelde geçerli paketler; sıralama önemli (uzun/spesifik olan önce eşleşmeli) */
  trims: TrimDef[];
  /** Segment — benzer araç bulunamazsa fallback kohort olarak kullanılır */
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
  | "SUV-B"
  | "SUV-C"
  | "SUV-D"
  | "ticari";

/** Kısa yardımcı — tekrar eden trim tanımlarını kısaltmak için */
const t = (name: string, tier: number, ...aliases: string[]): TrimDef => ({
  name,
  tier,
  aliases: [name.toLowerCase(), ...aliases],
});

const VW_TRIMS_GOLF: TrimDef[] = [
  t("Trendline", 20, "trend line", "trendlıne"),
  t("Comfortline", 45, "comfort line", "konforline", "comfortlıne"),
  t("Highline", 70, "high line", "hıghline"),
  t("R-Line", 85, "rline", "r line"),
  t("GTI", 95, "gtı"),
  t("GTD", 90),
];

const VW_TRIMS_PASSAT: TrimDef[] = [
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
];

const FIAT_EGEA_TRIMS: TrimDef[] = [
  t("Street", 20),
  t("Easy", 30),
  t("Urban", 45),
  t("Mirror", 55),
  t("Lounge", 70),
  t("HB Cross", 60, "cross"),
];

const FORD_FOCUS_TRIMS: TrimDef[] = [
  t("Trend", 20, "trend x", "trendx"),
  t("Titanium", 65, "tıtanium", "titanyum"),
  t("ST-Line", 80, "stline", "st line"),
  t("Vignale", 90),
];

const OPEL_ASTRA_TRIMS: TrimDef[] = [
  t("Essentia", 20),
  t("Edition", 35, "edıtion"),
  t("Enjoy", 45),
  t("Design", 55, "desıgn"),
  t("Elegance", 70),
  t("GS Line", 80, "gsline", "gs-line"),
];

const TOYOTA_COROLLA_TRIMS: TrimDef[] = [
  t("Vision", 30, "vısion"),
  t("Dream", 55),
  t("Flame", 70),
  t("Passion", 80, "passıon"),
  t("Passion X-Pack", 90, "passion x pack", "xpack"),
];

const HONDA_CIVIC_TRIMS: TrimDef[] = [
  t("Eco Elegance", 35, "ecoelegance", "eco-elegance"),
  t("Elegance", 45),
  t("Executive", 70, "executıve"),
  t("Executive+", 80, "executive plus"),
  t("RS", 85),
];

const BMW_3_TRIMS: TrimDef[] = [
  t("Standart", 20, "standard", "base"),
  t("Techno Plus", 45, "technoplus", "techno"),
  t("Luxury Line", 70, "luxuryline", "luxury"),
  t("M Sport", 85, "msport", "m-sport", "m spor"),
];

const MERCEDES_C_TRIMS: TrimDef[] = [
  t("Comfort", 30),
  t("Avantgarde", 60, "avantgard", "avangarde"),
  t("Exclusive", 70, "exclusıve"),
  t("AMG", 90, "amg line", "amgline"),
];

const AUDI_A3_TRIMS: TrimDef[] = [
  t("Attraction", 30, "attractıon"),
  t("Ambition", 50, "ambıtion"),
  t("Design Line", 60, "designline", "design"),
  t("Sport", 70),
  t("S-Line", 85, "sline", "s line"),
];

export const TAXONOMY: MakeDef[] = [
  {
    name: "Volkswagen",
    aliases: ["vw", "volkswagen", "wolksvagen", "volswagen"],
    models: [
      {
        name: "Golf",
        aliases: ["golf"],
        body: ["hatchback"],
        segment: "C",
        trims: VW_TRIMS_GOLF,
      },
      {
        name: "Passat",
        aliases: ["passat", "pasat"],
        body: ["sedan", "station_wagon"],
        segment: "D",
        trims: VW_TRIMS_PASSAT,
      },
      {
        name: "Polo",
        aliases: ["polo"],
        body: ["hatchback"],
        segment: "B",
        trims: [
          t("Trendline", 20, "trend line"),
          t("Comfortline", 45, "comfort line"),
          t("Highline", 70, "high line"),
        ],
      },
      {
        name: "Tiguan",
        aliases: ["tiguan", "tıguan"],
        body: ["suv"],
        segment: "SUV-C",
        trims: [
          t("Trendline", 20, "trend line"),
          t("Comfortline", 45, "comfort line"),
          t("Highline", 70, "high line"),
          t("R-Line", 85, "rline", "r line"),
        ],
      },
      {
        name: "Jetta",
        aliases: ["jetta", "jeta"],
        body: ["sedan"],
        segment: "C",
        trims: VW_TRIMS_PASSAT,
      },
    ],
  },
  {
    name: "Renault",
    aliases: ["renault", "renaut", "reno"],
    models: [
      {
        name: "Clio",
        aliases: ["clio", "klio"],
        body: ["hatchback"],
        segment: "B",
        trims: RENAULT_TRIMS,
      },
      {
        name: "Megane",
        aliases: ["megane", "megan"],
        body: ["sedan", "hatchback"],
        segment: "C",
        trims: RENAULT_TRIMS,
      },
      {
        name: "Symbol",
        aliases: ["symbol", "sembol"],
        body: ["sedan"],
        segment: "B",
        trims: RENAULT_TRIMS,
      },
      {
        name: "Captur",
        aliases: ["captur", "kaptur"],
        body: ["suv"],
        segment: "SUV-B",
        trims: RENAULT_TRIMS,
      },
      {
        name: "Taliant",
        aliases: ["taliant", "talyant"],
        body: ["sedan"],
        segment: "B",
        trims: RENAULT_TRIMS,
      },
    ],
  },
  {
    name: "Fiat",
    aliases: ["fiat", "fıat"],
    models: [
      {
        name: "Egea",
        aliases: ["egea", "egae", "tipo"],
        body: ["sedan", "hatchback", "station_wagon"],
        segment: "C",
        trims: FIAT_EGEA_TRIMS,
      },
      {
        name: "Fiorino",
        aliases: ["fiorino", "fıorino"],
        body: ["panelvan", "mpv"],
        segment: "ticari",
        trims: [t("Pop", 20), t("Emotion", 50), t("Premio", 65)],
      },
      {
        name: "Doblo",
        aliases: ["doblo", "doblò"],
        body: ["panelvan", "mpv"],
        segment: "ticari",
        trims: [t("Safeline", 25), t("Easy", 40), t("Premio", 65)],
      },
    ],
  },
  {
    name: "Ford",
    aliases: ["ford"],
    models: [
      {
        name: "Focus",
        aliases: ["focus", "fokus"],
        body: ["sedan", "hatchback", "station_wagon"],
        segment: "C",
        trims: FORD_FOCUS_TRIMS,
      },
      {
        name: "Fiesta",
        aliases: ["fiesta", "fıesta"],
        body: ["hatchback"],
        segment: "B",
        trims: FORD_FOCUS_TRIMS,
      },
      {
        name: "Kuga",
        aliases: ["kuga"],
        body: ["suv"],
        segment: "SUV-C",
        trims: FORD_FOCUS_TRIMS,
      },
      {
        name: "Transit Custom",
        aliases: ["transit custom", "custom", "tourneo custom"],
        body: ["panelvan"],
        segment: "ticari",
        trims: [t("Trend", 25), t("Titanium", 65), t("Sport", 80)],
      },
    ],
  },
  {
    name: "Opel",
    aliases: ["opel"],
    models: [
      {
        name: "Astra",
        aliases: ["astra"],
        body: ["hatchback", "sedan", "station_wagon"],
        segment: "C",
        trims: OPEL_ASTRA_TRIMS,
      },
      {
        name: "Corsa",
        aliases: ["corsa", "korsa"],
        body: ["hatchback"],
        segment: "B",
        trims: OPEL_ASTRA_TRIMS,
      },
      {
        name: "Insignia",
        aliases: ["insignia", "ınsignia"],
        body: ["sedan", "station_wagon"],
        segment: "D",
        trims: OPEL_ASTRA_TRIMS,
      },
      {
        name: "Grandland",
        aliases: ["grandland", "grandland x"],
        body: ["suv"],
        segment: "SUV-C",
        trims: OPEL_ASTRA_TRIMS,
      },
    ],
  },
  {
    name: "Toyota",
    aliases: ["toyota", "toyata"],
    models: [
      {
        name: "Corolla",
        aliases: ["corolla", "corola", "korola"],
        body: ["sedan", "hatchback", "station_wagon"],
        segment: "C",
        trims: TOYOTA_COROLLA_TRIMS,
      },
      {
        name: "C-HR",
        aliases: ["c-hr", "chr", "c hr"],
        body: ["suv"],
        segment: "SUV-B",
        trims: TOYOTA_COROLLA_TRIMS,
      },
      {
        name: "Yaris",
        aliases: ["yaris", "yarıs"],
        body: ["hatchback"],
        segment: "B",
        trims: TOYOTA_COROLLA_TRIMS,
      },
      {
        name: "RAV4",
        aliases: ["rav4", "rav 4"],
        body: ["suv"],
        segment: "SUV-C",
        trims: TOYOTA_COROLLA_TRIMS,
      },
    ],
  },
  {
    name: "Honda",
    aliases: ["honda"],
    models: [
      {
        name: "Civic",
        aliases: ["civic", "cıvic", "sivik"],
        body: ["sedan", "hatchback"],
        segment: "C",
        trims: HONDA_CIVIC_TRIMS,
      },
      {
        name: "CR-V",
        aliases: ["cr-v", "crv", "cr v"],
        body: ["suv"],
        segment: "SUV-C",
        trims: HONDA_CIVIC_TRIMS,
      },
      {
        name: "City",
        aliases: ["city", "cıty"],
        body: ["sedan"],
        segment: "B",
        trims: HONDA_CIVIC_TRIMS,
      },
    ],
  },
  {
    name: "BMW",
    aliases: ["bmw", "b m w"],
    models: [
      {
        name: "3 Serisi",
        aliases: ["3 serisi", "3 series", "320i", "320d", "318i", "316i", "330i", "seri 3"],
        body: ["sedan", "station_wagon"],
        segment: "D",
        trims: BMW_3_TRIMS,
      },
      {
        name: "5 Serisi",
        aliases: ["5 serisi", "5 series", "520i", "520d", "530i", "seri 5"],
        body: ["sedan"],
        segment: "E",
        trims: BMW_3_TRIMS,
      },
      {
        name: "1 Serisi",
        aliases: ["1 serisi", "1 series", "116i", "118i", "120i", "seri 1"],
        body: ["hatchback"],
        segment: "C",
        trims: BMW_3_TRIMS,
      },
      {
        name: "X1",
        aliases: ["x1", "x 1"],
        body: ["suv"],
        segment: "SUV-C",
        trims: BMW_3_TRIMS,
      },
    ],
  },
  {
    name: "Mercedes-Benz",
    aliases: ["mercedes", "mercedes-benz", "mercedes benz", "merdeces", "mb"],
    models: [
      {
        name: "C-Serisi",
        aliases: ["c serisi", "c-serisi", "c180", "c200", "c220", "c 180", "c 200", "c class"],
        body: ["sedan", "station_wagon"],
        segment: "D",
        trims: MERCEDES_C_TRIMS,
      },
      {
        name: "E-Serisi",
        aliases: ["e serisi", "e-serisi", "e180", "e200", "e220", "e 200", "e class"],
        body: ["sedan"],
        segment: "E",
        trims: MERCEDES_C_TRIMS,
      },
      {
        name: "A-Serisi",
        aliases: ["a serisi", "a-serisi", "a180", "a200", "a 180", "a class"],
        body: ["hatchback", "sedan"],
        segment: "C",
        trims: MERCEDES_C_TRIMS,
      },
      {
        name: "Vito",
        aliases: ["vito", "vıto"],
        body: ["panelvan", "mpv"],
        segment: "ticari",
        trims: [t("Base", 20), t("Select", 60), t("Tourer", 70)],
      },
    ],
  },
  {
    name: "Audi",
    aliases: ["audi", "audı"],
    models: [
      {
        name: "A3",
        aliases: ["a3", "a 3"],
        body: ["sedan", "hatchback"],
        segment: "C",
        trims: AUDI_A3_TRIMS,
      },
      {
        name: "A4",
        aliases: ["a4", "a 4"],
        body: ["sedan", "station_wagon"],
        segment: "D",
        trims: AUDI_A3_TRIMS,
      },
      {
        name: "A6",
        aliases: ["a6", "a 6"],
        body: ["sedan"],
        segment: "E",
        trims: AUDI_A3_TRIMS,
      },
      {
        name: "Q3",
        aliases: ["q3", "q 3"],
        body: ["suv"],
        segment: "SUV-C",
        trims: AUDI_A3_TRIMS,
      },
    ],
  },
  {
    name: "Hyundai",
    aliases: ["hyundai", "hyundaı", "hunday"],
    models: [
      {
        name: "i20",
        aliases: ["i20", "i 20"],
        body: ["hatchback"],
        segment: "B",
        trims: [t("Jump", 25), t("Style", 50), t("Elite", 70), t("Elite Plus", 80)],
      },
      {
        name: "Tucson",
        aliases: ["tucson", "tuscon"],
        body: ["suv"],
        segment: "SUV-C",
        trims: [t("Style", 40), t("Elite", 65), t("Elite Plus", 80)],
      },
      {
        name: "Bayon",
        aliases: ["bayon"],
        body: ["suv"],
        segment: "SUV-B",
        trims: [t("Jump", 25), t("Style", 50), t("Elite", 70)],
      },
    ],
  },
  {
    name: "Peugeot",
    aliases: ["peugeot", "pejo", "peguot"],
    models: [
      {
        name: "301",
        aliases: ["301"],
        body: ["sedan"],
        segment: "B",
        trims: [t("Access", 20), t("Active", 45), t("Allure", 70)],
      },
      {
        name: "308",
        aliases: ["308"],
        body: ["hatchback", "station_wagon"],
        segment: "C",
        trims: [t("Access", 20), t("Active", 45), t("Allure", 70), t("GT Line", 85, "gtline")],
      },
      {
        name: "3008",
        aliases: ["3008"],
        body: ["suv"],
        segment: "SUV-C",
        trims: [t("Active", 45), t("Allure", 70), t("GT Line", 85, "gtline")],
      },
    ],
  },
  {
    name: "Dacia",
    aliases: ["dacia", "dacya"],
    models: [
      {
        name: "Duster",
        aliases: ["duster"],
        body: ["suv"],
        segment: "SUV-B",
        trims: [t("Essential", 25), t("Comfort", 45), t("Prestige", 70), t("Journey", 75)],
      },
      {
        name: "Sandero",
        aliases: ["sandero"],
        body: ["hatchback"],
        segment: "B",
        trims: [t("Essential", 25), t("Comfort", 45), t("Stepway", 60), t("Journey", 75)],
      },
    ],
  },
  {
    name: "Skoda",
    aliases: ["skoda", "şkoda", "škoda"],
    models: [
      {
        name: "Octavia",
        aliases: ["octavia", "oktavia"],
        body: ["sedan", "station_wagon"],
        segment: "C",
        trims: [t("Ambition", 40), t("Elegance", 60), t("Style", 70), t("RS", 90)],
      },
      {
        name: "Superb",
        aliases: ["superb", "süperb"],
        body: ["sedan"],
        segment: "D",
        trims: [t("Ambition", 40), t("Elegance", 60), t("Style", 70), t("L&K", 90, "laurin klement")],
      },
    ],
  },
];

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
