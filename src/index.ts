#!/usr/bin/env bun

// posterboy - Main entry point

import { VERSION } from "./constants";
import { authLogin } from "./commands/auth/login";
import { authStatus } from "./commands/auth/status";
import { profilesList } from "./commands/profiles/list";
import { profilesCreate } from "./commands/profiles/create";
import { profilesDelete } from "./commands/profiles/delete";
import { profilesConnect } from "./commands/profiles/connect";
import { platforms, platformsPages } from "./commands/platforms";
import { postText } from "./commands/post/text";
import { postPhoto } from "./commands/post/photo";
import { postVideo } from "./commands/post/video";
import { postDocument } from "./commands/post/document";
import { statusCheck } from "./commands/status";
import { scheduleList } from "./commands/schedule/list";
import { scheduleCancel } from "./commands/schedule/cancel";
import { scheduleModify } from "./commands/schedule/modify";
import { queueSettings } from "./commands/queue/settings";
import { queuePreview } from "./commands/queue/preview";
import { queueNext } from "./commands/queue/next";
import { history } from "./commands/history";
import { analytics } from "./commands/analytics";
import { completions } from "./commands/completions";
import { createOutputFormatter } from "./lib/output";
import { PosterBoyError, suggestFix } from "./lib/errors";
import { suggestCommand } from "./lib/suggestions";
import type { GlobalFlags } from "./lib/types";

const HELP_TEXT = `posterboy - Social media posting CLI

USAGE:
  posterboy [global-options] <command> <subcommand> [flags]

GLOBAL OPTIONS:
  --json              Force JSON output
  --pretty            Force pretty output
  --config <path>     Override config file path
  --api-key <key>     Override API key
  --profile <name>    Override default profile
  --verbose           Show request/response details
  --version           Print version and exit
  --help              Print help and exit

COMMANDS:
  auth                Authentication and account management
    login             Store API key in config
    status            Show account info, plan, and usage

  profiles            Profile management
    list              List all connected profiles
    create            Create a new profile
    delete            Delete a profile
    connect           Generate JWT URL to connect social accounts

  post                Content posting
    text              Post text content
    photo             Post photo(s) / carousel
    video             Post video content
    document          Post document (LinkedIn only)

  schedule            Scheduled post management
    list              List all scheduled posts
    cancel            Cancel a scheduled post
    modify            Modify a scheduled post

  status              Check upload status
    <id>              Check status by job_id or request_id

  history             View upload history

  queue               Queue management
    settings          View or update queue configuration
    preview           Preview upcoming queue slots
    next              Get next available queue slot

  platforms           List connected platforms for a profile
    pages             List platform-specific pages/boards
      facebook        List Facebook pages
      linkedin        List LinkedIn pages
      pinterest       List Pinterest boards

  analytics           View profile analytics

  completions         Generate shell completions
    bash              Generate bash completion script
    zsh               Generate zsh completion script
    fish              Generate fish completion script

EXAMPLES:
  posterboy auth login --key up_xxxx
  posterboy auth status
  posterboy post text --body "Hello!" --platforms x,linkedin
  posterboy post photo --files photo.jpg --title "My photo" --platforms instagram
  posterboy history
  posterboy completions bash > /etc/bash_completion.d/posterboy
`;

