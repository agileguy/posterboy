// posterboy - Analytics command

import { parseArgs } from "node:util";
import { readConfig, getApiKey } from "../lib/config";
import { ApiClient } from "../lib/api";
import { createOutputFormatter } from "../lib/output";
import { UserError } from "../lib/errors";
import type { GlobalFlags } from "../lib/types";

export async function analytics(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values, positionals } = parseArgs({
    args,
    options: {
      platforms: { type: "string" },
      "facebook-page": { type: "string" },
      "linkedin-page": { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  // The first positional argument is the profile
  const profile = positionals[0];
  if (!profile) {
    throw new UserError(
      "Profile is required.\n" +
        "Usage: posterboy analytics <profile> [--platforms <list>]"
    );
  }

  // Parse platforms if provided
  const platforms = values.platforms
    ? (values.platforms as string).split(",").map(p => p.trim())
    : undefined;

  const facebookPage = values["facebook-page"] as string | undefined;
  const linkedinPage = values["linkedin-page"] as string | undefined;

  // Validate facebook platform requirement
  if (platforms?.includes("facebook") && !facebookPage) {
    throw new UserError(
      "Facebook analytics require --facebook-page flag.\n" +
        "Usage: posterboy analytics <profile> --platforms facebook --facebook-page <page_id>"
    );
  }

  // Get config and API key
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Call API
  const result = await client.getAnalytics(profile, platforms, facebookPage, linkedinPage);

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
    const lines = [
      formatter.header(`Analytics for "${result.profile}"`),
      "",
    ];

    // Check if analytics is empty
    if (Object.keys(result.analytics).length === 0) {
      lines.push("  No analytics data available.");
    } else {
      // Iterate through each platform
      for (const [platform, metrics] of Object.entries(result.analytics)) {
        lines.push(`  ${formatter.label(platform)}`);

        // Format each metric
        for (const [key, value] of Object.entries(metrics)) {
          const formattedKey = key
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          let formattedValue: string;
          if (typeof value === "number") {
            // Format numbers with commas
            formattedValue = value.toLocaleString();
          } else {
            formattedValue = String(value);
          }

          lines.push(`    ${formattedKey.padEnd(15)} ${formattedValue}`);
        }

        lines.push("");
      }
    }

    formatter.pretty(lines);
  }
}
