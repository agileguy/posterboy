// posterboy - Auth status command

import { getApiKey, readConfig } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import type { GlobalFlags } from "../../lib/types";

export async function authStatus(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Load config
  const config = readConfig();

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Call API
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const accountInfo = await client.me();

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({
      email: accountInfo.email,
      plan: accountInfo.plan,
    });
  } else {
    formatter.pretty([
      formatter.header("Account Status"),
      `  ${formatter.label("Email:")}     ${accountInfo.email}`,
      `  ${formatter.label("Plan:")}      ${accountInfo.plan}`,
    ]);
  }
}