async function main() {
  // Handle EPIPE errors (e.g., when piping to head)
  process.stdout.on("error", (err) => {
    const nodeErr = err as { code?: string };
    if (nodeErr.code === "EPIPE") {
      process.exit(0);
    }
  });

  const args = Bun.argv.slice(2);

  // Handle --version and --help at the top level
  if (args.includes("--version")) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args.includes("--help") || args.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  try {
    // Extract global flags manually from args before the command/subcommand.
    // parseArgs with strict:false treats ALL unknown flags as booleans,
    // which corrupts subcommand flags like --files, --body, --title etc.
    // Instead, we scan for known global flags and consume them, then pass
    // the rest (starting from command/subcommand) untouched to handlers.
    const globalFlags: GlobalFlags = {
      json: false,
      pretty: false,
      config: undefined,
      apiKey: undefined,
      profile: undefined,
      verbose: false,
    };

    const GLOBAL_BOOLEAN_FLAGS = new Set(["--json", "--pretty", "--verbose"]);
    const GLOBAL_STRING_FLAGS = new Set(["--config", "--api-key", "--profile"]);

    const filtered: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        if (arg === "--json") globalFlags.json = true;
        else if (arg === "--pretty") globalFlags.pretty = true;
        else if (arg === "--verbose") globalFlags.verbose = true;
      } else if (GLOBAL_STRING_FLAGS.has(arg) && i + 1 < args.length) {
        const val = args[++i]!;
        if (arg === "--config") globalFlags.config = val;
        else if (arg === "--api-key") globalFlags.apiKey = val;
        else if (arg === "--profile") globalFlags.profile = val;
      } else {
        filtered.push(arg);
      }
    }

    const [command, subcommand, ...remainingArgs] = filtered;

    // Route to command handlers
    switch (command) {
      case "auth":
        await handleAuthCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "profiles":
        await handleProfilesCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "platforms":
        await handlePlatformsCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "post":
        await handlePostCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "status":
        await handleStatusCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "schedule":
        await handleScheduleCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "queue":
        await handleQueueCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "history":
        await history(remainingArgs, globalFlags);
        break;

      case "analytics":
        await handleAnalyticsCommand(subcommand, remainingArgs, globalFlags);
        break;

      case "completions":
        await completions(remainingArgs, globalFlags);
        break;

      default: {
        const suggestion = suggestCommand(command);
        console.error(`Unknown command: ${command}`);
        if (suggestion) {
          console.error(`Did you mean '${suggestion}'?`);
        }
        console.error("Run 'posterboy --help' for usage information");
        process.exit(1);
      }
    }
  } catch (error) {
    await handleError(error);
  }
}

async function handleAuthCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy auth - Authentication and account management

SUBCOMMANDS:
  login         Store API key in config
  status        Show account info, plan, and usage

FLAGS:
  --key         API key (for login)
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  switch (subcommand) {
    case "login":
      await authLogin(args, globalFlags);
      break;

    case "status":
      await authStatus(args, globalFlags);
      break;

    default:
      console.error(`Unknown auth subcommand: ${subcommand}`);
      console.error("Available: login, status");
      process.exit(1);
      break;
  }
}

async function handleProfilesCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy profiles - Profile management

SUBCOMMANDS:
  list          List all connected profiles
  create        Create a new profile
  delete        Delete a profile
  connect       Generate JWT URL to connect social accounts

FLAGS:
  --username    Profile username (for create/delete/connect)
  --platforms   Target platforms for connection (for connect)
  --redirect    Redirect URL after auth (for connect)
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  switch (subcommand) {
    case "list":
      await profilesList(args, globalFlags);
      break;

    case "create":
      await profilesCreate(args, globalFlags);
      break;

    case "delete":
      await profilesDelete(args, globalFlags);
      break;

    case "connect":
      await profilesConnect(args, globalFlags);
      break;

    default:
      console.error(`Unknown profiles subcommand: ${subcommand}`);
      console.error("Available: list, create, delete, connect");
      process.exit(1);
      break;
  }
}

async function handlePlatformsCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // If no subcommand or help, show platform list or help
  if (!subcommand) {
    await platforms(args, globalFlags);
    return;
  }

  if (subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy platforms - List connected platforms

USAGE:
  posterboy platforms [--profile <name>]
  posterboy platforms pages <platform> [--profile <name>]

SUBCOMMANDS:
  pages         List platform-specific pages/boards
    facebook    List Facebook pages
    linkedin    List LinkedIn pages
    pinterest   List Pinterest boards

FLAGS:
  --profile     Profile to check platforms for
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  // Handle "pages" subcommand with platform-specific routing
  if (subcommand === "pages") {
    const [platformSubcmd, ...remainingArgs] = args;
    if (!platformSubcmd) {
      console.error("Platform required for pages command");
      console.error("Available: facebook, linkedin, pinterest");
      process.exit(1);
    }
    await platformsPages(platformSubcmd, remainingArgs, globalFlags);
    return;
  }

  console.error(`Unknown platforms subcommand: ${subcommand}`);
  console.error("Available: pages");
  process.exit(1);
}

