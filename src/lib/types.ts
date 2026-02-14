import type { Platform } from "../constants";

// Auth & Account
export interface AccountInfo {
  email: string;
  plan: string;
  usage: {
    count: number;
    limit: number;
    remaining: number;
  };
}

// Profiles
export interface Profile {
  username: string;
  connected_platforms: Platform[];
  created_at: string;
}

// Posting Results
export interface PlatformResult {
  success: boolean;
  publish_id?: string;
  url?: string;
  error?: string;
}

export interface PostResult {
  success: boolean;
  results?: Record<string, PlatformResult>;
  scheduled?: boolean;
  job_id?: string;
  scheduled_date?: string;
  request_id?: string;
  usage?: {
    count: number;
    limit: number;
    remaining: number;
  };
}

// Status
export interface StatusResult {
  status: string;
  results?: Record<string, PlatformResult>;
  error?: string;
}

// History
export interface HistoryEntry {
  id: string;
  date: string;
  platforms: Platform[];
  content_type: string;
  title: string;
  status: string;
  profile: string;
}

export interface HistoryResult {
  history: HistoryEntry[];
  page: number;
  total_pages: number;
}

// Text Post Parameters
export interface TextPostParams {
  profile: string;
  platforms: Platform[];
  text: string;
  schedule?: string;
  timezone?: string;
  queue?: boolean;
  async?: boolean;
  first_comment?: string;
  // X-specific
  x_title?: string;
  x_reply_to?: string;
  x_reply_settings?: string;
  x_quote_tweet?: string;
  x_long_text_as_post?: boolean;
  x_poll_options?: string[];
  x_poll_duration?: number;
  // LinkedIn-specific
  linkedin_title?: string;
  linkedin_page?: string;
  linkedin_visibility?: string;
  // Facebook-specific
  facebook_title?: string;
  facebook_page?: string;
  facebook_link?: string;
  // Threads-specific
  threads_title?: string;
  threads_long_text_as_post?: boolean;
  // Reddit-specific
  reddit_subreddit?: string;
  reddit_flair?: string;
  // Bluesky-specific
  bluesky_title?: string;
  bluesky_reply_to?: string;
}

// Photo Post Parameters
export interface PhotoPostParams {
  profile: string;
  platforms: Platform[];
  files?: string[];
  urls?: string[];
  title: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  queue?: boolean;
  async?: boolean;
  first_comment?: string;
  // Instagram-specific
  instagram_title?: string;
  instagram_media_type?: string;
  instagram_collaborators?: string;
  instagram_location?: string;
  instagram_user_tags?: string;
  // Facebook-specific
  facebook_page?: string;
  facebook_media_type?: string;
  // TikTok-specific
  tiktok_title?: string;
  tiktok_privacy?: string;
  tiktok_disable_comments?: boolean;
  tiktok_auto_music?: boolean;
  tiktok_cover_index?: number;
  // X-specific
  x_title?: string;
  x_thread_image_layout?: string;
  // LinkedIn-specific
  linkedin_title?: string;
  linkedin_page?: string;
  linkedin_visibility?: string;
  // Threads-specific
  threads_title?: string;
  // Pinterest-specific
  pinterest_board?: string;
  pinterest_link?: string;
  pinterest_alt_text?: string;
  // Reddit-specific
  reddit_subreddit?: string;
  reddit_flair?: string;
  // Bluesky-specific
  bluesky_title?: string;
}

