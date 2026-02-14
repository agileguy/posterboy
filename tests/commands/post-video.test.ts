import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { postVideo } from "../../src/commands/post/video";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { PostResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

// Store original Bun methods
const originalFile = Bun.file;

describe("postVideo command", () => {
  // Track spies for cleanup
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let bunFileSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  beforeEach(() => {
    // Mock Bun.file for video files
    bunFileSpy = spyOn(Bun, "file").mockImplementation((path: string | URL) => {
      if (typeof path === "string" && path === "/test/video.mp4") {
        return {
          exists: async () => true,
          size: 10 * 1024 * 1024, // 10MB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      if (typeof path === "string" && path === "/test/large-video.mp4") {
        return {
          exists: async () => true,
          size: 60 * 1024 * 1024, // 60MB - triggers auto-async
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalFile(path) as any;
    });
  });

  afterEach(() => {
    // Restore ApiClient spy to prevent leaking to other test files
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
    if (bunFileSpy) {
      bunFileSpy.mockRestore();
      bunFileSpy = null;
    }
    // Restore all config spies
    configSpies.forEach(spy => spy.mockRestore());
    configSpies = [];
  });

  test("posts video from --file flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        tiktok: { success: true, publish_id: "123", url: "https://tiktok.com/test/123" },
      },
      usage: { count: 1, limit: 10, remaining: 9 },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      ["--file", "/test/video.mp4", "--title", "Test Video", "--platforms", "tiktok"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "testuser",
        platforms: ["tiktok"],
        title: "Test Video",
        file: "/test/video.mp4",
      })
    );

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("posts video from --url flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        youtube: { success: true, publish_id: "456", url: "https://youtube.com/watch?v=456" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      ["--url", "https://example.com/video.mp4", "--title", "Test Video", "--platforms", "youtube"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "testuser",
        platforms: ["youtube"],
        title: "Test Video",
        url: "https://example.com/video.mp4",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("throws error when no file/url provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    await expect(
      postVideo(
        ["--title", "Test Video", "--platforms", "tiktok"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when both file and url provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    await expect(
      postVideo(
        ["--file", "/test/video.mp4", "--url", "https://example.com/video.mp4", "--title", "Test", "--platforms", "tiktok"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when title missing", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    await expect(
      postVideo(
        ["--file", "/test/video.mp4", "--platforms", "tiktok"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("auto-async for large files", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      request_id: "req_123",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      ["--file", "/test/large-video.mp4", "--title", "Large Video", "--platforms", "youtube"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        async: true,
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("dry run mode", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => ({} as PostResult));
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      ["--file", "/test/video.mp4", "--title", "Test", "--platforms", "tiktok", "--dry-run"],
      { json: false, pretty: true, verbose: false }
    );

    // API should not be called in dry run
    expect(mockPostVideo).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("JSON output format", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        tiktok: { success: true, publish_id: "123", url: "https://tiktok.com/test/123" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      ["--file", "/test/video.mp4", "--title", "Test", "--platforms", "tiktok"],
      { json: true, pretty: false, verbose: false }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success": true')
    );
    consoleLogSpy.mockRestore();
  });

  test("platform-specific YouTube params passed correctly", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        youtube: { success: true, publish_id: "123", url: "https://youtube.com/watch?v=123" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      [
        "--file", "/test/video.mp4",
        "--title", "Test Video",
        "--platforms", "youtube",
        "--youtube-title", "Custom YouTube Title",
        "--youtube-description", "Custom description",
        "--youtube-privacy", "unlisted",
        "--youtube-category", "22",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube_title: "Custom YouTube Title",
        youtube_description: "Custom description",
        youtube_privacy: "unlisted",
        youtube_category: "22",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("platform-specific TikTok params passed correctly", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        tiktok: { success: true, publish_id: "123", url: "https://tiktok.com/test/123" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostVideo = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postVideo: mockPostVideo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postVideo(
      [
        "--file", "/test/video.mp4",
        "--title", "Test Video",
        "--platforms", "tiktok",
        "--tiktok-title", "Custom TikTok Title",
        "--tiktok-privacy", "public_to_everyone",
        "--tiktok-disable-duet",
        "--tiktok-disable-comment",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        tiktok_title: "Custom TikTok Title",
        tiktok_privacy: "public_to_everyone",
        tiktok_disable_duet: true,
        tiktok_disable_comment: true,
      })
    );

    consoleLogSpy.mockRestore();
  });
});
