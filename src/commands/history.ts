// posterboy - History command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../lib/config";
import { ApiClient } from "../lib/api";
import { createOutputFormatter } from "../lib/output";
import { UserError } from "../lib/errors";
import type { GlobalFlags } from "../lib/types";

export async function history(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
      page: { type: "string" },
      limit: { type: "string" },
    },
    strict: false,
  });

  // Validate page number
  const page = values.page ? parseInt(values.page as string, 10) : 1;
  if (isNaN(page) || page < 1) {
    throw new UserError("Page must be a positive integer (>= 1)");
  }

  // Validate limit
  const limit = values.limit ? parseInt(values.limit as string, 10) : 10;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new UserError("Limit must be between 1 and 100");
  }

  // Get config and API key
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Profile is optional for history command (falls back to default)
  const profile = values.profile as string | undefined || globalFlags.profile || getDefaultProfile(undefined, config);

  // Call API
  const result = await client.getHistory(profile, page, limit);

  // Display results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json(result);
  } else {
    // Pretty output
    if (result.history.length === 0) {
      formatter.pretty([
        formatter.muted("No upload history found."),
      ]);
    } else {
      const lines = [
        formatter.header(`Upload History (page ${result.page} of ${result.total_pages})`),
        "",
      ];

      for (const entry of result.history) {
        const date = entry.date.substring(0, 16).replace("T", " ");
        const platformsList = entry.platforms.join(", ");
        const title = entry.title || "(no title)";
        const contentType = entry.content_type.padEnd(8);

        lines.push(`  ${date}  ${contentType}  ${platformsList.padEnd(20)}  ${title}`);
      }

      formatter.pretty(lines);
    }
  }
}
