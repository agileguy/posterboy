// posterboy - Schedule list command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import type { GlobalFlags } from "../../lib/types";

export async function scheduleList(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
    },
    strict: false,
  });

  // Get config and API key
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Profile is optional for list command
  const profile = values.profile as string | undefined || globalFlags.profile || getDefaultProfile(undefined, config);

  // Call API
  const result = await client.listScheduledPosts(profile);

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
    if (result.scheduled_posts.length === 0) {
      formatter.pretty([
        formatter.muted("No scheduled posts found."),
      ]);
    } else {
      const lines = [
        formatter.header(`Scheduled Posts (${result.scheduled_posts.length})`),
        "",
      ];

      for (const post of result.scheduled_posts) {
        const platformsList = post.platforms.join(", ");
        const title = post.title || "(no title)";

        lines.push(`  ${formatter.label("Job ID:")}     ${post.job_id}`);
        lines.push(`  ${formatter.label("Date:")}       ${post.scheduled_date}`);
        lines.push(`  ${formatter.label("Platforms:")}  ${platformsList}`);
        lines.push(`  ${formatter.label("Type:")}       ${post.media_type}`);
        lines.push(`  ${formatter.label("Title:")}      ${title}`);
        lines.push(`  ${formatter.label("Profile:")}    ${post.user}`);
        lines.push("");
      }

      formatter.pretty(lines);
    }
  }
}
