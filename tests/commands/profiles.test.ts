// posterboy - Profiles command tests

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { profilesList } from "../../src/commands/profiles/list";
import { profilesCreate } from "../../src/commands/profiles/create";
import { profilesDelete } from "../../src/commands/profiles/delete";
import { profilesConnect } from "../../src/commands/profiles/connect";
import type { GlobalFlags } from "../../src/lib/types";

describe("Profiles Commands", () => {
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

  describe("profilesList", () => {
    test("displays profile list in pretty mode", async () => {
      const mockResponse = {
        users: [
          {
            username: "test-profile",
            connected_platforms: ["x", "linkedin"],
            created_at: "2024-01-15T00:00:00Z",
          },
          {
            username: "another-profile",
            connected_platforms: ["instagram", "tiktok"],
            created_at: "2024-02-20T00:00:00Z",
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

      await profilesList([], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Profiles");
      expect(output).toContain("test-profile");
      expect(output).toContain("another-profile");
      expect(output).toContain("x, linkedin");
      expect(output).toContain("2 / 2 profiles");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        users: [
          {
            username: "test-profile",
            connected_platforms: ["x"],
            created_at: "2024-01-15T00:00:00Z",
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

      await profilesList([], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.profiles).toHaveLength(1);
      expect(parsed.profiles[0].username).toBe("test-profile");
      expect(parsed.count).toBe(1);
      expect(parsed.limit).toBe(2);
    });

    test("displays empty message when no profiles exist", async () => {
      const mockResponse = {
        users: [],
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

      await profilesList([], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("No profiles found");
      expect(output).toContain("posterboy profiles create");
    });
  });

  describe("profilesCreate", () => {
    test("creates profile successfully", async () => {
      const mockResponse = {
        success: true,
        profile: {
          username: "new-profile",
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

      await profilesCreate(["--username", "new-profile"], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Profile 'new-profile' created successfully");
      expect(output).toContain("posterboy profiles connect");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        success: true,
        profile: {
          username: "new-profile",
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

      await profilesCreate(["--username", "new-profile"], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(true);
      expect(parsed.profile.username).toBe("new-profile");
    });

    test("throws error when username is missing", async () => {
      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(profilesCreate([], globalFlags)).rejects.toThrow(
        "Username is required"
      );
    });

    test("handles API errors for duplicate username", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () =>
            Promise.resolve(JSON.stringify({ error: "Username already exists" })),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        profilesCreate(["--username", "existing"], globalFlags)
      ).rejects.toThrow();
    });
  });

  describe("profilesDelete", () => {
    test("deletes profile with --confirm flag", async () => {
      const mockResponse = {
        success: true,
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

      await profilesDelete(
        ["--username", "test-profile", "--confirm"],
        globalFlags
      );

      const output = outputBuffer.join("\n");
      expect(output).toContain("Profile 'test-profile' deleted successfully");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        success: true,
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

      await profilesDelete(
        ["--username", "test-profile", "--confirm"],
        globalFlags
      );

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(true);
    });

    test("throws error when username is missing", async () => {
      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        profilesDelete(["--confirm"], globalFlags)
      ).rejects.toThrow("Username is required");
    });

    test("throws error in JSON mode without --confirm", async () => {
      const globalFlags: GlobalFlags = {
        json: true,
        pretty: false,
        verbose: false,
      };

      await expect(
        profilesDelete(["--username", "test-profile"], globalFlags)
      ).rejects.toThrow("Deletion requires confirmation");
    });
  });

  describe("profilesConnect", () => {
    test("generates JWT URL successfully", async () => {
      const mockResponse = {
        success: true,
        access_url: "https://upload-post.com/connect?jwt=abc123",
        expires_in: "15 minutes",
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

      await profilesConnect(["--username", "test-profile"], globalFlags);

      const output = outputBuffer.join("\n");
      expect(output).toContain("Connect Social Accounts");
      expect(output).toContain("https://upload-post.com/connect?jwt=abc123");
      expect(output).toContain("15 minutes");
    });

    test("generates JWT URL with platforms filter", async () => {
      const mockResponse = {
        success: true,
        access_url: "https://upload-post.com/connect?jwt=abc123",
        expires_in: "15 minutes",
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

      await profilesConnect(
        ["--username", "test-profile", "--platforms", "x,linkedin"],
        globalFlags
      );

      const output = outputBuffer.join("\n");
      expect(output).toContain("Connect Social Accounts");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        success: true,
        access_url: "https://upload-post.com/connect?jwt=abc123",
        expires_in: "15 minutes",
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

      await profilesConnect(["--username", "test-profile"], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(true);
      expect(parsed.access_url).toBe("https://upload-post.com/connect?jwt=abc123");
      expect(parsed.expires_in).toBe("15 minutes");
    });

    test("throws error when username is missing", async () => {
      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(profilesConnect([], globalFlags)).rejects.toThrow(
        "Username is required"
      );
    });

    test("throws error for invalid platform names", async () => {
      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        profilesConnect(
          ["--username", "test-profile", "--platforms", "invalid,badplatform"],
          globalFlags
        )
      ).rejects.toThrow("Invalid platform names");
    });
  });
});
