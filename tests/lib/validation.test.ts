import { describe, test, expect } from "bun:test";
import {
  validatePlatforms,
  validateISODate,
  validateTimezone,
  validateMutuallyExclusive
} from "../../src/lib/validation";
import { UserError } from "../../src/lib/errors";

describe("Validation System", () => {
  test("validatePlatforms accepts valid platform names", () => {
    const result = validatePlatforms(["x", "linkedin", "instagram"]);
    expect(result).toEqual(["x", "linkedin", "instagram"]);
  });
  
  test("validatePlatforms rejects invalid platform names", () => {
    expect(() => validatePlatforms(["x", "invalid"])).toThrow(UserError);
    expect(() => validatePlatforms(["x", "invalid"])).toThrow(/Invalid platform names/);
  });
  
  test("validateISODate accepts valid future dates", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const isoDate = futureDate.toISOString();
    
    expect(() => validateISODate(isoDate)).not.toThrow();
  });
  
  test("validateISODate rejects past dates", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const isoDate = pastDate.toISOString();
    
    expect(() => validateISODate(isoDate)).toThrow(UserError);
    expect(() => validateISODate(isoDate)).toThrow(/must be in the future/);
  });
  
  test("validateISODate rejects dates too far in future", () => {
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 400);
    const isoDate = farDate.toISOString();
    
    expect(() => validateISODate(isoDate)).toThrow(UserError);
    expect(() => validateISODate(isoDate)).toThrow(/within 365 days/);
  });
  
  test("validateISODate rejects invalid date format", () => {
    expect(() => validateISODate("not-a-date")).toThrow(UserError);
  });
  
  test("validateTimezone accepts valid IANA timezone", () => {
    expect(() => validateTimezone("America/New_York")).not.toThrow();
    expect(() => validateTimezone("Europe/London")).not.toThrow();
    expect(() => validateTimezone("UTC")).not.toThrow();
  });
  
  test("validateTimezone rejects invalid timezone", () => {
    expect(() => validateTimezone("Not/A/Timezone")).toThrow(UserError);
    expect(() => validateTimezone("Not/A/Timezone")).toThrow(/Invalid timezone/);
  });
  
  test("validateMutuallyExclusive accepts exactly one option", () => {
    const options = { a: true, b: false, c: false };
    expect(() => validateMutuallyExclusive(options)).not.toThrow();
  });
  
  test("validateMutuallyExclusive rejects zero options", () => {
    const options = { a: false, b: false, c: false };
    expect(() => validateMutuallyExclusive(options)).toThrow(UserError);
  });
  
  test("validateMutuallyExclusive rejects multiple options", () => {
    const options = { a: true, b: true, c: false };
    expect(() => validateMutuallyExclusive(options)).toThrow(UserError);
  });
});
