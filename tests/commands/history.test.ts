import { describe, test, expect, afterEach, spyOn } from "bun:test";
import { history } from "../../src/commands/history";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("history command", () => {
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    if (apiClientSpy) { apiClientSpy.mockRestore(); apiClientSpy = null; }
    configSpies.forEach(s => s.mockRestore());
    configSpies = [];
  });

  test("lists history with default pagination", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult = {
      history: [
        {
          id: "1",
          created_at: "2026-02-10T12:00:00Z",
          platforms: ["x", "linkedin"],
          media_type: "text",
          title: "Hello world",
          status: "completed",
          user: "testuser",
        },
        {
          id: "2",
          created_at: "2026-02-09T09:30:00Z",
          platforms: ["tiktok"],
          media_type: "video",
          title: "My cool video",
          status: "completed",
          user: "testuser",
        },
      ],
      page: 1,
      total: 30,
      limit: 10,
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockGetHistory = spyOn(api.ApiClient.prototype, "getHistory").mockResolvedValue(mockResult);
    apiClientSpy = mockGetHistory;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await history([], { json: false, pretty: true, verbose: false });

    expect(mockGetHistory).toHaveBeenCalledWith("testuser", 1, 10);
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("lists history with custom page and limit", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult = {
      history: [],
      page: 2,
      total: 125,
      limit: 25,
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockGetHistory = spyOn(api.ApiClient.prototype, "getHistory").mockResolvedValue(mockResult);
    apiClientSpy = mockGetHistory;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await history(
      ["--page", "2", "--limit", "25"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetHistory).toHaveBeenCalledWith("testuser", 2, 25);
    consoleLogSpy.mockRestore();
  });

  test("JSON output mode", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult = {
      history: [
        {
          id: "1",
          created_at: "2026-02-10T12:00:00Z",
          platforms: ["instagram"],
          media_type: "photo",
          title: "Photo post",
          status: "completed",
          user: "testuser",
        },
      ],
      page: 1,
      total: 10,
      limit: 10,
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockGetHistory = spyOn(api.ApiClient.prototype, "getHistory").mockResolvedValue(mockResult);
    apiClientSpy = mockGetHistory;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await history([], { json: true, pretty: false, verbose: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"page": 1')
    );
    consoleLogSpy.mockRestore();
  });

  test("throws error for invalid page number (0)", async () => {
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
      history(
        ["--page", "0"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error for negative page number", async () => {
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
      history(
        ["--page", "-1"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("throws error for limit exceeding max (>100)", async () => {
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
      history(
        ["--limit", "101"],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });

  test("empty history result displays message", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult = {
      history: [],
      page: 1,
      total: 0,
      limit: 10,
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockGetHistory = spyOn(api.ApiClient.prototype, "getHistory").mockResolvedValue(mockResult);
    apiClientSpy = mockGetHistory;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await history([], { json: false, pretty: true, verbose: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No upload history found")
    );
    consoleLogSpy.mockRestore();
  });

  test("uses specified profile flag", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
      default_profile: "testuser",
    };

    const mockResult = {
      history: [],
      page: 1,
      total: 0,
      limit: 10,
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key"),
      spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
    );

    const mockGetHistory = spyOn(api.ApiClient.prototype, "getHistory").mockResolvedValue(mockResult);
    apiClientSpy = mockGetHistory;

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await history(
      ["--profile", "otheruser"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetHistory).toHaveBeenCalledWith("otheruser", 1, 10);
    consoleLogSpy.mockRestore();
  });
});
