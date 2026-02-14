<p align="center">
  <img src="https://raw.githubusercontent.com/agileguy/posterboy/main/assets/posterboy-banner.png" alt="posterboy" width="300">
</p>

<h1 align="center">posterboy</h1>

<p align="center">Social media posting CLI powered by <a href="https://upload-post.com">Upload Post</a>.</p>

## Installation

### npm (recommended)
```bash
npm install -g posterboy
```

### From Source
```bash
git clone https://github.com/agileguy/posterboy.git
cd posterboy
bun install
bun link
```

### Compiled Binary
```bash
bun run build:binary
sudo mv posterboy /usr/local/bin/
```

## Quick Start

```bash
# Store your API key
posterboy auth login --key up_xxxx

# Check account status
posterboy auth status

# Create a profile and connect platforms
posterboy profiles create --username myprofile
posterboy profiles connect --profile myprofile

# Post text to multiple platforms
posterboy post text --body "Hello world!" --platforms x,linkedin

# Post a photo
posterboy post photo --files photo.jpg --platforms instagram --title "My photo"

# Post a video
posterboy post video --file video.mp4 --platforms tiktok,youtube --title "My video"

# Schedule a post
posterboy post text --body "Scheduled post" --platforms x --schedule "2026-03-01T14:00:00Z"

# Queue a post
posterboy post text --body "Queued post" --platforms x --queue

# Delete a Bluesky post
posterboy post delete --url https://bsky.app/profile/user/post/abc123
posterboy post delete --id abc123 --platform bluesky
```

## Commands

| Command | Description |
|---------|-------------|
| `auth login` | Store API key |
| `auth status` | Show account info |
| `profiles list` | List profiles |
| `profiles create` | Create profile |
| `profiles delete` | Delete profile |
| `profiles connect` | Connect social accounts |
| `platforms` | List connected platforms |
| `post text` | Post text content |
| `post photo` | Post photos/carousel |
| `post video` | Post video |
| `post document` | Post document (LinkedIn) |
| `post delete` | Delete post (Bluesky only) |
| `schedule list` | List scheduled posts |
| `schedule cancel` | Cancel scheduled post |
| `schedule modify` | Modify scheduled post |
| `queue settings` | View/update queue config |
| `queue preview` | Preview queue slots |
| `queue next` | Next available slot |
| `history` | View upload history |
| `analytics` | View profile analytics |
| `status` | Check upload status |

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Force JSON output |
| `--pretty` | Force pretty output |
| `--verbose` | Show request/response details |
| `--profile` | Override default profile |
| `--api-key` | Override API key |
| `--config` | Override config path |

## Deleting Posts

The `post delete` command allows you to delete published posts. Currently, **only Bluesky is supported** because:

- Publer (the backend API) does not provide a delete endpoint for published posts
- For Bluesky, posterboy uses the AT Protocol API directly to delete posts
- For other platforms (X, LinkedIn, Facebook, etc.), you'll need to delete manually

### Requirements

Set Bluesky credentials in `~/.env`:

```bash
BLUESKY_HANDLE=your-handle.bsky.social
BLUESKY_APP_PASSWORD=your-app-password
```

### Usage

```bash
# Delete by URL
posterboy post delete --url https://bsky.app/profile/user.bsky.social/post/abc123xyz

# Delete by ID
posterboy post delete --id abc123xyz --platform bluesky

# Verbose mode shows authentication and deletion steps
posterboy --verbose post delete --url https://bsky.app/profile/user/post/abc123
```

### Supported Platforms

| Platform | Delete Support | Why |
|----------|----------------|-----|
| Bluesky | ✅ Yes | Direct AT Protocol API access |
| X (Twitter) | ❌ No | Publer API limitation |
| LinkedIn | ❌ No | Publer API limitation |
| Facebook | ❌ No | Publer API limitation |
| Instagram | ❌ No | Publer API limitation |
| TikTok | ❌ No | Publer API limitation |
| YouTube | ❌ No | Publer API limitation |

For unsupported platforms, posterboy will show an error message with the post URL for manual deletion.

## Configuration

Config file: `~/.posterboy/config.json`

```json
{
  "version": 1,
  "api_key": "up_xxxx",
  "default_profile": "myprofile",
  "default_platforms": ["x", "linkedin"],
  "default_timezone": "America/New_York"
}
```

## License

[MIT](LICENSE)
