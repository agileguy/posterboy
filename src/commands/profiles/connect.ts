// posterboy - Profile connect command

import { parseArgs } from "node:util";
import { getApiKey, readConfig } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import { validatePlatforms } from "../../lib/platforms";
import type { GlobalFlags, Platform } from "../../lib/types";

export async function profilesConnect(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      username: { type: "string" },
      platforms: { type: "string" },
      redirect: { type: "string" },
    },
    strict: false,
  });

  const username = values.username as string | undefined;
  const platformsStr = values.platforms as string | undefined;
  const redirect = values.redirect as string | undefined;

  if (!username) {
    throw new UserError(
      "Username is required.\nUsage: posterboy profiles connect --username <name> [--platforms platform1,platform2] [--redirect <url>]"
    );
  }

  // Parse and validate platforms if provided
  let platforms: Platform[] | undefined;
  if (platformsStr) {
    platforms = validatePlatforms(platformsStr.split(",").map((p) => p.trim()));
  }

  // Load config
  const config = readConfig();

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Call API to generate JWT
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const result = await client.generateJwt(username, { platforms, redirect_url: redirect });

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({
      success: result.success,
      access_url: result.access_url,
      expires_in: result.expires_in,
    });
  } else {
    formatter.pretty([
      formatter.header("Connect Social Accounts"),
      "",
      "Visit this URL to connect accounts:",
      `  ${formatter.success(result.access_url)}`,
      "",
      formatter.muted(`Link expires in ${result.expires_in}`),
    ]);
  }
}
