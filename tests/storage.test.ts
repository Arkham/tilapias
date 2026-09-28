import { expect, test } from "vitest";
import { emptyWorkspace, validateWorkspace } from "../src/storage";

test("roundtrips a workspace including edits, notes and progress", () => {
  const workspace = {
    ...emptyWorkspace(),
    drafts: {
      states: { spec: "edited", cfg: "INIT Init", notes: "My thinking" },
    },
    completed: ["states"],
  };
  expect(validateWorkspace(JSON.parse(JSON.stringify(workspace)))).toEqual(
    workspace,
  );
});
test("rejects malformed, oversized, or prototype-bearing backups", () => {
  for (const value of [
    null,
    {},
    { version: 2 },
    {
      ...emptyWorkspace(),
      drafts: { states: { spec: "x".repeat(200001), cfg: "", notes: "" } },
    },
    JSON.parse(
      '{"version":1,"current":"states","completed":[],"drafts":{"__proto__":{"spec":"","cfg":"","notes":""}}}',
    ),
  ])
    expect(() => validateWorkspace(value)).toThrow();
});
