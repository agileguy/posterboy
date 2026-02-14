# posterboy - Software Requirements Document

**Version:** 1.0.0
**Date:** 2026-02-13
**Status:** Draft
**Stack:** TypeScript + bun
**API:** Upload-Post.com (https://api.upload-post.com/api)

---

## Table of Contents

1. [Overview and Goals](#1-overview-and-goals)
2. [CLI Command Structure](#2-cli-command-structure)
3. [Detailed Feature Specifications](#3-detailed-feature-specifications)
4. [Configuration System](#4-configuration-system)
5. [Implementation Phases](#5-implementation-phases)
6. [Technical Architecture](#6-technical-architecture)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. Overview and Goals

### 1.1 Project Summary

**posterboy** is a production-quality TypeScript CLI tool that provides a single binary interface for posting content to 10 social media platforms via the Upload-Post.com API. It follows the deterministic CLI pattern: `parseArgs`, clear subcommands, JSON-first output, and no framework magic.

### 1.2 Business Objectives

- Provide a fast, scriptable CLI for social media posting from the terminal
- Support all 10 Upload-Post platforms: TikTok, Instagram, YouTube, LinkedIn, Facebook, X/Twitter, Threads, Pinterest, Reddit, Bluesky
- Enable automation pipelines (cron jobs, CI/CD, shell scripts) via JSON output
- Offer human-friendly pretty output for interactive use
- Minimize dependencies; ship as a single bun-executable entry point

### 1.3 Success Metrics

| Metric | Target |
|--------|--------|
| Platform coverage | All 10 platforms supported |
| Command response time (non-upload) | < 500ms for metadata commands |
| JSON output compliance | Every command produces valid JSON when `--json` is passed |
| Exit codes | 0 = success, 1 = user error, 2 = API error, 3 = network error |
| Test coverage | > 80% for command parsing and config logic |

### 1.4 Technical Stack

| Component | Choice | Justification |
|-----------|--------|---------------|
| Runtime | bun | Fast startup, native TypeScript, built-in test runner |
| Language | TypeScript (strict mode) | Type safety for API contracts |
| Arg parsing | `node:util` `parseArgs` | Zero-dependency, deterministic, follows llcli pattern |
| HTTP client | `upload-post` npm SDK | Official SDK with TypeScript types included |
| Config storage | `~/.posterboy/config.json` | Standard XDG-adjacent config location |
| Output formatting | Built-in (no chalk/ink) | ANSI escape codes directly, zero runtime deps for formatting |
| Testing | `bun test` | Built into runtime, fast, no extra tooling |

### 1.5 Supported Platforms

| Platform | Text | Photo | Video | Document | Scheduling | Analytics |
|----------|------|-------|-------|----------|------------|-----------|
| TikTok | - | Yes | Yes | - | Yes | Yes |
| Instagram | - | Yes | Yes | - | Yes | Yes |
| YouTube | - | - | Yes | - | Yes | Yes |
| LinkedIn | Yes | Yes | Yes | Yes | Yes | Yes |
| Facebook | Yes | Yes | Yes | - | Yes | Yes |
| X/Twitter | Yes | Yes | Yes | - | Yes | Yes |
| Threads | Yes | Yes | Yes | - | Yes | Yes |
| Pinterest | - | Yes | Yes | - | Yes | Yes |
| Reddit | Yes | Yes | Yes | - | Yes | Yes |
| Bluesky | Yes | Yes | Yes | - | Yes | Yes |

### 1.6 Free Tier Constraints

- 10 uploads per month
- 2 profiles maximum
- posterboy must display usage info after each upload so users can track remaining quota

---

## 2. CLI Command Structure

### 2.1 Command Tree

```
posterboy [global-options] <command> <subcommand> [flags]

GLOBAL OPTIONS:
  --json              Force JSON output (default for piped stdout)
  --pretty            Force pretty output (default for TTY stdout)
  --config <path>     Override config file path
  --api-key <key>     Override API key (takes precedence over config/env)
  --profile <name>    Override default profile
  --verbose           Show request/response details for debugging
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
    <job-id>          Check status by job_id or request_id

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
    <profile>         Analytics for a specific profile
```

### 2.2 Output Mode Detection

```
if (flags.json)          -> JSON output
else if (flags.pretty)   -> pretty output
else if (stdout is TTY)  -> pretty output
else                     -> JSON output
```

This ensures scripts piping posterboy output always get JSON, while interactive users get readable output.

### 2.3 Exit Code Convention

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | Post published successfully |
| 1 | User error | Missing required flag, invalid platform name |
| 2 | API error | Authentication failed, rate limit hit, platform rejection |
| 3 | Network error | Connection timeout, DNS failure |

---

## 3. Detailed Feature Specifications

### 3.1 `posterboy auth login`

Store the API key in the config file.

```
posterboy auth login --key <api-key>
posterboy auth login                    # Interactive: prompts for key
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--key` | string | No | (prompt) | Upload-Post API key |

**Behavior:**
1. If `--key` is provided, use it directly
2. If omitted, prompt: `Enter your Upload-Post API key:`
3. Validate the key by calling `GET /uploadposts/me`
4. On success, write to `~/.posterboy/config.json`
5. On failure, print error and exit 2

**JSON Output (success):**
```json
{
  "success": true,
  "email": "user@example.com",
  "plan": "free",
  "message": "API key saved to ~/.posterboy/config.json"
}
```

**Pretty Output (success):**
```
API key validated and saved.
  Account: user@example.com
  Plan:    free
  Config:  ~/.posterboy/config.json
```

**Errors:**
- Invalid API key -> exit 2, `{"success": false, "error": "Invalid API key"}`
- Network failure -> exit 3

---

### 3.2 `posterboy auth status`

Show account info and current usage.

```
posterboy auth status
```

**No flags.** Uses stored API key.

**API Call:** `GET /uploadposts/me`

**JSON Output:**
```json
{
  "email": "user@example.com",
  "plan": "free",
  "usage": {
    "count": 5,
    "limit": 10,
    "remaining": 5
  }
}
```

**Pretty Output:**
```
Account Status
  Email:     user@example.com
  Plan:      free
  Usage:     5 / 10 uploads this month (5 remaining)
```

---

### 3.3 `posterboy profiles list`

List all profiles under the account.

```
posterboy profiles list
```

**API Call:** `GET /uploadposts/users`

**JSON Output:**
```json
{
  "profiles": [
    {
      "username": "myprofile",
      "connected_platforms": ["instagram", "tiktok", "x"],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1,
  "limit": 2
}
```

**Pretty Output:**
```
Profiles (1 / 2 max)

  myprofile
    Platforms: instagram, tiktok, x
    Created:   2025-01-15
```

---

### 3.4 `posterboy profiles create`

Create a new profile.

```
posterboy profiles create --username <name>
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--username` | string | Yes | - | Unique profile identifier |

**API Call:** `POST /uploadposts/users` with `{ "username": "<name>" }`

**JSON Output:**
```json
{
  "success": true,
  "profile": {
    "username": "newprofile"
  }
}
```

**Errors:**
- Username already taken -> exit 2
- Profile limit reached -> exit 2

---

### 3.5 `posterboy profiles delete`

Delete a profile.

```
posterboy profiles delete --username <name>
posterboy profiles delete --username <name> --confirm
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--username` | string | Yes | - | Profile to delete |
| `--confirm` | boolean | No | false | Skip confirmation prompt |

**Behavior:**
1. Without `--confirm`, prompt: `Delete profile "name"? This removes all connected accounts. [y/N]`
2. On confirmation, call `DELETE /uploadposts/users` with `{ "username": "<name>" }`
3. If `--json` mode and no `--confirm`, exit 1 with error (no prompts in JSON mode)

---

### 3.6 `posterboy profiles connect`

Generate a JWT URL for connecting social media accounts to a profile.

```
posterboy profiles connect --username <name> [--platforms <list>] [--redirect <url>]
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--username` | string | Yes | - | Profile to connect accounts to |
| `--platforms` | string | No | all | Comma-separated platform list to show |
| `--redirect` | string | No | - | URL to redirect after connecting |

**API Call:** `POST /uploadposts/users/generate-jwt`

**JSON Output:**
```json
{
  "success": true,
  "access_url": "https://app.upload-post.com/connect?token=...",
  "expires_in": "48 hours"
}
```

**Pretty Output:**
```
Connect social accounts for "myprofile":

  https://app.upload-post.com/connect?token=...

  This link expires in 48 hours.
  Open it in your browser to connect your social media accounts.
```

---

### 3.7 `posterboy post text`

Post text content to one or more platforms.

```
posterboy post text --body <text> [flags]
posterboy post text --file <path> [flags]
cat message.txt | posterboy post text --stdin [flags]
```

**Core Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--body` | string | One of body/file/stdin | - | Text content inline |
| `--file` | string | One of body/file/stdin | - | Read text from file |
| `--stdin` | boolean | One of body/file/stdin | false | Read text from stdin |
| `--platforms` | string | No | config default | Comma-separated: `x,linkedin,threads` |
| `--profile` | string | No | config default | Profile username |
| `--schedule` | string | No | - | ISO-8601 datetime for scheduling |
| `--timezone` | string | No | system TZ | IANA timezone for schedule |
| `--queue` | boolean | No | false | Add to next queue slot |
| `--async` | boolean | No | false | Return immediately with request_id |
| `--first-comment` | string | No | - | Auto-post comment after publishing |
| `--dry-run` | boolean | No | false | Show what would be posted without posting |

**Platform-Specific Flags:**

| Flag | Platform | Type | Default | Description |
|------|----------|------|---------|-------------|
| `--x-title` | X | string | - | Override text for X |
| `--x-reply-to` | X | string | - | Tweet ID to reply to |
| `--x-reply-settings` | X | string | - | `following`, `mentionedUsers`, `subscribers`, `verified` |
| `--x-quote-tweet` | X | string | - | Tweet ID to quote |
| `--x-long-text-as-post` | X | boolean | false | Post as single tweet vs thread |
| `--x-poll-options` | X | string | - | Comma-separated poll options (2-4) |
| `--x-poll-duration` | X | number | - | Poll duration in minutes (5-10080) |
| `--linkedin-title` | LinkedIn | string | - | Override text for LinkedIn |
| `--linkedin-page` | LinkedIn | string | - | Organization ID for page posting |
| `--linkedin-visibility` | LinkedIn | string | PUBLIC | `PUBLIC`, `CONNECTIONS`, `LOGGED_IN` |
| `--facebook-title` | Facebook | string | - | Override text for Facebook |
| `--facebook-page` | Facebook | string | - | Facebook page ID (required for FB) |
| `--facebook-link` | Facebook | string | - | URL to attach to post |
| `--threads-title` | Threads | string | - | Override text for Threads |
| `--threads-long-text-as-post` | Threads | boolean | false | Post as single post vs thread |
| `--reddit-subreddit` | Reddit | string | - | Subreddit name (required for Reddit) |
| `--reddit-flair` | Reddit | string | - | Flair ID |
| `--bluesky-title` | Bluesky | string | - | Override text for Bluesky |
| `--bluesky-reply-to` | Bluesky | string | - | Post ID to reply to |

**Behavior:**
1. Resolve text content from `--body`, `--file`, or `--stdin` (exactly one required)
2. Resolve profile from `--profile` flag -> config default -> error
3. Resolve platforms from `--platforms` flag -> config default -> error
4. Validate that all specified platforms support text posting (x, linkedin, facebook, threads, reddit, bluesky)
5. If `--dry-run`, print the resolved request payload and exit 0
6. Call `POST /upload_text` with assembled parameters
7. Display results per-platform with success/failure details
8. Display usage summary

**Supported Platforms for Text:** x, linkedin, facebook, threads, reddit, bluesky

**Auto-Threading:**
- X: text > 280 chars is auto-threaded (split by paragraphs, then words)
- Threads: text > 500 chars is auto-threaded (unless `--threads-long-text-as-post`)
- Bluesky: text > 300 chars is auto-threaded

**JSON Output (success):**
```json
{
  "success": true,
  "results": {
    "x": {
      "success": true,
      "publish_id": "1234567890",
      "url": "https://x.com/user/status/1234567890"
    },
    "linkedin": {
      "success": true,
      "publish_id": "urn:li:share:7890",
      "url": "https://linkedin.com/feed/update/urn:li:share:7890"
    }
  },
  "usage": {
    "count": 6,
    "limit": 10,
    "remaining": 4
  }
}
```

**JSON Output (scheduled):**
```json
{
  "success": true,
  "scheduled": true,
  "job_id": "abc-123-def",
  "scheduled_date": "2026-03-01T14:00:00Z"
}
```

**Pretty Output (success):**
```
Posted to 2 platforms:

  x          https://x.com/user/status/1234567890
  linkedin   https://linkedin.com/feed/update/urn:li:share:7890

Usage: 6 / 10 (4 remaining)
```

---

### 3.8 `posterboy post photo`

Post photo(s) to one or more platforms.

```
posterboy post photo --files <path,...> --title <text> [flags]
posterboy post photo --urls <url,...> --title <text> [flags]
```

**Core Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--files` | string | One of files/urls | - | Comma-separated local file paths |
| `--urls` | string | One of files/urls | - | Comma-separated public image URLs |
| `--title` | string | Yes | - | Caption / post text |
| `--description` | string | No | - | Extended description (platform-dependent) |
| `--platforms` | string | No | config default | Target platforms |
| `--profile` | string | No | config default | Profile username |
| `--schedule` | string | No | - | ISO-8601 schedule datetime |
| `--timezone` | string | No | system TZ | IANA timezone |
| `--queue` | boolean | No | false | Add to queue |
| `--async` | boolean | No | false | Async upload |
| `--first-comment` | string | No | - | Auto first comment |
| `--dry-run` | boolean | No | false | Preview without posting |

**Platform-Specific Flags:**

| Flag | Platform | Type | Default | Description |
|------|----------|------|---------|-------------|
| `--instagram-title` | Instagram | string | - | Override caption |
| `--instagram-media-type` | Instagram | string | IMAGE | `IMAGE` or `STORIES` |
| `--instagram-collaborators` | Instagram | string | - | Comma-separated usernames |
| `--instagram-location` | Instagram | string | - | Location ID |
| `--instagram-user-tags` | Instagram | string | - | User tags |
| `--facebook-page` | Facebook | string | - | Page ID (required for FB) |
| `--facebook-media-type` | Facebook | string | POSTS | `POSTS` or `STORIES` |
| `--tiktok-title` | TikTok | string | - | Override caption |
| `--tiktok-privacy` | TikTok | string | PUBLIC_TO_EVERYONE | Privacy level |
| `--tiktok-disable-comments` | TikTok | boolean | false | Disable comments |
| `--tiktok-auto-music` | TikTok | boolean | false | Auto-add music |
| `--tiktok-cover-index` | TikTok | number | - | Cover photo index |
| `--x-title` | X | string | - | Override text |
| `--x-thread-image-layout` | X | string | - | Image distribution across tweets |
| `--linkedin-title` | LinkedIn | string | - | Override text |
| `--linkedin-page` | LinkedIn | string | - | Organization page ID |
| `--linkedin-visibility` | LinkedIn | string | PUBLIC | Visibility setting |
| `--threads-title` | Threads | string | - | Override text |
| `--pinterest-board` | Pinterest | string | - | Board ID (required for Pinterest) |
| `--pinterest-link` | Pinterest | string | - | Destination URL |
| `--pinterest-alt-text` | Pinterest | string | - | Accessibility text |
| `--reddit-subreddit` | Reddit | string | - | Subreddit (required for Reddit) |
| `--reddit-flair` | Reddit | string | - | Flair ID |
| `--bluesky-title` | Bluesky | string | - | Override text |

**Supported Platforms:** tiktok, instagram, linkedin, facebook, x, threads, pinterest, reddit, bluesky

**Carousel Support:**
- Multiple files/URLs create a carousel on platforms that support it (Instagram, Threads, X, TikTok, LinkedIn, Facebook)
- Instagram and Threads support mixed carousels (photos + videos in the same `--files` list)
- X allows max 4 images per tweet; more images auto-thread

**File Validation:**
- Supported formats: JPEG, PNG, GIF
- Max file size: 8MB per image (API limit)
- Validate locally before upload to provide fast feedback

---

### 3.9 `posterboy post video`

Post video to one or more platforms.

```
posterboy post video --file <path> --title <text> [flags]
posterboy post video --url <url> --title <text> [flags]
```

**Core Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--file` | string | One of file/url | - | Local video file path |
| `--url` | string | One of file/url | - | Public video URL |
| `--title` | string | Yes | - | Caption / post text |
| `--description` | string | No | - | Extended description |
| `--platforms` | string | No | config default | Target platforms |
| `--profile` | string | No | config default | Profile username |
| `--schedule` | string | No | - | ISO-8601 schedule datetime |
| `--timezone` | string | No | system TZ | IANA timezone |
| `--queue` | boolean | No | false | Add to queue |
| `--async` | boolean | No | false | Async upload (recommended for large files) |
| `--first-comment` | string | No | - | Auto first comment |
| `--dry-run` | boolean | No | false | Preview without posting |

**Platform-Specific Flags:**

| Flag | Platform | Type | Default | Description |
|------|----------|------|---------|-------------|
| `--tiktok-title` | TikTok | string | - | Override caption |
| `--tiktok-privacy` | TikTok | string | PUBLIC_TO_EVERYONE | `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` |
| `--tiktok-disable-duet` | TikTok | boolean | false | Disable duet |
| `--tiktok-disable-comment` | TikTok | boolean | false | Disable comments |
| `--tiktok-disable-stitch` | TikTok | boolean | false | Disable stitch |
| `--tiktok-post-mode` | TikTok | string | DIRECT_POST | `DIRECT_POST` or `MEDIA_UPLOAD` (draft) |
| `--tiktok-cover-timestamp` | TikTok | number | - | Cover frame in milliseconds |
| `--tiktok-brand-content` | TikTok | boolean | false | Brand content toggle |
| `--tiktok-brand-organic` | TikTok | boolean | false | Brand organic toggle |
| `--tiktok-aigc` | TikTok | boolean | false | AI-generated content flag |
| `--instagram-title` | Instagram | string | - | Override caption |
| `--instagram-media-type` | Instagram | string | REELS | `REELS` or `STORIES` |
| `--instagram-collaborators` | Instagram | string | - | Comma-separated usernames |
| `--instagram-cover-url` | Instagram | string | - | Custom cover image URL |
| `--instagram-share-to-feed` | Instagram | boolean | true | Share reel to feed |
| `--instagram-audio-name` | Instagram | string | - | Audio track name |
| `--instagram-thumb-offset` | Instagram | number | - | Thumbnail offset in ms |
| `--youtube-title` | YouTube | string | - | Override title |
| `--youtube-description` | YouTube | string | - | Override description |
| `--youtube-tags` | YouTube | string | - | Comma-separated tags |
| `--youtube-category` | YouTube | string | 22 | Category ID |
| `--youtube-privacy` | YouTube | string | public | `public`, `unlisted`, `private` |
| `--youtube-embeddable` | YouTube | boolean | true | Allow embedding |
| `--youtube-license` | YouTube | string | youtube | `youtube` or `creativeCommon` |
| `--youtube-kids` | YouTube | boolean | false | Made for kids |
| `--youtube-synthetic-media` | YouTube | boolean | false | Contains synthetic media |
| `--youtube-language` | YouTube | string | - | BCP-47 language code |
| `--youtube-thumbnail` | YouTube | string | - | Thumbnail file path or URL |
| `--youtube-recording-date` | YouTube | string | - | ISO-8601 recording date |
| `--linkedin-title` | LinkedIn | string | - | Override text |
| `--linkedin-description` | LinkedIn | string | - | Override description |
| `--linkedin-page` | LinkedIn | string | - | Organization page ID |
| `--linkedin-visibility` | LinkedIn | string | PUBLIC | Visibility setting |
| `--facebook-title` | Facebook | string | - | Override caption |
| `--facebook-description` | Facebook | string | - | Override description |
| `--facebook-page` | Facebook | string | - | Page ID (required for FB) |
| `--facebook-media-type` | Facebook | string | REELS | `REELS`, `STORIES`, `VIDEO` |
| `--facebook-thumbnail-url` | Facebook | string | - | Thumbnail URL (VIDEO type only) |
| `--x-title` | X | string | - | Override text |
| `--x-reply-settings` | X | string | - | Reply settings |
| `--threads-title` | Threads | string | - | Override text |
| `--pinterest-title` | Pinterest | string | - | Override text |
| `--pinterest-description` | Pinterest | string | - | Override description |
| `--pinterest-board` | Pinterest | string | - | Board ID (required for Pinterest) |
| `--pinterest-link` | Pinterest | string | - | Destination URL |
| `--pinterest-alt-text` | Pinterest | string | - | Accessibility text |
| `--reddit-title` | Reddit | string | - | Override title |
| `--reddit-subreddit` | Reddit | string | - | Subreddit (required for Reddit) |
| `--reddit-flair` | Reddit | string | - | Flair ID |
| `--bluesky-title` | Bluesky | string | - | Override text |

**Supported Platforms:** tiktok, instagram, youtube, linkedin, facebook, x, threads, pinterest, reddit, bluesky

**Supported Formats:** MP4, MOV, WebM, AVI (codec support: H.264, H.265, VP8, VP9, AV1)

**File Size Limits:**
- YouTube: up to 256GB
- Most platforms: up to 1GB
- Bluesky: 100MB per video, 10GB daily limit

**Upload Behavior:**
- Files > 50MB default to async upload (override with `--async=false`)
- Sync uploads that exceed 59 seconds auto-switch to async processing
- Async uploads return a `request_id` for status polling

---

### 3.10 `posterboy post document`

Post a document to LinkedIn.

```
posterboy post document --file <path> --title <text> [flags]
posterboy post document --url <url> --title <text> [flags]
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--file` | string | One of file/url | - | Local document path |
| `--url` | string | One of file/url | - | Public document URL |
| `--title` | string | Yes | - | Document title |
| `--description` | string | No | - | Post commentary text |
| `--profile` | string | No | config default | Profile username |
| `--linkedin-page` | string | No | - | Organization page ID |
| `--linkedin-visibility` | string | No | PUBLIC | `PUBLIC`, `CONNECTIONS`, `LOGGED_IN` |
| `--schedule` | string | No | - | ISO-8601 schedule datetime |
| `--timezone` | string | No | system TZ | IANA timezone |
| `--queue` | boolean | No | false | Add to queue |
| `--async` | boolean | No | false | Async upload |
| `--dry-run` | boolean | No | false | Preview without posting |

**Supported Formats:** PDF, PPT, PPTX, DOC, DOCX
**Max File Size:** 100MB
**Max Pages:** 300
**Platform:** LinkedIn only (the `--platforms` flag is not available; this command always targets LinkedIn)

---

### 3.11 `posterboy schedule list`

List all pending scheduled posts.

```
posterboy schedule list
```

**API Call:** `GET /uploadposts/schedule`

**JSON Output:**
```json
{
  "scheduled_posts": [
    {
      "job_id": "abc-123",
      "scheduled_date": "2026-03-01T14:00:00Z",
      "platforms": ["x", "linkedin"],
      "title": "Hello world",
      "content_type": "text",
      "profile": "myprofile"
    }
  ],
  "count": 1
}
```

**Pretty Output:**
```
Scheduled Posts (1)

  abc-123
    Date:      2026-03-01 14:00 UTC
    Platforms: x, linkedin
    Type:      text
    Title:     Hello world
    Profile:   myprofile
```

---

### 3.12 `posterboy schedule cancel`

Cancel a scheduled post.

```
posterboy schedule cancel --job-id <id>
posterboy schedule cancel --job-id <id> --confirm
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--job-id` | string | Yes | - | Scheduled post job ID |
| `--confirm` | boolean | No | false | Skip confirmation |

**API Call:** `DELETE /uploadposts/schedule/{job_id}`

---

### 3.13 `posterboy schedule modify`

Modify a scheduled post's date or content.

```
posterboy schedule modify --job-id <id> [--schedule <datetime>] [--title <text>]
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--job-id` | string | Yes | - | Scheduled post job ID |
| `--schedule` | string | No | - | New ISO-8601 datetime |
| `--title` | string | No | - | New post caption |
| `--timezone` | string | No | - | IANA timezone for new schedule |

**API Call:** `PATCH /uploadposts/schedule/{job_id}`

**Validation:** At least one of `--schedule` or `--title` must be provided.

---

### 3.14 `posterboy status`

Check the status of an async upload or scheduled post.

```
posterboy status <id>
posterboy status --request-id <id>
posterboy status --job-id <id>
posterboy status <id> --poll            # Poll until complete
posterboy status <id> --poll --interval 5
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| positional | string | Yes* | - | Auto-detect ID type |
| `--request-id` | string | No | - | Explicitly specify as request_id |
| `--job-id` | string | No | - | Explicitly specify as job_id |
| `--poll` | boolean | No | false | Poll until terminal state |
| `--interval` | number | No | 3 | Polling interval in seconds |

**API Call:** `GET /uploadposts/status` with `request_id` or `job_id` param

**Auto-Detection:** If just a positional ID is given, try `request_id` first, fall back to `job_id`.

**JSON Output:**
```json
{
  "status": "completed",
  "results": {
    "x": {
      "success": true,
      "publish_id": "1234567890",
      "url": "https://x.com/user/status/1234567890"
    }
  }
}
```

**Pretty Output:**
```
Upload Status: completed

  x         success  https://x.com/user/status/1234567890
```

**Polling Behavior:**
- When `--poll` is set, repeat the status check every `--interval` seconds
- Print a progress indicator (spinner or dots) between checks
- Exit when status reaches a terminal state (completed, failed, cancelled)
- Ctrl+C exits cleanly with the last known status

---

### 3.15 `posterboy history`

View upload history.

```
posterboy history
posterboy history --page 2 --limit 20
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--page` | number | No | 1 | Page number |
| `--limit` | number | No | 10 | Results per page |

**API Call:** `GET /uploadposts/history` with pagination params

**JSON Output:**
```json
{
  "history": [
    {
      "id": "upload-001",
      "date": "2026-02-10T12:00:00Z",
      "platforms": ["x", "linkedin"],
      "content_type": "text",
      "title": "Hello world",
      "status": "completed",
      "profile": "myprofile"
    }
  ],
  "page": 1,
  "total_pages": 3
}
```

**Pretty Output:**
```
Upload History (page 1 of 3)

  2026-02-10 12:00  text   x, linkedin  Hello world
  2026-02-09 09:30  video  tiktok       My cool video
  ...
```

---

### 3.16 `posterboy queue settings`

View or update queue configuration.

```
posterboy queue settings                                    # View current settings
posterboy queue settings --profile <name>                   # View for specific profile
posterboy queue settings --set-timezone "America/New_York"  # Update timezone
posterboy queue settings --set-slots '09:00,12:00,18:00'    # Update time slots
posterboy queue settings --set-days 'mon,tue,wed,thu,fri'   # Update active days
```

**Flags (View):**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--profile` | string | No | config default | Profile username |

**Flags (Update):**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--profile` | string | No | config default | Profile username |
| `--set-timezone` | string | No | - | IANA timezone |
| `--set-slots` | string | No | - | Comma-separated HH:MM time slots (max 24) |
| `--set-days` | string | No | - | Comma-separated day names (mon-sun) or numbers (0-6) |

**API Calls:**
- View: `GET /uploadposts/queue/settings`
- Update: `POST /uploadposts/queue/settings`

**JSON Output (view):**
```json
{
  "profile": "myprofile",
  "timezone": "America/New_York",
  "slots": ["09:00", "12:00", "18:00"],
  "days_of_week": ["mon", "tue", "wed", "thu", "fri"]
}
```

**Pretty Output (view):**
```
Queue Settings for "myprofile"

  Timezone: America/New_York
  Slots:    09:00, 12:00, 18:00
  Days:     Mon, Tue, Wed, Thu, Fri
```

---

### 3.17 `posterboy queue preview`

Preview upcoming queue slots.

```
posterboy queue preview
posterboy queue preview --count 20
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--profile` | string | No | config default | Profile username |
| `--count` | number | No | 10 | Number of slots to preview (max 50) |

**API Call:** `GET /uploadposts/queue/preview`

**JSON Output:**
```json
{
  "slots": [
    { "datetime": "2026-02-14T09:00:00-05:00", "available": true },
    { "datetime": "2026-02-14T12:00:00-05:00", "available": false },
    { "datetime": "2026-02-14T18:00:00-05:00", "available": true }
  ]
}
```

**Pretty Output:**
```
Upcoming Queue Slots

  2026-02-14  09:00 EST  available
  2026-02-14  12:00 EST  occupied
  2026-02-14  18:00 EST  available
```

---

### 3.18 `posterboy queue next`

Get the next available queue slot.

```
posterboy queue next
posterboy queue next --profile <name>
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--profile` | string | No | config default | Profile username |

**API Call:** `GET /uploadposts/queue/next-slot`

**JSON Output:**
```json
{
  "next_slot": "2026-02-14T09:00:00-05:00",
  "profile": "myprofile"
}
```

---

### 3.19 `posterboy platforms`

List connected platforms for the default or specified profile.

```
posterboy platforms
posterboy platforms --profile <name>
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--profile` | string | No | config default | Profile username |

**API Call:** `GET /uploadposts/users/{username}` (profile detail includes connected platforms)

**JSON Output:**
```json
{
  "profile": "myprofile",
  "platforms": [
    { "name": "instagram", "connected": true },
    { "name": "tiktok", "connected": true },
    { "name": "youtube", "connected": false },
    { "name": "linkedin", "connected": true },
    { "name": "facebook", "connected": false },
    { "name": "x", "connected": true },
    { "name": "threads", "connected": true },
    { "name": "pinterest", "connected": false },
    { "name": "reddit", "connected": false },
    { "name": "bluesky", "connected": true }
  ]
}
```

**Pretty Output:**
```
Connected Platforms for "myprofile"

  instagram   connected
  tiktok      connected
  youtube     -
  linkedin    connected
  facebook    -
  x           connected
  threads     connected
  pinterest   -
  reddit      -
  bluesky     connected
```

---

### 3.20 `posterboy platforms pages`

List platform-specific pages, boards, or entities.

```
posterboy platforms pages facebook [--profile <name>]
posterboy platforms pages linkedin [--profile <name>]
posterboy platforms pages pinterest [--profile <name>]
```

**Subcommands:**

| Subcommand | API Call | Returns |
|------------|----------|---------|
| `facebook` | `GET /uploadposts/facebook/pages` | Page IDs, names, categories |
| `linkedin` | `GET /uploadposts/linkedin/pages` | Organization URNs, names, logos |
| `pinterest` | `GET /uploadposts/pinterest/boards` | Board IDs, names |

**JSON Output (facebook example):**
```json
{
  "pages": [
    { "id": "123456", "name": "My Brand Page", "category": "Technology" }
  ]
}
```

---

### 3.21 `posterboy analytics`

View analytics for a profile.

```
posterboy analytics <profile>
posterboy analytics <profile> --platforms instagram,tiktok
posterboy analytics <profile> --facebook-page <id>
```

**Flags:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| positional | string | Yes | - | Profile username |
| `--platforms` | string | No | all connected | Comma-separated platform filter |
| `--facebook-page` | string | No | - | Facebook page ID (required for FB analytics) |
| `--linkedin-page` | string | No | - | LinkedIn organization URN |

**API Call:** `GET /analytics/{profile_username}`

**JSON Output:**
```json
{
  "profile": "myprofile",
  "analytics": {
    "instagram": {
      "followers": 1250,
      "impressions": 45000,
      "reach": 32000
    },
    "tiktok": {
      "followers": 5400,
      "views": 120000
    }
  }
}
```

**Pretty Output:**
```
Analytics for "myprofile"

  Instagram
    Followers:    1,250
    Impressions:  45,000
    Reach:        32,000

  TikTok
    Followers:    5,400
    Views:        120,000
```

---

## 4. Configuration System

### 4.1 Config File Location

**Primary:** `~/.posterboy/config.json`
**Override:** `--config <path>` global flag or `POSTERBOY_CONFIG` env var

### 4.2 Config File Schema

```json
{
  "$schema": "https://posterboy.dev/config-schema.json",
  "version": 1,
  "api_key": "up_xxxxxxxxxxxxxxxxxxxxxxxx",
  "default_profile": "myprofile",
  "default_platforms": ["x", "linkedin", "threads"],
  "default_timezone": "America/New_York",
  "output": {
    "format": "auto",
    "color": true
  },
  "platform_defaults": {
    "facebook": {
      "page_id": "123456789"
    },
    "linkedin": {
      "page_id": "org-123",
      "visibility": "PUBLIC"
    },
    "pinterest": {
      "board_id": "board-456"
    },
    "reddit": {
      "subreddit": "mysubreddit"
    },
    "youtube": {
      "privacy": "public",
      "category": "22"
    },
    "tiktok": {
      "privacy": "PUBLIC_TO_EVERYONE"
    }
  }
}
```

### 4.3 Config Schema Details

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | number | Yes | 1 | Config schema version for migrations |
| `api_key` | string | Yes | - | Upload-Post API key |
| `default_profile` | string | No | - | Default profile for all commands |
| `default_platforms` | string[] | No | [] | Default platforms for posting commands |
| `default_timezone` | string | No | system TZ | IANA timezone for scheduling |
| `output.format` | string | No | "auto" | `auto`, `json`, or `pretty` |
| `output.color` | boolean | No | true | Enable ANSI color output |
| `platform_defaults` | object | No | {} | Per-platform default values |

### 4.4 Environment Variable Overrides

Environment variables take precedence over config file values. Flag values take precedence over everything.

**Precedence Order (highest to lowest):**
1. CLI flags (`--api-key`, `--profile`, `--platforms`)
2. Environment variables (`POSTERBOY_*`)
3. Config file (`~/.posterboy/config.json`)
4. Built-in defaults

| Environment Variable | Overrides Config Field | Description |
|---------------------|----------------------|-------------|
| `POSTERBOY_API_KEY` | `api_key` | API key |
| `POSTERBOY_PROFILE` | `default_profile` | Default profile |
| `POSTERBOY_PLATFORMS` | `default_platforms` | Comma-separated default platforms |
| `POSTERBOY_TIMEZONE` | `default_timezone` | IANA timezone |
| `POSTERBOY_CONFIG` | (config path) | Path to config file |
| `POSTERBOY_OUTPUT` | `output.format` | `json` or `pretty` |
| `NO_COLOR` | `output.color` | Standard no-color env var (any value disables color) |

### 4.5 Config File Management

The config file is created automatically by `posterboy auth login`. posterboy never modifies the config file except through explicit commands (`auth login`). Users may edit it directly.

**Config Directory Creation:**
- On first `auth login`, create `~/.posterboy/` if it does not exist
- Set directory permissions to `0700` (user-only access)
- Set config file permissions to `0600` (user-only read/write)

### 4.6 Platform-Specific Defaults

The `platform_defaults` object allows users to set default values for platform-specific flags so they do not need to be repeated on every command.

Example: A user who always posts to the same Facebook page can set `platform_defaults.facebook.page_id` once and then omit `--facebook-page` from every `post` command.

Platform default fields map directly to the platform-specific CLI flags with the flag prefix removed:
- `--facebook-page` -> `platform_defaults.facebook.page_id`
- `--linkedin-visibility` -> `platform_defaults.linkedin.visibility`
- `--pinterest-board` -> `platform_defaults.pinterest.board_id`
- `--reddit-subreddit` -> `platform_defaults.reddit.subreddit`
- `--youtube-privacy` -> `platform_defaults.youtube.privacy`
- `--tiktok-privacy` -> `platform_defaults.tiktok.privacy`

---

## 5. Implementation Phases

### Phase 1: Foundation (Auth, Config, Account Info)

**Goal:** Establish project structure, config system, and basic authentication.

**Deliverables:**
- Project scaffolding (tsconfig, package.json, directory structure)
- Config system (read, write, validate, env var overrides)
- `posterboy auth login` - store and validate API key
- `posterboy auth status` - show account info and usage
- `posterboy --version` and `posterboy --help`
- Output formatting system (JSON and pretty, auto-detect TTY)
- Error handling framework (exit codes, structured errors)
- Unit tests for config and arg parsing

**Estimated Effort:** 2-3 days

---

### Phase 2: Profile Management and Text Posting

**Goal:** Profile CRUD and text posting with all platform-specific options.

**Deliverables:**
- `posterboy profiles list` - list profiles
- `posterboy profiles create` - create profile
- `posterboy profiles delete` - delete profile with confirmation
- `posterboy profiles connect` - generate JWT connection URL
- `posterboy post text` - text posting with all flags
- Platform validation (ensure target platforms support text)
- `--dry-run` support
- `--stdin` and `--file` input modes
- All X-specific flags (polls, quote tweets, reply settings, threads)
- All LinkedIn, Facebook, Threads, Reddit, Bluesky text flags
- `posterboy platforms` - list connected platforms
- `posterboy platforms pages facebook/linkedin/pinterest` - list pages/boards
- Integration tests with mocked API

**Estimated Effort:** 3-4 days

---

### Phase 3: Media Posting (Photo, Video, Document)

**Goal:** Full media upload support across all platforms.

**Deliverables:**
- `posterboy post photo` - photo/carousel posting with all flags
- `posterboy post video` - video posting with all flags
- `posterboy post document` - LinkedIn document posting
- Local file validation (format, size) before upload
- URL-based upload support
- Carousel/multi-image support
- Progress indication for large file uploads
- Auto-async for large files (> 50MB)
- All platform-specific media flags (TikTok privacy, YouTube categories, Instagram media types, etc.)
- `posterboy status <id>` - check upload status
- `posterboy status <id> --poll` - polling mode

**Estimated Effort:** 4-5 days

---

### Phase 4: Scheduling and Queue Management

**Goal:** Full scheduling and queue system support.

**Deliverables:**
- `--schedule` and `--timezone` flags on all `post` commands
- `--queue` flag on all `post` commands
- `posterboy schedule list` - list scheduled posts
- `posterboy schedule cancel` - cancel with confirmation
- `posterboy schedule modify` - update date/content
- `posterboy queue settings` - view and update queue config
- `posterboy queue preview` - preview upcoming slots
- `posterboy queue next` - get next available slot
- Timezone validation (IANA timezone names)
- Schedule date validation (must be future, max 365 days)
- Integration tests for scheduling flows

**Estimated Effort:** 2-3 days

---

### Phase 5: History, Analytics, and Polish

**Goal:** Complete feature set, polish, and production readiness.

**Deliverables:**
- `posterboy history` - paginated upload history
- `posterboy analytics <profile>` - cross-platform analytics
- Shell completion scripts (bash, zsh, fish)
- Man page or comprehensive `--help` for every command
- `--verbose` mode with request/response logging
- Performance optimization (lazy imports, minimal startup)
- End-to-end tests with real API (optional, gated by env var)
- Error message polish and user-friendly suggestions
- README.md with installation and usage examples
- `bun build` configuration for single-binary distribution
- Edge case handling (network timeouts, partial failures, rate limiting)

**Estimated Effort:** 3-4 days

---

### Phase Summary

| Phase | Focus | Duration | Cumulative |
|-------|-------|----------|------------|
| 1 | Foundation | 2-3 days | 2-3 days |
| 2 | Profiles + Text Posting | 3-4 days | 5-7 days |
| 3 | Media Posting | 4-5 days | 9-12 days |
| 4 | Scheduling + Queue | 2-3 days | 11-15 days |
| 5 | History + Analytics + Polish | 3-4 days | 14-19 days |

**Total Estimated Effort:** 14-19 development days

---

## 6. Technical Architecture

### 6.1 Project Structure

```
posterboy/
  docs/
    SRD.md                          # This document
  src/
    index.ts                        # Entry point: arg parsing, command routing
    commands/
      auth/
        login.ts                    # posterboy auth login
        status.ts                   # posterboy auth status
      profiles/
        list.ts                     # posterboy profiles list
        create.ts                   # posterboy profiles create
        delete.ts                   # posterboy profiles delete
        connect.ts                  # posterboy profiles connect
      post/
        text.ts                     # posterboy post text
        photo.ts                    # posterboy post photo
        video.ts                    # posterboy post video
        document.ts                 # posterboy post document
      schedule/
        list.ts                     # posterboy schedule list
        cancel.ts                   # posterboy schedule cancel
        modify.ts                   # posterboy schedule modify
      queue/
        settings.ts                 # posterboy queue settings
        preview.ts                  # posterboy queue preview
        next.ts                     # posterboy queue next
      status.ts                     # posterboy status <id>
      history.ts                    # posterboy history
      platforms.ts                  # posterboy platforms
      analytics.ts                  # posterboy analytics <profile>
    lib/
      config.ts                     # Config read/write/validate
      api.ts                        # API client wrapper around upload-post SDK
      output.ts                     # JSON/pretty output formatting
      errors.ts                     # Error types and handling
      validation.ts                 # Input validation helpers
      platforms.ts                  # Platform constants and capability maps
      types.ts                      # Shared TypeScript types
    constants.ts                    # Version, config paths, platform lists
  tests/
    commands/
      auth.test.ts
      profiles.test.ts
      post-text.test.ts
      post-photo.test.ts
      post-video.test.ts
      post-document.test.ts
      schedule.test.ts
      queue.test.ts
      status.test.ts
      history.test.ts
      platforms.test.ts
      analytics.test.ts
    lib/
      config.test.ts
      api.test.ts
      output.test.ts
      validation.test.ts
  package.json
  tsconfig.json
  bunfig.toml
  .gitignore
```

### 6.2 Dependencies

| Package | Purpose | Type |
|---------|---------|------|
| `upload-post` | Official Upload-Post SDK with TypeScript types | runtime |
| (none) | Arg parsing uses `node:util` parseArgs | built-in |
| (none) | File I/O uses `node:fs` / `Bun.file()` | built-in |
| (none) | Path manipulation uses `node:path` | built-in |

**Zero extra runtime dependencies.** The `upload-post` SDK is the only external package. Everything else uses bun built-ins and Node.js standard library.

**Dev Dependencies:**

| Package | Purpose |
|---------|---------|
| `@types/bun` | Bun type definitions |
| `typescript` | TypeScript compiler (for type checking only; bun runs .ts directly) |

### 6.3 Entry Point Pattern

The entry point (`src/index.ts`) follows the llcli/deterministic pattern observed in macpim:

```typescript
#!/usr/bin/env bun

import { parseArgs } from "util";

// 1. Extract the command and subcommand from argv
const args = Bun.argv.slice(2);
const command = args[0];
const subcommand = args[1];

// 2. Route to the correct handler
// 3. Each handler does its own parseArgs on the remaining args
// 4. Each handler returns a result object
// 5. The result is formatted as JSON or pretty based on output mode
// 6. Process exits with appropriate code
```

**Key Principles:**
- No framework (no commander, no yargs, no oclif)
- Each command handler is a pure async function that takes parsed args and returns a typed result
- Output formatting is a separate concern from command logic
- All errors are caught at the top level and formatted consistently

### 6.4 API Client Architecture

The API client (`src/lib/api.ts`) wraps the `upload-post` SDK to provide:

```typescript
interface ApiClient {
  // Auth
  me(): Promise<AccountInfo>;

  // Profiles
  listUsers(): Promise<Profile[]>;
  createUser(username: string): Promise<Profile>;
  deleteUser(username: string): Promise<void>;
  generateJwt(username: string, opts?: JwtOptions): Promise<JwtResult>;

  // Posting
  postText(params: TextPostParams): Promise<PostResult>;
  postPhotos(params: PhotoPostParams): Promise<PostResult>;
  postVideo(params: VideoPostParams): Promise<PostResult>;
  postDocument(params: DocumentPostParams): Promise<PostResult>;

  // Status & History
  getStatus(id: string, type?: 'request' | 'job'): Promise<StatusResult>;
  getHistory(page?: number, limit?: number): Promise<HistoryResult>;

  // Scheduling
  listScheduled(): Promise<ScheduledPost[]>;
  cancelScheduled(jobId: string): Promise<void>;
  modifyScheduled(jobId: string, updates: ScheduleUpdate): Promise<void>;

  // Queue
  getQueueSettings(profile?: string): Promise<QueueSettings>;
  updateQueueSettings(params: QueueSettingsUpdate): Promise<QueueSettings>;
  previewQueue(profile?: string, count?: number): Promise<QueueSlot[]>;
  nextSlot(profile?: string): Promise<QueueSlot>;

  // Platforms
  facebookPages(profile?: string): Promise<FacebookPage[]>;
  linkedinPages(profile?: string): Promise<LinkedInPage[]>;
  pinterestBoards(profile?: string): Promise<PinterestBoard[]>;

  // Analytics
  analytics(profile: string, platforms?: string[], opts?: AnalyticsOpts): Promise<Analytics>;
}
```

**Implementation Notes:**
- The client accepts a config object (API key, base URL) at construction
- All methods throw typed errors (`ApiError`, `AuthError`, `RateLimitError`, `NetworkError`)
- The client handles multipart form data construction for file uploads
- The client does NOT handle output formatting - it returns typed objects

### 6.5 Output System

The output system (`src/lib/output.ts`) provides two formatters:

```typescript
interface OutputFormatter {
  // Determine output mode
  mode(): 'json' | 'pretty';

  // JSON output: always valid JSON to stdout
  json(data: unknown): void;

  // Pretty output: formatted with ANSI colors to stdout
  pretty(lines: string[]): void;

  // Error output: always to stderr
  error(message: string, details?: unknown): void;

  // Usage tracking: appended after successful post commands
  usage(count: number, limit: number): void;

  // Table formatting for list commands
  table(headers: string[], rows: string[][]): void;
}
```

**ANSI Color Codes (no dependencies):**

| Element | Code | Usage |
|---------|------|-------|
| Bold | `\x1b[1m` | Headers, labels |
| Cyan | `\x1b[36m` | Section titles |
| Yellow | `\x1b[33m` | Warnings, secondary info |
| Green | `\x1b[32m` | Success indicators |
| Red | `\x1b[31m` | Errors |
| Gray | `\x1b[90m` | Muted/secondary text |
| Reset | `\x1b[0m` | Reset formatting |

**NO_COLOR Support:** If `NO_COLOR` env var is set or `output.color` is false in config, all ANSI codes are stripped.

### 6.6 Error Handling Strategy

**Error Type Hierarchy:**

```typescript
class PosterBoyError extends Error {
  exitCode: number;
  json(): { success: false; error: string; code: string };
}

class UserError extends PosterBoyError {
  exitCode = 1;  // Missing args, invalid input, bad config
}

class ApiError extends PosterBoyError {
  exitCode = 2;  // API returned error (401, 403, 404, 429, 500)
  statusCode: number;
  apiMessage: string;
}

class NetworkError extends PosterBoyError {
  exitCode = 3;  // Connection refused, timeout, DNS failure
}
```

**Error Handling Flow:**
1. Command handlers throw typed errors
2. Top-level catch in `main()` catches all errors
3. Error is formatted according to output mode (JSON or pretty)
4. Process exits with the appropriate exit code

**Rate Limit Handling:**
When a 429 is received, the error includes usage data:
```json
{
  "success": false,
  "error": "Upload limit reached (10/10). Resets on 2026-03-01.",
  "code": "RATE_LIMIT",
  "usage": { "count": 10, "limit": 10, "remaining": 0 }
}
```

**Partial Failure Handling:**
When posting to multiple platforms and some succeed while others fail:
- Exit code is 0 if at least one platform succeeded
- The response includes per-platform results with individual success/failure
- In pretty mode, failures are highlighted in red

### 6.7 Testing Approach

**Test Layers:**

| Layer | Tool | Coverage Target | Description |
|-------|------|-----------------|-------------|
| Unit | `bun test` | > 90% | Config parsing, arg validation, output formatting, platform maps |
| Integration | `bun test` | > 70% | Command handlers with mocked API client |
| E2E (optional) | `bun test` | manual | Real API calls gated by `POSTERBOY_TEST_API_KEY` env var |

**Mocking Strategy:**
- The API client is injected into command handlers (dependency injection)
- Tests provide a mock API client that returns canned responses
- No network calls in unit or integration tests
- File system operations use temporary directories

**Test File Structure:**
- Each command has a corresponding test file
- Tests cover: valid input, missing required flags, invalid values, API errors, partial failures
- Output tests verify both JSON and pretty formats

### 6.8 Build and Distribution

```bash
# Development (runs TypeScript directly)
bun run src/index.ts auth status

# Build single executable
bun build src/index.ts --compile --outfile posterboy

# Install globally (development)
bun link

# Run tests
bun test

# Type check only (no emit)
bunx tsc --noEmit
```

**package.json bin entry:**
```json
{
  "name": "posterboy",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "posterboy": "src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --outfile posterboy",
    "test": "bun test",
    "typecheck": "bunx tsc --noEmit"
  }
}
```

### 6.9 Platform Capability Map

A static map defines which content types each platform supports, used for validation:

```typescript
const PLATFORM_CAPABILITIES = {
  tiktok:    { text: false, photo: true,  video: true,  document: false },
  instagram: { text: false, photo: true,  video: true,  document: false },
  youtube:   { text: false, photo: false, video: true,  document: false },
  linkedin:  { text: true,  photo: true,  video: true,  document: true  },
  facebook:  { text: true,  photo: true,  video: true,  document: false },
  x:         { text: true,  photo: true,  video: true,  document: false },
  threads:   { text: true,  photo: true,  video: true,  document: false },
  pinterest: { text: false, photo: true,  video: true,  document: false },
  reddit:    { text: true,  photo: true,  video: true,  document: false },
  bluesky:   { text: true,  photo: true,  video: true,  document: false },
} as const;

const ALL_PLATFORMS = Object.keys(PLATFORM_CAPABILITIES);
```

When a user attempts to post text to Instagram, posterboy validates against this map and exits with a clear error:
```
Error: Instagram does not support text-only posts.
Supported platforms for text: x, linkedin, facebook, threads, reddit, bluesky
```

### 6.10 Platform-Specific Required Fields

Some platforms require additional fields that must be validated before the API call:

| Platform | Content Type | Required Field | Flag |
|----------|-------------|----------------|------|
| Facebook | All | `page_id` | `--facebook-page` |
| Pinterest | Photo/Video | `board_id` | `--pinterest-board` |
| Reddit | All | `subreddit` | `--reddit-subreddit` |

These are validated before the API call. If missing, posterboy checks config `platform_defaults` first, then errors with a helpful message:

```
Error: Reddit requires --reddit-subreddit flag.
Tip: Set a default in ~/.posterboy/config.json:
  "platform_defaults": { "reddit": { "subreddit": "yoursubreddit" } }
```

---

## 7. Implementation Checklist

### Phase 1: Foundation

**Project Setup:**
- [ ] Initialize git repository
- [ ] Create `package.json` with bun scripts and bin entry
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `bunfig.toml` if needed
- [ ] Create `.gitignore` (node_modules, dist, .posterboy test configs)
- [ ] Create directory structure (`src/`, `src/commands/`, `src/lib/`, `tests/`)
- [ ] Install `upload-post` SDK: `bun add upload-post`
- [ ] Install dev deps: `bun add -d @types/bun typescript`

**Constants and Types:**
- [ ] Create `src/constants.ts` with version, config paths, platform lists
- [ ] Create `src/lib/types.ts` with shared TypeScript interfaces
- [ ] Create `src/lib/platforms.ts` with platform capability map and validation

**Config System:**
- [ ] Create `src/lib/config.ts`
- [ ] Implement config file reading from `~/.posterboy/config.json`
- [ ] Implement config file writing with proper permissions (0700/0600)
- [ ] Implement config schema validation
- [ ] Implement environment variable overrides (POSTERBOY_*)
- [ ] Implement config value resolution (flags > env > config > defaults)
- [ ] Write unit tests for config reading, writing, validation, env overrides

**Output System:**
- [ ] Create `src/lib/output.ts`
- [ ] Implement TTY detection for auto format selection
- [ ] Implement JSON formatter (always valid JSON to stdout)
- [ ] Implement pretty formatter with ANSI colors
- [ ] Implement NO_COLOR support
- [ ] Implement error output to stderr
- [ ] Implement usage display helper
- [ ] Write unit tests for both output modes

**Error Handling:**
- [ ] Create `src/lib/errors.ts`
- [ ] Implement PosterBoyError base class with exit codes
- [ ] Implement UserError (exit 1)
- [ ] Implement ApiError (exit 2) with status code and API message
- [ ] Implement NetworkError (exit 3)
- [ ] Implement error formatting for JSON and pretty modes
- [ ] Write unit tests for error formatting

**Entry Point:**
- [ ] Create `src/index.ts` with parseArgs-based command routing
- [ ] Implement global flag parsing (--json, --pretty, --config, --api-key, --profile, --verbose, --version, --help)
- [ ] Implement command routing (auth, profiles, post, schedule, status, history, queue, platforms, analytics)
- [ ] Implement top-level error catching and exit code handling
- [ ] Implement --help output with full command tree
- [ ] Implement --version output

**Auth Commands:**
- [ ] Create `src/commands/auth/login.ts`
- [ ] Implement `auth login --key <key>` (direct key input)
- [ ] Implement `auth login` interactive prompt (TTY only)
- [ ] Implement API key validation via GET /uploadposts/me
- [ ] Implement config file creation on first login
- [ ] Create `src/commands/auth/status.ts`
- [ ] Implement `auth status` with account info and usage display
- [ ] Write tests for auth login (valid key, invalid key, network error)
- [ ] Write tests for auth status

**Verification:**
- [ ] `posterboy --version` prints version
- [ ] `posterboy --help` prints full help
- [ ] `posterboy auth login --key <valid-key>` creates config and validates
- [ ] `posterboy auth login --key <invalid-key>` shows error, exits 2
- [ ] `posterboy auth status` shows account info
- [ ] `posterboy auth status --json` outputs valid JSON
- [ ] Config file has correct permissions
- [ ] Env var POSTERBOY_API_KEY overrides config

---

### Phase 2: Profiles and Text Posting

**Profile Commands:**
- [ ] Create `src/commands/profiles/list.ts`
- [ ] Implement profile listing with JSON and pretty output
- [ ] Create `src/commands/profiles/create.ts`
- [ ] Implement profile creation with username validation
- [ ] Create `src/commands/profiles/delete.ts`
- [ ] Implement profile deletion with confirmation prompt
- [ ] Implement `--confirm` flag for non-interactive deletion
- [ ] Implement JSON mode restriction (no prompts in JSON mode)
- [ ] Create `src/commands/profiles/connect.ts`
- [ ] Implement JWT URL generation for social account linking
- [ ] Write tests for all profile commands

**Platform Discovery:**
- [ ] Create `src/commands/platforms.ts`
- [ ] Implement connected platform listing
- [ ] Implement `platforms pages facebook` subcommand
- [ ] Implement `platforms pages linkedin` subcommand
- [ ] Implement `platforms pages pinterest` subcommand
- [ ] Write tests for platform commands

**API Client:**
- [ ] Create `src/lib/api.ts`
- [ ] Implement API client constructor with config injection
- [ ] Implement auth header construction
- [ ] Implement `me()` method
- [ ] Implement `listUsers()`, `createUser()`, `deleteUser()` methods
- [ ] Implement `generateJwt()` method
- [ ] Implement `postText()` method with full parameter mapping
- [ ] Implement `facebookPages()`, `linkedinPages()`, `pinterestBoards()` methods
- [ ] Implement error response parsing and typed error throwing
- [ ] Write tests with mocked HTTP responses

**Text Posting:**
- [ ] Create `src/commands/post/text.ts`
- [ ] Implement `--body` flag (inline text)
- [ ] Implement `--file` flag (read from file)
- [ ] Implement `--stdin` flag (read from stdin pipe)
- [ ] Implement mutual exclusivity validation (exactly one input mode)
- [ ] Implement platform validation (only text-capable platforms)
- [ ] Implement platform-required field validation (facebook-page, reddit-subreddit)
- [ ] Implement `--dry-run` mode
- [ ] Implement all X-specific flags (polls, quote tweets, reply settings, long text)
- [ ] Implement all LinkedIn-specific flags (page, visibility)
- [ ] Implement all Facebook-specific flags (page, link)
- [ ] Implement all Threads-specific flags (long text as post)
- [ ] Implement all Reddit-specific flags (subreddit, flair)
- [ ] Implement all Bluesky-specific flags (reply to)
- [ ] Implement per-platform title override flags
- [ ] Implement `--first-comment` flag
- [ ] Implement result display with per-platform success/failure
- [ ] Implement usage display after successful post
- [ ] Write tests for text posting (all input modes, all platforms, all flags)
- [ ] Write tests for validation errors (wrong platform, missing required fields)
- [ ] Write tests for partial failures

**Input Validation:**
- [ ] Create `src/lib/validation.ts`
- [ ] Implement platform name validation
- [ ] Implement ISO-8601 date validation
- [ ] Implement IANA timezone validation
- [ ] Implement file existence and readability checks
- [ ] Implement file format validation helpers
- [ ] Write tests for all validators

**Verification:**
- [ ] `posterboy profiles list` shows profiles
- [ ] `posterboy profiles create --username test` creates a profile
- [ ] `posterboy profiles delete --username test --confirm` deletes
- [ ] `posterboy profiles connect --username test` shows JWT URL
- [ ] `posterboy post text --body "hello" --platforms x` posts to X
- [ ] `posterboy post text --file message.txt --platforms x,linkedin` posts from file
- [ ] `echo "hello" | posterboy post text --stdin --platforms x` posts from stdin
- [ ] `posterboy post text --body "hello" --platforms instagram` shows platform error
- [ ] `posterboy post text --body "hello" --platforms reddit` shows subreddit error
- [ ] `posterboy post text --body "hello" --dry-run --platforms x` shows payload
- [ ] `posterboy platforms` lists connected platforms
- [ ] `posterboy platforms pages facebook` lists Facebook pages

---

### Phase 3: Media Posting

**Photo Posting:**
- [ ] Create `src/commands/post/photo.ts`
- [ ] Implement `--files` flag (local file paths, comma-separated)
- [ ] Implement `--urls` flag (public URLs, comma-separated)
- [ ] Implement local file validation (format: JPEG/PNG/GIF, size: <8MB)
- [ ] Implement carousel support (multiple files)
- [ ] Implement all Instagram-specific photo flags
- [ ] Implement all Facebook-specific photo flags
- [ ] Implement all TikTok-specific photo flags
- [ ] Implement all X-specific photo flags (thread image layout)
- [ ] Implement all LinkedIn-specific photo flags
- [ ] Implement all Threads-specific photo flags
- [ ] Implement all Pinterest-specific photo flags
- [ ] Implement all Reddit-specific photo flags
- [ ] Implement all Bluesky-specific photo flags
- [ ] Implement `--dry-run` mode
- [ ] Write tests for photo posting (single, carousel, all platforms)
- [ ] Write tests for file validation errors

**Video Posting:**
- [ ] Create `src/commands/post/video.ts`
- [ ] Implement `--file` flag (local video path)
- [ ] Implement `--url` flag (public video URL)
- [ ] Implement local file validation (format: MP4/MOV/WebM/AVI)
- [ ] Implement auto-async for files > 50MB
- [ ] Implement all TikTok-specific video flags (privacy, duet, stitch, cover, brand, aigc)
- [ ] Implement all Instagram-specific video flags (media type, collaborators, cover, share to feed)
- [ ] Implement all YouTube-specific video flags (tags, category, privacy, thumbnail, kids, language)
- [ ] Implement all LinkedIn-specific video flags (page, visibility)
- [ ] Implement all Facebook-specific video flags (page, media type, thumbnail)
- [ ] Implement all X-specific video flags (reply settings)
- [ ] Implement all Threads-specific video flags
- [ ] Implement all Pinterest-specific video flags (board, link, alt text)
- [ ] Implement all Reddit-specific video flags (subreddit, flair)
- [ ] Implement all Bluesky-specific video flags
- [ ] Implement `--dry-run` mode
- [ ] Implement progress indication for large uploads (TTY only)
- [ ] Write tests for video posting (all platforms, all flags)
- [ ] Write tests for auto-async behavior

**Document Posting:**
- [ ] Create `src/commands/post/document.ts`
- [ ] Implement `--file` flag
- [ ] Implement `--url` flag
- [ ] Implement file validation (PDF/PPT/PPTX/DOC/DOCX, <100MB, <300 pages)
- [ ] Hardcode platform to LinkedIn only (no --platforms flag)
- [ ] Implement all LinkedIn document flags (page, visibility)
- [ ] Implement `--dry-run` mode
- [ ] Write tests for document posting

**API Client Extensions:**
- [ ] Implement `postPhotos()` method with multipart form data
- [ ] Implement `postVideo()` method with multipart form data
- [ ] Implement `postDocument()` method with multipart form data
- [ ] Implement `getStatus()` method with request_id/job_id support
- [ ] Implement file upload progress tracking

**Status Command:**
- [ ] Create `src/commands/status.ts`
- [ ] Implement positional ID argument with auto-detection
- [ ] Implement `--request-id` and `--job-id` explicit flags
- [ ] Implement `--poll` mode with configurable interval
- [ ] Implement progress indicator during polling
- [ ] Implement clean Ctrl+C handling during polling
- [ ] Write tests for status command (all ID types, polling)

**Verification:**
- [ ] `posterboy post photo --files photo.jpg --title "test" --platforms instagram` posts photo
- [ ] `posterboy post photo --files a.jpg,b.jpg,c.jpg --title "carousel" --platforms instagram` posts carousel
- [ ] `posterboy post video --file video.mp4 --title "test" --platforms tiktok,youtube` posts video
- [ ] `posterboy post video --file large.mp4 --title "test" --platforms youtube` auto-uses async
- [ ] `posterboy post document --file doc.pdf --title "test"` posts to LinkedIn
- [ ] `posterboy status abc-123` shows upload status
- [ ] `posterboy status abc-123 --poll` polls until complete

---

### Phase 4: Scheduling and Queue

**Scheduling Flags on Post Commands:**
- [ ] Add `--schedule` flag to all post commands (text, photo, video, document)
- [ ] Add `--timezone` flag to all post commands
- [ ] Add `--queue` flag to all post commands
- [ ] Implement schedule date validation (future, max 365 days)
- [ ] Implement timezone validation (valid IANA name)
- [ ] Implement queue vs schedule mutual exclusivity
- [ ] Handle 202 Accepted responses (scheduled)
- [ ] Display job_id and scheduled_date on successful scheduling

**Schedule Management:**
- [ ] Create `src/commands/schedule/list.ts`
- [ ] Implement scheduled post listing with JSON and pretty output
- [ ] Create `src/commands/schedule/cancel.ts`
- [ ] Implement cancellation with confirmation prompt
- [ ] Implement `--confirm` flag
- [ ] Create `src/commands/schedule/modify.ts`
- [ ] Implement date and title modification
- [ ] Implement validation (at least one update field required)
- [ ] Write tests for all schedule commands

**Queue Management:**
- [ ] Create `src/commands/queue/settings.ts`
- [ ] Implement queue settings view
- [ ] Implement queue settings update (timezone, slots, days)
- [ ] Implement slot parsing (HH:MM format)
- [ ] Implement day parsing (mon-sun names or 0-6 numbers)
- [ ] Create `src/commands/queue/preview.ts`
- [ ] Implement queue preview with availability status
- [ ] Create `src/commands/queue/next.ts`
- [ ] Implement next slot retrieval
- [ ] Write tests for all queue commands

**API Client Extensions:**
- [ ] Implement `listScheduled()` method
- [ ] Implement `cancelScheduled()` method
- [ ] Implement `modifyScheduled()` method
- [ ] Implement `getQueueSettings()` method
- [ ] Implement `updateQueueSettings()` method
- [ ] Implement `previewQueue()` method
- [ ] Implement `nextSlot()` method

**Verification:**
- [ ] `posterboy post text --body "hello" --schedule "2026-03-01T14:00:00" --timezone America/New_York --platforms x` schedules
- [ ] `posterboy post text --body "hello" --queue --platforms x` adds to queue
- [ ] `posterboy schedule list` shows scheduled posts
- [ ] `posterboy schedule cancel --job-id abc-123 --confirm` cancels
- [ ] `posterboy schedule modify --job-id abc-123 --schedule "2026-03-02T14:00:00"` modifies
- [ ] `posterboy queue settings` shows current settings
- [ ] `posterboy queue settings --set-slots "09:00,12:00,18:00"` updates slots
- [ ] `posterboy queue preview` shows upcoming slots
- [ ] `posterboy queue next` shows next available slot

---

### Phase 5: History, Analytics, and Polish

**History Command:**
- [ ] Create `src/commands/history.ts`
- [ ] Implement paginated history display
- [ ] Implement `--page` and `--limit` flags
- [ ] Implement JSON and pretty output
- [ ] Write tests for history command

**Analytics Command:**
- [ ] Create `src/commands/analytics.ts`
- [ ] Implement analytics retrieval with platform filtering
- [ ] Implement `--facebook-page` and `--linkedin-page` flags
- [ ] Implement JSON and pretty output
- [ ] Write tests for analytics command

**API Client Extensions:**
- [ ] Implement `getHistory()` method
- [ ] Implement `analytics()` method

**Verbose Mode:**
- [ ] Implement `--verbose` flag globally
- [ ] Log HTTP method, URL, and headers (redacted API key) to stderr
- [ ] Log request body (truncated for large files) to stderr
- [ ] Log response status, headers, and body to stderr
- [ ] Ensure verbose output goes to stderr (not stdout) so JSON piping works

**Shell Completions:**
- [ ] Generate bash completion script
- [ ] Generate zsh completion script
- [ ] Generate fish completion script
- [ ] Add `posterboy completions <shell>` command to output scripts
- [ ] Document installation in help text

**Performance:**
- [ ] Measure startup time (target: < 100ms for `--help`)
- [ ] Implement lazy command loading (only import the handler for the invoked command)
- [ ] Minimize top-level imports in index.ts

**Polish:**
- [ ] Review all error messages for clarity and actionability
- [ ] Add "Did you mean?" suggestions for mistyped commands
- [ ] Add helpful tips in error messages (config defaults, env vars)
- [ ] Ensure all commands have `--help` with examples
- [ ] Review JSON output consistency across all commands
- [ ] Review pretty output alignment and formatting
- [ ] Handle Ctrl+C gracefully in all interactive modes
- [ ] Handle broken pipe (EPIPE) gracefully when piped output is closed

**Build and Distribution:**
- [ ] Configure `bun build --compile` for single binary
- [ ] Test compiled binary on macOS (arm64 and x64)
- [ ] Test compiled binary on Linux (x64)
- [ ] Create installation instructions

**Edge Cases:**
- [ ] Handle empty API responses gracefully
- [ ] Handle network timeouts with retry suggestion
- [ ] Handle rate limiting with usage info and reset date
- [ ] Handle partial platform failures (some succeed, some fail)
- [ ] Handle interrupted uploads (Ctrl+C during upload)
- [ ] Handle invalid config file (corrupted JSON) with helpful error
- [ ] Handle missing config file (guide user to `auth login`)
- [ ] Handle expired JWT tokens with re-auth suggestion

**Documentation:**
- [ ] Write README.md with installation, quick start, and examples
- [ ] Add inline `--help` text for every command and subcommand
- [ ] Document all environment variables
- [ ] Document config file schema with examples
- [ ] Add examples section in help for common workflows

**Final Verification:**
- [ ] All commands produce valid JSON with `--json`
- [ ] All commands produce readable pretty output in TTY
- [ ] All exit codes follow convention (0/1/2/3)
- [ ] `NO_COLOR` disables all ANSI codes
- [ ] `POSTERBOY_API_KEY` env var works for all commands
- [ ] `--config` flag works for all commands
- [ ] `--profile` flag works for all applicable commands
- [ ] `--verbose` shows request/response details
- [ ] Compiled binary works without bun installed
- [ ] All tests pass: `bun test`
- [ ] Type check passes: `bunx tsc --noEmit`

---

## Appendix A: API Endpoint Reference

Quick reference mapping posterboy commands to Upload-Post API endpoints.

| posterboy Command | HTTP Method | API Endpoint |
|-------------------|------------|--------------|
| `auth status` | GET | `/uploadposts/me` |
| `profiles list` | GET | `/uploadposts/users` |
| `profiles create` | POST | `/uploadposts/users` |
| `profiles delete` | DELETE | `/uploadposts/users` |
| `profiles connect` | POST | `/uploadposts/users/generate-jwt` |
| `post text` | POST | `/upload_text` |
| `post photo` | POST | `/upload_photos` |
| `post video` | POST | `/upload_videos` |
| `post document` | POST | `/upload_document` |
| `schedule list` | GET | `/uploadposts/schedule` |
| `schedule cancel` | DELETE | `/uploadposts/schedule/{job_id}` |
| `schedule modify` | PATCH | `/uploadposts/schedule/{job_id}` |
| `status <id>` | GET | `/uploadposts/status` |
| `history` | GET | `/uploadposts/history` |
| `queue settings` (view) | GET | `/uploadposts/queue/settings` |
| `queue settings` (update) | POST | `/uploadposts/queue/settings` |
| `queue preview` | GET | `/uploadposts/queue/preview` |
| `queue next` | GET | `/uploadposts/queue/next-slot` |
| `platforms` | GET | `/uploadposts/users/{username}` |
| `platforms pages facebook` | GET | `/uploadposts/facebook/pages` |
| `platforms pages linkedin` | GET | `/uploadposts/linkedin/pages` |
| `platforms pages pinterest` | GET | `/uploadposts/pinterest/boards` |
| `analytics` | GET | `/analytics/{profile_username}` |

---

## Appendix B: Platform Threading Behavior

Auto-threading behavior when text exceeds platform character limits:

| Platform | Char Limit | Threading | Disable Flag |
|----------|-----------|-----------|-------------|
| X/Twitter | 280 | Splits by paragraphs, then words | `--x-long-text-as-post` |
| Threads | 500 | Splits by paragraphs, then words | `--threads-long-text-as-post` |
| Bluesky | 300 | Splits by paragraphs, then words | N/A |

---

## Appendix C: Poll Support (X/Twitter Only)

Polls are supported exclusively on X via `posterboy post text`:

```bash
posterboy post text \
  --body "What's your favorite language?" \
  --platforms x \
  --x-poll-options "TypeScript,Rust,Go,Python" \
  --x-poll-duration 1440
```

**Constraints:**
- 2-4 options (comma-separated)
- Duration: 5-10080 minutes (5 minutes to 7 days)
- Cannot combine polls with media

---

## Appendix D: Common Workflows

### Post text to all default platforms
```bash
posterboy post text --body "Hello world!"
```

### Post a photo carousel to Instagram and Threads
```bash
posterboy post photo \
  --files photo1.jpg,photo2.jpg,photo3.jpg \
  --title "Check out these photos!" \
  --platforms instagram,threads
```

### Upload a YouTube video with full metadata
```bash
posterboy post video \
  --file video.mp4 \
  --title "My Video Title" \
  --description "Full description here" \
  --platforms youtube \
  --youtube-tags "tag1,tag2,tag3" \
  --youtube-category 22 \
  --youtube-privacy unlisted \
  --youtube-thumbnail thumb.jpg
```

### Schedule a post for next Tuesday
```bash
posterboy post text \
  --body "Scheduled post!" \
  --platforms x,linkedin \
  --schedule "2026-02-17T14:00:00" \
  --timezone "America/New_York"
```

### Add to the queue
```bash
posterboy post text --body "Queued post!" --platforms x --queue
```

### Post from a file and pipe result to jq
```bash
posterboy post text --file blog-post.txt --platforms x,linkedin --json | jq '.results'
```

### Check status of an async upload
```bash
posterboy status abc-123-def --poll --interval 5
```

### Create a poll on X
```bash
posterboy post text \
  --body "Best runtime?" \
  --platforms x \
  --x-poll-options "bun,node,deno" \
  --x-poll-duration 1440
```

### Post a LinkedIn document
```bash
posterboy post document \
  --file presentation.pdf \
  --title "Q4 Results" \
  --description "Our quarterly performance review" \
  --linkedin-page org-123 \
  --linkedin-visibility CONNECTIONS
```

---

*End of Software Requirements Document*
