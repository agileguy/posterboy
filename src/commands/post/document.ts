// posterboy - Post document command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import {
  validateMutuallyExclusive,
  validateISODate,
  validateTimezone,
} from "../../lib/validation";
import type { GlobalFlags, DocumentPostParams } from "../../lib/types";

/**
 * Validate document file exists and meets format/size requirements
 */
async function validateDocumentFile(filePath: string): Promise<void> {
  const validExts = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];
  const maxSize = 100 * 1024 * 1024; // 100MB

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new UserError(`File not found: ${filePath}`);
  }
  if (file.size > maxSize) {
    throw new UserError(
      `File exceeds 100MB limit: ${filePath} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
    );
  }
  const ext = filePath.toLowerCase().match(/\.([^./\\]+)$/)?.[1];
  if (!ext || !validExts.includes(`.${ext}`)) {
    throw new UserError(
      `Unsupported format: ${filePath}. Supported: PDF, PPT, PPTX, DOC, DOCX`
    );
  }
}

export async function postDocument(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      file: { type: "string" },
      url: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      platforms: { type: "string" },
      profile: { type: "string" },
      "linkedin-page": { type: "string" },
      "linkedin-visibility": { type: "string" },
      schedule: { type: "string" },
      timezone: { type: "string" },
      queue: { type: "boolean", default: false },
      async: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
    strict: false,
  });

  // Validate mutually exclusive file/url
  validateMutuallyExclusive(
    {
      "--file": !!values.file,
      "--url": !!values.url,
    },
    "Must provide either --file or --url (not both)"
  );

  // Validate title is required
  if (!values.title) {
    throw new UserError("--title is required for document posts");
  }

  // Validate file if provided
  if (values.file) {
    await validateDocumentFile(values.file as string);
  }

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
        "  --profile <name> (global flag)             (before 'post')\n" +
        "  POSTERBOY_PROFILE=<name>                   (environment variable)\n" +
        '  "default_profile": "<name>"                (in ~/.posterboy/config.json)'
    );
  }

  // Documents are LinkedIn-only - validate if user passed --platforms
  if (values.platforms) {
    const platformList = (values.platforms as string)
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const nonLinkedin = platformList.filter((p) => p !== "linkedin");
    if (nonLinkedin.length > 0) {
      throw new UserError(
        `Document posts are only supported on LinkedIn. Unsupported: ${nonLinkedin.join(", ")}`
      );
    }
  }

  // Validate scheduling flags
  if (values.schedule && values.queue) {
    throw new UserError(
      "--schedule and --queue are mutually exclusive.\n" +
        "Use --schedule for a specific date/time, or --queue to use the next available slot."
    );
  }

  if (values.schedule) {
    validateISODate(values.schedule as string);
  }

  if (values.timezone) {
    validateTimezone(values.timezone as string);
  }

  // Build full DocumentPostParams
  const postParams: DocumentPostParams = {
    profile,
    file: values.file as string | undefined,
    url: values.url as string | undefined,
    title: values.title as string,
  };

  // Add optional fields
  if (values.description) postParams.description = values.description as string;
  if (values["linkedin-page"] || config?.platform_defaults?.linkedin?.page_id) {
    postParams.linkedin_page = (values["linkedin-page"] as string) || config?.platform_defaults?.linkedin?.page_id;
  }
  if (values["linkedin-visibility"] || config?.platform_defaults?.linkedin?.visibility) {
    postParams.linkedin_visibility = (values["linkedin-visibility"] as string) || config?.platform_defaults?.linkedin?.visibility;
  }
  if (values.schedule) postParams.schedule = values.schedule as string;
  if (values.timezone) postParams.timezone = values.timezone as string;
  if (values.queue) postParams.queue = values.queue as boolean;
  if (values.async) postParams.async = values.async as boolean;

  // Dry run mode - print payload and exit
  if (values["dry-run"]) {
    const formatter = createOutputFormatter(
      globalFlags.json,
      globalFlags.pretty,
      true
    );

    if (formatter.mode() === "json") {
      formatter.json({
        dry_run: true,
        payload: postParams,
      });
    } else {
      formatter.pretty([
        formatter.header("Dry Run - Request Payload:"),
        "",
        JSON.stringify(postParams, null, 2),
      ]);
    }
    return;
  }

  // Get API key and create client
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey);

  // Call API
  const result = await client.postDocument(postParams);

  // Display results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json(result);
  } else {
    // Pretty output
    if (result.scheduled) {
      formatter.pretty([
        formatter.success("Document post scheduled successfully on LinkedIn!"),
        `  ${formatter.label("Job ID:")}        ${result.job_id}`,
        `  ${formatter.label("Scheduled for:")} ${result.scheduled_date}`,
      ]);
    } else if (result.results) {
      // Immediate post
      const lines = [
        formatter.success("Document posted to LinkedIn successfully!"),
        "",
      ];

      // Show results (should only be LinkedIn)
      for (const [platform, platformResult] of Object.entries(result.results)) {
        if (platformResult.success && platformResult.url) {
          lines.push(`  ${platform.padEnd(12)} ${platformResult.url}`);
        } else if (!platformResult.success && platformResult.error) {
          lines.push(
            `  ${platform.padEnd(12)} ${formatter.color("FAILED", "RED")} - ${platformResult.error}`
          );
        }
      }

      // Show usage if available
      if (result.usage) {
        lines.push("");
        lines.push(
          `Usage: ${result.usage.count} / ${result.usage.limit} (${result.usage.remaining} remaining)`
        );
      }

      formatter.pretty(lines);
    } else {
      // Async mode
      formatter.pretty([
        formatter.success("Document post queued successfully!"),
        `  ${formatter.label("Request ID:")} ${result.request_id || "N/A"}`,
      ]);
    }
  }
}
