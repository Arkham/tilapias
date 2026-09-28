export type Formula =
  | { kind: "atom"; name: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "not"; value: Formula }
  | { kind: "binary"; op: string; left: Formula; right: Formula };
export type Valuation = Record<string, boolean>;
export type Obligation = {
  label: string;
  formula: string;
  valid: boolean;
  counterexample?: Valuation;
  references: string[];
};
export type ProofResult = {
  status: "valid" | "invalid" | "unsupported";
  message: string;
  obligations: Obligation[];
  atoms: string[];
  assignments: number;
  vacuous: boolean;
};

const binary = new Set(["/\\", "\\/", "=>", "<=>"]);
const reserved = new Set([
  "TRUE",
  "FALSE",
  "ASSUME",
  "PROVE",
  "PROOF",
  "BY",
  "OBVIOUS",
  "QED",
  "THEOREM",
  "MODULE",
  "CONSTANT",
  "CONSTANTS",
]);

export function parseFormula(source: string, declared: Set<string>): Formula {
  const tokens: string[] = [];
  let text = source.trim();
  while (text) {
    const match = /^(<=>|=>|\/\\|\\\/|[()~]|[A-Za-z][A-Za-z0-9_]*)/.exec(text);
    if (!match)
      throw new Error(
        `Unsupported syntax near “${text.slice(0, 24)}”. This checker accepts propositional logic only.`,
      );
    tokens.push(match[0]);
    text = text.slice(match[0].length).trimStart();
  }
  let at = 0;
  function unit(): Formula {
    const token = tokens[at++];
    if (token === "~") return { kind: "not", value: unit() };
    if (token === "(") {
      const value = expression();
      if (tokens[at++] !== ")")
        throw new Error("Expected a closing parenthesis.");
      return value;
    }
    if (token === "TRUE" || token === "FALSE")
      return { kind: "boolean", value: token === "TRUE" };
    if (token && declared.has(token)) return { kind: "atom", name: token };
    throw new Error(
      token
        ? `“${token}” is not a declared propositional atom.`
        : "Expected a formula, not an empty expression.",
    );
  }
  function expression(): Formula {
    let value = unit();
    let previous: string | undefined;
    while (binary.has(tokens[at])) {
      const op = tokens[at++];
      if (previous && (op !== previous || op === "=>" || op === "<=>")) {
        throw new Error(
          "Parenthesize mixed or chained implications explicitly. The lab never guesses TLA+ operator grouping.",
        );
      }
      value = { kind: "binary", op, left: value, right: unit() };
      previous = op;
    }
    return value;
  }
  const formula = expression();
  if (at !== tokens.length)
    throw new Error(
      `Unexpected token “${tokens[at]}”. Separate proof steps with their justifications.`,
    );
  return formula;
}

export function evaluate(formula: Formula, values: Valuation): boolean {
  switch (formula.kind) {
    case "atom":
      return values[formula.name];
    case "boolean":
      return formula.value;
    case "not":
      return !evaluate(formula.value, values);
    case "binary": {
      const a = evaluate(formula.left, values);
      const b = evaluate(formula.right, values);
      switch (formula.op) {
        case "/\\":
          return a && b;
        case "\\/":
          return a || b;
        case "=>":
          return !a || b;
        case "<=>":
          return a === b;
        default:
          throw new Error("Unknown operator.");
      }
    }
  }
}

function withoutComments(source: string): string {
  let output = "",
    depth = 0;
  for (let i = 0; i < source.length; i++) {
    if (source.slice(i, i + 2) === "(*") {
      depth++;
      i++;
    } else if (depth && source.slice(i, i + 2) === "*)") {
      depth--;
      i++;
      output += " ";
    } else if (!depth && source.slice(i, i + 2) === "\\*") {
      while (i < source.length && source[i] !== "\n") i++;
      output += "\n";
    } else if (!depth) output += source[i];
    else if (source[i] === "\n") output += "\n";
  }
  if (depth) throw new Error("Unclosed block comment.");
  return output;
}

