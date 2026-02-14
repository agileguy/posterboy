import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { completions } from "../../src/commands/completions";
import type { GlobalFlags } from "../../src/lib/types";

const defaultFlags: GlobalFlags = {
  json: false,
  pretty: false,
  verbose: false,
};

describe("completions command", () => {
  const consoleLogSpy = spyOn(console, "log");
  const consoleErrorSpy = spyOn(console, "error");

  afterEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it("generates bash completion script", async () => {
    await completions(["bash"], defaultFlags);

    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain("_posterboy()");
    expect(output).toContain("complete -F _posterboy posterboy");
    expect(output).toContain("auth");
    expect(output).toContain("profiles");
    expect(output).toContain("post");
    expect(output).toContain("completions");
  });

  it("generates zsh completion script", async () => {
    await completions(["zsh"], defaultFlags);

    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain("#compdef posterboy");
    expect(output).toContain("_posterboy()");
    expect(output).toContain("_arguments");
    expect(output).toContain("auth:Authentication");
    expect(output).toContain("profiles:Profile management");
  });

  it("generates fish completion script", async () => {
    await completions(["fish"], defaultFlags);

    const output = consoleLogSpy.mock.calls[0][0] as string;
    expect(output).toContain("# posterboy fish completion");
    expect(output).toContain("complete -c posterboy -l json");
    expect(output).toContain("complete -c posterboy -l verbose");
    expect(output).toContain('"auth" -d "Authentication');
    expect(output).toContain('"profiles" -d "Profile management"');
    expect(output).toContain('"completions" -d "Generate shell completions"');
  });

  it("errors on unknown shell", async () => {
    await expect(completions(["powershell"], defaultFlags)).rejects.toThrow(
      "Unknown shell: powershell"
    );
  });

  it("errors when no shell is specified", async () => {
    await expect(completions([], defaultFlags)).rejects.toThrow(
      "Shell type required"
    );
  });

  it("is case insensitive for shell names", async () => {
    await completions(["BASH"], defaultFlags);
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain("_posterboy()");
  });
});