// Video Post Parameters
export interface VideoPostParams {
  profile: string;
  platforms: Platform[];
  file?: string;
  url?: string;
  title: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  queue?: boolean;
  async?: boolean;
  first_comment?: string;
  // TikTok-specific
  tiktok_title?: string;
  tiktok_privacy?: string;
  tiktok_disable_duet?: boolean;
  tiktok_disable_comment?: boolean;
  tiktok_disable_stitch?: boolean;
  tiktok_post_mode?: string;
  tiktok_cover_timestamp?: number;
  tiktok_brand_content?: boolean;
  tiktok_brand_organic?: boolean;
  tiktok_aigc?: boolean;
  // Instagram-specific
  instagram_title?: string;
  instagram_media_type?: string;
  instagram_collaborators?: string;
  instagram_cover_url?: string;
  instagram_share_to_feed?: boolean;
  instagram_audio_name?: string;
  instagram_thumb_offset?: number;
  // YouTube-specific
  youtube_title?: string;
  youtube_description?: string;
  youtube_tags?: string;
  youtube_category?: string;
  youtube_privacy?: string;
  youtube_embeddable?: boolean;
  youtube_license?: string;
  youtube_kids?: boolean;
  youtube_synthetic_media?: boolean;
  youtube_language?: string;
  youtube_thumbnail?: string;
  youtube_recording_date?: string;
  // LinkedIn-specific
  linkedin_title?: string;
  linkedin_description?: string;
  linkedin_page?: string;
  linkedin_visibility?: string;
  // Facebook-specific
  facebook_title?: string;
  facebook_description?: string;
  facebook_page?: string;
  facebook_media_type?: string;
  facebook_thumbnail_url?: string;
  // X-specific
  x_title?: string;
  x_reply_settings?: string;
  // Threads-specific
  threads_title?: string;
  // Pinterest-specific
  pinterest_title?: string;
  pinterest_description?: string;
  pinterest_board?: string;
  pinterest_link?: string;
  pinterest_alt_text?: string;
  // Reddit-specific
  reddit_title?: string;
  reddit_subreddit?: string;
  reddit_flair?: string;
  // Bluesky-specific
  bluesky_title?: string;
}

// Document Post Parameters
export interface DocumentPostParams {
  profile: string;
  file?: string;
  url?: string;
  title: string;
  description?: string;
  linkedin_page?: string;
  linkedin_visibility?: string;
  schedule?: string;
  timezone?: string;
  queue?: boolean;
  async?: boolean;
}

// Scheduling
export interface ScheduledPost {
  job_id: string;
  scheduled_date: string;
  platforms: Platform[];
  title: string;
  content_type: string;
  profile: string;
}

export interface ScheduleUpdate {
  schedule?: string;
  title?: string;
  timezone?: string;
}

// Queue
export interface QueueSettings {
  profile: string;
  timezone: string;
  slots: string[];
  days_of_week: string[];
}

export interface QueueSettingsUpdate {
  profile?: string;
  timezone?: string;
  slots?: string[];
  days_of_week?: string[];
}

export interface QueueSlot {
  datetime: string;
  available: boolean;
}

// Platform Pages
export interface FacebookPage {
  id: string;
  name: string;
  category: string;
}

export interface LinkedInPage {
  id: string;
  name: string;
  logo?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
}

// Analytics
export interface Analytics {
  profile: string;
  analytics: Record<string, Record<string, number | string>>;
}

export interface AnalyticsOpts {
  platforms?: Platform[];
  facebook_page?: string;
  linkedin_page?: string;
}

// JWT
export interface JwtOptions {
  platforms?: Platform[];
  redirect?: string;
}

export interface JwtResult {
  success: boolean;
  access_url: string;
  expires_in: string;
}

// Config Schema
export interface Config {
  version: number;
  api_key?: string;
  default_profile?: string;
  default_platforms?: Platform[];
  default_timezone?: string;
  output?: {
    format?: "auto" | "json" | "pretty";
    color?: boolean;
  };
  platform_defaults?: {
    facebook?: {
      page_id?: string;
    };
    linkedin?: {
      page_id?: string;
      visibility?: string;
    };
    pinterest?: {
      board_id?: string;
    };
    reddit?: {
      subreddit?: string;
    };
    youtube?: {
      privacy?: string;
      category?: string;
    };
    tiktok?: {
      privacy?: string;
    };
  };
}
