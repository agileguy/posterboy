// posterboy - Queue preview command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function queuePreview(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
      count: { type: "string" },
    },
    strict: false,
  });

  // Resolve profile
  const config = readConfig();
  const profile =
    (values.profile as string | undefined) ||
    globalFlags.profile ||
    getDefaultProfile(undefined, config);

  if (!profile) {
    throw new UserError(
      "Profile required. Provide one of:\n" +
        "  --profile <name>                           (command flag)\n" +
        "  --profile <name> (global flag)             (before 'queue')\n" +
        "  POSTERBOY_PROFILE=<name>                   (environment variable)\n" +
        '  "default_profile": "<name>"                (in ~/.posterboy/config.json)'
    );
  }

  // Parse and validate count
  let count = 10; // default
  if (values.count) {
    const parsed = parseInt(values.count as string, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      throw new UserError(
        `Invalid count: ${values.count}\n` +
        `Count must be a number between 1 and 50`
      );
    }
    count = parsed;
  }

  // Get API key and create client
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Fetch preview
  const result = await client.previewQueue(profile, count);

  // Display results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json(result);
  } else {
    // Pretty output - table format
    const lines = [
      formatter.header(`Next ${result.slots.length} Queue Slots:`),
      "",
    ];

    if (result.slots.length === 0) {
      lines.push("  No upcoming slots available.");
    } else {
      // Table header
      const headers = ["Datetime", "Status"];
      const rows = result.slots.map((slot) => [
        slot.datetime,
        slot.available ? formatter.success("Available") : formatter.muted("Occupied"),
      ]);

      // Calculate column widths
      const col1Width = Math.max(
        headers[0].length,
        ...rows.map((r) => r[0].length)
      );

      // Print header
      lines.push(
        `  ${formatter.color(headers[0].padEnd(col1Width), "CYAN")}  ${formatter.color(headers[1], "CYAN")}`
      );

      // Print rows
      rows.forEach((row) => {
        lines.push(`  ${row[0].padEnd(col1Width)}  ${row[1]}`);
      });
    }

    formatter.pretty(lines);
  }
}
