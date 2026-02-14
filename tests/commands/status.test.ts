import { describe, test, expect, afterEach, mock, spyOn } from "bun:test";
import { statusCheck } from "../../src/commands/status";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { StatusResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("statusCheck command", () => {
  // Track spies for cleanup
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    // Restore ApiClient spy to prevent leaking to other test files
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
    // Restore all config spies
    configSpies.forEach(spy => spy.mockRestore());
    configSpies = [];
  });

  test("shows status for job_id", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult: StatusResult = {
      status: "completed",
      completed: 1,
      total: 1,
      results: [
        { platform: "tiktok", success: true, publish_id: "123", url: "https://tiktok.com/test/123" },
      ],
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetStatus = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      getStatus: mockGetStatus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await statusCheck(
      ["job_123"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetStatus).toHaveBeenCalledWith("job_123", "job_id");
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("shows status for request_id", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult: StatusResult = {
      status: "pending",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetStatus = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      getStatus: mockGetStatus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await statusCheck(
      ["--request-id", "req_456"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetStatus).toHaveBeenCalledWith("req_456", "request_id");
    consoleLogSpy.mockRestore();
  });

  test("auto-detects request_id type (req_ prefix)", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult: StatusResult = {
      status: "processing",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetStatus = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      getStatus: mockGetStatus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await statusCheck(
      ["req_789"],
      { json: false, pretty: true, verbose: false }
    );

    expect(mockGetStatus).toHaveBeenCalledWith("req_789", "request_id");
    consoleLogSpy.mockRestore();
  });

  test("JSON output format", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    const mockResult: StatusResult = {
      status: "completed",
      completed: 1,
      total: 1,
      results: [
        { platform: "youtube", success: true, publish_id: "abc", url: "https://youtube.com/watch?v=abc" },
      ],
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    const mockGetStatus = mock(async () => mockResult);
    apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
      getStatus: mockGetStatus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    await statusCheck(
      ["job_123"],
      { json: true, pretty: false, verbose: false }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "completed"')
    );
    consoleLogSpy.mockRestore();
  });

  test("throws error when no ID provided", async () => {
    const mockConfig: Config = {
      version: 1,
      api_key: "test_key",
    };

    configSpies.push(
      spyOn(config, "readConfig").mockReturnValue(mockConfig),
      spyOn(config, "getApiKey").mockReturnValue("test_key")
    );

    await expect(
      statusCheck(
        [],
        { json: false, pretty: true, verbose: false }
      )
    ).rejects.toThrow(UserError);
  });
});
