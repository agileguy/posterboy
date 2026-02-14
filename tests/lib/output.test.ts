import { describe, test, expect } from "bun:test";
import { OutputFormatter, createOutputFormatter } from "../../src/lib/output";

describe("Output System", () => {
  test("OutputFormatter detects JSON mode for non-TTY", () => {
    // In test environment, stdout.isTTY is typically false
    const formatter = new OutputFormatter();
    expect(formatter.mode()).toBe("json");
  });
  
  test("OutputFormatter respects forced mode", () => {
    const formatter = new OutputFormatter("pretty");
    expect(formatter.mode()).toBe("pretty");
  });
  
  test("OutputFormatter respects NO_COLOR env var", () => {
    process.env.NO_COLOR = "1";
    const formatter = new OutputFormatter("pretty");
    const colored = formatter.color("test", "RED");
    expect(colored).toBe("test"); // No ANSI codes
    delete process.env.NO_COLOR;
  });
  
  test("createOutputFormatter sets JSON mode from flag", () => {
    const formatter = createOutputFormatter(true, false);
    expect(formatter.mode()).toBe("json");
  });
  
  test("createOutputFormatter sets pretty mode from flag", () => {
    const formatter = createOutputFormatter(false, true);
    expect(formatter.mode()).toBe("pretty");
  });
  
  test("json() outputs valid JSON", () => {
    const formatter = new OutputFormatter("json");
    const data = { success: true, message: "test" };
    
    // Capture stdout (in real usage)
    // For now just check it doesn't throw
    expect(() => formatter.json(data)).not.toThrow();
  });
  
  test("color() applies ANSI codes when color enabled", () => {
    const formatter = new OutputFormatter("pretty", true);
    const colored = formatter.color("test", "RED");
    expect(colored).toContain("\x1b[31m"); // Red color code
    expect(colored).toContain("\x1b[0m");  // Reset code
  });
  
  test("color() skips ANSI codes when color disabled", () => {
    const formatter = new OutputFormatter("pretty", false);
    const colored = formatter.color("test", "RED");
    expect(colored).toBe("test");
  });
});
