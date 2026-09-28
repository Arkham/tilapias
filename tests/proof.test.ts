import { describe, expect, test } from "vitest";
import { checkProof, evaluate, parseFormula } from "../src/proof";
import { lessons } from "../src/lessons";
const wrap = (statement: string, body = "OBVIOUS", atoms = "P, Q") =>
  `---- MODULE Test ----\nCONSTANTS ${atoms}\nTHEOREM Claim == ${statement}\nPROOF ${body}\n====`;

describe("propositional proof kernel", () => {
  test("every proof lesson is checked, not a canned outcome", () => {
    for (const lesson of lessons.filter((l) => l.mode === "proof"))
      expect(checkProof(lesson.spec).status, lesson.id).toBe("valid");
  });
  test.each([
    "(P /\\ (P => Q)) => Q",
    "(P /\\ Q) => P",
    "(P \\/ ~P)",
    "(P => Q) <=> (~Q => ~P)",
    "TRUE",
  ])("accepts tautology %s", (formula) => {
    expect(checkProof(wrap(formula)).status).toBe("valid");
  });
  test("rejects affirming the consequent with a concrete countervaluation", () => {
    const result = checkProof(wrap("((P => Q) /\\ Q) => P"));
    expect(result.status).toBe("invalid");
    expect(result.obligations[0].counterexample).toEqual({ P: false, Q: true });
  });
  test("checks formulas under assumptions, not in isolation", () => {
    expect(checkProof(wrap("ASSUME P, P => Q PROVE Q")).status).toBe("valid");
    expect(checkProof(wrap("ASSUME P => Q PROVE Q")).status).toBe("invalid");
  });
  test("warns when assumptions are inconsistent", () => {
    const result = checkProof(wrap("ASSUME P, ~P PROVE Q"));
    expect(result.status).toBe("valid");
    expect(result.vacuous).toBe(true);
  });
  test("a false intermediate step fails even when the final theorem is valid", () => {
    const result = checkProof(
      wrap("P => P", "<1>1. Q OBVIOUS\n<1> QED BY <1>1"),
    );
    expect(result.status).toBe("invalid");
    expect(result.obligations[0].label).toBe("<1>1");
  });
  test.each([
    "<1>1. P => P BY <1>1\n<1> QED BY <1>1",
    "<1>1. P => P BY <1>2\n<1>2. Q => Q OBVIOUS\n<1> QED BY <1>2",
    "<1>1. P => P OBVIOUS",
    "<1>1. P => P OBVIOUS\n<1>1. Q => Q OBVIOUS\n<1> QED BY <1>1",
    "<1> QED OBVIOUS\n<1>1. TRUE OBVIOUS",
  ])("rejects malformed dependency structure %s", (body) => {
    expect(checkProof(wrap("TRUE", body)).status).toBe("unsupported");
  });
  test.each([
    "P = P",
    "P + 1 > 0",
    "[]P",
    "\\A x \\in Nat: x = x",
    "R",
    "P Q",
    "P /\\ Q \\/ P",
    "P => Q => P",
    "P<=>Q<=>P",
    "(P",
    "P)",
    "",
  ])("rejects unsupported or ambiguous expression %s", (formula) => {
    expect(checkProof(wrap(formula)).status).toBe("unsupported");
  });
  test.each([
    "OMITTED",
    "BY SMT",
    "<2>1. TRUE OBVIOUS\n<2> QED BY <2>1",
    "OBVIOUS trailing garbage",
  ])("never silently accepts unsupported proof %s", (body) => {
    expect(checkProof(wrap("TRUE", body)).status).toBe("unsupported");
  });
  test("supports comments but rejects unclosed ones", () => {
    expect(
      checkProof(wrap("(* outer (* nested *) *) P => P \\* note\n")).status,
    ).toBe("valid");
    expect(checkProof(wrap("P (*")).status).toBe("unsupported");
  });
  test("enforces the atom and document limits", () => {
    expect(
      checkProof(
        wrap(
          "TRUE",
          "OBVIOUS",
          Array.from({ length: 13 }, (_, i) => `P${i}`).join(","),
        ),
      ).status,
    ).toBe("unsupported");
    expect(checkProof("x".repeat(32001)).status).toBe("unsupported");
  });
  test("handles no atoms and rejects redeclarations", () => {
    expect(
      checkProof(
        "---- MODULE Empty ----\nTHEOREM A == TRUE\nPROOF OBVIOUS\n====",
      ).status,
    ).toBe("valid");
    expect(checkProof(wrap("P", "OBVIOUS", "P,P")).status).toBe("unsupported");
  });
  test("truth-table semantics agree with independently specified operator functions", () => {
    for (const P of [false, true])
      for (const Q of [false, true]) {
        const functions: Record<string, boolean> = {
          "/\\": P && Q,
          "\\/": P || Q,
          "=>": !P || Q,
          "<=>": P === Q,
        };
        for (const [op, expected] of Object.entries(functions))
          expect(
            evaluate(parseFormula(`P ${op} Q`, new Set(["P", "Q"])), { P, Q }),
          ).toBe(expected);
      }
  });
});
