// posterboy - Queue settings command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import { validateTimezone } from "../../lib/validation";
import type { GlobalFlags, QueueSettingsUpdate } from "../../lib/types";

/**
 * Validate time slot format (HH:MM)
 */
function validateTimeSlot(slot: string): boolean {
  const timePattern = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timePattern.test(slot)) {
    throw new UserError(
      `Invalid time slot format: ${slot}\n` +
      `Expected format: HH:MM (24-hour time, e.g., 09:00, 14:30, 23:45)`
    );
  }
  return true;
}

/**
 * Parse and validate time slots
 */
function parseTimeSlots(slotsString: string): string[] {
  const slots = slotsString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (slots.length === 0) {
    throw new UserError("At least one time slot is required");
  }

  if (slots.length > 24) {
    throw new UserError(`Maximum 24 time slots allowed. You provided ${slots.length}.`);
  }

  // Validate each slot
  slots.forEach((slot) => validateTimeSlot(slot));

  return slots;
}

/**
 * Parse and normalize day names
 */
function parseDaysOfWeek(daysString: string): string[] {
  const dayMap: Record<string, string> = {
    "0": "sun",
    "1": "mon",
    "2": "tue",
    "3": "wed",
    "4": "thu",
    "5": "fri",
    "6": "sat",
    sun: "sun",
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sunday: "sun",
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
  };

  const days = daysString
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);

  if (days.length === 0) {
    throw new UserError("At least one day of the week is required");
  }

  // Normalize and validate
  const normalized = days.map((day) => {
    const normalizedDay = dayMap[day];
    if (!normalizedDay) {
      throw new UserError(
        `Invalid day: ${day}\n` +
        `Valid days: mon, tue, wed, thu, fri, sat, sun (or 0-6, or full names)`
      );
    }
    return normalizedDay;
  });

  // Remove duplicates
  return [...new Set(normalized)];
}

export async function queueSettings(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
      "set-timezone": { type: "string" },
      "set-slots": { type: "string" },
      "set-days": { type: "string" },
    },
    strict: false,
  });

  // Resolve profile
  const config = readConfig();
  const profile =
    (values.profile as string | undefined) ||
    globalFlags.profile ||
    getDefaultProfile(undefined, config);

  if (!profile) {
    throw new UserError(
      "Profile required. Provide one of:\n" +
        "  --profile <name>                           (command flag)\n" +
        "  --profile <name> (global flag)             (before 'queue')\n" +
        "  POSTERBOY_PROFILE=<name>                   (environment variable)\n" +
        '  "default_profile": "<name>"                (in ~/.posterboy/config.json)'
    );
  }

  // Get API key and create client
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey);

  // Determine if this is a view or update operation
  const isUpdate = !!(
    values["set-timezone"] ||
    values["set-slots"] ||
    values["set-days"]
  );

  if (isUpdate) {
    // Build update object
    const updates: QueueSettingsUpdate = {};

    if (values["set-timezone"]) {
      const timezone = values["set-timezone"] as string;
      validateTimezone(timezone);
      updates.timezone = timezone;
    }

    if (values["set-slots"]) {
      updates.slots = parseTimeSlots(values["set-slots"] as string);
    }

    if (values["set-days"]) {
      updates.days_of_week = parseDaysOfWeek(values["set-days"] as string);
    }

    // Call API to update settings
    await client.updateQueueSettings(profile, updates);

    // Display results
    const formatter = createOutputFormatter(
      globalFlags.json,
      globalFlags.pretty,
      true
    );

    if (formatter.mode() === "json") {
      formatter.json({ success: true });
    } else {
      formatter.pretty([formatter.success("Queue settings updated.")]);
    }
  } else {
    // View mode - fetch and display settings
    const settings = await client.getQueueSettings(profile);

    const formatter = createOutputFormatter(
      globalFlags.json,
      globalFlags.pretty,
      true
    );

    if (formatter.mode() === "json") {
      formatter.json(settings);
    } else {
      // Pretty output
      const lines = [
        formatter.header("Queue Settings:"),
        "",
        `  ${formatter.label("Profile:")}      ${settings.profile}`,
        `  ${formatter.label("Timezone:")}     ${settings.timezone}`,
        `  ${formatter.label("Time Slots:")}   ${settings.slots.join(", ")}`,
        `  ${formatter.label("Days Active:")}  ${settings.days_of_week.join(", ")}`,
      ];
      formatter.pretty(lines);
    }
  }
}
