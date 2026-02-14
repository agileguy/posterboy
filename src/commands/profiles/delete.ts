// posterboy - Profile delete command

import { parseArgs } from "node:util";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { getApiKey, readConfig } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function profilesDelete(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      username: { type: "string" },
      confirm: { type: "boolean" },
    },
    strict: false,
  });

  const username = values.username as string | undefined;
  const confirm = values.confirm as boolean | undefined;

  if (!username) {
    throw new UserError(
      "Username is required.\nUsage: posterboy profiles delete --username <name>"
    );
  }

  // Load config
  const config = readConfig();

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Check if confirmation is needed
  if (!confirm) {
    // In JSON mode, we can't prompt - require --confirm flag
    if (globalFlags.json) {
      throw new UserError(
        "Deletion requires confirmation.\nAdd --confirm flag to delete without prompting."
      );
    }

    // In TTY mode, prompt for confirmation
    if (stdin.isTTY) {
      const shouldDelete = await promptForConfirmation(username);
      if (!shouldDelete) {
        console.log("Deletion cancelled.");
        process.exit(0);
      }
    } else {
      // Non-TTY without --confirm flag
      throw new UserError(
        "Deletion requires confirmation.\nAdd --confirm flag when running non-interactively."
      );
    }
  }

  // Call API to delete
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const result = await client.deleteUser(username);

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({
      success: result.success,
    });
  } else {
    formatter.pretty([
      formatter.success(`Profile '${username}' deleted successfully.`),
    ]);
  }
}

// Prompt for deletion confirmation
async function promptForConfirmation(username: string): Promise<boolean> {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `Delete profile '${username}'? This removes all connected accounts. [y/N] `,
      (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === "y" || normalized === "yes");
      }
    );
  });
}
