// posterboy - Platforms command tests

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { platforms, platformsPages } from "../../src/commands/platforms";
import type { GlobalFlags } from "../../src/lib/types";

describe("Platforms Commands", () => {
  let testConfigDir: string;
  let testConfigPath: string;
  let originalConsoleLog: typeof console.log;
  let outputBuffer: string[];

  beforeEach(async () => {
    // Create temporary config directory
    testConfigDir = join(tmpdir(), `posterboy-test-${Date.now()}`);
    mkdirSync(testConfigDir, { recursive: true });
    testConfigPath = join(testConfigDir, "config.json");

    // Set environment variable for config path
    process.env.POSTERBOY_CONFIG = testConfigPath;

    // Create a config file with API key
    const config = {
      version: 1,
      api_key: "test_key_123",
      default_profile: "test-profile",
    };
    const fs = await import("node:fs/promises");
    await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

    // Capture console.log output
    outputBuffer = [];
    originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      outputBuffer.push(args.map(String).join(" "));
    };
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;

    // Clear environment variable
    delete process.env.POSTERBOY_CONFIG;

    // Cleanup test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe("platforms", () => {
    test("displays platform list in pretty mode", async () => {
      const mockResponse = {
        user: {
          username: "test-profile",
          connected_platforms: ["x", "linkedin", "instagram"],
          created_at: "2024-01-15T00:00:00Z",
        },
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platforms([], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Platforms for test-profile");
      expect(output).toContain("3 of 10 platforms connected");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        user: {
          username: "test-profile",
          connected_platforms: ["x", "linkedin"],
          created_at: "2024-01-15T00:00:00Z",
        },
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: true,
        pretty: false,
        verbose: false,
      };

      await platforms([], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.profile).toBe("test-profile");
      expect(parsed.platforms).toHaveLength(10);
      expect(parsed.platforms.find((p: any) => p.platform === "x").connected).toBe(true);
      expect(parsed.platforms.find((p: any) => p.platform === "tiktok").connected).toBe(false);
    });

    test("throws error when profile is missing", async () => {
      // Create config without default_profile
      const config = {
        version: 1,
        api_key: "test_key_123",
      };
      const fs = await import("node:fs/promises");
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(platforms([], globalFlags)).rejects.toThrow("Profile is required");
    });

    test("uses --profile flag when provided", async () => {
      const mockResponse = {
        user: {
          username: "custom-profile",
          connected_platforms: ["facebook"],
          created_at: "2024-01-15T00:00:00Z",
        },
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platforms(["--profile", "custom-profile"], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Platforms for custom-profile");
    });
  });

  describe("platformsPages - facebook", () => {
    test("displays Facebook pages in pretty mode", async () => {
      const mockResponse = {
        pages: [
          {
            id: "123456789",
            name: "My Business Page",
            category: "Business",
          },
          {
            id: "987654321",
            name: "My Other Page",
            category: "Community",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platformsPages("facebook", [], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Facebook Pages for test-profile");
      expect(output).toContain("My Business Page");
      expect(output).toContain("123456789");
      expect(output).toContain("Business");
    });

    test("outputs JSON format for Facebook pages", async () => {
      const mockResponse = {
        pages: [
          {
            id: "123456789",
            name: "My Business Page",
            category: "Business",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: true,
        pretty: false,
        verbose: false,
      };

      await platformsPages("facebook", [], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.profile).toBe("test-profile");
      expect(parsed.platform).toBe("facebook");
      expect(parsed.pages).toHaveLength(1);
      expect(parsed.pages[0].name).toBe("My Business Page");
    });

    test("displays empty message when no Facebook pages found", async () => {
      const mockResponse = {
        pages: [],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platformsPages("facebook", [], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("No Facebook pages found");
    });
  });

  describe("platformsPages - linkedin", () => {
    test("displays LinkedIn pages in pretty mode", async () => {
      const mockResponse = {
        pages: [
          {
            id: "urn:li:organization:123456",
            name: "My Company",
            logo: "https://example.com/logo.png",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platformsPages("linkedin", [], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("LinkedIn Pages for test-profile");
      expect(output).toContain("My Company");
      expect(output).toContain("urn:li:organization:123456");
    });

    test("outputs JSON format for LinkedIn pages", async () => {
      const mockResponse = {
        pages: [
          {
            id: "urn:li:organization:123456",
            name: "My Company",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: true,
        pretty: false,
        verbose: false,
      };

      await platformsPages("linkedin", [], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.profile).toBe("test-profile");
      expect(parsed.platform).toBe("linkedin");
      expect(parsed.pages).toHaveLength(1);
    });
  });

  describe("platformsPages - pinterest", () => {
    test("displays Pinterest boards in pretty mode", async () => {
      const mockResponse = {
        boards: [
          {
            id: "board123",
            name: "My Board",
          },
          {
            id: "board456",
            name: "Another Board",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await platformsPages("pinterest", [], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Pinterest Boards for test-profile");
      expect(output).toContain("My Board");
      expect(output).toContain("board123");
    });

    test("outputs JSON format for Pinterest boards", async () => {
      const mockResponse = {
        boards: [
          {
            id: "board123",
            name: "My Board",
          },
        ],
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: true,
        pretty: false,
        verbose: false,
      };

      await platformsPages("pinterest", [], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.profile).toBe("test-profile");
      expect(parsed.platform).toBe("pinterest");
      expect(parsed.boards).toHaveLength(1);
    });
  });

  describe("platformsPages - errors", () => {
    test("throws error for unknown platform", async () => {
      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        platformsPages("unknown", [], globalFlags)
      ).rejects.toThrow("Unknown platform");
    });

    test("throws error when profile is missing", async () => {
      // Create config without default_profile
      const config = {
        version: 1,
        api_key: "test_key_123",
      };
      const fs = await import("node:fs/promises");
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        platformsPages("facebook", [], globalFlags)
      ).rejects.toThrow("Profile is required");
    });
  });
});
