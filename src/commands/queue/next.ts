// posterboy - Queue next slot command

import { parseArgs } from "node:util";
import { readConfig, getApiKey, getDefaultProfile } from "../../lib/config";
import { ApiClient } from "../../lib/api";
import { createOutputFormatter } from "../../lib/output";
import { UserError } from "../../lib/errors";
import type { GlobalFlags } from "../../lib/types";

export async function queueNext(
  args: string[],
  globalFlags: GlobalFlags
): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: "string" },
    },
    strict: false,
  });

  // Resolve profile
  const config = readConfig();
  const profile =
    (values.profile as string | undefined) ||
    globalFlags.profile ||
    getDefaultProfile(undefined, config);

  if (!profile) {
    throw new UserError(
      "Profile required. Provide one of:\n" +
        "  --profile <name>                           (command flag)\n" +
        "  --profile <name> (global flag)             (before 'queue')\n" +
        "  POSTERBOY_PROFILE=<name>                   (environment variable)\n" +
        '  "default_profile": "<name>"                (in ~/.posterboy/config.json)'
    );
  }

  // Get API key and create client
  const apiKey = getApiKey(globalFlags.apiKey, config?.api_key);
  const client = new ApiClient(apiKey, { verbose: globalFlags.verbose });

  // Fetch next slot
  const result = await client.nextSlot(profile);

  // Display results
  const formatter = createOutputFormatter(
    globalFlags.json,
    globalFlags.pretty,
    true
  );

  if (formatter.mode() === "json") {
    formatter.json(result);
  } else {
    // Pretty output
    formatter.pretty([
      formatter.success(`Next available slot: ${result.next_slot}`),
    ]);
  }
}
