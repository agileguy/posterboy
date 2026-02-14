import { describe, it, expect } from "bun:test";
import { suggestCommand } from "../../src/lib/suggestions";

describe("suggestCommand", () => {
  it("suggests 'auth' for 'auht' (1 char typo)", () => {
    expect(suggestCommand("auht")).toBe("auth");
  });

  it("suggests 'post' for 'pst' (1 char deletion)", () => {
    expect(suggestCommand("pst")).toBe("post");
  });

  it("suggests 'profiles' for 'profils' (1 char typo)", () => {
    expect(suggestCommand("profils")).toBe("profiles");
  });

  it("suggests 'schedule' for 'scheduel' (2 char transposition)", () => {
    expect(suggestCommand("scheduel")).toBe("schedule");
  });

  it("suggests 'history' for 'histry' (1 char deletion)", () => {
    expect(suggestCommand("histry")).toBe("history");
  });

  it("suggests 'analytics' for 'analytic' (1 char deletion)", () => {
    expect(suggestCommand("analytic")).toBe("analytics");
  });

  it("suggests 'platforms' for 'platform' (1 char deletion)", () => {
    expect(suggestCommand("platform")).toBe("platforms");
  });

  it("returns null for completely wrong input", () => {
    expect(suggestCommand("xyz123")).toBeNull();
  });

  it("returns null for input with distance > 3", () => {
    expect(suggestCommand("abcdef")).toBeNull();
  });

  it("suggests exact match", () => {
    expect(suggestCommand("auth")).toBe("auth");
  });

  it("suggests closest match when multiple are close", () => {
    const result = suggestCommand("que");
    // Should suggest "queue" (distance 2) over others
    expect(result).toBe("queue");
  });
});
