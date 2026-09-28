import { describe, expect, test } from "vitest";
import { parseTlc } from "../src/tlc";

describe("TLC output", () => {
  test("does not treat an exit code, a parse error, or partial progress as success", () => {
    for (const output of [
      "Fieldnotes TLC result: 0",
      "Parsing module Counter\nSemantic errors:",
      "3 states generated, 2 distinct states found, 1 states left on queue.",
    ])
      expect(parseTlc(output).status).toBe("error");
  });
  test("requires TLC’s explicit completion message", () => {
    const result = parseTlc(
      "Model checking completed. No error has been found.\n1,234 states generated, 1,200 distinct states found, 0 states left on queue.",
    );
    expect(result.status).toBe("success");
    expect(result.states).toBe(1200);
    expect(result.generated).toBe(1234);
  });
  test("reports final counts and never promotes a failed bridge run to success", () => {
    const counts =
      "3 states generated, 2 distinct states found\n100 states generated, 50 distinct states found";
    expect(parseTlc(counts).states).toBe(50);
    const completion = "Model checking completed. No error has been found.\n";
    expect(parseTlc(completion + "Fieldnotes TLC result: 1000").status).toBe(
      "error",
    );
    expect(parseTlc(completion + "Error: unexpected exception").status).toBe(
      "error",
    );
  });
  test("extracts real safety traces with scalar and structured values", () => {
    const result = parseTlc(
      'Error: Invariant Correct is violated.\nState 1: <Initial predicate>\n/\\ counter = 0\n/\\ pc = ("a" :> "read" @@\n  "b" :> "read")\n\nState 2: <Write line 3, col 1>\n/\\ counter = 1\n/\\ pc = ("a" :> "done")\n\n9 states generated, 6 distinct states found, 0 states left on queue.',
    );
    expect(result.status).toBe("violation");
    expect(result.trace).toHaveLength(2);
    expect(result.trace[0].values.pc).toBe('("a" :> "read" @@\n"b" :> "read")');
    expect(result.trace[1].values.counter).toBe("1");
  });
  test("handles one-variable trace states without the conjunction prefix", () => {
    expect(
      parseTlc("State 1: <Initial predicate>\nx = 0\n").trace[0].values.x,
    ).toBe("0");
  });
  test("preserves stuttering and loop information for liveness failures", () => {
    const result = parseTlc(
      "Error: Temporal properties were violated.\nState 1: <Initial predicate>\nx = 0\nState 2: Stuttering",
    );
    expect(result.status).toBe("violation");
    expect(result.trace[1].marker).toContain("forever");
    expect(result.trace[1].values.x).toBe("0");
    expect(
      parseTlc("Error: Temporal property EventuallyDone was violated.").title,
    ).toBe("Temporal property EventuallyDone is violated");
    expect(
      parseTlc("State 1: <Initial predicate>\nx = 0\nBack to state 1:").trace[0]
        .marker,
    ).toContain("state 1");
  });
  test("distinguishes deadlock from an invariant violation", () => {
    expect(parseTlc("Error: Deadlock reached.").title).toBe(
      "TLC found a deadlock",
    );
  });
});
