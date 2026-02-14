// posterboy - Platforms command

import { parseArgs } from "node:util";
import { getApiKey, readConfig, getDefaultProfile } from "../lib/config";
import { ApiClient } from "../lib/api";
import { createOutputFormatter } from "../lib/output";
import { UserError } from "../lib/errors";
import { ALL_PLATFORMS } from "../constants";
import type { GlobalFlags } from "../lib/types";

export async function platforms(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
    },
    strict: false,
  });

  // Load config
  const config = readConfig();

  // Resolve profile (command flag > global flag > config default)
  const profile =
    (values.profile as string | undefined) ||
    getDefaultProfile(globalFlags.profile, config);

  if (!profile) {
    throw new UserError(
      "Profile is required.\n" +
        "Use --profile flag or set default_profile in config.\n" +
        "Usage: posterboy platforms --profile <username>"
    );
  }

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Call API to get user profile
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });
  const result = await client.getUserProfile(profile);

  // Output results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    // JSON output: list all platforms with connection status
    const platformStatuses = ALL_PLATFORMS.map((platform) => ({
      platform,
      connected: result.user.connected_platforms.includes(platform),
    }));

    formatter.json({
      profile: result.user.username,
      platforms: platformStatuses,
    });
  } else {
    // Pretty output: formatted list with indicators
    const lines = [
      formatter.header(`Platforms for ${result.user.username}`),
      "",
    ];

    for (const platform of ALL_PLATFORMS) {
      const connected = result.user.connected_platforms.includes(platform);
      const indicator = connected
        ? formatter.success("✓")
        : formatter.muted("-");
      const platformName = platform.padEnd(10);

      lines.push(`  ${indicator} ${platformName}`);
    }

    lines.push("");
    lines.push(
      formatter.muted(
        `${result.user.connected_platforms.length} of ${ALL_PLATFORMS.length} platforms connected`
      )
    );

    formatter.pretty(lines);
  }
}

export async function platformsPages(
  subcommand: string,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
    },
    strict: false,
  });

  // Load config
  const config = readConfig();

  // Resolve profile (command flag > global flag > config default)
  const profile =
    (values.profile as string | undefined) ||
    getDefaultProfile(globalFlags.profile, config);

  if (!profile) {
    throw new UserError(
      "Profile is required.\n" +
        "Use --profile flag or set default_profile in config.\n" +
        `Usage: posterboy platforms pages ${subcommand} --profile <username>`
    );
  }

  // Get API key from config/env/flag
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);

  // Create API client
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Output formatter
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  // Route to specific platform pages endpoint
  switch (subcommand) {
    case "facebook":
      {
        const result = await client.facebookPages(profile);

        if (formatter.mode() === "json") {
          formatter.json({
            profile,
            platform: "facebook",
            pages: result.pages,
          });
        } else {
          const lines = [
            formatter.header(`Facebook Pages for ${profile}`),
            "",
          ];

          if (result.pages.length === 0) {
            lines.push("  No Facebook pages found.");
          } else {
            for (const page of result.pages) {
              lines.push(
                `  ${formatter.label(page.name)}`,
                `    ID:       ${page.id}`,
                `    Category: ${page.category}`,
                ""
              );
            }
          }

          formatter.pretty(lines);
        }
      }
      break;

    case "linkedin":
      {
        const result = await client.linkedinPages(profile);

        if (formatter.mode() === "json") {
          formatter.json({
            profile,
            platform: "linkedin",
            pages: result.pages,
          });
        } else {
          const lines = [
            formatter.header(`LinkedIn Pages for ${profile}`),
            "",
          ];

          if (result.pages.length === 0) {
            lines.push("  No LinkedIn pages found.");
          } else {
            for (const page of result.pages) {
              lines.push(
                `  ${formatter.label(page.name)}`,
                `    ID: ${page.id}`,
                ""
              );
            }
          }

          formatter.pretty(lines);
        }
      }
      break;

    case "pinterest":
      {
        const result = await client.pinterestBoards(profile);

        if (formatter.mode() === "json") {
          formatter.json({
            profile,
            platform: "pinterest",
            boards: result.boards,
          });
        } else {
          const lines = [
            formatter.header(`Pinterest Boards for ${profile}`),
            "",
          ];

          if (result.boards.length === 0) {
            lines.push("  No Pinterest boards found.");
          } else {
            for (const board of result.boards) {
              lines.push(
                `  ${formatter.label(board.name)}`,
                `    ID: ${board.id}`,
                ""
              );
            }
          }

          formatter.pretty(lines);
        }
      }
      break;

    default:
      throw new UserError(
        `Unknown platform: ${subcommand}\n` +
          "Available platforms: facebook, linkedin, pinterest"
      );
  }
}
