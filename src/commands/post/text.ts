// posterboy - Post text command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import { validatePlatforms, validateMutuallyExclusive, validateISODate, validateTimezone } from "../../lib/validation";
import {
  validateContentTypeForPlatforms,
  validatePlatformRequirements,
} from "../../lib/platforms";
import type { GlobalFlags, Platform, TextPostParams } from "../../lib/types";

export async function postText(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      body: { type: "string" },
      file: { type: "string" },
      stdin: { type: "boolean", default: false },
      platforms: { type: "string" },
      profile: { type: "string" },
      schedule: { type: "string" },
      timezone: { type: "string" },
      queue: { type: "boolean", default: false },
      async: { type: "boolean", default: false },
      "first-comment": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      // X-specific
      "x-title": { type: "string" },
      "x-reply-to": { type: "string" },
      "x-reply-settings": { type: "string" },
      "x-quote-tweet": { type: "string" },
      "x-long-text-as-post": { type: "boolean" },
      "x-poll-options": { type: "string", multiple: true },
      "x-poll-duration": { type: "string" },
      // LinkedIn-specific
      "linkedin-title": { type: "string" },
      "linkedin-page": { type: "string" },
      "linkedin-visibility": { type: "string" },
      // Facebook-specific
      "facebook-title": { type: "string" },
      "facebook-page": { type: "string" },
      "facebook-link": { type: "string" },
      // Threads-specific
      "threads-title": { type: "string" },
      "threads-long-text-as-post": { type: "boolean" },
      // Reddit-specific
      "reddit-subreddit": { type: "string" },
      "reddit-flair": { type: "string" },
      // Bluesky-specific
      "bluesky-title": { type: "string" },
      "bluesky-reply-to": { type: "string" },
    },
    strict: false,
  });

  // Resolve text content from exactly ONE of --body, --file, or --stdin
  let text: string;
  const hasBody = !!values.body;
  const hasFile = !!values.file;
  const hasStdin = values.stdin as boolean;

  const inputModes = [hasBody, hasFile, hasStdin].filter(Boolean).length;

  if (inputModes === 0) {
    throw new UserError(
      "Text content required. Provide exactly one of:\n" +
        "  --body <text>    Text content inline\n" +
        "  --file <path>    Read text from file\n" +
        "  --stdin          Read text from stdin"
    );
  }

  if (inputModes > 1) {
    throw new UserError(
      "Only one text input method allowed.\n" +
        "Choose one of: --body, --file, or --stdin"
    );
  }

  if (hasBody) {
    text = values.body as string;
  } else if (hasFile) {
    const filePath = values.file as string;
    try {
      text = await Bun.file(filePath).text();
    } catch (error) {
      throw new UserError(
        `Failed to read file: ${filePath}\n` +
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  } else {
    // hasStdin
    try {
      text = await Bun.stdin.text();
    } catch (error) {
      throw new UserError(
        `Failed to read from stdin\n` +
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  if (!text || text.trim().length === 0) {
    throw new UserError("Text content cannot be empty");
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

  // Resolve platforms
  let platforms: Platform[];
  if (values.platforms) {
    const platformList = (values.platforms as string)
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    platforms = validatePlatforms(platformList);
  } else if (config?.default_platforms && config.default_platforms.length > 0) {
    platforms = config.default_platforms;
  } else {
    throw new UserError(
      "Platforms required. Provide one of:\n" +
        "  --platforms <list>                         (comma-separated: x,linkedin,threads)\n" +
        "  POSTERBOY_PLATFORMS=<list>                 (environment variable)\n" +
        '  "default_platforms": [...]                 (in ~/.posterboy/config.json)'
    );
  }

  // Validate all platforms support text
  validateContentTypeForPlatforms("text", platforms);

  // Build params object for validation and API call
  const params: Record<string, unknown> = {
    profile,
    platforms,
    text,
    facebook_page: values["facebook-page"] || config?.platform_defaults?.facebook?.page_id,
    reddit_subreddit: values["reddit-subreddit"] || config?.platform_defaults?.reddit?.subreddit,
  };

  // Validate platform-specific requirements
  validatePlatformRequirements(platforms, params);

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

  // Build full TextPostParams
  const postParams: TextPostParams = {
    profile,
    platforms,
    text,
  };

  // Add optional scheduling fields
  if (values.schedule) postParams.schedule = values.schedule as string;
  if (values.timezone) postParams.timezone = values.timezone as string;
  if (values.queue) postParams.queue = values.queue as boolean;
  if (values.async) postParams.async = values.async as boolean;
  if (values["first-comment"]) postParams.first_comment = values["first-comment"] as string;

  // X-specific
  if (values["x-title"]) postParams.x_title = values["x-title"] as string;
  if (values["x-reply-to"]) postParams.x_reply_to = values["x-reply-to"] as string;
  if (values["x-reply-settings"]) postParams.x_reply_settings = values["x-reply-settings"] as string;
  if (values["x-quote-tweet"]) postParams.x_quote_tweet = values["x-quote-tweet"] as string;
  if (values["x-long-text-as-post"] !== undefined) postParams.x_long_text_as_post = values["x-long-text-as-post"] as boolean;

  if (values["x-poll-options"]) {
    const options = (values["x-poll-options"] as string[])
      .flatMap((opt) => opt.split(","))
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (options.length < 2 || options.length > 4) {
      throw new UserError(
        `X polls require 2-4 options. You provided ${options.length}.`
      );
    }
    postParams.x_poll_options = options;
  }

  if (values["x-poll-duration"]) {
    const duration = parseInt(values["x-poll-duration"] as string, 10);
    if (isNaN(duration) || duration < 5 || duration > 10080) {
      throw new UserError(
        "Invalid poll duration. Must be a number between 5 and 10080 minutes (5 minutes to 7 days)."
      );
    }
    postParams.x_poll_duration = duration;
  }

  // LinkedIn-specific
  if (values["linkedin-title"]) postParams.linkedin_title = values["linkedin-title"] as string;
  if (values["linkedin-page"]) postParams.linkedin_page = values["linkedin-page"] as string;
  if (values["linkedin-visibility"]) postParams.linkedin_visibility = values["linkedin-visibility"] as string;

  // Facebook-specific
  if (values["facebook-title"]) postParams.facebook_title = values["facebook-title"] as string;
  if (values["facebook-page"]) postParams.facebook_page = values["facebook-page"] as string;
  if (values["facebook-link"]) postParams.facebook_link = values["facebook-link"] as string;

  // Threads-specific
  if (values["threads-title"]) postParams.threads_title = values["threads-title"] as string;
  if (values["threads-long-text-as-post"] !== undefined) postParams.threads_long_text_as_post = values["threads-long-text-as-post"] as boolean;

  // Reddit-specific
  if (values["reddit-subreddit"]) postParams.reddit_subreddit = values["reddit-subreddit"] as string;
  if (values["reddit-flair"]) postParams.reddit_flair = values["reddit-flair"] as string;

  // Bluesky-specific
  if (values["bluesky-title"]) postParams.bluesky_title = values["bluesky-title"] as string;
  if (values["bluesky-reply-to"]) postParams.bluesky_reply_to = values["bluesky-reply-to"] as string;

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
  const result = await client.postText(postParams);

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
        formatter.success("Post scheduled successfully!"),
        `  ${formatter.label("Job ID:")}        ${result.job_id}`,
        `  ${formatter.label("Scheduled for:")} ${result.scheduled_date}`,
      ]);
    } else if (result.results) {
      // Immediate post
      const successCount = Object.values(result.results).filter(
        (r) => r.success
      ).length;
      const lines = [
        formatter.success(`Posted to ${successCount} platform${successCount === 1 ? "" : "s"}:`),
        "",
      ];

      // Show results per platform
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
        formatter.success("Post queued successfully!"),
        `  ${formatter.label("Request ID:")} ${result.request_id || "N/A"}`,
      ]);
    }
  }
}
