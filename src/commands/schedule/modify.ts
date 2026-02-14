// posterboy - Schedule modify command

import { parseArgs } from "node:util";
import { readConfig, getApiKey } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import { validateISODate, validateTimezone } from "../../lib/validation";
import type { GlobalFlags, ScheduleUpdate } from "../../lib/types";

export async function scheduleModify(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      "job-id": { type: "string" },
      schedule: { type: "string" },
      title: { type: "string" },
      timezone: { type: "string" },
    },
    strict: false,
  });

  // Validate required job-id
  if (!values["job-id"]) {
    throw new UserError(
      "Job ID required.\n" +
      "Usage: posterboy schedule modify --job-id <id> [--schedule <datetime>] [--title <text>] [--timezone <tz>]"
    );
  }

  const jobId = values["job-id"] as string;

  // Build updates object
  const updates: ScheduleUpdate = {};

  if (values.schedule) {
    const scheduleDate = values.schedule as string;
    validateISODate(scheduleDate);
    updates.schedule = scheduleDate;
  }

  if (values.title) {
    updates.title = values.title as string;
  }

  if (values.timezone) {
    const tz = values.timezone as string;
    validateTimezone(tz);
    updates.timezone = tz;
  }

  // Validate that at least one update is provided
  if (Object.keys(updates).length === 0) {
    throw new UserError(
      "At least one update required.\n" +
      "Provide one of: --schedule, --title, or --timezone"
    );
  }

  // Get config and API key
  const config = readConfig();
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey);

  // Call API
  const result = await client.modifyScheduledPost(jobId, updates);

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
      formatter.success(`Scheduled post ${jobId} updated.`),
    ]);
  }
}