export function checkProof(source: string): ProofResult {
  const result: ProofResult = {
    status: "unsupported",
    message: "",
    obligations: [],
    atoms: [],
    assignments: 0,
    vacuous: false,
  };
  try {
    if (source.length > 32000)
      throw new Error("Keep this learning proof under 32,000 characters.");
    const clean = withoutComments(source).trim();
    const module =
      /^-{4,}\s*MODULE\s+[A-Za-z][A-Za-z0-9_]*\s*-{4,}\s*([\s\S]*?)\s*={4,}$/.exec(
        clean,
      );
    if (!module)
      throw new Error(
        "Expected one complete ---- MODULE Name ---- … ==== module.",
      );
    const declaration =
      /^(?:(?:CONSTANTS?)\s+([A-Za-z][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z][A-Za-z0-9_]*)*)\s+)?THEOREM\s+([A-Za-z][A-Za-z0-9_]*)\s*==\s*([\s\S]+)$/.exec(
        module[1],
      );
    if (!declaration)
      throw new Error(
        "Expected optional CONSTANTS followed by one THEOREM Name ==. Definitions and EXTENDS are not supported.",
      );
    const atoms = declaration[1] ? declaration[1].split(/\s*,\s*/) : [];
    if (
      atoms.some((name) => reserved.has(name)) ||
      new Set(atoms).size !== atoms.length ||
      atoms.includes(declaration[2])
    )
      throw new Error(
        "Use unique, non-reserved names for constants and the theorem.",
      );
    if (atoms.length > 12)
      throw new Error(
        "This browser checker supports at most 12 propositional atoms.",
      );
    result.atoms = atoms;
    result.assignments = 2 ** atoms.length;
    const declared = new Set(atoms);
    const proofParts = declaration[3].split(/\bPROOF\b/);
    if (proofParts.length !== 2)
      throw new Error(
        "Provide exactly one PROOF, followed by OBVIOUS or flat <1> steps.",
      );
    const statement = proofParts[0].trim();
    let assumptionTexts: string[] = [];
    let goalText = statement;
    if (statement.startsWith("ASSUME")) {
      const context = /^ASSUME\s+([\s\S]+?)\s+PROVE\s+([\s\S]+)$/.exec(
        statement,
      );
      if (!context)
        throw new Error(
          "Use ASSUME proposition, proposition PROVE goal. NEW declarations are outside this fragment.",
        );
      assumptionTexts = context[1].split(",").map((s) => s.trim());
      goalText = context[2].trim();
    }
    const assumptions = assumptionTexts.map((s) => parseFormula(s, declared));
    const goal = parseFormula(goalText, declared);
    const valuations: Valuation[] = [];
    for (let bits = 0; bits < result.assignments; bits++) {
      valuations.push(
        Object.fromEntries(
          atoms.map((name, index) => [name, Boolean(bits & (1 << index))]),
        ),
      );
    }
    result.vacuous = !valuations.some((v) =>
      assumptions.every((a) => evaluate(a, v)),
    );
    const facts = new Map<string, Formula>();
    const discharge = (
      label: string,
      text: string,
      formula: Formula,
      refs: string[],
    ) => {
      const premises = [...assumptions];
      for (const ref of refs) {
        const fact = facts.get(ref);
        if (!fact)
          throw new Error(
            `“${ref}” is not an earlier proved step. Forward references and self-references are not allowed.`,
          );
        premises.push(fact);
      }
      const counterexample = valuations.find(
        (v) => premises.every((p) => evaluate(p, v)) && !evaluate(formula, v),
      );
      result.obligations.push({
        label,
        formula: text,
        valid: !counterexample,
        counterexample,
        references: refs,
      });
      return !counterexample;
    };
    const parseJustification = (s: string): string[] => {
      if (s.trim() === "OBVIOUS") return [];
      if (!/^BY\s+<1>\d+(?:\s*,\s*<1>\d+)*$/.test(s.trim()))
        throw new Error(
          "Use OBVIOUS or BY with comma-separated earlier <1> step references.",
        );
      return s.match(/<1>\d+/g) ?? [];
    };
    const body = proofParts[1].trim();
    if (body === "OBVIOUS") {
      discharge("Theorem", goalText, goal, []);
    } else {
      const markers = [...body.matchAll(/<1>\s*(?:(\d+)\.|(QED)\b)/g)];
      if (!markers.length || markers[0].index !== 0 || markers.length > 64)
        throw new Error("Use up to 64 flat <1> steps followed by <1> QED.");
      let closed = false;
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const content = body
          .slice(
            marker.index! + marker[0].length,
            markers[i + 1]?.index ?? body.length,
          )
          .trim();
        if (marker[2]) {
          if (i !== markers.length - 1)
            throw new Error("QED must be the final step.");
          discharge("QED", goalText, goal, parseJustification(content));
          closed = true;
        } else {
          const label = `<1>${marker[1]}`;
          if (facts.has(label)) throw new Error(`Duplicate step ${label}.`);
          const parts = /^([\s\S]+?)\s+(OBVIOUS|BY\s+[\s\S]+)$/.exec(content);
          if (!parts)
            throw new Error(
              `Step ${label} needs a formula and an OBVIOUS or BY justification.`,
            );
          const formula = parseFormula(parts[1], declared);
          const valid = discharge(
            label,
            parts[1],
            formula,
            parseJustification(parts[2]),
          );
          if (!valid) {
            result.status = "invalid";
            result.message = `Step ${label} does not follow from its context. The countervaluation makes the context true and the conclusion false.`;
            return result;
          }
          facts.set(label, formula);
        }
      }
      if (!closed)
        throw new Error(
          "The proof is unfinished. Add a final <1> QED justification.",
        );
    }
    result.status = result.obligations.every((o) => o.valid)
      ? "valid"
      : "invalid";
    result.message =
      result.status === "valid"
        ? result.vacuous
          ? "Valid, but vacuous: no Boolean assignment satisfies the assumptions. Revisit the context."
          : "Every obligation is valid for all Boolean valuations of the declared propositions."
        : "The goal does not follow. This countervaluation satisfies the context but falsifies the conclusion.";
  } catch (error) {
    result.status = "unsupported";
    result.message = error instanceof Error ? error.message : String(error);
  }
  return result;
}
