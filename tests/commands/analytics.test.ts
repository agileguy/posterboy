import { describe, test, expect, afterEach, spyOn } from "bun:test";
import { analytics } from "../../src/commands/analytics";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("analytics command", () => {
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    if (apiClientSpy) { apiClientSpy.mockRestore(); apiClientSpy = null; }
    configSpies.forEach(s => s.mockRestore());
    configSpies = [];
  });

  test("retrieves basic analytics for profile", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {
        instagram: {
          followers: 1250,
          posts: 45,
          engagement_rate: 3.2,
        },
        tiktok: {
          followers: 5000,
          videos: 12,
          views: 50000,
        },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(["testuser"], { json: false, pretty: true, verbose: false });

    expect(mockGetAnalytics).toHaveBeenCalledWith("testuser", undefined, undefined, undefined);
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("filters analytics by platforms", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {
        instagram: {
          followers: 1250,
          posts: 45,
        },
        tiktok: {
          followers: 5000,
          videos: 12,
        },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(
      ["testuser", "--platforms", "instagram,tiktok"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetAnalytics).toHaveBeenCalledWith(
      "testuser",
      ["instagram", "tiktok"],
      undefined,
      undefined
    );
    consoleLogSpy.mockRestore();
  });

  test("includes facebook page parameter", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {
        facebook: {
          page_followers: 800,
          page_likes: 750,
        },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(
      ["testuser", "--platforms", "facebook", "--facebook-page", "page123"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetAnalytics).toHaveBeenCalledWith(
      "testuser",
      ["facebook"],
      "page123",
      undefined
    );
    consoleLogSpy.mockRestore();
  });

  test("includes linkedin page parameter", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {
        linkedin: {
          followers: 450,
          posts: 30,
        },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(
      ["testuser", "--linkedin-page", "org456"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetAnalytics).toHaveBeenCalledWith(
      "testuser",
      undefined,
      undefined,
      "org456"
    );
    consoleLogSpy.mockRestore();
  });

  test("throws error when profile is missing", async () => {
    await expect(
      analytics([], { json: false, pretty: true, verbose: false })
    ).rejects.toThrow(UserError);
  });

  test("throws error when facebook platform requires page", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    await expect(
      analytics(
        ["testuser", "--platforms", "facebook"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("JSON output mode", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {
        instagram: {
          followers: 1250,
        },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(["testuser"], { json: true, pretty: false, verbose: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"profile": "testuser"')
    );
    consoleLogSpy.mockRestore();
  });

  test("handles empty analytics data", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult = {
      profile: "testuser",
      analytics: {},
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetAnalytics = spyOn(api.ApiClient.prototype, "getAnalytics").mockResolvedValue(mockResult);
    apiClientSpy = mockGetAnalytics;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await analytics(["testuser"], { json: false, pretty: true, verbose: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No analytics data available")
    );
    consoleLogSpy.mockRestore();
  });
});
