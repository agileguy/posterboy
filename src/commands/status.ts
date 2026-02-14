// posterboy - Status check command

import { parseArgs } from "node:util";
import { readConfig, getApiKey } from "../lib/config";
import { ApiClient } from "../lib/api";
import { createOutputFormatter } from "../lib/output";
import { UserError } from "../lib/errors";
import type { GlobalFlags } from "../lib/types";

export async function statusCheck(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values, positionals } = parseArgs({
    args,
    options: {
      "request-id": { type: "string" },
      "job-id": { type: "string" },
      poll: { type: "boolean", default: false },
      interval: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  // Validate mutual exclusivity - only one ID source allowed
  const hasPositional = positionals.length > 0;
  const hasRequestId = !!values["request-id"];
  const hasJobId = !!values["job-id"];
  const idSourceCount = [hasPositional, hasRequestId, hasJobId].filter(Boolean).length;

  if (idSourceCount > 1) {
    throw new UserError(
      "Only one ID source allowed. Provide one of:\n" +
        "  posterboy status <id>\n" +
        "  posterboy status --request-id <id>\n" +
        "  posterboy status --job-id <id>"
    );
  }

  // Get ID from positional arg, or explicit flags
  let id: string | undefined;
  let idType: "request_id" | "job_id" = "job_id";

  if (values["request-id"]) {
    id = values["request-id"] as string;
    idType = "request_id";
  } else if (values["job-id"]) {
    id = values["job-id"] as string;
    idType = "job_id";
  } else if (positionals.length > 0) {
    id = positionals[0];
    // Auto-detect type based on prefix
    if (id.startsWith("req_")) {
      idType = "request_id";
    }
  }

  if (!id) {
    throw new UserError(
      "ID required. Provide one of:\n" +
        "  posterboy status <id>          (job_id or request_id)\n" +
        "  posterboy status --request-id <id>\n" +
        "  posterboy status --job-id <id>"
    );
  }

  // Parse poll interval (default: 5 seconds)
  const pollInterval = values.interval
    ? parseInt(values.interval as string, 10) * 1000
    : 5000;

  if (isNaN(pollInterval) || pollInterval < 1000) {
    throw new UserError("Poll interval must be at least 1 second");
  }

  // Get API key and create client
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Create formatter
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  // Handle polling mode
  if (values.poll) {
    const isTTY = process.stdout.isTTY;
    let attempts = 0;
    const maxAttempts = 120; // Max 10 minutes with 5s intervals

    // Handle Ctrl+C gracefully
    let interrupted = false;
    const sigintHandler = () => {
      interrupted = true;
      if (isTTY) {
        console.log("\n\nPolling interrupted by user.");
      }
      process.exit(0);
    };
    process.on("SIGINT", sigintHandler);

    while (attempts < maxAttempts && !interrupted) {
      const result = await client.getStatus(id, idType);

      // Check if complete
      if (result.status === "completed" || result.status === "failed") {
        process.off("SIGINT", sigintHandler);

        if (formatter.mode() === "json") {
          formatter.json(result);
        } else {
          displayPrettyStatus(result, formatter);
        }
        return;
      }

      // Show polling indicator (only in TTY)
      if (isTTY) {
        const dots = ".".repeat((attempts % 3) + 1);
        process.stdout.write(`\rPolling status${dots}   `);
      }

      // Wait for interval
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    process.off("SIGINT", sigintHandler);

    if (attempts >= maxAttempts) {
      throw new UserError(
        "Polling timeout reached. Status is still pending. Try again later."
      );
    }
  } else {
    // Single status check
    const result = await client.getStatus(id, idType);

    if (formatter.mode() === "json") {
      formatter.json(result);
    } else {
      displayPrettyStatus(result, formatter);
    }
  }
}

function displayPrettyStatus(
  result: { status: string; completed?: number; total?: number; results?: Array<{ platform: string; success: boolean; url?: string; error?: string }>; error?: string },
  formatter: ReturnType<typeof createOutputFormatter>
): void {
  const lines: string[] = [];

  // Status header with progress
  if (result.status === "completed") {
    lines.push(formatter.success("Status: Completed"));
  } else if (result.status === "failed") {
    lines.push(formatter.color("Status: Failed", "RED"));
  } else {
    lines.push(`Status: ${result.status}`);
  }

  if (result.completed !== undefined && result.total !== undefined) {
    lines.push(`Progress: ${result.completed}/${result.total}`);
  }

  if (result.error) {
    lines.push("");
    lines.push(formatter.color(`Error: ${result.error}`, "RED"));
  }

  if (result.results && Array.isArray(result.results)) {
    lines.push("");
    lines.push(formatter.header("Platform Results:"));
    for (const pr of result.results) {
      if (pr.success && pr.url) {
        lines.push(`  ${pr.platform.padEnd(12)} ${pr.url}`);
      } else if (!pr.success && pr.error) {
        lines.push(`  ${pr.platform.padEnd(12)} ${formatter.color("FAILED", "RED")} - ${pr.error}`);
      }
    }
  }

  formatter.pretty(lines);
}
