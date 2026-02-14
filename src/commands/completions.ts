// posterboy - Shell completions command

import { parseArgs } from "node:util";
import { UserError } from "../lib/errors";
import type { GlobalFlags } from "../lib/types";

/* eslint-disable no-useless-escape */
const BASH_COMPLETION = `# posterboy bash completion
_posterboy() {
  local cur prev commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="auth profiles post schedule status history queue platforms analytics completions"

  case "\${prev}" in
    posterboy)
      COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
      ;;
    auth)
      COMPREPLY=($(compgen -W "login status" -- "\${cur}"))
      ;;
    profiles)
      COMPREPLY=($(compgen -W "list create delete connect" -- "\${cur}"))
      ;;
    post)
      COMPREPLY=($(compgen -W "text photo video document" -- "\${cur}"))
      ;;
    schedule)
      COMPREPLY=($(compgen -W "list cancel modify" -- "\${cur}"))
      ;;
    queue)
      COMPREPLY=($(compgen -W "settings preview next" -- "\${cur}"))
      ;;
    platforms)
      COMPREPLY=($(compgen -W "pages" -- "\${cur}"))
      ;;
    pages)
      COMPREPLY=($(compgen -W "facebook linkedin pinterest" -- "\${cur}"))
      ;;
    completions)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "\${cur}"))
      ;;
    *)
      COMPREPLY=($(compgen -W "--json --pretty --verbose --profile --config --api-key --help --version" -- "\${cur}"))
      ;;
  esac
}

complete -F _posterboy posterboy
`;

const ZSH_COMPLETION = `#compdef posterboy
# posterboy zsh completion

_posterboy() {
  local curcontext="\$curcontext" state line
  typeset -A opt_args

  _arguments -C \\
    '1: :->command' \\
    '*:: :->args' \\
    '--json[Force JSON output]' \\
    '--pretty[Force pretty output]' \\
    '--verbose[Show request/response details]' \\
    '--config[Override config file path]:file:_files' \\
    '--api-key[Override API key]:key:' \\
    '--profile[Override default profile]:profile:' \\
    '--help[Print help]' \\
    '--version[Print version]'

  case \$state in
    command)
      local -a commands
      commands=(
        'auth:Authentication and account management'
        'profiles:Profile management'
        'post:Content posting'
        'schedule:Scheduled post management'
        'status:Check upload status'
        'history:View upload history'
        'queue:Queue management'
        'platforms:List connected platforms'
        'analytics:View profile analytics'
        'completions:Generate shell completions'
      )
      _describe 'command' commands
      ;;
    args)
      case \$line[1] in
        auth)
          _arguments '1: :(login status)'
          ;;
        profiles)
          _arguments '1: :(list create delete connect)'
          ;;
        post)
          _arguments '1: :(text photo video document)'
          ;;
        schedule)
          _arguments '1: :(list cancel modify)'
          ;;
        queue)
          _arguments '1: :(settings preview next)'
          ;;
        platforms)
          _arguments '1: :(pages)' '2: :(facebook linkedin pinterest)'
          ;;
        completions)
          _arguments '1: :(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}

_posterboy
`;

