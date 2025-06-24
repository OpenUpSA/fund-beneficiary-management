export interface District {
  name: string;
  code: string;
}

export interface Province {
  name: string;
  code: string;
  districts: District[];
}

export const ZA_PROVINCES: Province[] = [
  {
    name: "Eastern Cape",
    code: "eastern-cape",
    districts: [
      { name: "Buffalo City Metropolitan", code: "buffalo-city" },
      { name: "Nelson Mandela Bay Metropolitan", code: "nelson-mandela-bay" },
      { name: "Amathole", code: "amathole" },
      { name: "Chris Hani", code: "chris-hani" },
      { name: "Joe Gqabi", code: "joe-gqabi" },
      { name: "OR Tambo", code: "or-tambo" },
      { name: "Sarah Baartman", code: "sarah-baartman" },
    ],
  },
  {
    name: "Free State",
    code: "free-state",
    districts: [
      { name: "Mangaung Metropolitan", code: "mangaung" },
      { name: "Fezile Dabi", code: "fezile-dabi" },
      { name: "Lejweleputswa", code: "lejweleputswa" },
      { name: "Thabo Mofutsanyana", code: "thabo-mofutsanyana" },
      { name: "Xhariep", code: "xhariep" },
    ],
  },
  {
    name: "Gauteng",
    code: "gauteng",
    districts: [
      { name: "City of Johannesburg Metropolitan", code: "johannesburg" },
      { name: "City of Tshwane Metropolitan", code: "tshwane" },
      { name: "Ekurhuleni Metropolitan", code: "ekurhuleni" },
      { name: "Sedibeng", code: "sedibeng" },
      { name: "West Rand", code: "west-rand" },
    ],
  },
  {
    name: "KwaZulu-Natal",
    code: "kwazulu-natal",
    districts: [
      { name: "eThekwini Metropolitan", code: "ethekwini" },
      { name: "Amajuba", code: "amajuba" },
      { name: "Harry Gwala", code: "harry-gwala" },
      { name: "iLembe", code: "ilembe" },
      { name: "King Cetshwayo", code: "king-cetshwayo" },
      { name: "uMgungundlovu", code: "umgungundlovu" },
      { name: "uMkhanyakude", code: "umkhanyakude" },
      { name: "uMzinyathi", code: "umzinyathi" },
      { name: "uThukela", code: "uthukela" },
      { name: "Zululand", code: "zululand" },
    ],
  },
  {
    name: "Limpopo",
    code: "limpopo",
    districts: [
      { name: "Capricorn", code: "capricorn" },
      { name: "Mopani", code: "mopani" },
      { name: "Sekhukhune", code: "sekhukhune" },
      { name: "Vhembe", code: "vhembe" },
      { name: "Waterberg", code: "waterberg" },
    ],
  },
  {
    name: "Mpumalanga",
    code: "mpumalanga",
    districts: [
      { name: "Ehlanzeni", code: "ehlanzeni" },
      { name: "Gert Sibande", code: "gert-sibande" },
      { name: "Nkangala", code: "nkangala" },
    ],
  },
  {
    name: "Northern Cape",
    code: "northern-cape",
    districts: [
      { name: "Frances Baard", code: "frances-baard" },
      { name: "John Taolo Gaetsewe", code: "john-taolo-gaetsewe" },
      { name: "Namakwa", code: "namakwa" },
      { name: "Pixley ka Seme", code: "pixley-ka-seme" },
      { name: "ZF Mgcawu", code: "zf-mgcawu" },
    ],
  },
  {
    name: "North West",
    code: "north-west",
    districts: [
      { name: "Bojanala", code: "bojanala" },
      { name: "Dr Kenneth Kaunda", code: "dr-kenneth-kaunda" },
      { name: "Dr Ruth Segomotsi Mompati", code: "dr-ruth-segomotsi-mompati" },
      { name: "Ngaka Modiri Molema", code: "ngaka-modiri-molema" },
      { name: "Rustenburg", code: "rustenburg" },
    ],
  },
  {
    name: "Western Cape",
    code: "western-cape",
    districts: [
      { name: "City of Cape Town Metropolitan", code: "cape-town" },
      { name: "Cape Winelands", code: "cape-winelands" },
      { name: "Central Karoo", code: "central-karoo" },
      { name: "Garden Route", code: "garden-route" },
      { name: "Overberg", code: "overberg" },
      { name: "West Coast", code: "west-coast" },
    ],
  },
];
  