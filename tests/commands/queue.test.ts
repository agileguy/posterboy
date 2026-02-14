import { describe, test, expect, afterEach, mock, spyOn } from "bun:test";
import { queueSettings } from "../../src/commands/queue/settings";
import { queuePreview } from "../../src/commands/queue/preview";
import { queueNext } from "../../src/commands/queue/next";
import * as config from "../../src/lib/config";
import * as api from "../../src/lib/api";
import type { Config, QueueSettings, QueueSlot } from "../../src/lib/types";
import { UserError } from "../../src/lib/errors";

describe("queue commands", () => {
  let apiClientSpy: ReturnType<typeof spyOn> | null = null;
  let configSpies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    if (apiClientSpy) {
      apiClientSpy.mockRestore();
      apiClientSpy = null;
    }
    configSpies.forEach((s) => s.mockRestore());
    configSpies = [];
  });

  describe("queue settings", () => {
    test("views queue settings in JSON mode", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      const mockSettings: QueueSettings = {
        profile_username: "testuser",
        timezone: "America/New_York",
        slots: [{ hour: 9, minute: 0 }, { hour: 12, minute: 0 }, { hour: 18, minute: 0 }],
        days_of_week: [1, 2, 3, 4, 5],
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockGetQueueSettings = mock(async () => mockSettings);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            getQueueSettings: mockGetQueueSettings,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueSettings([], { json: true, pretty: false, verbose: false });

      expect(mockGetQueueSettings).toHaveBeenCalledWith("testuser");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"profile_username": "testuser"')
      );

      consoleLogSpy.mockRestore();
    });

    test("updates queue settings with timezone", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockUpdateQueueSettings = mock(
        async () => ({ success: true }) as { success: boolean }
      );
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            updateQueueSettings: mockUpdateQueueSettings,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueSettings(
        ["--set-timezone", "America/Los_Angeles"],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockUpdateQueueSettings).toHaveBeenCalledWith("testuser", {
        timezone: "America/Los_Angeles",
      });

      consoleLogSpy.mockRestore();
    });

    test("updates queue settings with slots", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockUpdateQueueSettings = mock(
        async () => ({ success: true }) as { success: boolean }
      );
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            updateQueueSettings: mockUpdateQueueSettings,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueSettings(
        ["--set-slots", "08:00,12:00,16:00,20:00"],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockUpdateQueueSettings).toHaveBeenCalledWith("testuser", {
        slots: [{ hour: 8, minute: 0 }, { hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }],
      });

      consoleLogSpy.mockRestore();
    });

    test("updates queue settings with days", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockUpdateQueueSettings = mock(
        async () => ({ success: true }) as { success: boolean }
      );
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            updateQueueSettings: mockUpdateQueueSettings,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueSettings(
        ["--set-days", "mon,wed,fri"],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockUpdateQueueSettings).toHaveBeenCalledWith("testuser", {
        days_of_week: [1, 3, 5],
      });

      consoleLogSpy.mockRestore();
    });

    test("validates invalid time slot format", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      await expect(
        queueSettings(
          ["--set-slots", "9:00,25:00,invalid"],
          { json: false, pretty: true, verbose: false }
        )
      ).rejects.toThrow(UserError);
    });

    test("validates invalid day names", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      await expect(
        queueSettings(
          ["--set-days", "monday,invalidday,friday"],
          { json: false, pretty: true, verbose: false }
        )
      ).rejects.toThrow(UserError);
    });

    test("validates max slot count", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const manySlots = Array.from({ length: 25 }, (_, i) =>
        `${String(i).padStart(2, "0")}:00`
      ).join(",");

      await expect(
        queueSettings(
          ["--set-slots", manySlots],
          { json: false, pretty: true, verbose: false }
        )
      ).rejects.toThrow(UserError);
    });

    test("validates invalid timezone format", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      await expect(
        queueSettings(
          ["--set-timezone", "InvalidZone"],
          { json: false, pretty: true, verbose: false }
        )
      ).rejects.toThrow(UserError);
    });
  });

  describe("queue preview", () => {
    test("previews queue slots with default count", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      const mockSlots: QueueSlot[] = [
        { slot_time: "2026-02-14T09:00:00Z", available: true },
        { slot_time: "2026-02-14T12:00:00Z", available: false },
        { slot_time: "2026-02-14T18:00:00Z", available: true },
      ];

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockPreviewQueue = mock(async () => ({ preview: mockSlots }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            previewQueue: mockPreviewQueue,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queuePreview([], { json: false, pretty: true, verbose: false });

      expect(mockPreviewQueue).toHaveBeenCalledWith("testuser", 10);

      consoleLogSpy.mockRestore();
    });

    test("previews queue slots with custom count", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      const mockSlots: QueueSlot[] = [
        { slot_time: "2026-02-14T09:00:00Z", available: true },
      ];

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockPreviewQueue = mock(async () => ({ preview: mockSlots }));
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            previewQueue: mockPreviewQueue,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queuePreview(
        ["--count", "5"],
        { json: false, pretty: true, verbose: false }
      );

      expect(mockPreviewQueue).toHaveBeenCalledWith("testuser", 5);

      consoleLogSpy.mockRestore();
    });

    test("validates count is within range", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      await expect(
        queuePreview(
          ["--count", "100"],
          { json: false, pretty: true, verbose: false }
        )
      ).rejects.toThrow(UserError);
    });
  });

  describe("queue next", () => {
    test("gets next available queue slot", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      const mockResult = {
        next_slot: "2026-02-14T09:00:00Z",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockNextSlot = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            nextSlot: mockNextSlot,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueNext([], { json: false, pretty: true, verbose: false });

      expect(mockNextSlot).toHaveBeenCalledWith("testuser");

      consoleLogSpy.mockRestore();
    });

    test("outputs JSON when --json flag is set", async () => {
      const mockConfig: Config = {
        version: 1,
        api_key: "test_key",
        default_profile: "testuser",
      };

      const mockResult = {
        next_slot: "2026-02-14T09:00:00Z",
      };

      configSpies.push(spyOn(config, "readConfig").mockReturnValue(mockConfig));
      configSpies.push(spyOn(config, "getApiKey").mockReturnValue("test_key"));
      configSpies.push(
        spyOn(config, "getDefaultProfile").mockReturnValue("testuser")
      );

      const mockNextSlot = mock(async () => mockResult);
      apiClientSpy = spyOn(api, "ApiClient").mockImplementation(
        () =>
          ({
            nextSlot: mockNextSlot,
          }) as any
      );

      const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

      await queueNext([], { json: true, pretty: false, verbose: false });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"next_slot"')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
