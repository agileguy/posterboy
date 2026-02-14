// posterboy - Post photo command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import {
  validatePlatforms,
  validateMutuallyExclusive,
  validateISODate,
  validateTimezone,
} from "../../lib/validation";
import {
  validateContentTypeForPlatforms,
  validatePlatformRequirements,
} from "../../lib/platforms";
import type { GlobalFlags, Platform, PhotoPostParams } from "../../lib/types";

/**
 * Validate photo files exist and meet format/size requirements
 */
async function validatePhotoFiles(files: string[]): Promise<void> {
  const validExts = [".jpg", ".jpeg", ".png", ".gif"];
  const maxSize = 8 * 1024 * 1024; // 8MB

  for (const filePath of files) {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new UserError(`File not found: ${filePath}`);
    }
    if (file.size > maxSize) {
      throw new UserError(
        `File exceeds 8MB limit: ${filePath} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
      );
    }
    const ext = filePath.toLowerCase().match(/\.([^./\\]+)$/)?.[1];
    if (!ext || !validExts.includes(`.${ext}`)) {
      throw new UserError(
        `Unsupported format: ${filePath}. Supported: JPEG, PNG, GIF`
      );
    }
  }
}

export async function postPhoto(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      files: { type: "string" },
      urls: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      platforms: { type: "string" },
      profile: { type: "string" },
      schedule: { type: "string" },
      timezone: { type: "string" },
      queue: { type: "boolean", default: false },
      async: { type: "boolean", default: false },
      "first-comment": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      // Instagram-specific
      "instagram-title": { type: "string" },
      "instagram-media-type": { type: "string" },
      "instagram-collaborators": { type: "string" },
      "instagram-location": { type: "string" },
      "instagram-user-tags": { type: "string" },
      // Facebook-specific
      "facebook-page": { type: "string" },
      "facebook-media-type": { type: "string" },
      // TikTok-specific
      "tiktok-title": { type: "string" },
      "tiktok-privacy": { type: "string" },
      "tiktok-disable-comments": { type: "boolean" },
      "tiktok-auto-music": { type: "boolean" },
      "tiktok-cover-index": { type: "string" },
      // X-specific
      "x-title": { type: "string" },
      "x-thread-image-layout": { type: "string" },
      // LinkedIn-specific
      "linkedin-title": { type: "string" },
      "linkedin-page": { type: "string" },
      "linkedin-visibility": { type: "string" },
      // Threads-specific
      "threads-title": { type: "string" },
      // Pinterest-specific
      "pinterest-board": { type: "string" },
      "pinterest-link": { type: "string" },
      "pinterest-alt-text": { type: "string" },
      // Reddit-specific
      "reddit-subreddit": { type: "string" },
      "reddit-flair": { type: "string" },
      // Bluesky-specific
      "bluesky-title": { type: "string" },
    },
    strict: false,
  });

  // Validate mutually exclusive files/urls
  validateMutuallyExclusive(
    {
      "--files": !!values.files,
      "--urls": !!values.urls,
    },
    "Must provide either --files or --urls (not both)"
  );

  // Validate title is required
  if (!values.title) {
    throw new UserError("--title is required for photo posts");
  }

  // Parse and validate files or URLs
  let files: string[] | undefined;
  let urls: string[] | undefined;

  if (values.files) {
    files = (values.files as string)
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    await validatePhotoFiles(files);
  } else if (values.urls) {
    urls = (values.urls as string)
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
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
        "  --platforms <list>                         (comma-separated: instagram,tiktok,facebook)\n" +
        "  POSTERBOY_PLATFORMS=<list>                 (environment variable)\n" +
        '  "default_platforms": [...]                 (in ~/.posterboy/config.json)'
    );
  }

  // Validate all platforms support photo
  validateContentTypeForPlatforms("photo", platforms);

  // Build params object for validation
  const params: Record<string, unknown> = {
    profile,
    platforms,
    facebook_page: values["facebook-page"] || config?.platform_defaults?.facebook?.page_id,
    pinterest_board: values["pinterest-board"] || config?.platform_defaults?.pinterest?.board_id,
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

  // Build full PhotoPostParams
  const postParams: PhotoPostParams = {
    profile,
    platforms,
    files,
    urls,
    title: values.title as string,
  };

  // Add optional scheduling fields
  if (values.description) postParams.description = values.description as string;
  if (values.schedule) postParams.schedule = values.schedule as string;
  if (values.timezone) postParams.timezone = values.timezone as string;
  if (values.queue) postParams.queue = values.queue as boolean;
  if (values.async) postParams.async = values.async as boolean;
  if (values["first-comment"]) postParams.first_comment = values["first-comment"] as string;

  // Instagram-specific
  if (values["instagram-title"]) postParams.instagram_title = values["instagram-title"] as string;
  if (values["instagram-media-type"]) postParams.instagram_media_type = values["instagram-media-type"] as string;
  if (values["instagram-collaborators"]) postParams.instagram_collaborators = values["instagram-collaborators"] as string;
  if (values["instagram-location"]) postParams.instagram_location = values["instagram-location"] as string;
  if (values["instagram-user-tags"]) postParams.instagram_user_tags = values["instagram-user-tags"] as string;

  // Facebook-specific
  if (values["facebook-page"]) postParams.facebook_page = values["facebook-page"] as string;
  if (values["facebook-media-type"]) postParams.facebook_media_type = values["facebook-media-type"] as string;

  // TikTok-specific
  if (values["tiktok-title"]) postParams.tiktok_title = values["tiktok-title"] as string;
  if (values["tiktok-privacy"]) postParams.tiktok_privacy = values["tiktok-privacy"] as string;
  if (values["tiktok-disable-comments"] !== undefined) postParams.tiktok_disable_comments = values["tiktok-disable-comments"] as boolean;
  if (values["tiktok-auto-music"] !== undefined) postParams.tiktok_auto_music = values["tiktok-auto-music"] as boolean;
  if (values["tiktok-cover-index"]) {
    const coverIndex = parseInt(values["tiktok-cover-index"] as string, 10);
    if (!isNaN(coverIndex)) {
      postParams.tiktok_cover_index = coverIndex;
    }
  }

  // X-specific
  if (values["x-title"]) postParams.x_title = values["x-title"] as string;
  if (values["x-thread-image-layout"]) postParams.x_thread_image_layout = values["x-thread-image-layout"] as string;

  // LinkedIn-specific
  if (values["linkedin-title"]) postParams.linkedin_title = values["linkedin-title"] as string;
  if (values["linkedin-page"]) postParams.linkedin_page = values["linkedin-page"] as string;
  if (values["linkedin-visibility"]) postParams.linkedin_visibility = values["linkedin-visibility"] as string;

  // Threads-specific
  if (values["threads-title"]) postParams.threads_title = values["threads-title"] as string;

  // Pinterest-specific
  if (values["pinterest-board"]) postParams.pinterest_board = values["pinterest-board"] as string;
  if (values["pinterest-link"]) postParams.pinterest_link = values["pinterest-link"] as string;
  if (values["pinterest-alt-text"]) postParams.pinterest_alt_text = values["pinterest-alt-text"] as string;

  // Reddit-specific
  if (values["reddit-subreddit"]) postParams.reddit_subreddit = values["reddit-subreddit"] as string;
  if (values["reddit-flair"]) postParams.reddit_flair = values["reddit-flair"] as string;

  // Bluesky-specific
  if (values["bluesky-title"]) postParams.bluesky_title = values["bluesky-title"] as string;

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
  const result = await client.postPhotos(postParams);

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
        formatter.success("Photo post scheduled successfully!"),
        `  ${formatter.label("Job ID:")}        ${result.job_id}`,
        `  ${formatter.label("Scheduled for:")} ${result.scheduled_date}`,
      ]);
    } else if (result.results) {
      // Immediate post
      const successCount = Object.values(result.results).filter(
        (r) => r.success
      ).length;
      const lines = [
        formatter.success(`Posted photos to ${successCount} platform${successCount === 1 ? "" : "s"}:`),
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
        formatter.success("Photo post queued successfully!"),
        `  ${formatter.label("Request ID:")} ${result.request_id || "N/A"}`,
      ]);
    }
  }
}
