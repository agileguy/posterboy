import type { Platform } from "../constants";
import { ALL_PLATFORMS } from "../constants";
import { UserError } from "./errors";

export const PLATFORM_CAPABILITIES = {
  tiktok:    { text: false, photo: true,  video: true,  document: false },
  instagram: { text: false, photo: true,  video: true,  document: false },
  youtube:   { text: false, photo: false, video: true,  document: false },
  linkedin:  { text: true,  photo: true,  video: true,  document: true  },
  facebook:  { text: true,  photo: true,  video: true,  document: false },
  x:         { text: true,  photo: true,  video: true,  document: false },
  threads:   { text: true,  photo: true,  video: true,  document: false },
  pinterest: { text: false, photo: true,  video: true,  document: false },
  reddit:    { text: true,  photo: true,  video: true,  document: false },
  bluesky:   { text: true,  photo: true,  video: true,  document: false },
} as const;

/**
 * Validate platform names and return typed Platform array
 * @throws UserError if any platform name is invalid
 */
export function validatePlatforms(platforms: string[]): Platform[] {
  if (platforms.length === 0) {
    throw new UserError(
      "At least one platform is required.\n" +
      `Valid platforms: ${ALL_PLATFORMS.join(", ")}`
    );
  }

  const invalid = platforms.filter(p => !ALL_PLATFORMS.includes(p as Platform));
  if (invalid.length > 0) {
    throw new UserError(
      `Invalid platform names: ${invalid.join(", ")}.\n` +
      `Valid platforms: ${ALL_PLATFORMS.join(", ")}`
    );
  }
  return platforms as Platform[];
}

/**
 * Get all platforms that support a specific content type
 */
export function getPlatformsForContentType(
  type: "text" | "photo" | "video" | "document"
): Platform[] {
  return ALL_PLATFORMS.filter(platform => 
    PLATFORM_CAPABILITIES[platform][type]
  );
}

/**
 * Validate that all platforms support the given content type
 * @throws UserError if any platform doesn't support the content type
 */
export function validateContentTypeForPlatforms(
  contentType: "text" | "photo" | "video" | "document",
  platforms: Platform[]
): void {
  const unsupported = platforms.filter(
    p => !PLATFORM_CAPABILITIES[p][contentType]
  );

  if (unsupported.length > 0) {
    const supported = getPlatformsForContentType(contentType);
    throw new UserError(
      `${unsupported.join(", ")} does not support ${contentType} posts.\n` +
      `Supported platforms for ${contentType}: ${supported.join(", ")}`
    );
  }
}

/**
 * Validate platform-specific required fields
 * @throws UserError if required fields are missing
 */
export function validatePlatformRequirements(
  platforms: Platform[],
  params: Record<string, unknown>
): void {
  for (const platform of platforms) {
    switch (platform) {
      case "facebook":
        if (!params.facebook_page) {
          throw new UserError(
            `Facebook requires --facebook-page flag.\n` +
            `Tip: Set a default in ~/.posterboy/config.json:\n` +
            `  "platform_defaults": { "facebook": { "page_id": "your-page-id" } }`
          );
        }
        break;

      case "pinterest":
        if (!params.pinterest_board) {
          throw new UserError(
            `Pinterest requires --pinterest-board flag.\n` +
            `Tip: Set a default in ~/.posterboy/config.json:\n` +
            `  "platform_defaults": { "pinterest": { "board_id": "your-board-id" } }`
          );
        }
        break;

      case "reddit":
        if (!params.reddit_subreddit) {
          throw new UserError(
            `Reddit requires --reddit-subreddit flag.\n` +
            `Tip: Set a default in ~/.posterboy/config.json:\n` +
            `  "platform_defaults": { "reddit": { "subreddit": "yoursubreddit" } }`
          );
        }
        break;
    }
  }
}
