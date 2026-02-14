// posterboy - Post delete command

import { parseArgs } from "node:util";
import { UserError } from "../../lib/errors";
import { createOutputFormatter } from "../../lib/output";
import type { GlobalFlags } from "../../lib/types";

/**
 * Delete a post from a platform
 *
 * For Bluesky: Uses AT Protocol API to delete the post record
 * For other platforms: Shows error message (Publer doesn't support deletion)
 */
export async function postDelete(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  // Parse command-specific flags
  const { values } = parseArgs({
    args,
    options: {
      url: { type: "string" },
      id: { type: "string" },
      platform: { type: "string" },
    },
    strict: false,
  });

  // Validate input - need either URL or (ID + platform)
  const hasUrl = !!values.url;
  const hasIdAndPlatform = !!values.id && !!values.platform;

  if (!hasUrl && !hasIdAndPlatform) {
    throw new UserError(
      "Must provide either --url or both --id and --platform\n" +
        "\nExamples:\n" +
        "  posterboy post delete --url https://bsky.app/profile/user/post/abc123\n" +
        "  posterboy post delete --id abc123 --platform bluesky"
    );
  }

  if (hasUrl && hasIdAndPlatform) {
    throw new UserError(
      "Cannot provide both --url and --id/--platform. Choose one approach."
    );
  }

  // Determine platform and post details
  let platform: string;
  let postId: string;
  let postUrl: string;

  if (hasUrl) {
    const url = values.url as string;
    const parsed = parsePostUrl(url);
    platform = parsed.platform;
    postId = parsed.postId;
    postUrl = url;
  } else {
    platform = (values.platform as string).toLowerCase();
    postId = values.id as string;
    postUrl = `[${platform} post ${postId}]`;
  }

  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  // Handle deletion based on platform
  if (platform === "bluesky") {
    await deleteBlueskyPost(postId, postUrl, formatter, globalFlags);
  } else {
    // For all other platforms, show error
    if (formatter.mode() === "json") {
      formatter.json({
        success: false,
        error: `Deletion not supported for ${platform}`,
        platform,
        message: `Publer does not provide an API endpoint to delete published posts from ${platform}.`,
        manual_deletion_url: hasUrl ? values.url : undefined,
      });
    } else {
      formatter.pretty([
        formatter.error(`Deletion not supported for ${platform}`),
        "",
        `Publer does not provide an API endpoint to delete published posts.`,
        `You'll need to delete this post manually on ${platform}.`,
        "",
        ...(hasUrl ? [`Post URL: ${values.url}`] : []),
      ]);
    }
    process.exit(1);
  }
}

/**
 * Parse a post URL to extract platform and post ID
 */
function parsePostUrl(url: string): { platform: string; postId: string } {
  // Bluesky URLs: https://bsky.app/profile/{handle}/post/{rkey}
  const blueskyMatch = url.match(/bsky\.app\/profile\/[^/]+\/post\/([^/?#]+)/);
  if (blueskyMatch) {
    return {
      platform: "bluesky",
      postId: blueskyMatch[1]!,
    };
  }

  // X/Twitter URLs: https://x.com/{user}/status/{id} or twitter.com
  const xMatch = url.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/);
  if (xMatch) {
    return {
      platform: "x",
      postId: xMatch[1]!,
    };
  }

  // LinkedIn URLs: https://www.linkedin.com/feed/update/urn:li:share:{id}
  const linkedinMatch = url.match(/linkedin\.com\/.*\/(urn:li:share:\d+)/);
  if (linkedinMatch) {
    return {
      platform: "linkedin",
      postId: linkedinMatch[1]!,
    };
  }

  // Facebook URLs: https://www.facebook.com/{user}/posts/{id}
  const facebookMatch = url.match(/facebook\.com\/[^/]+\/posts\/(\d+)/);
  if (facebookMatch) {
    return {
      platform: "facebook",
      postId: facebookMatch[1]!,
    };
  }

  throw new UserError(
    `Unable to parse post URL: ${url}\n` +
      `Supported platforms: bluesky, x, linkedin, facebook\n` +
      `Alternatively, use --id and --platform flags instead of --url`
  );
}

/**
 * Delete a Bluesky post using AT Protocol
 */
async function deleteBlueskyPost(
  rkey: string,
  postUrl: string,
  formatter: ReturnType<typeof createOutputFormatter>,
  globalFlags: GlobalFlags
): Promise<void> {
  // Get Bluesky credentials from environment
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!handle || !password) {
    throw new UserError(
      "Bluesky credentials not found.\n" +
        "Please set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD in ~/.env"
    );
  }

  try {
    // Step 1: Create session (authenticate)
    if (globalFlags.verbose) {
      console.error("Authenticating with Bluesky...");
    }

    const loginResponse = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: handle,
        password: password,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Bluesky authentication failed: ${loginResponse.status} ${errorText}`);
    }

    const session = await loginResponse.json() as {
      accessJwt: string;
      did: string;
      handle: string;
    };

    if (globalFlags.verbose) {
      console.error(`Authenticated as ${session.handle} (${session.did})`);
    }

    // Step 2: Delete the post record
    if (globalFlags.verbose) {
      console.error(`Deleting post record: at://${session.did}/app.bsky.feed.post/${rkey}`);
    }

    const deleteResponse = await fetch("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        rkey: rkey,
      }),
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Bluesky deletion failed: ${deleteResponse.status} ${errorText}`);
    }

    // Success!
    if (formatter.mode() === "json") {
      formatter.json({
        success: true,
        platform: "bluesky",
        post_id: rkey,
        post_url: postUrl,
        message: "Post deleted successfully",
      });
    } else {
      formatter.pretty([
        formatter.success("Post deleted successfully from Bluesky"),
        "",
        `  ${formatter.label("Post ID:")}  ${rkey}`,
        `  ${formatter.label("URL:")}      ${postUrl}`,
      ]);
    }
  } catch (error) {
    if (formatter.mode() === "json") {
      formatter.json({
        success: false,
        platform: "bluesky",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      formatter.error(
        `Failed to delete Bluesky post:\n${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
    process.exit(1);
  }
}
