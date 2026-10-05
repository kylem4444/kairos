import { describe, expect, it } from "vitest";
import {
  aggregateGeoFromMetas,
  geoFromRequestHeaders,
} from "./geo";

describe("geoFromRequestHeaders", () => {
  it("reads country and region without inventing values", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "us",
      "x-vercel-ip-country-region": "co",
    });
    expect(geoFromRequestHeaders(headers)).toEqual({
      country: "US",
      region: "CO",
    });
  });

  it("ignores placeholder country codes", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "XX",
    });
    expect(geoFromRequestHeaders(headers)).toEqual({});
  });
});

describe("aggregateGeoFromMetas", () => {
  it("counts countries and regions and unknowns", () => {
    const result = aggregateGeoFromMetas([
      { country: "US", region: "CO" },
      { country: "US", region: "NY" },
      { country: "GB" },
      {},
    ]);
    expect(result.total).toBe(4);
    expect(result.unknown).toBe(1);
    expect(result.byCountry[0]).toEqual({ code: "US", count: 2 });
    expect(result.byRegion).toEqual(
      expect.arrayContaining([
        { code: "US-CO", count: 1 },
        { code: "US-NY", count: 1 },
      ]),
    );
  });
});
