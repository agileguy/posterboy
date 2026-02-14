import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { postDocument } from "../../src/commands/post/document";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { PostResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("postDocument command", () => {
  // Track spies for cleanup
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;

  beforeEach(() => {
    // Mock Bun.file to simulate file existence and properties
    spyOn(Bun, "file").mockImplementation((path: string | URL) => {
      const pathStr = typeof path === "string" ? path : path.toString();

      if (pathStr === "/test/presentation.pdf") {
        return {
          exists: async () => true,
          size: 5 * 1024 * 1024, // 5MB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      if (pathStr === "/test/document.pptx") {
        return {
          exists: async () => true,
          size: 10 * 1024 * 1024, // 10MB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      if (pathStr === "/test/large.pdf") {
        return {
          exists: async () => true,
          size: 150 * 1024 * 1024, // 150MB (exceeds limit)
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
    });
  });

  afterEach(() => {
    // Restore ApiClient spy to prevent leaking to other test files
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
  });

  test("posts document from --file flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        linkedin: { success: true, publish_id: "123", url: "https://linkedin.com/feed/update/123" },
      },
      usage: { count: 1, limit: 10, remaining: 9 },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      ["--file", "/test/presentation.pdf", "--title", "Q4 Results"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "testuser",
        file: "/test/presentation.pdf",
        title: "Q4 Results",
      })
    );

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("posts from --url flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        linkedin: { success: true, publish_id: "456", url: "https://linkedin.com/feed/update/456" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      [
        "--url", "https://example.com/document.pdf",
        "--title", "Annual Report",
        "--description", "2025 Annual Report",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/document.pdf",
        title: "Annual Report",
        description: "2025 Annual Report",
      })
    );

    consoleLogSpy.mockRestore();
  });

  test("throws error when no file/url", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postDocument(
        ["--title", "Test Document"],
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

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postDocument(
        ["--file", "/test/presentation.pdf"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("dry run mode", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => ({} as PostResult));
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      [
        "--file", "/test/presentation.pdf",
        "--title", "Test Doc",
        "--dry-run",
      ],
      { json: false, pretty: true, verbose: false }
    );

    // API should not be called in dry run
    expect(mockPostDocument).not.toHaveBeenCalled();
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
        linkedin: { success: true, publish_id: "789", url: "https://linkedin.com/feed/update/789" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      ["--file", "/test/presentation.pdf", "--title", "Test Doc"],
      { json: true, pretty: false, verbose: false }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"success": true')
    );
    consoleLogSpy.mockRestore();
  });

  test("LinkedIn-page param passed correctly", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        linkedin: { success: true, publish_id: "123", url: "https://linkedin.com/feed/update/123" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      [
        "--file", "/test/presentation.pdf",
        "--title", "Test Doc",
        "--linkedin-page", "urn:li:organization:123456",
        "--linkedin-visibility", "PUBLIC",
      ],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedin_page: "urn:li:organization:123456",
        linkedin_visibility: "PUBLIC",
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

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postDocument(
        ["--file", "/test/notfound.pdf", "--title", "Test"],
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

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postDocument(
        ["--file", "/test/large.pdf", "--title", "Test"],
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

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    await expect(
      postDocument(
        ["--file", "/test/invalid.txt", "--title", "Test"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("applies config defaults for linkedin_page", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
      platform_defaults: {
        linkedin: {
          page_id: "urn:li:organization:default123",
          visibility: "CONNECTIONS",
        },
      },
    };

    const mockResult: PostResult = {
      success: true,
      results: {
        linkedin: { success: true, publish_id: "123", url: "https://linkedin.com/feed/update/123" },
      },
    };

    spyOn(config, "readConfig").mockReturnValue(mockConfig);
    spyOn(config, "getApiKey").mockReturnValue("test_key");
    spyOn(config, "getDefaultProfile").mockReturnValue("testuser");

    const mockPostDocument = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      postDocument: mockPostDocument,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await postDocument(
      ["--file", "/test/presentation.pdf", "--title", "Test Doc"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockPostDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedin_page: "urn:li:organization:default123",
        linkedin_visibility: "CONNECTIONS",
      })
    );

    consoleLogSpy.mockRestore();
  });
});
