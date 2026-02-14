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
  PostResult,
} from "./types";

export class ApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout after 30 seconds");
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
  async listUsers(): Promise<{ users: Profile[] }> {
    return this.request<{ users: Profile[] }>("GET", "/uploadposts/users");
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
    if (options?.redirect) body.redirect = options.redirect;
    return this.request<JwtResult>("POST", "/uploadposts/users/generate-jwt", body);
  }

  async getUserProfile(username: string): Promise<{ user: Profile }> {
    return this.request<{ user: Profile }>("GET", `/uploadposts/users/${username}`);
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
    // Map TextPostParams to the API's expected format
    const body: Record<string, unknown> = {
      profile: params.profile,
      platforms: params.platforms,
      text: params.text,
    };

    // Add optional fields only if present
    if (params.schedule) body.schedule = params.schedule;
    if (params.timezone) body.timezone = params.timezone;
    if (params.queue) body.queue = params.queue;
    if (params.async) body.async = params.async;
    if (params.first_comment) body.first_comment = params.first_comment;

    // X-specific
    if (params.x_title) body.x_title = params.x_title;
    if (params.x_reply_to) body.x_reply_to = params.x_reply_to;
    if (params.x_reply_settings) body.x_reply_settings = params.x_reply_settings;
    if (params.x_quote_tweet) body.x_quote_tweet = params.x_quote_tweet;
    if (params.x_long_text_as_post !== undefined) body.x_long_text_as_post = params.x_long_text_as_post;
    if (params.x_poll_options) body.x_poll_options = params.x_poll_options;
    if (params.x_poll_duration) body.x_poll_duration = params.x_poll_duration;

    // LinkedIn-specific
    if (params.linkedin_title) body.linkedin_title = params.linkedin_title;
    if (params.linkedin_page) body.linkedin_page = params.linkedin_page;
    if (params.linkedin_visibility) body.linkedin_visibility = params.linkedin_visibility;

    // Facebook-specific
    if (params.facebook_title) body.facebook_title = params.facebook_title;
    if (params.facebook_page) body.facebook_page = params.facebook_page;
    if (params.facebook_link) body.facebook_link = params.facebook_link;

    // Threads-specific
    if (params.threads_title) body.threads_title = params.threads_title;
    if (params.threads_long_text_as_post !== undefined) body.threads_long_text_as_post = params.threads_long_text_as_post;

    // Reddit-specific
    if (params.reddit_subreddit) body.reddit_subreddit = params.reddit_subreddit;
    if (params.reddit_flair) body.reddit_flair = params.reddit_flair;

    // Bluesky-specific
    if (params.bluesky_title) body.bluesky_title = params.bluesky_title;
    if (params.bluesky_reply_to) body.bluesky_reply_to = params.bluesky_reply_to;

    return this.request<PostResult>("POST", "/upload_text", body);
  }
}