const FISH_COMPLETION = `# posterboy fish completion

# Global options
complete -c posterboy -l json -d "Force JSON output"
complete -c posterboy -l pretty -d "Force pretty output"
complete -c posterboy -l verbose -d "Show request/response details"
complete -c posterboy -l config -d "Override config file path" -r
complete -c posterboy -l api-key -d "Override API key" -r
complete -c posterboy -l profile -d "Override default profile" -r
complete -c posterboy -l help -d "Print help"
complete -c posterboy -l version -d "Print version"

# Main commands
complete -c posterboy -f -n "__fish_use_subcommand" -a "auth" -d "Authentication and account management"
complete -c posterboy -f -n "__fish_use_subcommand" -a "profiles" -d "Profile management"
complete -c posterboy -f -n "__fish_use_subcommand" -a "post" -d "Content posting"
complete -c posterboy -f -n "__fish_use_subcommand" -a "schedule" -d "Scheduled post management"
complete -c posterboy -f -n "__fish_use_subcommand" -a "status" -d "Check upload status"
complete -c posterboy -f -n "__fish_use_subcommand" -a "history" -d "View upload history"
complete -c posterboy -f -n "__fish_use_subcommand" -a "queue" -d "Queue management"
complete -c posterboy -f -n "__fish_use_subcommand" -a "platforms" -d "List connected platforms"
complete -c posterboy -f -n "__fish_use_subcommand" -a "analytics" -d "View profile analytics"
complete -c posterboy -f -n "__fish_use_subcommand" -a "completions" -d "Generate shell completions"

# auth subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from auth" -a "login" -d "Store API key in config"
complete -c posterboy -f -n "__fish_seen_subcommand_from auth" -a "status" -d "Show account info"

# profiles subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from profiles" -a "list" -d "List all connected profiles"
complete -c posterboy -f -n "__fish_seen_subcommand_from profiles" -a "create" -d "Create a new profile"
complete -c posterboy -f -n "__fish_seen_subcommand_from profiles" -a "delete" -d "Delete a profile"
complete -c posterboy -f -n "__fish_seen_subcommand_from profiles" -a "connect" -d "Generate JWT URL"

# post subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from post" -a "text" -d "Post text content"
complete -c posterboy -f -n "__fish_seen_subcommand_from post" -a "photo" -d "Post photo/carousel"
complete -c posterboy -f -n "__fish_seen_subcommand_from post" -a "video" -d "Post video content"
complete -c posterboy -f -n "__fish_seen_subcommand_from post" -a "document" -d "Post document (LinkedIn)"

# schedule subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from schedule" -a "list" -d "List scheduled posts"
complete -c posterboy -f -n "__fish_seen_subcommand_from schedule" -a "cancel" -d "Cancel a scheduled post"
complete -c posterboy -f -n "__fish_seen_subcommand_from schedule" -a "modify" -d "Modify a scheduled post"

# queue subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from queue" -a "settings" -d "View or update queue config"
complete -c posterboy -f -n "__fish_seen_subcommand_from queue" -a "preview" -d "Preview upcoming queue slots"
complete -c posterboy -f -n "__fish_seen_subcommand_from queue" -a "next" -d "Get next available slot"

# platforms subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from platforms" -a "pages" -d "List platform-specific pages/boards"

# platforms pages subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from pages" -a "facebook" -d "List Facebook pages"
complete -c posterboy -f -n "__fish_seen_subcommand_from pages" -a "linkedin" -d "List LinkedIn pages"
complete -c posterboy -f -n "__fish_seen_subcommand_from pages" -a "pinterest" -d "List Pinterest boards"

# completions subcommands
complete -c posterboy -f -n "__fish_seen_subcommand_from completions" -a "bash" -d "Generate bash completion"
complete -c posterboy -f -n "__fish_seen_subcommand_from completions" -a "zsh" -d "Generate zsh completion"
complete -c posterboy -f -n "__fish_seen_subcommand_from completions" -a "fish" -d "Generate fish completion"
`;

export async function completions(
  args: string[],
  _globalFlags: GlobalFlags
): Promise<void> {
  const { positionals } = parseArgs({
    args,
    options: {},
    strict: false,
    allowPositionals: true,
  });

  const [shell] = positionals;

  if (!shell) {
    throw new UserError(
      "Shell type required. Specify one of: bash, zsh, fish\n\n" +
        "Examples:\n" +
        "  posterboy completions bash > /etc/bash_completion.d/posterboy\n" +
        "  posterboy completions zsh > ~/.zsh/completions/_posterboy\n" +
        "  posterboy completions fish > ~/.config/fish/completions/posterboy.fish"
    );
  }

  switch (shell.toLowerCase()) {
    case "bash":
      console.log(BASH_COMPLETION);
      break;

    case "zsh":
      console.log(ZSH_COMPLETION);
      break;

    case "fish":
      console.log(FISH_COMPLETION);
      break;

    default:
      throw new UserError(
        `Unknown shell: ${shell}\n` +
          "Supported shells: bash, zsh, fish"
      );
  }
}
