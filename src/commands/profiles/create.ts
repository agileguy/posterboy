// posterboy - Profile create command

import { parseArgs } from "node:util";
import { getApiKey, readConfig } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function profilesCreate(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      username: { type: "string" },
    },
    strict: false,
  });

  const username = values.username as string | undefined;

  if (!username) {
    throw new UserError(
      "Username is required.\nUsage: posterboy profiles create --username <name>"
    );
  }

  // Load config
  const config = readConfig();

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Call API
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const result = await client.createUser(username);

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({
      success: result.success,
      profile: result.profile,
    });
  } else {
    formatter.pretty([
      formatter.success(`Profile '${username}' created successfully.`),
      "",
      "Next step: Connect social accounts with:",
      `  posterboy profiles connect --username ${username}`,
    ]);
  }
}
