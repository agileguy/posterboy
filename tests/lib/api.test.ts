// posterboy - API client tests

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { ApiClient } from "../../src/lib/api";
import { ApiError, NetworkError } from "../../src/lib/errors";

describe("ApiClient", () => {
  const mockApiKey = "test_api_key_123";
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(mockApiKey);
  });

  describe("constructor", () => {
    test("creates client with API key", () => {
      expect(client).toBeDefined();
    });

    test("accepts custom base URL", () => {
      const customClient = new ApiClient(mockApiKey, "https://custom.api.com");
      expect(customClient).toBeDefined();
    });
  });

  describe("me()", () => {
    test("returns account info on success", async () => {
      const mockResponse = {
        email: "test@example.com",
        plan: "free",
        usage: {
          count: 5,
          limit: 10,
          remaining: 5,
        },
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const result = await client.me();
      expect(result).toEqual(mockResponse);
    });

    test("throws ApiError on 401 unauthorized", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({ error: "Invalid API key" })),
        })
      ) as any;

      await expect(client.me()).rejects.toThrow(ApiError);
    });

    test("throws ApiError on 500 server error", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve(JSON.stringify({ error: "Internal server error" })),
        })
      ) as any;

      await expect(client.me()).rejects.toThrow(ApiError);
    });

    test("throws NetworkError on network failure", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network failure"))) as any;

      await expect(client.me()).rejects.toThrow(NetworkError);
    });

    test("includes authorization header", async () => {
      let capturedHeaders: HeadersInit | undefined;

      global.fetch = mock((url: string, options: RequestInit) => {
        capturedHeaders = options.headers;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ email: "test@example.com", plan: "free", usage: { count: 0, limit: 10, remaining: 10 } }),
        });
      }) as any;

      await client.me();
      expect(capturedHeaders).toBeDefined();
      expect((capturedHeaders as any)["Authorization"]).toBe(`Bearer ${mockApiKey}`);
    });
  });
});
