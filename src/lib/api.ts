// posterboy - API client wrapper

import { API_BASE_URL } from "../constants";
import { ApiError, NetworkError } from "./errors";
import type {
  AccountInfo,
  Profile,
  JwtOptions,
  JwtResult,
  FacebookPage,
  LinkedInPage,
  PinterestBoard,
  TextPostParams,
  PhotoPostParams,
  VideoPostParams,
  DocumentPostParams,
  PostResult,
  StatusResult,
  ScheduleListResult,
  QueueSettings,
  QueueSettingsUpdate,
  QueueSlot,
  HistoryEntry,
  ScheduleUpdate,
} from "./types";

export class ApiClient {
  private apiKey: string;
  private baseUrl: string;
  private verbose: boolean;

  constructor(apiKey: string, options?: { baseUrl?: string; verbose?: boolean }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? API_BASE_URL;
    this.verbose = options?.verbose ?? false;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (this.verbose) {
      const headers = {
        Authorization: `Apikey ${this.apiKey.substring(0, 7)}...`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      console.error(`[verbose] → ${method} ${url}`);
      console.error(`[verbose]   Headers: ${JSON.stringify(headers)}`);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Apikey ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      if (this.verbose) {
        console.error(`[verbose] ← ${response.status} ${response.statusText} (${elapsed}ms)`);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API error: ${response.status}`;
        let apiMessage = errorMessage;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.message || parsed.error || errorMessage;
          apiMessage = parsed.message || parsed.error || apiMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new ApiError(errorMessage, response.status, apiMessage);
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new ApiError(
          "Invalid JSON response from API",
          response.status,
          "Response body was not valid JSON"
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (this.verbose && error instanceof Error) {
        console.error(`[verbose] ✗ ${error.message}`);
      }
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout after 30 seconds");
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed"
      );
    }
  }

  private async uploadRequest<T>(
    method: string,
    path: string,
    formData: FormData
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for uploads

    if (this.verbose) {
      const headers = {
        Authorization: `Apikey ${this.apiKey.substring(0, 7)}...`,
        Accept: "application/json",
      };
      console.error(`[verbose] → ${method} ${url} (upload)`);
      console.error(`[verbose]   Headers: ${JSON.stringify(headers)}`);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Apikey ${this.apiKey}`,
          // Don't set Content-Type - let browser/bun handle multipart boundary
          Accept: "application/json",
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      if (this.verbose) {
        console.error(`[verbose] ← ${response.status} ${response.statusText} (${elapsed}ms)`);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API error: ${response.status}`;
        let apiMessage = errorMessage;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.message || parsed.error || errorMessage;
          apiMessage = parsed.message || parsed.error || apiMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new ApiError(errorMessage, response.status, apiMessage);
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new ApiError(
          "Invalid JSON response from API",
          response.status,
          "Response body was not valid JSON"
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (this.verbose && error instanceof Error) {
        console.error(`[verbose] ✗ ${error.message}`);
      }
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout after 120 seconds");
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed"
      );
    }
  }

  // Auth
  async me(): Promise<AccountInfo> {
    return this.request<AccountInfo>("GET", "/uploadposts/me");
  }

  // Profiles
  async listUsers(): Promise<{ profiles: Profile[] }> {
    return this.request<{ profiles: Profile[] }>("GET", "/uploadposts/users");
  }

  async createUser(username: string): Promise<{ success: boolean; profile: { username: string } }> {
    return this.request("POST", "/uploadposts/users", { username });
  }

  async deleteUser(username: string): Promise<{ success: boolean }> {
    return this.request("DELETE", "/uploadposts/users", { username });
  }

  async generateJwt(username: string, options?: JwtOptions): Promise<JwtResult> {
    const body: Record<string, unknown> = { username };
    if (options?.platforms) body.platforms = options.platforms;
    if (options?.redirect_url) body.redirect_url = options.redirect_url;
    return this.request<JwtResult>("POST", "/uploadposts/users/generate-jwt", body);
  }

  async getUserProfile(username: string): Promise<{ profile: Profile }> {
    return this.request<{ profile: Profile }>("GET", `/uploadposts/users/${username}`);
  }

  // Platform Pages
  async facebookPages(username: string): Promise<{ pages: FacebookPage[] }> {
    return this.request<{ pages: FacebookPage[] }>("GET", `/uploadposts/facebook/pages?username=${username}`);
  }

  async linkedinPages(username: string): Promise<{ pages: LinkedInPage[] }> {
    return this.request<{ pages: LinkedInPage[] }>("GET", `/uploadposts/linkedin/pages?username=${username}`);
  }

  async pinterestBoards(username: string): Promise<{ boards: PinterestBoard[] }> {
    return this.request<{ boards: PinterestBoard[] }>("GET", `/uploadposts/pinterest/boards?username=${username}`);
  }

  // Post Content
  async postText(params: TextPostParams): Promise<PostResult> {
    // MUST use FormData for text posts (all upload endpoints require multipart/form-data)
    const formData = new FormData();

    // Map CLI param names to API field names
    formData.append("user", params.profile);

    // Platforms must be sent as multiple platform[] form fields
    for (const platform of params.platforms) {
      formData.append("platform[]", platform);
    }

    formData.append("title", params.text);

    // Add optional fields only if present
    if (params.schedule) formData.append("scheduled_date", params.schedule);
    if (params.timezone) formData.append("timezone", params.timezone);
    if (params.queue) formData.append("add_to_queue", String(params.queue));
    if (params.async) formData.append("async_upload", String(params.async));
    if (params.first_comment) formData.append("first_comment", params.first_comment);

    // X-specific
    if (params.x_title) formData.append("x_title", params.x_title);
    if (params.x_reply_to) formData.append("reply_to_id", params.x_reply_to);
    if (params.x_reply_settings) formData.append("x_reply_settings", params.x_reply_settings);
    if (params.x_quote_tweet) formData.append("quote_tweet_id", params.x_quote_tweet);
    if (params.x_long_text_as_post !== undefined) formData.append("x_long_text_as_post", String(params.x_long_text_as_post));
    if (params.x_poll_options) {
      for (const option of params.x_poll_options) {
        formData.append("x_poll_options[]", option);
      }
    }
    if (params.x_poll_duration) formData.append("x_poll_duration", String(params.x_poll_duration));

    // LinkedIn-specific
    if (params.linkedin_title) formData.append("linkedin_title", params.linkedin_title);
    if (params.linkedin_page) formData.append("target_linkedin_page_id", params.linkedin_page);
    if (params.linkedin_visibility) formData.append("visibility", params.linkedin_visibility);

    // Facebook-specific
    if (params.facebook_title) formData.append("facebook_title", params.facebook_title);
    if (params.facebook_page) formData.append("facebook_page_id", params.facebook_page);
    if (params.facebook_link) formData.append("facebook_link", params.facebook_link);

    // Threads-specific
    if (params.threads_title) formData.append("threads_title", params.threads_title);
    if (params.threads_long_text_as_post !== undefined) formData.append("threads_long_text_as_post", String(params.threads_long_text_as_post));

    // Reddit-specific
    if (params.reddit_subreddit) formData.append("reddit_subreddit", params.reddit_subreddit);
    if (params.reddit_flair) formData.append("flair_id", params.reddit_flair);

    // Bluesky-specific
    if (params.bluesky_title) formData.append("bluesky_title", params.bluesky_title);
    if (params.bluesky_reply_to) formData.append("reply_to_id", params.bluesky_reply_to);

    return this.uploadRequest<PostResult>("POST", "/upload_text", formData);
  }

  async postPhotos(params: PhotoPostParams): Promise<PostResult> {
    const formData = new FormData();

    // Add media files or URLs
    if (params.files) {
      for (const file of params.files) {
        formData.append("photos[]", Bun.file(file));
      }
    } else if (params.urls) {
      for (const url of params.urls) {
        formData.append("photo_url[]", url);
      }
    }

    // Add required fields
    formData.append("user", params.profile);

    // Platforms must be sent as multiple platform[] form fields, NOT JSON
    for (const platform of params.platforms) {
      formData.append("platform[]", platform);
    }

    formData.append("title", params.title);

    // Add optional fields
    if (params.description) formData.append("description", params.description);
    if (params.schedule) formData.append("scheduled_date", params.schedule);
    if (params.timezone) formData.append("timezone", params.timezone);
    if (params.queue) formData.append("add_to_queue", String(params.queue));
    if (params.async) formData.append("async_upload", String(params.async));
    if (params.first_comment) formData.append("first_comment", params.first_comment);

    // Instagram-specific
    if (params.instagram_title) formData.append("instagram_title", params.instagram_title);
    if (params.instagram_media_type) formData.append("instagram_media_type", params.instagram_media_type);
    if (params.instagram_collaborators) formData.append("instagram_collaborators", params.instagram_collaborators);
    if (params.instagram_location) formData.append("instagram_location", params.instagram_location);
    if (params.instagram_user_tags) formData.append("instagram_user_tags", params.instagram_user_tags);

    // Facebook-specific
    if (params.facebook_page) formData.append("facebook_page_id", params.facebook_page);
    if (params.facebook_media_type) formData.append("facebook_media_type", params.facebook_media_type);

    // TikTok-specific
    if (params.tiktok_title) formData.append("tiktok_title", params.tiktok_title);
    if (params.tiktok_privacy) formData.append("tiktok_privacy", params.tiktok_privacy);
    if (params.tiktok_disable_comments !== undefined) formData.append("tiktok_disable_comments", String(params.tiktok_disable_comments));
    if (params.tiktok_auto_music !== undefined) formData.append("tiktok_auto_music", String(params.tiktok_auto_music));
    if (params.tiktok_cover_index !== undefined) formData.append("tiktok_cover_index", String(params.tiktok_cover_index));

    // X-specific
    if (params.x_title) formData.append("x_title", params.x_title);
    if (params.x_thread_image_layout) formData.append("x_thread_image_layout", params.x_thread_image_layout);

    // LinkedIn-specific
    if (params.linkedin_title) formData.append("linkedin_title", params.linkedin_title);
    if (params.linkedin_page) formData.append("target_linkedin_page_id", params.linkedin_page);
    if (params.linkedin_visibility) formData.append("visibility", params.linkedin_visibility);

    // Threads-specific
    if (params.threads_title) formData.append("threads_title", params.threads_title);

    // Pinterest-specific
    if (params.pinterest_board) formData.append("pinterest_board_id", params.pinterest_board);
    if (params.pinterest_link) formData.append("pinterest_link", params.pinterest_link);
    if (params.pinterest_alt_text) formData.append("pinterest_alt_text", params.pinterest_alt_text);

    // Reddit-specific
    if (params.reddit_subreddit) formData.append("reddit_subreddit", params.reddit_subreddit);
    if (params.reddit_flair) formData.append("flair_id", params.reddit_flair);

    // Bluesky-specific
    if (params.bluesky_title) formData.append("bluesky_title", params.bluesky_title);

    return this.uploadRequest<PostResult>("POST", "/upload_photos", formData);
  }

  async postVideo(params: VideoPostParams): Promise<PostResult> {
    const formData = new FormData();

    // Add media file or URL (field names changed)
    if (params.file) {
      formData.append("video", Bun.file(params.file));
    } else if (params.url) {
      formData.append("video_url", params.url);
    }

    // Add required fields
    formData.append("user", params.profile);

    // Platforms must be sent as multiple platform[] form fields, NOT JSON
    for (const platform of params.platforms) {
      formData.append("platform[]", platform);
    }

    formData.append("title", params.title);

    // Add optional fields
    if (params.description) formData.append("description", params.description);
    if (params.schedule) formData.append("scheduled_date", params.schedule);
    if (params.timezone) formData.append("timezone", params.timezone);
    if (params.queue) formData.append("add_to_queue", String(params.queue));
    if (params.async) formData.append("async_upload", String(params.async));
    if (params.first_comment) formData.append("first_comment", params.first_comment);

    // TikTok-specific (renamed fields)
    if (params.tiktok_title) formData.append("tiktok_title", params.tiktok_title);
    if (params.tiktok_privacy) formData.append("privacy_level", params.tiktok_privacy);
    if (params.tiktok_disable_duet !== undefined) formData.append("disable_duet", String(params.tiktok_disable_duet));
    if (params.tiktok_disable_comment !== undefined) formData.append("disable_comment", String(params.tiktok_disable_comment));
    if (params.tiktok_disable_stitch !== undefined) formData.append("disable_stitch", String(params.tiktok_disable_stitch));
    if (params.tiktok_post_mode) formData.append("tiktok_post_mode", params.tiktok_post_mode);
    if (params.tiktok_cover_timestamp !== undefined) formData.append("tiktok_cover_timestamp", String(params.tiktok_cover_timestamp));
    if (params.tiktok_brand_content !== undefined) formData.append("branded_content_toggle", String(params.tiktok_brand_content));
    if (params.tiktok_brand_organic !== undefined) formData.append("branded_content_organic_toggle", String(params.tiktok_brand_organic));
    if (params.tiktok_aigc !== undefined) formData.append("is_aigc", String(params.tiktok_aigc));

    // Instagram-specific (renamed fields)
    if (params.instagram_title) formData.append("instagram_title", params.instagram_title);
    if (params.instagram_media_type) formData.append("media_type", params.instagram_media_type);
    if (params.instagram_collaborators) formData.append("collaborators", params.instagram_collaborators);
    if (params.instagram_cover_url) formData.append("cover_url", params.instagram_cover_url);
    if (params.instagram_share_to_feed !== undefined) formData.append("share_to_feed", String(params.instagram_share_to_feed));
    if (params.instagram_audio_name) formData.append("audio_name", params.instagram_audio_name);
    if (params.instagram_thumb_offset !== undefined) formData.append("thumb_offset", String(params.instagram_thumb_offset));

    // YouTube-specific (renamed fields)
    if (params.youtube_title) formData.append("youtube_title", params.youtube_title);
    if (params.youtube_description) formData.append("youtube_description", params.youtube_description);
    if (params.youtube_tags) formData.append("youtube_tags", params.youtube_tags);
    if (params.youtube_category) formData.append("categoryId", params.youtube_category);
    if (params.youtube_privacy) formData.append("privacyStatus", params.youtube_privacy);
    if (params.youtube_embeddable !== undefined) formData.append("youtube_embeddable", String(params.youtube_embeddable));
    if (params.youtube_license) formData.append("youtube_license", params.youtube_license);
    if (params.youtube_kids !== undefined) formData.append("selfDeclaredMadeForKids", String(params.youtube_kids));
    if (params.youtube_synthetic_media !== undefined) formData.append("syntheticMedia", String(params.youtube_synthetic_media));
    if (params.youtube_language) formData.append("youtube_language", params.youtube_language);
    if (params.youtube_thumbnail) formData.append("youtube_thumbnail", params.youtube_thumbnail);
    if (params.youtube_recording_date) formData.append("youtube_recording_date", params.youtube_recording_date);

    // LinkedIn-specific
    if (params.linkedin_title) formData.append("linkedin_title", params.linkedin_title);
    if (params.linkedin_description) formData.append("linkedin_description", params.linkedin_description);
    if (params.linkedin_page) formData.append("target_linkedin_page_id", params.linkedin_page);
    if (params.linkedin_visibility) formData.append("visibility", params.linkedin_visibility);

    // Facebook-specific
    if (params.facebook_title) formData.append("facebook_title", params.facebook_title);
    if (params.facebook_description) formData.append("facebook_description", params.facebook_description);
    if (params.facebook_page) formData.append("facebook_page_id", params.facebook_page);
    if (params.facebook_media_type) formData.append("facebook_media_type", params.facebook_media_type);
    if (params.facebook_thumbnail_url) formData.append("facebook_thumbnail_url", params.facebook_thumbnail_url);

    // X-specific
    if (params.x_title) formData.append("x_title", params.x_title);
    if (params.x_reply_settings) formData.append("x_reply_settings", params.x_reply_settings);

    // Threads-specific
    if (params.threads_title) formData.append("threads_title", params.threads_title);

    // Pinterest-specific
    if (params.pinterest_title) formData.append("pinterest_title", params.pinterest_title);
    if (params.pinterest_description) formData.append("pinterest_description", params.pinterest_description);
    if (params.pinterest_board) formData.append("pinterest_board_id", params.pinterest_board);
    if (params.pinterest_link) formData.append("pinterest_link", params.pinterest_link);
    if (params.pinterest_alt_text) formData.append("pinterest_alt_text", params.pinterest_alt_text);

    // Reddit-specific
    if (params.reddit_title) formData.append("reddit_title", params.reddit_title);
    if (params.reddit_subreddit) formData.append("reddit_subreddit", params.reddit_subreddit);
    if (params.reddit_flair) formData.append("flair_id", params.reddit_flair);

    // Bluesky-specific
    if (params.bluesky_title) formData.append("bluesky_title", params.bluesky_title);

    // Endpoint changed from /upload_videos to /upload
    return this.uploadRequest<PostResult>("POST", "/upload", formData);
  }

  async postDocument(params: DocumentPostParams): Promise<PostResult> {
    const formData = new FormData();

    // Add media file or URL (field names changed)
    if (params.file) {
      const file = Bun.file(params.file);
      formData.append("document", file);
    } else if (params.url) {
      formData.append("document_url", params.url);
    }

    // Add required fields
    formData.append("user", params.profile);
    formData.append("title", params.title);

    // Add optional fields
    if (params.description) formData.append("description", params.description);
    if (params.linkedin_page) formData.append("target_linkedin_page_id", params.linkedin_page);
    if (params.linkedin_visibility) formData.append("visibility", params.linkedin_visibility);
    if (params.schedule) formData.append("scheduled_date", params.schedule);
    if (params.timezone) formData.append("timezone", params.timezone);
    if (params.queue) formData.append("add_to_queue", String(params.queue));
    if (params.async) formData.append("async_upload", String(params.async));

    return this.uploadRequest<PostResult>("POST", "/upload_document", formData);
  }

  async getStatus(id: string, type: "request_id" | "job_id" = "request_id"): Promise<StatusResult> {
    const queryParam = type === "job_id" ? `job_id=${id}` : `request_id=${id}`;
    return this.request<StatusResult>("GET", `/uploadposts/status?${queryParam}`);
  }

  // Schedule Management
  async listScheduledPosts(profile?: string): Promise<ScheduleListResult> {
    const queryParam = profile ? `?profile=${encodeURIComponent(profile)}` : "";
    return this.request<ScheduleListResult>("GET", `/uploadposts/schedule${queryParam}`);
  }

  async cancelScheduledPost(jobId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("DELETE", `/uploadposts/schedule/${jobId}`);
  }

  async modifyScheduledPost(
    jobId: string,
    updates: ScheduleUpdate
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("PATCH", `/uploadposts/schedule/${jobId}`, updates);
  }

  // Queue Management
  async getQueueSettings(profile: string): Promise<QueueSettings> {
    return this.request<QueueSettings>("GET", `/uploadposts/queue/settings?profile_username=${encodeURIComponent(profile)}`);
  }

  async updateQueueSettings(profile: string, updates: QueueSettingsUpdate): Promise<{ success: boolean }> {
    const body = { profile_username: profile, ...updates };
    return this.request<{ success: boolean }>("POST", "/uploadposts/queue/settings", body);
  }

  async previewQueue(profile: string, count?: number): Promise<{ preview: QueueSlot[] }> {
    const queryParams = new URLSearchParams({ profile_username: profile });
    if (count !== undefined) {
      queryParams.set("count", count.toString());
    }
    return this.request<{ preview: QueueSlot[] }>("GET", `/uploadposts/queue/preview?${queryParams}`);
  }

  async nextSlot(profile: string): Promise<{ next_slot: string }> {
    return this.request<{ next_slot: string }>("GET", `/uploadposts/queue/next-slot?profile_username=${encodeURIComponent(profile)}`);
  }

  // History
  async getHistory(profile?: string, page?: number, limit?: number): Promise<{ history: HistoryEntry[]; page: number; total: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (profile) queryParams.set("profile", profile);
    if (page !== undefined) queryParams.set("page", page.toString());
    if (limit !== undefined) queryParams.set("limit", limit.toString());

    const queryString = queryParams.toString();
    const path = queryString ? `/uploadposts/history?${queryString}` : "/uploadposts/history";

    return this.request<{ history: HistoryEntry[]; page: number; total: number; limit: number }>("GET", path);
  }

  // Analytics
  async getAnalytics(
    profile: string,
    platforms?: string[],
    facebookPage?: string,
    linkedinPage?: string
  ): Promise<{ profile: string; analytics: Record<string, Record<string, number | string>> }> {
    const queryParams = new URLSearchParams();
    if (platforms && platforms.length > 0) queryParams.set("platforms", platforms.join(","));
    if (facebookPage) queryParams.set("page_id", facebookPage);
    if (linkedinPage) queryParams.set("page_urn", linkedinPage);

    const queryString = queryParams.toString();
    const path = queryString
      ? `/analytics/${encodeURIComponent(profile)}?${queryString}`
      : `/analytics/${encodeURIComponent(profile)}`;

    return this.request<{ profile: string; analytics: Record<string, Record<string, number | string>> }>("GET", path);
  }
}
