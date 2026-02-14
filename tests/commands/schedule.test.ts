import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { scheduleList } from "../../src/commands/schedule/list";
import { scheduleCancel } from "../../src/commands/schedule/cancel";
import { scheduleModify } from "../../src/commands/schedule/modify";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { ScheduleListResult, Config } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("schedule commands", () => {
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  beforeEach(() => {
    // Reset for each test
    apiClientSpy = null;
    configSpies = [];
  });

  afterEach(() => {
    // Clean up all spies
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
    configSpies.forEach(s => s.mockRestore());
    configSpies = [];
  });

  describe("schedule list", () => {
    test("lists scheduled posts with results", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      const mockResult: ScheduleListResult = {
        scheduled_posts: [
          {
            job_id: "job-123",
            scheduled_date: "2026-03-01T14:00:00Z",
            platforms: ["x", "linkedin"],
            title: "Test Post",
            content_type: "text",
            profile: "testuser",
          },
          {
            job_id: "job-456",
            scheduled_date: "2026-03-02T10:00:00Z",
            platforms: ["threads"],
            content_type: "photo",
            profile: "testuser",
          },
        ],
        count: 2,
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(spyOn(config, "getDefaultProfile").mockReturnValue(undefined));

      const mockListScheduledPosts = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        listScheduledPosts: mockListScheduledPosts,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleList([], { json: false, pretty: true, verbose: false });

      expect(mockListScheduledPosts).toHaveBeenCalledWith(undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test("lists scheduled posts with profile filter", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      const mockResult: ScheduleListResult = {
        scheduled_posts: [],
        count: 0,
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(spyOn(config, "getDefaultProfile").mockReturnValue(undefined));

      const mockListScheduledPosts = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        listScheduledPosts: mockListScheduledPosts,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleList(["--profile", "myprofile"], { json: false, pretty: true, verbose: false });

      expect(mockListScheduledPosts).toHaveBeenCalledWith("myprofile");
      consoleLogSpy.mockRestore();
    });

    test("handles empty list", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      const mockResult: ScheduleListResult = {
        scheduled_posts: [],
        count: 0,
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(spyOn(config, "getDefaultProfile").mockReturnValue(undefined));

      const mockListScheduledPosts = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        listScheduledPosts: mockListScheduledPosts,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleList([], { json: false, pretty: true, verbose: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test("outputs JSON format", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      const mockResult: ScheduleListResult = {
        scheduled_posts: [],
        count: 0,
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(spyOn(config, "getDefaultProfile").mockReturnValue(undefined));

      const mockListScheduledPosts = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        listScheduledPosts: mockListScheduledPosts,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleList([], { json: true, pretty: false, verbose: false });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"count": 0')
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe("schedule cancel", () => {
    test("throws error when job-id not provided", async () => {
      await expect(
        scheduleCancel([], { json: false, pretty: true, verbose: false })
      ).rejects.toThrow(UserError);
    });

    test("cancels scheduled post with --confirm flag", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockCancelScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        cancelScheduledPost: mockCancelScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleCancel(["--job-id", "job-123", "--confirm"], { json: false, pretty: true, verbose: false });

      expect(mockCancelScheduledPost).toHaveBeenCalledWith("job-123");
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test("throws error in non-TTY without --confirm", async () => {
      const originalIsTTY = process.stdout.isTTY;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.stdout as any).isTTY = false;

      try {
        await expect(
          scheduleCancel(["--job-id", "job-123"], { json: false, pretty: true, verbose: false })
        ).rejects.toThrow(UserError);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process.stdout as any).isTTY = originalIsTTY;
      }
    });

    test("outputs JSON format", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockCancelScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        cancelScheduledPost: mockCancelScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleCancel(["--job-id", "job-123", "--confirm"], { json: true, pretty: false, verbose: false });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"job_id": "job-123"')
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe("schedule modify", () => {
    test("throws error when job-id not provided", async () => {
      await expect(
        scheduleModify([], { json: false, pretty: true, verbose: false })
      ).rejects.toThrow(UserError);
    });

    test("throws error when no updates provided", async () => {
      await expect(
        scheduleModify(["--job-id", "job-123"], { json: false, pretty: true, verbose: false })
      ).rejects.toThrow(UserError);
    });

    test("modifies scheduled post with schedule update", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockModifyScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        modifyScheduledPost: mockModifyScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      // Use a date far in the future to pass validation
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateISO = futureDate.toISOString();

      await scheduleModify(
        ["--job-id", "job-123", "--schedule", futureDateISO],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockModifyScheduledPost).toHaveBeenCalledWith("job-123", {
        schedule: futureDateISO,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test("modifies scheduled post with title update", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockModifyScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        modifyScheduledPost: mockModifyScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleModify(
        ["--job-id", "job-123", "--title", "Updated Title"],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockModifyScheduledPost).toHaveBeenCalledWith("job-123", {
        title: "Updated Title",
      });
      consoleLogSpy.mockRestore();
    });

    test("modifies scheduled post with multiple updates", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockModifyScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        modifyScheduledPost: mockModifyScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateISO = futureDate.toISOString();

      await scheduleModify(
        [
          "--job-id", "job-123",
          "--schedule", futureDateISO,
          "--title", "Updated Title",
          "--timezone", "America/New_York"
        ],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockModifyScheduledPost).toHaveBeenCalledWith("job-123", {
        schedule: futureDateISO,
        title: "Updated Title",
        timezone: "America/New_York",
      });
      consoleLogSpy.mockRestore();
    });

    test("outputs JSON format", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));

      const mockModifyScheduledPost = mock(async () => ({ success: true }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(() => ({
        modifyScheduledPost: mockModifyScheduledPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await scheduleModify(
        ["--job-id", "job-123", "--title", "Updated"],
        { json: true, pretty: false, verbose: false }
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"job_id": "job-123"')
      );
      consoleLogSpy.mockRestore();
    });
  });
});
