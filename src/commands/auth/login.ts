// posterboy - Auth login command

import { parseArgs } from "node:util";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { readConfig, writeConfig, resolveConfigPath } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function authLogin(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      key: { type: "string" },
    },
    strict: false,
  });

  let apiKey = values.key as string | undefined;

  // If no key provided, prompt for it (only if stdin is TTY)
  if (!apiKey) {
    if (stdin.isTTY) {
      apiKey = await promptForKey();
    } else {
      throw new UserError(
        "API key required. Use --key flag or run interactively.\nUsage: posterboy auth login --key <your-api-key>"
      );
    }
  }

  // Validate the key by calling API
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const accountInfo = await client.me();

  // Load existing config (or create new one)
  const existingConfig = readConfig();
  const config = existingConfig || { version: 1 };
  config.api_key = apiKey;

  // Save config
  await writeConfig(config);

  // Output success
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  const configPath = resolveConfigPath(globalFlags.config);

  if (formatter.mode() === "json") {
    formatter.json({
      success: true,
      email: accountInfo.email,
      plan: accountInfo.plan,
      message: `API key saved to ${configPath}`,
    });
  } else {
    formatter.pretty([
      "API key validated and saved.",
      `  ${formatter.label("Account:")} ${accountInfo.email}`,
      `  ${formatter.label("Plan:")}    ${accountInfo.plan}`,
      `  ${formatter.label("Config:")}  ${configPath}`,
    ]);
  }
}

// Prompt for API key
async function promptForKey(): Promise<string> {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter your Upload-Post API key: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
