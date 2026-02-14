// posterboy - Profile list command

import { getApiKey, readConfig } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import type { GlobalFlags } from "../../lib/types";

export async function profilesList(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Load config
  const config = readConfig();

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Call API
  const client = new ApiClient(apiKey);
  const result = await client.listUsers();

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({
      profiles: result.users,
      count: result.users.length,
      limit: 2,
    });
  } else {
    if (result.users.length === 0) {
      formatter.pretty([
        formatter.header("Profiles"),
        "  No profiles found. Create one with: posterboy profiles create --username <name>",
      ]);
    } else {
      const lines = [formatter.header("Profiles")];

      for (const profile of result.users) {
        const platformsDisplay = profile.connected_platforms.length > 0
          ? profile.connected_platforms.join(", ")
          : formatter.muted("none");

        const createdDate = new Date(profile.created_at).toLocaleDateString();

        lines.push(
          `  ${formatter.label(profile.username)}`,
          `    Platforms: ${platformsDisplay}`,
          `    Created:   ${createdDate}`,
          ""
        );
      }

      lines.push(formatter.muted(`${result.users.length} / 2 profiles`));

      formatter.pretty(lines);
    }
  }
}
