// posterboy - Schedule cancel command

import { parseArgs } from "node:util";
import { readConfig, getApiKey } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function scheduleCancel(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      "job-id": { type: "string" },
      confirm: { type: "boolean", default: false },
    },
    strict: false,
  });

  // Validate required job-id
  if (!values["job-id"]) {
    throw new UserError(
      "Job ID required.\n" +
      "Usage: posterboy schedule cancel --job-id <id> [--confirm]"
    );
  }

  const jobId = values["job-id"] as string;
  const confirmed = values.confirm as boolean;

  // If not confirmed and TTY, prompt for confirmation
  if (!confirmed && process.stdout.isTTY) {
    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`Cancel scheduled post ${jobId}? (y/n): `, resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.log("Cancelled.");
      return;
    }
  } else if (!confirmed && !process.stdout.isTTY) {
    // Non-TTY without --confirm is an error
    throw new UserError(
      "Confirmation required for non-interactive mode.\n" +
      "Use --confirm flag to proceed without prompt."
    );
  }

  // Get config and API key
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey);

  // Call API
  const result = await client.cancelScheduledPost(jobId);

  // Display results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json({ success: result.success, job_id: jobId });
  } else {
    formatter.pretty([
      formatter.success(`Scheduled post ${jobId} cancelled.`),
    ]);
  }
}
