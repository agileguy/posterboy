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
  const client = new ApiClient(apiKey);
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
      usage: accountInfo.usage,
    });
  } else {
    const usage = accountInfo.usage;
    formatter.pretty([
      formatter.header("Account Status"),
      `  ${formatter.label("Email:")}     ${accountInfo.email}`,
      `  ${formatter.label("Plan:")}      ${accountInfo.plan}`,
      `  ${formatter.label("Usage:")}     ${usage.count} / ${usage.limit} uploads this month (${usage.remaining} remaining)`,
    ]);
  }
}
