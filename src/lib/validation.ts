import { validatePlatforms as validatePlatformNames } from "./platforms";
import type { Platform } from "../constants";
import { UserError } from "./errors";

/**
 * Validate platform names and return typed Platform array
 */
export function validatePlatforms(platforms: string[]): Platform[] {
  try {
    return validatePlatformNames(platforms);
  } catch (error) {
    if (error instanceof Error) {
      throw new UserError(error.message);
    }
    throw error;
  }
}

/**
 * Validate ISO-8601 date format and that it's in the future
 */
export function validateISODate(date: string): boolean {
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new UserError(`Invalid ISO-8601 date: ${date}`);
    }
    
    // Check if date is in the future
    if (parsed.getTime() <= Date.now()) {
      throw new UserError(`Schedule date must be in the future: ${date}`);
    }
    
    // Check if date is within 365 days
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 365);
    if (parsed.getTime() > maxDate.getTime()) {
      throw new UserError(
        `Schedule date must be within 365 days from now: ${date}`
      );
    }
    
    return true;
  } catch (error) {
    if (error instanceof UserError) {
      throw error;
    }
    throw new UserError(`Invalid date format: ${date}`);
  }
}

/**
 * Validate IANA timezone name
 */
export function validateTimezone(tz: string): boolean {
  try {
    // Try to create a date with the timezone
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (error) {
    throw new UserError(
      `Invalid timezone: ${tz}.\n` +
      `Must be a valid IANA timezone name (e.g., "America/New_York").`
    );
  }
}

/**
 * Validate that a file exists and is readable
 */
export function validateFileExists(path: string): void {
  try {
    const file = Bun.file(path);
    if (!file.size && file.size !== 0) {
      throw new Error("File does not exist");
    }
  } catch (error) {
    throw new UserError(`File not found or not readable: ${path}`);
  }
}

/**
 * Validate file format based on allowed extensions
 */
export function validateFileFormat(
  path: string,
  allowedFormats: string[]
): void {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext || !allowedFormats.includes(ext)) {
    throw new UserError(
      `Invalid file format for ${path}.\n` +
      `Allowed formats: ${allowedFormats.join(", ")}`
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(path: string, maxSizeMB: number): void {
  const file = Bun.file(path);
  const sizeMB = file.size / (1024 * 1024);
  
  if (sizeMB > maxSizeMB) {
    throw new UserError(
      `File too large: ${path} (${sizeMB.toFixed(1)}MB).\n` +
      `Maximum size: ${maxSizeMB}MB`
    );
  }
}

/**
 * Validate that exactly one of the specified options is provided
 */
export function validateMutuallyExclusive(
  options: Record<string, boolean>,
  errorMessage?: string
): void {
  const provided = Object.entries(options).filter(([_, val]) => val);
  
  if (provided.length === 0) {
    throw new UserError(
      errorMessage ||
      `Exactly one of the following must be provided: ${Object.keys(options).join(", ")}`
    );
  }
  
  if (provided.length > 1) {
    throw new UserError(
      errorMessage ||
      `Only one of the following can be provided: ${provided.map(([k]) => k).join(", ")}`
    );
  }
}
