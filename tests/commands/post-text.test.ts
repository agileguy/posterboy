import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { postText } from "../../src/commands/post/text";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { PostResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

// Store original Bun methods
const originalFile = Bun.file;

describe("postText command", () => {
  let mockFileText: ReturnType<typeof mock>;
  let mockStdinText: ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset mocks
    mockFileText = mock(async () => "Text from file");
    mockStdinText = mock(async () => "Text from stdin");

    // Mock Bun.file
    spyOn(Bun, "file").mockImplementation((path: string | URL) => {
      if (path === "/test/file.txt") {
        return {
          text: mockFileText,
          size: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalFile(path) as any;
    });

    // Mock Bun.stdin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Bun.stdin as any).text = mockStdinText;
  });

  test("posts text from --body flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        x: { success: true, publish_id: "123", url: "https://x.com/test/123" },
      },
      usage: { count: 1, limit: 10, remaining: 9 },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostText = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--body", "Hello world", "--platforms", "x"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostText).toHaveBeenCalledWith({
      profile: "testuser",
      platforms: ["x"],
      text: "Hello world",
    });

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("posts text from --file flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        linkedin: { success: true, publish_id: "456", url: "https://linkedin.com/test/456" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue(undefined);

    const mockPostTextFn = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostTextFn,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--file", "/test/file.txt", "--platforms", "linkedin", "--profile", "myprofile"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockFileText).toHaveBeenCalled();
    expect(mockPostTextFn).toHaveBeenCalledWith({
      profile: "myprofile",
      platforms: ["linkedin"],
      text: "Text from file",
    });

    consoleLogSpy.mockRestore();
  });

  test("posts text from --stdin flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
      default_platforms: ["threads"],
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        threads: { success: true, publish_id: "789", url: "https://threads.net/test/789" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostTextFn = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostTextFn,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--stdin"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockStdinText).toHaveBeenCalled();
    expect(mockPostTextFn).toHaveBeenCalledWith({
      profile: "testuser",
      platforms: ["threads"],
      text: "Text from stdin",
    });

    consoleLogSpy.mockRestore();
  });

  test("throws error when no input method provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");

    await expect(
      postText(["--platforms", "x", "--profile", "testuser"], { json: false, pretty: true, verbose: false })
    ).rejects.toThrow(UserError);
  });

  test("throws error when multiple input methods provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");

    await expect(
      postText(
        ["--body", "test", "--file", "/test/file.txt", "--platforms", "x", "--profile", "testuser"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when platform does not support text", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");

    await expect(
      postText(
        ["--body", "test", "--platforms", "instagram", "--profile", "testuser"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when facebook missing --facebook-page", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");

    await expect(
      postText(
        ["--body", "test", "--platforms", "facebook", "--profile", "testuser"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when reddit missing --reddit-subreddit", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");

    await expect(
      postText(
        ["--body", "test", "--platforms", "reddit", "--profile", "testuser"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("dry run mode prints payload without calling API", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostText = mock(async () => ({} as PostResult));
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--body", "test", "--platforms", "x", "--dry-run"],
      { json: false, pretty: true, verbose: false }
    );

    // API should not be called in dry run
    expect(mockPostText).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("outputs JSON when --json flag is set", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        x: { success: true, publish_id: "123", url: "https://x.com/test/123" },
      },
      usage: { count: 1, limit: 10, remaining: 9 },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostText = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--body", "test", "--platforms", "x"],
      { json: true, pretty: false, verbose: false }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success": true')
    );
    consoleLogSpy.mockRestore();
  });

  test("handles scheduled post output", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      scheduled: true,
      job_id: "job-123",
      scheduled_date: "2026-03-01T14:00:00Z",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostText = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      ["--body", "test", "--platforms", "x", "--schedule", "2026-03-01T14:00:00Z"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostText).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: "2026-03-01T14:00:00Z",
      })
    );

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("includes platform-specific parameters", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        x: { success: true, publish_id: "123", url: "https://x.com/test/123" },
        linkedin: { success: true, publish_id: "456", url: "https://linkedin.com/test/456" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostText = mock(async () => mockResult);
    spyOn(api, "ApiClient").mockImplementation(() => ({
      postText: mockPostText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postText(
      [
        "--body", "test",
        "--platforms", "x,linkedin",
        "--x-title", "X Post Title",
        "--linkedin-title", "LinkedIn Post Title",
        "--linkedin-page", "page-123",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostText).toHaveBeenCalledWith(
      expect.objectContaining({
        x_title: "X Post Title",
        linkedin_title: "LinkedIn Post Title",
        linkedin_page: "page-123",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("throws error when profile not provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue(undefined);

    await expect(
      postText(
        ["--body", "test", "--platforms", "x"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when platforms not provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postText(
        ["--body", "test"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error when text is empty", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postText(
        ["--body", "   ", "--platforms", "x"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });
});
