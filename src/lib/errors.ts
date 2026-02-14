import { EXIT_CODES } from "../constants";

/**
 * Base error class for all posterboy errors
 */
export abstract class PosterBoyError extends Error {
  abstract exitCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Format error as JSON object
   */
  json(): { success: false; error: string; code: string } {
    return {
      success: false,
      error: this.message,
      code: this.name.replace(/Error$/, "").toUpperCase(),
    };
  }
}

/**
 * User error - invalid input, missing arguments, bad configuration
 * Exit code: 1
 */
export class UserError extends PosterBoyError {
  exitCode = EXIT_CODES.USER_ERROR;
}

/**
 * API error - authentication failure, rate limiting, platform rejection
 * Exit code: 2
 */
export class ApiError extends PosterBoyError {
  exitCode = EXIT_CODES.API_ERROR;
  statusCode: number;
  apiMessage: string;
  
  constructor(message: string, statusCode: number, apiMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.apiMessage = apiMessage || message;
  }
  
  override json() {
    return {
      success: false as const,
      error: this.message,
      code: "API_ERROR",
      statusCode: this.statusCode,
      apiMessage: this.apiMessage,
    };
  }
}

/**
 * Network error - connection timeout, DNS failure, connection refused
 * Exit code: 3
 */
export class NetworkError extends PosterBoyError {
  exitCode = EXIT_CODES.NETWORK_ERROR;
}

/**
 * Rate limit error - extends ApiError with usage information
 */
export class RateLimitError extends ApiError {
  usage: {
    count: number;
    limit: number;
    remaining: number;
  };

  constructor(
    message: string,
    usage: { count: number; limit: number; remaining: number }
  ) {
    super(message, 429, message);
    this.usage = usage;
  }

  override json() {
    return {
      success: false as const,
      error: this.message,
      code: "RATE_LIMIT",
      statusCode: this.statusCode,
      apiMessage: this.apiMessage,
      usage: this.usage,
    };
  }
}

/**
 * Suggest a fix for common error scenarios
 */
export function suggestFix(error: PosterBoyError): string | null {
  const msg = error.message.toLowerCase();

  if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("authentication")) {
    return "Run 'posterboy auth login --key <your-key>' to set up authentication";
  }

  if (msg.includes("profile required") || msg.includes("profile not found")) {
    return "Set a default profile: posterboy profiles create --username <name>";
  }

  if (msg.includes("platform") && (msg.includes("not connected") || msg.includes("invalid"))) {
    return "See available platforms: posterboy platforms --profile <name>";
  }

  if (msg.includes("file not found") || msg.includes("no such file")) {
    return "Check that the file path is correct and the file exists";
  }

  return null;
}
