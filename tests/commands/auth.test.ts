// posterboy - Auth command tests

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { authLogin } from "../../src/commands/auth/login";
import { authStatus } from "../../src/commands/auth/status";
import type { GlobalFlags } from "../../src/lib/types";

describe("Auth Commands", () => {
  let testConfigDir: string;
  let testConfigPath: string;
  let originalConsoleLog: typeof console.log;
  let outputBuffer: string[];

  beforeEach(() => {
    // Create temporary config directory
    testConfigDir = join(tmpdir(), `posterboy-test-${Date.now()}`);
    mkdirSync(testConfigDir, { recursive: true });
    testConfigPath = join(testConfigDir, "config.json");

    // Set environment variable for config path
    process.env.POSTERBOY_CONFIG = testConfigPath;

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

  describe("authLogin", () => {
    test("saves API key on successful validation", async () => {
      const mockResponse = {
        email: "test@example.com",
        plan: "free",
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

      await authLogin(["--key", "test_key_123"], globalFlags);

      // Check config file was created
      expect(existsSync(testConfigPath)).toBe(true);

      // Check config contains API key
      const config = JSON.parse(readFileSync(testConfigPath, "utf-8"));
      expect(config.api_key).toBe("test_key_123");
      expect(config.version).toBe(1);
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        email: "test@example.com",
        plan: "premium",
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

      await authLogin(["--key", "test_key_456"], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(true);
      expect(parsed.email).toBe("test@example.com");
      expect(parsed.plan).toBe("premium");
    });

    test("throws UserError when key is invalid", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({ error: "Invalid API key" })),
        })
      ) as any;

      const globalFlags: GlobalFlags = {
        json: false,
        pretty: true,
        verbose: false,
      };

      await expect(
        authLogin(["--key", "invalid_key"], globalFlags)
      ).rejects.toThrow();
    });
  });

  describe("authStatus", () => {
    beforeEach(async () => {
      // Create a config file with API key
      const config = {
        version: 1,
        api_key: "test_key_123",
      };
      const fs = await import("node:fs/promises");
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));
    });

    test("displays account status", async () => {
      const mockResponse = {
        email: "test@example.com",
        plan: "free",
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

      await authStatus([], globalFlags);

      const output = outputBuffer.join("");
      expect(output).toContain("Account Status");
      expect(output).toContain("test@example.com");
      expect(output).toContain("free");
    });

    test("outputs JSON format when --json flag is set", async () => {
      const mockResponse = {
        email: "test@example.com",
        plan: "free",
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

      await authStatus([], globalFlags);

      const output = outputBuffer.join("");
      const parsed = JSON.parse(output);

      expect(parsed.email).toBe("test@example.com");
      expect(parsed.plan).toBe("free");
    });
  });
});
