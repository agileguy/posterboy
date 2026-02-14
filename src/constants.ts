export const VERSION = "0.1.2";
export const CONFIG_DIR = `${process.env.HOME}/.posterboy`;
export const CONFIG_FILE = `${CONFIG_DIR}/config.json`;
export const API_BASE_URL = "https://api.upload-post.com/api";

export const ALL_PLATFORMS = [
  "tiktok", "instagram", "youtube", "linkedin", "facebook",
  "x", "threads", "pinterest", "reddit", "bluesky"
] as const;

export type Platform = typeof ALL_PLATFORMS[number];

export const EXIT_CODES = {
  SUCCESS: 0,
  USER_ERROR: 1,
  API_ERROR: 2,
  NETWORK_ERROR: 3,
} as const;
