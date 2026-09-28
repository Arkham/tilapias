import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { lessons, type Lesson } from "../src/lessons.ts";
import { parseTlc } from "../src/tlc.ts";
import { checkProof } from "../src/proof.ts";

const jar = resolve("public/vendor/tla2tools-1.8.0.jar");
const folder = mkdtempSync(join(tmpdir(), "tilapias-check-"));
let failed = false;
function check(lesson: Lesson, edited = false) {
  const name = /MODULE\s+(\w+)/.exec(lesson.spec)![1];
  writeFileSync(join(folder, name + ".tla"), lesson.spec);
  writeFileSync(join(folder, name + ".cfg"), lesson.cfg);
  const command =
    lesson.mode === "model"
      ? [
          "tlc2.TLC",
          "-workers",
          "1",
          "-cleanup",
          "-config",
          name + ".cfg",
          name + ".tla",
        ]
      : ["tla2sany.SANY", name + ".tla"];
  const run = spawnSync(
    "java",
    ["-Xmx512m", "-XX:+UseParallelGC", "-cp", jar, ...command],
    { cwd: folder, encoding: "utf8", timeout: 30000 },
  );
  const output = run.stdout + run.stderr;
  const parsed =
    lesson.mode === "model" ? parseTlc(output) : checkProof(lesson.spec);
  const expected =
    lesson.mode === "model"
      ? lesson.expected
      : lesson.expected === "success"
        ? "valid"
        : "invalid";
  const syntaxError = /(?:Parsing|Semantic) errors|Fatal errors|Exception/.test(
    output,
  );
  if (run.error || parsed.status !== expected || syntaxError) {
    failed = true;
    console.error(
      `FAIL ${lesson.id}${edited ? " (edit)" : ""}: expected ${expected}, got ${parsed.status}`,
      run.error ?? "",
      output,
    );
  } else {
    console.log(
      `PASS ${lesson.id}${edited ? " (edit)" : ""}: ${parsed.status}${"states" in parsed ? `, ${parsed.states} distinct states` : ", SANY accepts proof syntax"}`,
    );
  }
}
try {
  for (const lesson of lessons) check(lesson);
  const variant = (
    index: number,
    spec: string,
    expected: Lesson["expected"],
    cfg = lessons[index].cfg,
  ) => check({ ...lessons[index], spec, cfg, expected }, true);
  variant(
    0,
    lessons[0].spec.replace("Init == x = 0", "Init == x = 1"),
    "success",
  );
  variant(1, lessons[1].spec.replace("/\\ x' = 0", "/\\ x' = 1"), "success");
  variant(2, lessons[2].spec.replace("x <= 2", "x < 2"), "success");
  variant(
    3,
    lessons[3].spec.replace("Next == Deposit \\/ Reset", lessons[3].solution),
    "success",
  );
  variant(
    4,
    lessons[4].spec.replace("====", 'NeverAda == "Ada" \\notin done\n===='),
    "violation",
    lessons[4].cfg + "\nINVARIANT NeverAda",
  );
  variant(
    5,
    lessons[5].spec.replace('{"a", "b"}', '{"a", "b", "c"}'),
    "success",
  );
  variant(
    6,
    lessons[6].spec.replace("counter' = tmp[w] + 1", "counter' = counter + 1"),
    "success",
  );
  variant(
    7,
    lessons[7].spec,
    "success",
    lessons[7].cfg.replace("PROPERTY EventuallyDone\n", ""),
  );
  variant(8, lessons[8].spec.replace(" /\\ WF_x(Next)", ""), "violation");
  variant(
    9,
    lessons[9].spec.replace("(P /\\ (P => Q)) => Q", "((P => Q) /\\ Q) => P"),
    "violation",
  );
  variant(10, lessons[10].spec.replace("<1>2. R", "<1>2. ~R"), "violation");
  variant(
    11,
    lessons[11].spec.replace("Init => I, I => Safe", "Init => I"),
    "violation",
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
if (failed) process.exitCode = 1;
