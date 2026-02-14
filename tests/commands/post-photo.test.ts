import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { postPhoto } from "../../src/commands/post/photo";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { PostResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("postPhoto command", () => {
  // Track spies for cleanup
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  beforeEach(() => {
    // Mock Bun.file to simulate file existence and properties
    configSpies.push(
      spyOn(Bun, "file").mockImplementation((path: string | URL) => {
      const pathStr = typeof path === "string" ? path : path.toString();

      if (pathStr === "/test/photo1.jpg" || pathStr === "/test/photo2.png") {
        return {
          exists: async () => true,
          size: 1024 * 1024, // 1MB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      if (pathStr === "/test/large.jpg") {
        return {
          exists: async () => true,
          size: 10 * 1024 * 1024, // 10MB (exceeds limit)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      if (pathStr === "/test/invalid.txt") {
        return {
          exists: async () => true,
          size: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      // File not found
      return {
        exists: async () => false,
        size: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    })
    );
  });

  afterEach(() => {
    // Restore ApiClient spy to prevent leaking to other test files
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
    // Restore all config and Bun.file spies
    configSpies.forEach(spy => spy.mockRestore());
    configSpies = [];
  });

  test("posts single photo from --files flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        instagram: { success: true, publish_id: "123", url: "https://instagram.com/p/123" },
      },
      usage: { count: 1, limit: 10, remaining: 9 },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostPhotos = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      ["--files", "/test/photo1.jpg", "--title", "Test Photo", "--platforms", "instagram"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "testuser",
        platforms: ["instagram"],
        files: ["/test/photo1.jpg"],
        title: "Test Photo",
      })
    );

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("posts carousel from multiple --files", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        instagram: { success: true, publish_id: "456", url: "https://instagram.com/p/456" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostPhotos = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      [
        "--files", "/test/photo1.jpg,/test/photo2.png",
        "--title", "Carousel Test",
        "--platforms", "instagram",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ["/test/photo1.jpg", "/test/photo2.png"],
        title: "Carousel Test",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("posts from --urls flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        x: { success: true, publish_id: "789", url: "https://x.com/test/789" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostPhotos = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      [
        "--urls", "https://example.com/photo1.jpg,https://example.com/photo2.png",
        "--title", "URL Photos",
        "--platforms", "x",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        urls: ["https://example.com/photo1.jpg", "https://example.com/photo2.png"],
        title: "URL Photos",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("throws error when no files/urls provided", async () => {
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
      postPhoto(
        ["--title", "Test", "--platforms", "instagram"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when both files and urls provided", async () => {
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
      postPhoto(
        [
          "--files", "/test/photo1.jpg",
          "--urls", "https://example.com/photo.jpg",
          "--title", "Test",
          "--platforms", "instagram",
        ],
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
      postPhoto(
        ["--files", "/test/photo1.jpg", "--platforms", "instagram"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error for unsupported platform (youtube)", async () => {
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
      postPhoto(
        ["--files", "/test/photo1.jpg", "--title", "Test", "--platforms", "youtube"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("dry run mode shows payload without API call", async () => {
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

    const mockPostPhotos = mock(async () => ({} as PostResult));
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      [
        "--files", "/test/photo1.jpg",
        "--title", "Test",
        "--platforms", "instagram",
        "--dry-run",
      ],
      { json: false, pretty: true, verbose: false }
    );

    // API should not be called in dry run
    expect(mockPostPhotos).not.toHaveBeenCalled();
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
        instagram: { success: true, publish_id: "123", url: "https://instagram.com/p/123" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostPhotos = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      ["--files", "/test/photo1.jpg", "--title", "Test", "--platforms", "instagram"],
      { json: true, pretty: false, verbose: false }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success": true')
    );
    consoleLogSpy.mockRestore();
  });

  test("platform-specific params passed correctly", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        instagram: { success: true, publish_id: "123", url: "https://instagram.com/p/123" },
        tiktok: { success: true, publish_id: "456", url: "https://tiktok.com/@user/video/456" },
      },
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockPostPhotos = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postPhotos: mockPostPhotos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postPhoto(
      [
        "--files", "/test/photo1.jpg",
        "--title", "Test Photo",
        "--platforms", "instagram,tiktok",
        "--instagram-title", "Instagram Title",
        "--instagram-media-type", "REEL",
        "--tiktok-title", "TikTok Title",
        "--tiktok-privacy", "PUBLIC_TO_EVERYONE",
        "--tiktok-disable-comments",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        instagram_title: "Instagram Title",
        instagram_media_type: "REEL",
        tiktok_title: "TikTok Title",
        tiktok_privacy: "PUBLIC_TO_EVERYONE",
        tiktok_disable_comments: true,
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("throws error when file not found", async () => {
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
      postPhoto(
        ["--files", "/test/notfound.jpg", "--title", "Test", "--platforms", "instagram"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when file exceeds size limit", async () => {
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
      postPhoto(
        ["--files", "/test/large.jpg", "--title", "Test", "--platforms", "instagram"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when file format unsupported", async () => {
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
      postPhoto(
        ["--files", "/test/invalid.txt", "--title", "Test", "--platforms", "instagram"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });
});
