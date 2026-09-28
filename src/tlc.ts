import { assetUrl } from "./assets.ts";

export type TraceState = {
  number: number;
  action: string;
  values: Record<string, string>;
  marker?: string;
};
export type ModelResult = {
  status: "success" | "violation" | "error";
  title: string;
  detail: string;
  raw: string;
  states?: number;
  generated?: number;
  trace: TraceState[];
};

export function parseTlc(raw: string): ModelResult {
  const result: ModelResult = {
    status: "error",
    title: "The check did not complete",
    detail:
      "Read TLC’s output below. A parse error, runtime error, or incomplete run is not a passing check.",
    raw,
    trace: [],
  };
  const count = [
    ...raw.matchAll(
      /([\d,]+) states generated, ([\d,]+) distinct states found/g,
    ),
  ].at(-1);
  if (count) {
    result.generated = Number(count[1].replaceAll(",", ""));
    result.states = Number(count[2].replaceAll(",", ""));
  }
  const bridgeCode = [...raw.matchAll(/^Fieldnotes TLC result: (-?\d+)$/gm)].at(
    -1,
  );
  if (
    /^Model checking completed\. No error has been found\./m.test(raw) &&
    (!bridgeCode || bridgeCode[1] === "0") &&
    !/^Error:/m.test(raw)
  ) {
    result.status = "success";
    result.title = "No counterexample found";
    result.detail =
      "TLC completed the configured model. The configured properties held; this is not a proof for arbitrary model sizes or production code.";
  }
  const invariant = /Invariant (.+?) is violated/.exec(raw);
  if (invariant) {
    result.status = "violation";
    result.title = `${invariant[1]} is violated`;
    result.detail =
      "An allowed execution reaches a state where this invariant is false. Follow the evidence one step at a time.";
  } else if (
    /Temporal (?:properties (?:were|are)|property .+? was) violated/.test(raw)
  ) {
    result.status = "violation";
    const property = /Temporal property (.+?) was violated/.exec(raw);
    result.title = property
      ? `Temporal property ${property[1]} is violated`
      : "A temporal property is violated";
    result.detail =
      "This behavior violates a configured temporal property. A stuttering marker or back edge describes its infinite continuation.";
  } else if (/Deadlock reached/.test(raw)) {
    result.status = "violation";
    result.title = "TLC found a deadlock";
    result.detail =
      "No Next action is enabled here. Decide whether this is an intended terminal state or a design error before changing the deadlock setting.";
  }
  const matches = [...raw.matchAll(/^State (\d+):\s*(.+)$/gm)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const body = raw.slice(
      match.index! + match[0].length,
      matches[i + 1]?.index ?? raw.length,
    );
    const values: Record<string, string> = {};
    const lines = body.split("\n");
    let name: string | undefined;
    for (const line of lines) {
      const variable =
        /^\s*(?:\/\\\s*)?([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (variable) {
        name = variable[1];
        values[name] = variable[2].trim();
      } else if (
        name &&
        /^\s+\S/.test(line) &&
        !/^\s*(?:Error:|Progress|Finished|Back to state)/.test(line)
      )
        values[name] += "\n" + line.trim();
      else if (line.trim()) name = undefined;
    }
    if (
      /stuttering/i.test(match[2]) &&
      !Object.keys(values).length &&
      result.trace.length
    )
      Object.assign(values, result.trace[result.trace.length - 1].values);
    result.trace.push({
      number: Number(match[1]),
      action: match[2].trim(),
      values,
      marker: /stuttering/i.test(match[2])
        ? "The behavior repeats this state forever."
        : undefined,
    });
  }
  const back = /(?:Back to state|back to state)\s+(\d+)[^\n]*/.exec(raw);
  if (back && result.trace.length)
    result.trace[result.trace.length - 1].marker =
      `Loops back to state ${back[1]} forever.`;
  return result;
}

export function runTlc(
  spec: string,
  cfg: string,
  signal: AbortSignal,
  onPhase: (phase: string) => void,
): Promise<ModelResult> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.title = "Isolated TLC Java runtime";
    frame.src = assetUrl("tlc-frame.html");
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      signal.removeEventListener("abort", abort);
      frame.remove();
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const abort = () =>
      fail(
        "Stopped. No result was established. Your work is still saved in this browser.",
      );
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.contentWindow ||
        event.data?.channel !== "fieldnotes-tlc"
      )
        return;
      if (event.data.type === "ready") {
        onPhase("Exploring reachable states");
        clearTimeout(timer);
        timer = setTimeout(
          () =>
            fail(
              "The 90-second exploration limit was reached. Try a smaller finite model. No result was established.",
            ),
          90000,
        );
        frame.contentWindow?.postMessage(
          { type: "run", spec, cfg },
          location.origin,
        );
      } else if (event.data.type === "result") {
        const result = parseTlc(String(event.data.output));
        cleanup();
        resolve(result);
      } else if (event.data.type === "error") fail(String(event.data.message));
    };
    if (signal.aborted) {
      reject(new Error("Stopped."));
      return;
    }
    window.addEventListener("message", receive);
    signal.addEventListener("abort", abort, { once: true });
    onPhase("Loading the Java runtime");
    timer = setTimeout(
      () =>
        fail(
          "The Java runtime did not load within 3 minutes. Check your connection, retry, or download the model for local TLC.",
        ),
      180000,
    );
    document.body.appendChild(frame);
  });
}