async function handlePostCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy post - Content posting

SUBCOMMANDS:
  text          Post text content
  photo         Post photo(s) / carousel
  video         Post video content
  document      Post document (LinkedIn only)

FLAGS:
  --profile     Profile to post from
  --platforms   Target platforms (comma-separated)
  --schedule    ISO-8601 datetime for scheduling
  --queue       Add to next queue slot
  --dry-run     Preview without posting
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  switch (subcommand) {
    case "text":
      await postText(args, globalFlags);
      break;
    case "photo":
      await postPhoto(args, globalFlags);
      break;
    case "video":
      await postVideo(args, globalFlags);
      break;
    case "document":
      await postDocument(args, globalFlags);
      break;
    default:
      console.error(`Unknown post subcommand: ${subcommand}`);
      console.error("Available: text, photo, video, document");
      process.exit(1);
      break;
  }
}

async function handleStatusCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // The subcommand IS the ID for status
  const allArgs = subcommand ? [subcommand, ...args] : args;
  await statusCheck(allArgs, globalFlags);
}

async function handleScheduleCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy schedule - Scheduled post management

SUBCOMMANDS:
  list          List all scheduled posts
  cancel        Cancel a scheduled post
  modify        Modify a scheduled post

FLAGS:
  --profile     Filter by profile (for list)
  --id          Job ID (for cancel/modify)
  --schedule    New schedule time (for modify)
  --title       New title (for modify)
  --timezone    New timezone (for modify)
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  switch (subcommand) {
    case "list":
      await scheduleList(args, globalFlags);
      break;

    case "cancel":
      await scheduleCancel(args, globalFlags);
      break;

    case "modify":
      await scheduleModify(args, globalFlags);
      break;

    default:
      console.error(`Unknown schedule subcommand: ${subcommand}`);
      console.error("Available: list, cancel, modify");
      process.exit(1);
      break;
  }
}

async function handleQueueCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    console.log(`posterboy queue - Queue management

SUBCOMMANDS:
  settings      View or update queue configuration
  preview       Preview upcoming queue slots
  next          Get next available queue slot

FLAGS:
  --profile     Profile to manage queue for
  --count       Number of slots to preview (for preview)
  --enabled     Enable/disable queue (for settings)
  --times       Queue times (comma-separated, for settings)
  --timezone    Queue timezone (for settings)
  --json        Force JSON output
  --verbose     Show request/response details
`);
    return;
  }

  switch (subcommand) {
    case "settings":
      await queueSettings(args, globalFlags);
      break;

    case "preview":
      await queuePreview(args, globalFlags);
      break;

    case "next":
      await queueNext(args, globalFlags);
      break;

    default:
      console.error(`Unknown queue subcommand: ${subcommand}`);
      console.error("Available: settings, preview, next");
      process.exit(1);
      break;
  }
}

async function handleAnalyticsCommand(
  subcommand: string | undefined,
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // The subcommand IS the profile name for analytics (like status command)
  const allArgs = subcommand ? [subcommand, ...args] : args;
  await analytics(allArgs, globalFlags);
}

async function handleError(error: unknown): Promise<void> {
  const formatter = createOutputFormatter(false, false, true);

  if (error instanceof PosterBoyError) {
    formatter.error(error.message);
    const fix = suggestFix(error);
    if (fix) {
      console.error(`\nTip: ${fix}`);
    }
    process.exit(error.exitCode);
  } else if (error instanceof Error) {
    formatter.error(error.message);
    process.exit(1);
  } else {
    formatter.error("An unexpected error occurred");
    process.exit(1);
  }
}

main();
