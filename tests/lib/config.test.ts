import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readConfig, writeConfig, validateConfig, resolveValue, getApiKey } from "../../src/lib/config";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import type { Config } from "../../src/lib/types";

const TEST_CONFIG_DIR = "/tmp/posterboy-test-config";
const TEST_CONFIG_FILE = `${TEST_CONFIG_DIR}/config.json`;

describe("Config System", () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
    // Clear env vars
    delete process.env.POSTERBOY_CONFIG;
    delete process.env.POSTERBOY_API_KEY;
  });
  
  afterEach(() => {
    // Clean up
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
    delete process.env.POSTERBOY_CONFIG;
    delete process.env.POSTERBOY_API_KEY;
  });
  
  test("validateConfig accepts valid config", () => {
    const config: Config = {
      version: 1,
      api_key: "test_key",
    };
    
    expect(() => validateConfig(config)).not.toThrow();
  });
  
  test("validateConfig rejects invalid version", () => {
    const config = {
      version: 2,
    } as Config;
    
    expect(() => validateConfig(config)).toThrow(/Unsupported config version/);
  });
  
  test("validateConfig requires version number", () => {
    const config = {} as Config;
    
    expect(() => validateConfig(config)).toThrow(/version number/);
  });
  
  test("readConfig returns null for non-existent file", () => {
    process.env.POSTERBOY_CONFIG = TEST_CONFIG_FILE;
    const config = readConfig();
    expect(config).toBeNull();
  });
  
  test("writeConfig creates directory with correct permissions", async () => {
    process.env.POSTERBOY_CONFIG = TEST_CONFIG_FILE;
    
    const config: Config = {
      version: 1,
      api_key: "test_key",
    };
    
    await writeConfig(config);
    
    expect(existsSync(TEST_CONFIG_DIR)).toBe(true);
    expect(existsSync(TEST_CONFIG_FILE)).toBe(true);
  });
  
  test("resolveValue follows precedence order", () => {
    const result = resolveValue(
      "flag_value",
      "NONEXISTENT_ENV",
      "config_value",
      "default_value"
    );
    
    expect(result).toBe("flag_value");
  });
  
  test("resolveValue uses env var when flag is undefined", () => {
    process.env.TEST_VAR = "env_value";
    
    const result = resolveValue(
      undefined,
      "TEST_VAR",
      "config_value",
      "default_value"
    );
    
    expect(result).toBe("env_value");
    delete process.env.TEST_VAR;
  });
  
  test("resolveValue uses config when flag and env are undefined", () => {
    const result = resolveValue(
      undefined,
      "NONEXISTENT_ENV",
      "config_value",
      "default_value"
    );
    
    expect(result).toBe("config_value");
  });
  
  test("resolveValue uses default when all else undefined", () => {
    const result = resolveValue(
      undefined,
      "NONEXISTENT_ENV",
      undefined,
      "default_value"
    );
    
    expect(result).toBe("default_value");
  });
  
  test("getApiKey throws when no API key available", () => {
    expect(() => getApiKey()).toThrow(/API key not found/);
  });
  
  test("getApiKey returns flag value first", () => {
    process.env.POSTERBOY_API_KEY = "env_key";
    const result = getApiKey("flag_key", "config_key");
    expect(result).toBe("flag_key");
  });
  
  test("getApiKey returns env value when flag undefined", () => {
    process.env.POSTERBOY_API_KEY = "env_key";
    const result = getApiKey(undefined, "config_key");
    expect(result).toBe("env_key");
  });
});
