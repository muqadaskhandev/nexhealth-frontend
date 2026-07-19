/** Shared geo + phone helpers for practice/location forms. */

export function formatLocationAddress(loc: {
  address?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}): string {
  const street = [loc.address, loc.address_line2].filter(Boolean).join(", ");
  const cityStateZip = [loc.city, [loc.state, loc.zip_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, cityStateZip].filter(Boolean).join(", ") || "—";
}

export type StateOption = { code: string; name: string };

/** US states + DC — code is what we store in DB. */
export const US_STATES: StateOption[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

/** Major cities keyed by state code — drives the City dropdown. */
export const CITIES_BY_STATE: Record<string, string[]> = {
  AL: ["Birmingham", "Montgomery", "Huntsville", "Mobile"],
  AK: ["Anchorage", "Fairbanks", "Juneau"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Scottsdale"],
  AR: ["Little Rock", "Fayetteville", "Fort Smith"],
  CA: [
    "Los Angeles",
    "San Francisco",
    "San Diego",
    "San Jose",
    "Sacramento",
    "Oakland",
    "Sausalito",
  ],
  CO: ["Denver", "Colorado Springs", "Aurora", "Boulder"],
  CT: ["Hartford", "New Haven", "Stamford"],
  DE: ["Wilmington", "Dover", "Newark"],
  DC: ["Washington"],
  FL: ["Miami", "Orlando", "Tampa", "Jacksonville"],
  GA: ["Atlanta", "Savannah", "Augusta"],
  HI: ["Honolulu", "Hilo"],
  ID: ["Boise", "Idaho Falls"],
  IL: ["Chicago", "Springfield", "Naperville"],
  IN: ["Indianapolis", "Fort Wayne", "Bloomington"],
  IA: ["Des Moines", "Cedar Rapids"],
  KS: ["Wichita", "Kansas City", "Topeka"],
  KY: ["Louisville", "Lexington"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport"],
  ME: ["Portland", "Augusta"],
  MD: ["Baltimore", "Annapolis"],
  MA: ["Boston", "Cambridge", "Worcester"],
  MI: ["Detroit", "Grand Rapids", "Ann Arbor"],
  MN: ["Minneapolis", "Saint Paul"],
  MS: ["Jackson", "Gulfport"],
  MO: ["Kansas City", "St. Louis", "Springfield"],
  MT: ["Billings", "Missoula", "Helena"],
  NE: ["Omaha", "Lincoln"],
  NV: ["Las Vegas", "Reno"],
  NH: ["Manchester", "Concord"],
  NJ: ["Newark", "Jersey City", "Princeton"],
  NM: ["Albuquerque", "Santa Fe"],
  NY: ["New York City", "Brooklyn", "Buffalo", "Rochester", "Albany", "Manhattan"],
  NC: ["Charlotte", "Raleigh", "Durham"],
  ND: ["Fargo", "Bismarck"],
  OH: ["Columbus", "Cleveland", "Cincinnati"],
  OK: ["Oklahoma City", "Tulsa"],
  OR: ["Portland", "Eugene", "Salem"],
  PA: ["Philadelphia", "Pittsburgh", "Harrisburg"],
  RI: ["Providence", "Newport"],
  SC: ["Charleston", "Columbia"],
  SD: ["Sioux Falls", "Rapid City"],
  TN: ["Nashville", "Memphis", "Knoxville"],
  TX: ["Houston", "Dallas", "Austin", "San Antonio"],
  UT: ["Salt Lake City", "Provo"],
  VT: ["Burlington", "Montpelier"],
  VA: ["Richmond", "Virginia Beach", "Arlington"],
  WA: ["Seattle", "Tacoma", "Spokane"],
  WV: ["Charleston", "Morgantown"],
  WI: ["Milwaukee", "Madison"],
  WY: ["Cheyenne", "Jackson"],
};

export type CountryDial = {
  code: string; // ISO
  name: string;
  dial: string; // without +
};

export const COUNTRY_DIAL_CODES: CountryDial[] = [
  { code: "US", name: "United States", dial: "1" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "IN", name: "India", dial: "91" },
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "FR", name: "France", dial: "33" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "BR", name: "Brazil", dial: "55" },
];

export const CUSTOM_OPTION = "__custom__";

export function citiesForState(stateCode: string): string[] {
  return CITIES_BY_STATE[stateCode] ?? [];
}

export function isListedState(code: string): boolean {
  return US_STATES.some((s) => s.code === code);
}

export function isListedCity(stateCode: string, city: string): boolean {
  return citiesForState(stateCode).includes(city);
}

export function isListedDial(dial: string): boolean {
  return COUNTRY_DIAL_CODES.some((c) => c.dial === dial);
}


/** Combine dial code + national number into E.164-ish storage form. */
export function formatPhoneWithDial(dial: string, national: string): string {
  const digits = national.replace(/[^\d]/g, "");
  const dialDigits = dial.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${dialDigits} ${digits}`;
}

/** Split a stored phone into dial code + national number when possible. */
export function parsePhoneWithDial(phone: string): { dial: string; national: string } {
  const trimmed = phone.trim();
  const match = trimmed.match(/^\+(\d{1,4})\s*(.*)$/);
  if (match) {
    return { dial: match[1], national: match[2].replace(/[^\d]/g, "") };
  }
  return { dial: "1", national: trimmed.replace(/[^\d]/g, "") };
}
