// posterboy - API client wrapper

import { API_BASE_URL } from "../constants";
import { ApiError, NetworkError } from "./errors";
import type { AccountInfo } from "./types";

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
}
