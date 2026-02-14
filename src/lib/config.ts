import { CONFIG_FILE } from "../constants";
import type { Config, Platform } from "./types";
import { UserError } from "./errors";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Read configuration from file
 */
export function readConfig(): Config | null {
  const configPath = resolveConfigPath();
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as Config;
    validateConfig(config);
    return config;
  } catch (error) {
    if (error instanceof UserError) {
      throw error;
    }
    throw new UserError(
      `Failed to read config file at ${configPath}.\n` +
      `The file may be corrupted. Please run 'posterboy auth login' to recreate it.`
    );
  }
}

/**
 * Write configuration to file with proper permissions
 */
export async function writeConfig(config: Config): Promise<void> {
  const configPath = resolveConfigPath();
  const configDir = dirname(configPath);

  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  // Validate before writing
  validateConfig(config);

  // Write config file with atomic permissions
  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, { mode: 0o600 });

  // Ensure directory has correct permissions too
  await chmod(configDir, 0o700);
}

/**
 * Validate config schema
 */
export function validateConfig(config: Config): void {
  if (typeof config !== "object" || config === null) {
    throw new UserError("Config must be an object");
  }
  
  if (typeof config.version !== "number") {
    throw new UserError("Config must have a version number");
  }
  
  if (config.version !== 1) {
    throw new UserError(
      `Unsupported config version: ${config.version}. Expected version 1.`
    );
  }
  
  // API key is optional in config (can come from env var)
  if (config.api_key !== undefined && typeof config.api_key !== "string") {
    throw new UserError("Config api_key must be a string");
  }
  
  // Validate optional fields if present
  if (config.default_profile !== undefined && typeof config.default_profile !== "string") {
    throw new UserError("Config default_profile must be a string");
  }
  
  if (config.default_platforms !== undefined) {
    if (!Array.isArray(config.default_platforms)) {
      throw new UserError("Config default_platforms must be an array");
    }
  }
  
  if (config.default_timezone !== undefined && typeof config.default_timezone !== "string") {
    throw new UserError("Config default_timezone must be a string");
  }
}

/**
 * Resolve config file path
 * Respects POSTERBOY_CONFIG env var or --config flag
 */
export function resolveConfigPath(overridePath?: string): string {
  return overridePath || process.env.POSTERBOY_CONFIG || CONFIG_FILE;
}

/**
 * Resolve a value with precedence: flag > env > config > default
 */
export function resolveValue<T>(
  flagValue: T | undefined,
  envVar: string,
  configValue: T | undefined,
  defaultValue: T
): T {
  // Priority 1: CLI flag
  if (flagValue !== undefined) {
    return flagValue;
  }
  
  // Priority 2: Environment variable
  const envValue = process.env[envVar];
  if (envValue !== undefined) {
    return envValue as T;
  }
  
  // Priority 3: Config file
  if (configValue !== undefined) {
    return configValue;
  }
  
  // Priority 4: Default value
  return defaultValue;
}

/**
 * Get API key from all possible sources
 */
export function getApiKey(
  flagValue?: string,
  configValue?: string
): string {
  const apiKey = resolveValue(
    flagValue,
    "POSTERBOY_API_KEY",
    configValue,
    ""
  );
  
  if (!apiKey) {
    throw new UserError(
      "API key not found.\n" +
      "Please run 'posterboy auth login' or set POSTERBOY_API_KEY environment variable."
    );
  }
  
  return apiKey;
}

/**
 * Get default profile from all possible sources
 */
export function getDefaultProfile(
  flagValue?: string,
  config?: Config | null
): string | undefined {
  return resolveValue(
    flagValue,
    "POSTERBOY_PROFILE",
    config?.default_profile,
    undefined
  );
}

/**
 * Get default platforms from all possible sources
 */
export function getDefaultPlatforms(
  flagValue?: Platform[],
  config?: Config | null
): Platform[] | undefined {
  // Handle comma-separated env var
  const envValue = process.env.POSTERBOY_PLATFORMS;
  const envPlatforms = envValue ? envValue.split(",") as Platform[] : undefined;

  return resolveValue(
    flagValue,
    "", // Not used since we handle env manually above
    envPlatforms || config?.default_platforms,
    undefined
  );
}

/**
 * Get default timezone from all possible sources
 */
export function getDefaultTimezone(
  flagValue?: string,
  config?: Config | null
): string {
  // Default to system timezone
  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return resolveValue(
    flagValue,
    "POSTERBOY_TIMEZONE",
    config?.default_timezone,
    systemTz
  );
}

/**
 * Get output format preference from all possible sources
 */
export function getOutputFormat(
  jsonFlag?: boolean,
  prettyFlag?: boolean,
  config?: Config | null
): "json" | "pretty" | "auto" {
  if (jsonFlag) return "json";
  if (prettyFlag) return "pretty";
  
  const envValue = process.env.POSTERBOY_OUTPUT;
  if (envValue === "json" || envValue === "pretty") {
    return envValue;
  }
  
  return config?.output?.format || "auto";
}

/**
 * Check if color output should be enabled
 */
export function isColorEnabled(config?: Config | null): boolean {
  // NO_COLOR env var takes precedence
  if (process.env.NO_COLOR) {
    return false;
  }
  
  return config?.output?.color !== false;
}
