/** Read coarse geo from Vercel request headers. Never returns IP. */
export function geoFromRequestHeaders(headers: Headers): {
  country?: string;
  region?: string;
} {
  const country = normalizeCode(headers.get("x-vercel-ip-country"), 2);
  const region = normalizeCode(headers.get("x-vercel-ip-country-region"), 8);
  const out: { country?: string; region?: string } = {};
  if (country) out.country = country;
  if (region) out.region = region;
  return out;
}

function normalizeCode(value: string | null, maxLen: number): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed || trimmed === "XX" || trimmed === "T1") return null;
  if (trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}

export type GeoBucket = { code: string; count: number };

export type GeoMetricAggregate = {
  byCountry: GeoBucket[];
  byRegion: GeoBucket[];
  unknown: number;
  total: number;
};

export function emptyGeoMetric(): GeoMetricAggregate {
  return { byCountry: [], byRegion: [], unknown: 0, total: 0 };
}

export function aggregateGeoFromMetas(
  metas: Array<Record<string, unknown> | null | undefined>,
): GeoMetricAggregate {
  const countries = new Map<string, number>();
  const regions = new Map<string, number>();
  let unknown = 0;

  for (const meta of metas) {
    const country =
      typeof meta?.country === "string" ? meta.country.toUpperCase() : "";
    const region =
      typeof meta?.region === "string" ? meta.region.toUpperCase() : "";

    if (!country) {
      unknown += 1;
      continue;
    }
    countries.set(country, (countries.get(country) ?? 0) + 1);
    if (region) {
      const key = `${country}-${region}`;
      regions.set(key, (regions.get(key) ?? 0) + 1);
    }
  }

  const sortBuckets = (map: Map<string, number>): GeoBucket[] =>
    [...map.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return {
    byCountry: sortBuckets(countries),
    byRegion: sortBuckets(regions),
    unknown,
    total: metas.length,
  };
}

/** Approximate country centroids [lon, lat] for bubble map (ISO 3166-1 alpha-2). */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  AD: [1.6, 42.5],
  AE: [54.0, 24.0],
  AF: [66.0, 33.0],
  AG: [-61.8, 17.05],
  AI: [-63.05, 18.22],
  AL: [20.0, 41.0],
  AM: [45.0, 40.0],
  AO: [18.5, -12.5],
  AR: [-64.0, -34.0],
  AT: [14.55, 47.52],
  AU: [133.0, -27.0],
  AW: [-69.97, 12.5],
  AZ: [47.5, 40.5],
  BA: [17.8, 44.0],
  BB: [-59.55, 13.17],
  BD: [90.0, 24.0],
  BE: [4.47, 50.5],
  BF: [-2.0, 13.0],
  BG: [25.5, 42.7],
  BH: [50.55, 26.03],
  BI: [30.0, -3.5],
  BJ: [2.25, 9.5],
  BM: [-64.75, 32.3],
  BN: [114.67, 4.5],
  BO: [-65.0, -17.0],
  BR: [-55.0, -10.0],
  BS: [-77.4, 25.04],
  BT: [90.5, 27.5],
  BW: [24.0, -22.0],
  BY: [28.0, 53.0],
  BZ: [-88.75, 17.25],
  CA: [-106.0, 56.0],
  CD: [25.0, -4.0],
  CF: [21.0, 7.0],
  CG: [15.0, -1.0],
  CH: [8.23, 46.82],
  CI: [-5.5, 7.5],
  CL: [-71.0, -30.0],
  CM: [12.0, 6.0],
  CN: [105.0, 35.0],
  CO: [-72.0, 4.0],
  CR: [-84.0, 10.0],
  CU: [-79.5, 21.5],
  CV: [-24.0, 16.0],
  CY: [33.0, 35.0],
  CZ: [15.5, 49.75],
  DE: [10.5, 51.0],
  DJ: [42.5, 11.5],
  DK: [10.0, 56.0],
  DM: [-61.37, 15.42],
  DO: [-70.67, 19.0],
  DZ: [3.0, 28.0],
  EC: [-78.25, -1.25],
  EE: [26.0, 59.0],
  EG: [30.0, 27.0],
  EH: [-13.0, 24.5],
  ER: [39.0, 15.0],
  ES: [-3.7, 40.0],
  ET: [40.0, 9.0],
  FI: [26.0, 64.0],
  FJ: [178.0, -18.0],
  FK: [-59.0, -51.75],
  FR: [2.0, 46.0],
  GA: [11.75, -0.8],
  GB: [-2.0, 54.0],
  GD: [-61.68, 12.12],
  GE: [43.5, 42.0],
  GF: [-53.0, 4.0],
  GH: [-1.0, 8.0],
  GI: [-5.35, 36.14],
  GL: [-40.0, 72.0],
  GM: [-15.5, 13.45],
  GN: [-10.0, 11.0],
  GP: [-61.5, 16.25],
  GQ: [10.5, 1.5],
  GR: [22.0, 39.0],
  GT: [-90.25, 15.5],
  GU: [144.78, 13.44],
  GW: [-15.0, 12.0],
  GY: [-59.0, 5.0],
  HK: [114.17, 22.32],
  HN: [-86.5, 15.0],
  HR: [15.5, 45.17],
  HT: [-72.28, 18.97],
  HU: [19.5, 47.0],
  ID: [118.0, -2.0],
  IE: [-8.0, 53.0],
  IL: [34.75, 31.5],
  IN: [79.0, 21.0],
  IQ: [44.0, 33.0],
  IR: [53.0, 32.0],
  IS: [-18.0, 65.0],
  IT: [12.5, 42.5],
  JM: [-77.3, 18.15],
  JO: [36.0, 31.0],
  JP: [138.0, 36.0],
  KE: [38.0, 1.0],
  KG: [75.0, 41.0],
  KH: [105.0, 13.0],
  KI: [173.0, 1.42],
  KM: [44.25, -12.17],
  KN: [-62.75, 17.33],
  KP: [127.0, 40.0],
  KR: [127.5, 37.0],
  KW: [47.75, 29.5],
  KY: [-80.5, 19.5],
  KZ: [68.0, 48.0],
  LA: [105.0, 18.0],
  LB: [35.83, 33.83],
  LC: [-60.97, 13.88],
  LI: [9.55, 47.17],
  LK: [81.0, 7.0],
  LR: [-9.5, 6.5],
  LS: [28.5, -29.5],
  LT: [24.0, 56.0],
  LU: [6.13, 49.75],
  LV: [25.0, 57.0],
  LY: [17.0, 25.0],
  MA: [-5.0, 32.0],
  MC: [7.4, 43.73],
  MD: [28.58, 47.0],
  ME: [19.3, 42.5],
  MG: [47.0, -20.0],
  MK: [21.75, 41.6],
  ML: [-4.0, 17.0],
  MM: [98.0, 22.0],
  MN: [105.0, 46.0],
  MO: [113.55, 22.17],
  MQ: [-61.0, 14.67],
  MR: [-10.5, 20.0],
  MS: [-62.2, 16.75],
  MT: [14.5, 35.9],
  MU: [57.55, -20.3],
  MV: [73.5, 3.25],
  MW: [34.0, -13.5],
  MX: [-102.0, 23.0],
  MY: [112.5, 2.5],
  MZ: [35.0, -18.25],
  NA: [17.0, -22.0],
  NC: [165.5, -21.5],
  NE: [8.0, 16.0],
  NG: [8.0, 10.0],
  NI: [-85.0, 13.0],
  NL: [5.75, 52.5],
  NO: [10.0, 62.0],
  NP: [84.0, 28.0],
  NZ: [174.0, -42.0],
  OM: [57.0, 21.0],
  PA: [-80.0, 9.0],
  PE: [-76.0, -10.0],
  PF: [-145.0, -15.0],
  PG: [147.0, -6.0],
  PH: [122.0, 13.0],
  PK: [70.0, 30.0],
  PL: [20.0, 52.0],
  PR: [-66.5, 18.25],
  PS: [35.25, 31.9],
  PT: [-8.0, 39.5],
  PY: [-58.0, -23.0],
  QA: [51.25, 25.5],
  RE: [55.53, -21.13],
  RO: [25.0, 46.0],
  RS: [21.0, 44.0],
  RU: [100.0, 60.0],
  RW: [30.0, -2.0],
  SA: [45.0, 25.0],
  SB: [159.0, -8.0],
  SC: [55.5, -4.6],
  SD: [30.0, 15.0],
  SE: [15.0, 62.0],
  SG: [103.8, 1.37],
  SI: [14.8, 46.15],
  SK: [19.5, 48.67],
  SL: [-11.5, 8.5],
  SM: [12.45, 43.93],
  SN: [-14.5, 14.0],
  SO: [49.0, 6.0],
  SR: [-56.0, 4.0],
  SS: [30.0, 7.0],
  ST: [7.0, 1.0],
  SV: [-88.92, 13.83],
  SY: [38.0, 35.0],
  SZ: [31.5, -26.5],
  TC: [-71.8, 21.75],
  TD: [19.0, 15.0],
  TG: [1.17, 8.0],
  TH: [101.0, 15.0],
  TJ: [71.0, 39.0],
  TL: [125.75, -8.87],
  TM: [60.0, 40.0],
  TN: [9.0, 34.0],
  TO: [-175.0, -20.0],
  TR: [35.0, 39.0],
  TT: [-61.22, 10.69],
  TW: [121.0, 23.5],
  TZ: [35.0, -6.0],
  UA: [32.0, 49.0],
  UG: [32.0, 1.0],
  US: [-98.0, 39.5],
  UY: [-56.0, -33.0],
  UZ: [64.0, 41.0],
  VC: [-61.2, 13.25],
  VE: [-66.0, 8.0],
  VG: [-64.5, 18.5],
  VI: [-64.8, 18.35],
  VN: [107.83, 16.17],
  VU: [167.0, -16.0],
  WS: [-172.33, -13.58],
  XK: [20.9, 42.6],
  YE: [48.0, 15.5],
  YT: [45.17, -12.83],
  ZA: [25.0, -29.0],
  ZM: [30.0, -15.0],
  ZW: [30.0, -20.0],
};

export function projectLonLat(
  lon: number,
  lat: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}
