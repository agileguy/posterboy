# posterboy

Social media posting CLI powered by [Upload Post](https://upload-post.com).

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
