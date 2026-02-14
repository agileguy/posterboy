#!/usr/bin/env bun

// posterboy - Main entry point

import { parseArgs } from "node:util";
import { VERSION } from "./constants";
import { authLogin } from "./commands/auth/login";
import { authStatus } from "./commands/auth/status";
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
      case "post":
      case "schedule":
      case "status":
      case "history":
      case "queue":
      case "platforms":
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
