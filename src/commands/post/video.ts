// posterboy - Post video command

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
import type { GlobalFlags, Platform, VideoPostParams } from "../../lib/types";

async function validateVideoFile(filePath: string): Promise<{ size: number }> {
  const validExts = [".mp4", ".mov", ".webm", ".avi"];
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new UserError(`File not found: ${filePath}`);
  }
  const ext = filePath.toLowerCase().match(/\.([^./\\]+)$/)?.[1];
  if (!ext || !validExts.includes(`.${ext}`)) {
    throw new UserError(
      `Unsupported video format: ${filePath}. Supported: MP4, MOV, WebM, AVI`
    );
  }
  return { size: file.size };
}

export async function postVideo(
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
      schedule: { type: "string" },
      timezone: { type: "string" },
      queue: { type: "boolean", default: false },
      async: { type: "boolean" },
      "first-comment": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      // TikTok-specific
      "tiktok-title": { type: "string" },
      "tiktok-privacy": { type: "string" },
      "tiktok-disable-duet": { type: "boolean" },
      "tiktok-disable-comment": { type: "boolean" },
      "tiktok-disable-stitch": { type: "boolean" },
      "tiktok-post-mode": { type: "string" },
      "tiktok-cover-timestamp": { type: "string" },
      "tiktok-brand-content": { type: "boolean" },
      "tiktok-brand-organic": { type: "boolean" },
      "tiktok-aigc": { type: "boolean" },
      // Instagram-specific
      "instagram-title": { type: "string" },
      "instagram-media-type": { type: "string" },
      "instagram-collaborators": { type: "string" },
      "instagram-cover-url": { type: "string" },
      "instagram-share-to-feed": { type: "boolean" },
      "instagram-audio-name": { type: "string" },
      "instagram-thumb-offset": { type: "string" },
      // YouTube-specific
      "youtube-title": { type: "string" },
      "youtube-description": { type: "string" },
      "youtube-tags": { type: "string" },
      "youtube-category": { type: "string" },
      "youtube-privacy": { type: "string" },
      "youtube-embeddable": { type: "boolean" },
      "youtube-license": { type: "string" },
      "youtube-kids": { type: "boolean" },
      "youtube-synthetic-media": { type: "boolean" },
      "youtube-language": { type: "string" },
      "youtube-thumbnail": { type: "string" },
      "youtube-recording-date": { type: "string" },
      // LinkedIn-specific
      "linkedin-title": { type: "string" },
      "linkedin-description": { type: "string" },
      "linkedin-page": { type: "string" },
      "linkedin-visibility": { type: "string" },
      // Facebook-specific
      "facebook-title": { type: "string" },
      "facebook-description": { type: "string" },
      "facebook-page": { type: "string" },
      "facebook-media-type": { type: "string" },
      "facebook-thumbnail-url": { type: "string" },
      // X-specific
      "x-title": { type: "string" },
      "x-reply-settings": { type: "string" },
      // Threads-specific
      "threads-title": { type: "string" },
      // Pinterest-specific
      "pinterest-title": { type: "string" },
      "pinterest-description": { type: "string" },
      "pinterest-board": { type: "string" },
      "pinterest-link": { type: "string" },
      "pinterest-alt-text": { type: "string" },
      // Reddit-specific
      "reddit-title": { type: "string" },
      "reddit-subreddit": { type: "string" },
      "reddit-flair": { type: "string" },
      // Bluesky-specific
      "bluesky-title": { type: "string" },
    },
    strict: false,
  });

  // Validate mutually exclusive --file and --url
  validateMutuallyExclusive(
    {
      "--file": !!values.file,
      "--url": !!values.url,
    },
    "Video source required. Provide exactly one of:\n" +
      "  --file <path>    Local video file\n" +
      "  --url <url>      Public video URL"
  );

  // Validate title is provided
  if (!values.title) {
    throw new UserError("Title required. Use --title <text>");
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
        "  --platforms <list>                         (comma-separated: tiktok,youtube,instagram)\n" +
        "  POSTERBOY_PLATFORMS=<list>                 (environment variable)\n" +
        '  "default_platforms": [...]                 (in ~/.posterboy/config.json)'
    );
  }

  // Validate all platforms support video
  validateContentTypeForPlatforms("video", platforms);

  // Validate local file format and size
  let fileSize = 0;
  if (values.file) {
    const validation = await validateVideoFile(values.file as string);
    fileSize = validation.size;
  }

  // Auto-async for large files (>50MB)
  let shouldUseAsync = values.async as boolean | undefined;
  if (fileSize > 50 * 1024 * 1024 && shouldUseAsync === undefined) {
    shouldUseAsync = true;
  }

  // Build params object for validation
  const params: Record<string, unknown> = {
    profile,
    platforms,
    facebook_page:
      values["facebook-page"] || config?.platform_defaults?.facebook?.page_id,
    pinterest_board:
      values["pinterest-board"] ||
      config?.platform_defaults?.pinterest?.board_id,
    reddit_subreddit:
      values["reddit-subreddit"] ||
      config?.platform_defaults?.reddit?.subreddit,
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

  // Build full VideoPostParams
  const postParams: VideoPostParams = {
    profile,
    platforms,
    title: values.title as string,
  };

  // Add media source
  if (values.file) postParams.file = values.file as string;
  if (values.url) postParams.url = values.url as string;

  // Add optional scheduling fields
  if (values.description) postParams.description = values.description as string;
  if (values.schedule) postParams.schedule = values.schedule as string;
  if (values.timezone) postParams.timezone = values.timezone as string;
  if (values.queue) postParams.queue = values.queue as boolean;
  if (shouldUseAsync !== undefined) postParams.async = shouldUseAsync;
  if (values["first-comment"])
    postParams.first_comment = values["first-comment"] as string;

  // TikTok-specific
  if (values["tiktok-title"])
    postParams.tiktok_title = values["tiktok-title"] as string;
  if (values["tiktok-privacy"])
    postParams.tiktok_privacy =
      (values["tiktok-privacy"] as string) ||
      config?.platform_defaults?.tiktok?.privacy;
  if (values["tiktok-disable-duet"] !== undefined)
    postParams.tiktok_disable_duet = values["tiktok-disable-duet"] as boolean;
  if (values["tiktok-disable-comment"] !== undefined)
    postParams.tiktok_disable_comment = values[
      "tiktok-disable-comment"
    ] as boolean;
  if (values["tiktok-disable-stitch"] !== undefined)
    postParams.tiktok_disable_stitch = values[
      "tiktok-disable-stitch"
    ] as boolean;
  if (values["tiktok-post-mode"])
    postParams.tiktok_post_mode = values["tiktok-post-mode"] as string;
  if (values["tiktok-cover-timestamp"]) {
    const timestamp = parseFloat(values["tiktok-cover-timestamp"] as string);
    if (!isNaN(timestamp)) {
      postParams.tiktok_cover_timestamp = timestamp;
    }
  }
  if (values["tiktok-brand-content"] !== undefined)
    postParams.tiktok_brand_content = values["tiktok-brand-content"] as boolean;
  if (values["tiktok-brand-organic"] !== undefined)
    postParams.tiktok_brand_organic = values["tiktok-brand-organic"] as boolean;
  if (values["tiktok-aigc"] !== undefined)
    postParams.tiktok_aigc = values["tiktok-aigc"] as boolean;

  // Instagram-specific
  if (values["instagram-title"])
    postParams.instagram_title = values["instagram-title"] as string;
  if (values["instagram-media-type"])
    postParams.instagram_media_type = values["instagram-media-type"] as string;
  if (values["instagram-collaborators"])
    postParams.instagram_collaborators = values[
      "instagram-collaborators"
    ] as string;
  if (values["instagram-cover-url"])
    postParams.instagram_cover_url = values["instagram-cover-url"] as string;
  if (values["instagram-share-to-feed"] !== undefined)
    postParams.instagram_share_to_feed = values[
      "instagram-share-to-feed"
    ] as boolean;
  if (values["instagram-audio-name"])
    postParams.instagram_audio_name = values["instagram-audio-name"] as string;
  if (values["instagram-thumb-offset"]) {
    const offset = parseFloat(values["instagram-thumb-offset"] as string);
    if (!isNaN(offset)) {
      postParams.instagram_thumb_offset = offset;
    }
  }

  // YouTube-specific
  if (values["youtube-title"])
    postParams.youtube_title = values["youtube-title"] as string;
  if (values["youtube-description"])
    postParams.youtube_description = values["youtube-description"] as string;
  if (values["youtube-tags"])
    postParams.youtube_tags = values["youtube-tags"] as string;
  if (values["youtube-category"])
    postParams.youtube_category =
      (values["youtube-category"] as string) ||
      config?.platform_defaults?.youtube?.category;
  if (values["youtube-privacy"])
    postParams.youtube_privacy =
      (values["youtube-privacy"] as string) ||
      config?.platform_defaults?.youtube?.privacy;
  if (values["youtube-embeddable"] !== undefined)
    postParams.youtube_embeddable = values["youtube-embeddable"] as boolean;
  if (values["youtube-license"])
    postParams.youtube_license = values["youtube-license"] as string;
  if (values["youtube-kids"] !== undefined)
    postParams.youtube_kids = values["youtube-kids"] as boolean;
  if (values["youtube-synthetic-media"] !== undefined)
    postParams.youtube_synthetic_media = values[
      "youtube-synthetic-media"
    ] as boolean;
  if (values["youtube-language"])
    postParams.youtube_language = values["youtube-language"] as string;
  if (values["youtube-thumbnail"])
    postParams.youtube_thumbnail = values["youtube-thumbnail"] as string;
  if (values["youtube-recording-date"])
    postParams.youtube_recording_date = values[
      "youtube-recording-date"
    ] as string;

  // LinkedIn-specific
  if (values["linkedin-title"])
    postParams.linkedin_title = values["linkedin-title"] as string;
  if (values["linkedin-description"])
    postParams.linkedin_description = values["linkedin-description"] as string;
  if (values["linkedin-page"])
    postParams.linkedin_page = values["linkedin-page"] as string;
  if (values["linkedin-visibility"])
    postParams.linkedin_visibility = values["linkedin-visibility"] as string;

  // Facebook-specific
  if (values["facebook-title"])
    postParams.facebook_title = values["facebook-title"] as string;
  if (values["facebook-description"])
    postParams.facebook_description = values["facebook-description"] as string;
  if (values["facebook-page"])
    postParams.facebook_page = values["facebook-page"] as string;
  if (values["facebook-media-type"])
    postParams.facebook_media_type = values["facebook-media-type"] as string;
  if (values["facebook-thumbnail-url"])
    postParams.facebook_thumbnail_url = values[
      "facebook-thumbnail-url"
    ] as string;

  // X-specific
  if (values["x-title"]) postParams.x_title = values["x-title"] as string;
  if (values["x-reply-settings"])
    postParams.x_reply_settings = values["x-reply-settings"] as string;

  // Threads-specific
  if (values["threads-title"])
    postParams.threads_title = values["threads-title"] as string;

  // Pinterest-specific
  if (values["pinterest-title"])
    postParams.pinterest_title = values["pinterest-title"] as string;
  if (values["pinterest-description"])
    postParams.pinterest_description = values["pinterest-description"] as string;
  if (values["pinterest-board"])
    postParams.pinterest_board = values["pinterest-board"] as string;
  if (values["pinterest-link"])
    postParams.pinterest_link = values["pinterest-link"] as string;
  if (values["pinterest-alt-text"])
    postParams.pinterest_alt_text = values["pinterest-alt-text"] as string;

  // Reddit-specific
  if (values["reddit-title"])
    postParams.reddit_title = values["reddit-title"] as string;
  if (values["reddit-subreddit"])
    postParams.reddit_subreddit = values["reddit-subreddit"] as string;
  if (values["reddit-flair"])
    postParams.reddit_flair = values["reddit-flair"] as string;

  // Bluesky-specific
  if (values["bluesky-title"])
    postParams.bluesky_title = values["bluesky-title"] as string;

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
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Call API
  const result = await client.postVideo(postParams);

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
        formatter.success("Video scheduled successfully!"),
        `  ${formatter.label("Job ID:")}        ${result.job_id}`,
        `  ${formatter.label("Scheduled for:")} ${result.scheduled_date}`,
      ]);
    } else if (result.results) {
      // Immediate post
      const successCount = Object.values(result.results).filter(
        (r) => r.success
      ).length;
      const lines = [
        formatter.success(
          `Posted to ${successCount} platform${successCount === 1 ? "" : "s"}:`
        ),
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
        formatter.success("Video upload queued successfully!"),
        `  ${formatter.label("Request ID:")} ${result.request_id || "N/A"}`,
        "",
        "Use 'posterboy status <request_id>' to check upload status.",
      ]);
    }
  }
}
