#!/usr/bin/env bun

// posterboy - Main entry point

import { parseArgs } from "node:util";
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
import { createOutputFormatter } from "./lib/output";
import { PosterBoyError } from "./lib/errors";
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

EXAMPLES:
  posterboy auth login --key up_xxxx
  posterboy auth status
  posterboy post text --body "Hello!" --platforms x,linkedin
  posterboy post photo --files photo.jpg --title "My photo" --platforms instagram
  posterboy history
`;

async function main() {
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
    // Parse global flags
    const { values, positionals } = parseArgs({
      args,
      options: {
        json: { type: "boolean", default: false },
        pretty: { type: "boolean", default: false },
        config: { type: "string" },
        "api-key": { type: "string" },
        profile: { type: "string" },
        verbose: { type: "boolean", default: false },
        version: { type: "boolean" },
        help: { type: "boolean" },
      },
      strict: false,
      allowPositionals: true,
    });

    const globalFlags: GlobalFlags = {
      json: values.json as boolean,
      pretty: values.pretty as boolean,
      config: values.config as string | undefined,
      apiKey: values["api-key"] as string | undefined,
      profile: values.profile as string | undefined,
      verbose: values.verbose as boolean,
    };

    const [command, subcommand, ...remainingArgs] = positionals;

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
      case "analytics":
        console.error(`Command '${command}' not implemented yet`);
        process.exit(1);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'posterboy --help' for usage information");
        process.exit(1);
        break;
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
  // If no subcommand, show platform list
  if (!subcommand) {
    await platforms(args, globalFlags);
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

async function handleError(error: unknown): Promise<void> {
  const formatter = createOutputFormatter(false, false, true);

  if (error instanceof PosterBoyError) {
    formatter.error(error.message);
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
