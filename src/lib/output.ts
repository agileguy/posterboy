/**
 * Output formatting system with JSON and pretty modes
 * Respects --json, --pretty flags, TTY detection, and NO_COLOR env var
 */

type OutputMode = "json" | "pretty";

// ANSI color codes
const ANSI = {
  BOLD: "\x1b[1m",
  CYAN: "\x1b[36m",
  YELLOW: "\x1b[33m",
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  GRAY: "\x1b[90m",
  RESET: "\x1b[0m",
} as const;

export class OutputFormatter {
  private _mode: OutputMode;
  private _colorEnabled: boolean;
  
  constructor(
    forceMode?: OutputMode,
    colorEnabled: boolean = true
  ) {
    // Determine output mode
    if (forceMode) {
      this._mode = forceMode;
    } else if (!process.stdout.isTTY) {
      // Non-TTY defaults to JSON for script friendliness
      this._mode = "json";
    } else {
      this._mode = "pretty";
    }
    
    // Respect NO_COLOR environment variable
    this._colorEnabled = colorEnabled && !process.env.NO_COLOR;
  }
  
  /**
   * Get current output mode
   */
  mode(): OutputMode {
    return this._mode;
  }
  
  /**
   * Output data as JSON to stdout
   */
  json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }
  
  /**
   * Output formatted text to stdout (pretty mode)
   */
  pretty(lines: string[]): void {
    console.log(lines.join("\n"));
  }
  
  /**
   * Output error to stderr
   */
  error(message: string, details?: unknown): void {
    const prefix = this.color("Error:", "RED");
    console.error(`${prefix} ${message}`);
    if (details) {
      console.error(details);
    }
  }
  
  /**
   * Display usage information after successful post
   */
  usage(count: number, limit: number): void {
    const remaining = limit - count;
    const line = `Usage: ${count} / ${limit} (${remaining} remaining)`;
    
    if (this._mode === "json") {
      // Usage is included in the main JSON output, don't print separately
      return;
    }
    
    console.log("\n" + line);
  }
  
  /**
   * Format a table for list commands
   */
  table(headers: string[], rows: string[][]): void {
    if (this._mode === "json") {
      // Tables should be formatted as JSON arrays in JSON mode
      // This is a fallback - callers should handle JSON mode themselves
      return;
    }
    
    // Calculate column widths
    const widths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map(r => (r[i] || "").length));
      return Math.max(h.length, maxRowWidth);
    });
    
    // Print header
    const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
    console.log(this.color(headerLine, "CYAN"));
    
    // Print rows
    rows.forEach(row => {
      const rowLine = row.map((cell, i) => cell.padEnd(widths[i])).join("  ");
      console.log(rowLine);
    });
  }
  
  /**
   * Apply ANSI color code
   */
  color(text: string, colorName: keyof typeof ANSI): string {
    if (!this._colorEnabled) {
      return text;
    }
    return `${ANSI[colorName]}${text}${ANSI.RESET}`;
  }
  
  /**
   * Format a section header
   */
  header(text: string): string {
    return this.color(text, "CYAN");
  }
  
  /**
   * Format a label (bold)
   */
  label(text: string): string {
    return this.color(text, "BOLD");
  }
  
  /**
   * Format success text
   */
  success(text: string): string {
    return this.color(text, "GREEN");
  }
  
  /**
   * Format warning text
   */
  warning(text: string): string {
    return this.color(text, "YELLOW");
  }
  
  /**
   * Format muted/secondary text
   */
  muted(text: string): string {
    return this.color(text, "GRAY");
  }
}

/**
 * Create an output formatter with the given configuration
 */
export function createOutputFormatter(
  jsonFlag?: boolean,
  prettyFlag?: boolean,
  colorEnabled: boolean = true
): OutputFormatter {
  let mode: OutputMode | undefined;
  
  if (jsonFlag) {
    mode = "json";
  } else if (prettyFlag) {
    mode = "pretty";
  }
  // else undefined, let OutputFormatter auto-detect from TTY
  
  return new OutputFormatter(mode, colorEnabled);
}
