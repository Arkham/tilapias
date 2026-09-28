import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  Code2,
  Download,
  FileCode2,
  Fish,
  FlaskConical,
  Lightbulb,
  LoaderCircle,
  Menu,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  Upload,
  Waves,
  X,
} from "lucide-react";
import { Editor } from "./Editor";
import { assetUrl } from "./assets";
import { Aquarium, Pond } from "./Tilapia";
import { glossary, lessons, type Lesson } from "./lessons";
import { checkProof, type ProofResult } from "./proof";
import { runTlc, type ModelResult } from "./tlc";
import {
  download,
  loadWorkspace,
  storageKey,
  validateWorkspace,
  type Draft,
  type Workspace,
} from "./storage";

const scratchModel: Lesson = {
  ...lessons[0],
  id: "scratch-model",
  title: "A small place for big what-ifs.",
  subtitle: "Your own model. Your own questions.",
  concept: "Scratchpad",
  intro:
    "Start with a finite model, choose the properties that matter, and let TLC look for trouble. Your scratchpad is saved separately from the lessons.",
};
const scratchProof: Lesson = {
  ...lessons[9],
  id: "scratch-proof",
  title: "Give your reasoning a place to land.",
  subtitle: "Write a claim. Make every step count.",
  concept: "Proof scratchpad",
  intro:
    "Write a propositional theorem or a flat structured proof. This independent learning checker accepts a deliberately small fragment of TLA+ proof syntax; it is not TLAPS.",
};
const findLesson = (id: string) =>
  lessons.find((l) => l.id === id) ??
  (id === "scratch-proof"
    ? scratchProof
    : id === "scratch-model"
      ? scratchModel
      : lessons[0]);
const moduleName = (spec: string) =>
  /-{4,}\s*MODULE\s+(\w+)/.exec(spec)?.[1] ?? "Untitled";
type SavedResult = {
  spec: string;
  cfg: string;
  value: ModelResult | ProofResult;
};
const isProofResult = (
  value: ModelResult | ProofResult,
): value is ProofResult => "obligations" in value;

function Trace({ result }: { result: ModelResult }) {
  const [at, setAt] = useState(0);
  const state = result.trace[Math.min(at, result.trace.length - 1)];
  const previous = result.trace[Math.min(at, result.trace.length - 1) - 1];
  if (!state) return null;
  return (
    <div className="trace">
      <div className="trace-toolbar">
        <span className="eyebrow">COUNTEREXAMPLE</span>
        <div className="trace-nav">
          <button
            aria-label="Previous trace state"
            disabled={at === 0}
            onClick={() => setAt(at - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {at + 1} / {result.trace.length}
          </span>
          <button
            aria-label="Next trace state"
            disabled={at >= result.trace.length - 1}
            onClick={() => setAt(at + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="trace-dots">
        {result.trace.map((s, i) => (
          <button
            key={s.number}
            className={i === at ? "selected" : ""}
            onClick={() => setAt(i)}
            aria-label={`Show state ${s.number}`}
            aria-current={i === at ? "step" : undefined}
          >
            {s.number}
          </button>
        ))}
      </div>
      <p className="trace-action">{state.action.replace(/^<|>$/g, "")}</p>
      <div className="state-values">
        {Object.entries(state.values).map(([key, value]) => (
          <div
            key={key}
            className={
              previous && previous.values[key] !== value ? "changed" : ""
            }
          >
            <code>{key}</code>
            <pre>{value}</pre>
            {previous && previous.values[key] !== value && (
              <span className="changed-label">changed</span>
            )}
          </div>
        ))}
      </div>
      {state.marker && (
        <div className="callout compact">
          <RotateCcw size={16} />
          <span>{state.marker}</span>
        </div>
      )}
      {at === result.trace.length - 1 &&
        result.title.includes("is violated") &&
        !/temporal/i.test(result.title) && (
          <p className="trace-caption">
            The property fails in this state. Look one step back: what allowed
            the change?
          </p>
        )}
    </div>
  );
}

function Result({ result }: { result: ModelResult | ProofResult }) {
  if (isProofResult(result)) {
    const valid = result.status === "valid";
    const title = valid
      ? result.vacuous
        ? "Valid, but vacuous"
        : "Propositional proof checked"
      : result.status === "invalid"
        ? "An obligation does not follow"
        : "Not checked: unsupported or malformed";
    return (
      <>
        <div
          className={`result-heading ${valid && !result.vacuous ? "good" : "warning"}`}
        >
          {valid && !result.vacuous ? (
            <CheckCircle2 size={23} />
          ) : (
            <CircleAlert size={23} />
          )}
          <div>
            <h3>{title}</h3>
            <p>{result.message}</p>
          </div>
        </div>
        <div className="scope-label">
          <ShieldCheck size={14} /> Propositional fragment · independent checker
          · not TLAPS
        </div>
        {result.obligations.map((o, index) => (
          <details
            className={`obligation ${o.valid ? "" : "failed"}`}
            key={index}
            open={!o.valid}
          >
            <summary>
              {o.valid ? <Check size={15} /> : <X size={15} />}
              <code>{o.label}</code>
              <span>{o.valid ? "follows" : "does not follow"}</span>
              <ChevronDown size={14} />
            </summary>
            <div>
              <pre>{o.formula}</pre>
              <p className="small">
                Context: theorem assumptions
                {o.references.length
                  ? ` + ${o.references.join(", ")}`
                  : " only"}
                .
              </p>
              {o.counterexample && (
                <>
                  <p className="small">
                    A countervaluation, not an execution trace:
                  </p>
                  <div className="valuation">
                    {Object.entries(o.counterexample).map(([name, value]) => (
                      <div key={name}>
                        <code>{name}</code>
                        <strong className={value ? "true" : "false"}>
                          {String(value).toUpperCase()}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {Object.keys(o.counterexample).length === 0 && (
                    <p className="small">
                      The conclusion is FALSE even with no propositional atoms.
                    </p>
                  )}
                </>
              )}
            </div>
          </details>
        ))}
        {result.status !== "unsupported" && (
          <p className="small result-foot">
            {result.assignments.toLocaleString()} possible Boolean valuation
            {result.assignments === 1 ? "" : "s"}. Checking stops at a
            counterexample. No arithmetic, quantifier, or temporal reasoning.
          </p>
        )}
      </>
    );
  }
  return (
    <>
      <div
        className={`result-heading ${result.status === "success" ? "good" : "warning"}`}
      >
        {result.status === "success" ? (
          <CheckCircle2 size={23} />
        ) : (
          <CircleAlert size={23} />
        )}
        <div>
          <h3>{result.title}</h3>
          <p>{result.detail}</p>
        </div>
      </div>
      {result.states !== undefined && (
        <div className="stats">
          <div>
            <strong>{result.states.toLocaleString()}</strong>
            <span>distinct states</span>
          </div>
          <div>
            <strong>{result.generated?.toLocaleString()}</strong>
            <span>states generated</span>
          </div>
          <div>
            <strong>TLC</strong>
            <span>real model checker</span>
          </div>
        </div>
      )}
      <Trace result={result} />
      <details className="raw-output" open={result.status === "error"}>
        <summary>
          <Terminal size={15} /> Full TLC output <ChevronDown size={14} />
        </summary>
        <pre>{result.raw}</pre>
      </details>
    </>
  );
}

function Reference({
  navigate,
  close,
}: {
  navigate: (id: string) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("concepts");
  const results = glossary.filter((entry) =>
    `${entry[0]} ${entry[1]}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">KEEP THIS WITHIN REACH</span>
          <h2>The field reference.</h2>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close reference"
        >
          <X size={20} />
        </button>
      </div>
      <div className="reference-tabs">
        {["concepts", "checking", "sources"].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "concepts" && (
        <>
          <label className="search-input">
            <Search size={19} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a concept, operator, or tool…"
              aria-label="Search the reference"
            />
            <kbd>esc</kbd>
          </label>
          <div className="reference-list">
            {results.map(([name, definition, id]) => (
              <button
                key={name}
                onClick={() => {
                  navigate(id);
                  close();
                }}
              >
                <div>
                  <h3>{name}</h3>
                  <p>{definition}</p>
                </div>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!results.length && (
              <div className="empty-search">
                <Fish size={32} />
                <p>No matching concept. Try “prime”, “fairness”, or “proof”.</p>
              </div>
            )}
          </div>
        </>
      )}
      {tab === "checking" && (
        <div className="reference-prose">
          <h3>Two tools. Two kinds of evidence.</h3>
          <p>
            <strong>TLC</strong> checks the reachable graph of the configured
            model. A passing run establishes only the configured properties of
            that model, subject to TLC’s own implementation and fingerprinting
            behavior. It does not check THEOREM proofs. Bounds, assumptions, and
            missing properties matter.
          </p>
          <p>
            <strong>The proof lab</strong> is a small, independent propositional
            entailment checker. It checks every supported obligation against
            every Boolean valuation. It is not TLAPS and cannot check
            arithmetic, sets, quantifiers, temporal reasoning, nested proofs, or
            general induction. It does not produce an externally certified proof
            object.
          </p>
          <h3>Accepted proof syntax</h3>
          <pre>{lessons[10].spec}</pre>
          <p>
            Declare at most 12 atoms with CONSTANTS. Use TRUE, FALSE, ~, /\, \/,
            =&gt;, &lt;=&gt;, and parentheses. Parenthesize mixed operators.
            Write one theorem, an optional ASSUME … PROVE … context, and PROOF
            OBVIOUS or flat &lt;1&gt; steps ending in QED. Each step needs
            OBVIOUS or BY with earlier step references. Unsupported input is
            rejected, never silently translated.
          </p>
          <h3>What stays in your browser?</h3>
          <p>
            Your drafts, notes, progress, and computation. TLC runs as Java
            through CheerpJ. The browser downloads the runtime from Leaning
            Technologies’ CDN; it does not submit your specification to a
            checking server. The site itself uses no analytics. Local storage is
            not a backup: export your work, especially on shared or temporary
            browser profiles.
          </p>
          <h3>Practical limits</h3>
          <p>
            One .tla module plus the bundled standard library, and one .cfg
            file. No PlusCal translation or additional custom modules here. TLC
            startup depends on the runtime CDN and a modern WebAssembly-capable
            browser. Startup is capped at 3 minutes, exploration at 90 seconds;
            stopping yields no established result. Keep models finite and small.
            Use local tools for large models.
          </p>
          <h3>Run the exported model locally</h3>
          <pre>
            java -cp tla2tools.jar tlc2.TLC -config Counter.cfg Counter.tla
          </pre>
          <p>
            Use your exported module’s filename in place of Counter. Get the
            tools from the{" "}
            <a
              href="https://github.com/tlaplus/tlaplus/releases"
              target="_blank"
              rel="noreferrer"
            >
              official TLA+ releases
            </a>
            . For full deductive proof checking, follow the{" "}
            <a
              href="https://proofs.tlapl.us/doc/web/content/Home.html"
              target="_blank"
              rel="noreferrer"
            >
              TLAPS installation guide
            </a>
            .
          </p>
        </div>
      )}
      {tab === "sources" && (
        <div className="reference-prose">
          <p>
            This is an original, hands-on companion to two exceptional
            resources, not a replacement or an official TLA+ project.
          </p>
          <a
            className="source-card"
            href="https://lamport.azurewebsites.net/video/videos.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="source-number">01</span>
            <div>
              <h3>Leslie Lamport’s TLA+ video course</h3>
              <p>
                For the mental model. Start with State Machines, then Die Hard.
                Return for implementation, liveness, and refinement. Written
                scripts accompany the lectures.
              </p>
            </div>
            <ArrowUpRight size={20} />
          </a>
          <a
            className="source-card"
            href="https://learntla.com/index.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="source-number">02</span>
            <div>
              <h3>Learn TLA+ by Hillel Wayne</h3>
              <p>
                For the practical craft. Work through the Core, especially
                invariants, concurrency, and temporal properties. It introduces
                PlusCal first; this companion starts with pure TLA+.
              </p>
            </div>
            <ArrowUpRight size={20} />
          </a>
          <a
            className="source-card"
            href="https://proofs.tlapl.us/doc/web/content/Home.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="source-number">03</span>
            <div>
              <h3>The TLA+ Proof System</h3>
              <p>
                For full deductive proofs. Follow the Euclid tutorial, learn
                usable facts and definition expansion, and check your proofs
                with TLAPS.
              </p>
            </div>
            <ArrowUpRight size={20} />
          </a>
          <h3>Under the waterline</h3>
          <p>
            TLC from the official 1.8.0 prerelease is the Java model checker,
            run through{" "}
            <a href="https://cheerpj.com" target="_blank" rel="noreferrer">
              CheerpJ 4.3 by Leaning Technologies
            </a>
            . The in-browser architecture was informed by{" "}
            <a
              href="https://learning.tlapl.us/intro/platform/"
              target="_blank"
              rel="noreferrer"
            >
              TLA+ By Example
            </a>
            . Editing uses CodeMirror. Icons are from Lucide.
          </p>
          <p>
            CheerpJ’s Community License covers personal learning and FOSS uses;
            organizational use may require a commercial license. Review{" "}
            <a
              href="https://cheerpj.com/docs/licensing"
              target="_blank"
              rel="noreferrer"
            >
              the licensing terms
            </a>{" "}
            before broader deployment.{" "}
            <a
              href={assetUrl("THIRD_PARTY_NOTICES.txt")}
              target="_blank"
              rel="noreferrer"
            >
              Third-party notices
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [initial] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState<Workspace>(initial.workspace);
  const [notice, setNotice] = useState(initial.error ?? "");
  const [saved, setSaved] = useState(!initial.error);
  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem("tilapias.motion") !== "off";
    } catch {
      return true;
    }
  });
  const hashId = location.hash.slice(1);
  const [id, setId] = useState(findLesson(hashId || workspace.current).id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  const sidebar = useRef<HTMLElement>(null);
  const mobileMenu = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<"spec" | "cfg">("spec");
  const [results, setResults] = useState<Record<string, SavedResult>>({});
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [runError, setRunError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const lesson = findLesson(id);
  const scratch = id.startsWith("scratch-");
  const index = lessons.findIndex((l) => l.id === id);
  const draft = workspace.drafts[id] ?? {
    spec: lesson.spec,
    cfg: lesson.cfg,
    notes: "",
  };
  const result = results[id];
  const stale =
    result && (result.spec !== draft.spec || result.cfg !== draft.cfg);
  const completed = workspace.completed.filter((x) =>
    lessons.some((l) => l.id === x),
  ).length;
  const name = moduleName(draft.spec);
  const chapters = [...new Set(lessons.map((l) => l.chapter))];

  function updateDraft(patch: Partial<Draft>) {
    setWorkspace((w) => ({
      ...w,
      drafts: { ...w.drafts, [id]: { ...draft, ...patch } },
    }));
  }
  function navigate(next: string) {
    controller.current?.abort();
    controller.current = null;
    setRunning(false);
    const valid = findLesson(next).id;
    setId(valid);
    setTab("spec");
    setRunError("");
    setMobileOpen(false);
    setWorkspace((w) => ({ ...w, current: valid }));
    history.replaceState(null, "", `#${valid}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      document.getElementById("lesson-title")?.focus({ preventScroll: true }),
    );
  }
  function closeMobileNavigation() {
    setMobileOpen(false);
    requestAnimationFrame(() => mobileMenu.current?.focus());
  }
  function openReference() {
    setMobileOpen(false);
    setReferenceOpen(true);
    dialog.current?.showModal();
  }
  function closeReference() {
    setReferenceOpen(false);
    dialog.current?.close();
  }
  async function run() {
    if (running) return;
    const snapshot = { spec: draft.spec, cfg: draft.cfg };
    setRunError("");
    if (lesson.mode === "proof") {
      setResults((r) => ({
        ...r,
        [id]: { ...snapshot, value: checkProof(draft.spec) },
      }));
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setElapsed(0);
    try {
      const value = await runTlc(draft.spec, draft.cfg, abort.signal, setPhase);
      if (controller.current === abort)
        setResults((r) => ({ ...r, [id]: { ...snapshot, value } }));
    } catch (error) {
      if (controller.current === abort)
        setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      if (controller.current === abort) {
        setRunning(false);
        controller.current = null;
      }
    }
  }
  function reset() {
    if (
      !confirm(
        "Restore this starter specification and configuration? Your notes and other lessons will be kept.",
      )
    )
      return;
    updateDraft({ spec: lesson.spec, cfg: lesson.cfg });
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5000000)
        throw new Error("Backups must be smaller than 5 MB.");
      const restored = validateWorkspace(JSON.parse(await file.text()));
      if (
        !confirm(
          "Replace this browser’s drafts, notes, and progress with this backup? Export first if you want to keep them.",
        )
      )
        return;
      controller.current?.abort();
      controller.current = null;
      setRunning(false);
      setWorkspace(restored);
      setId(findLesson(restored.current).id);
      setResults({});
      setRunError("");
      setTab("spec");
      history.replaceState(null, "", `#${findLesson(restored.current).id}`);
      setNotice("Backup restored. No specifications were run automatically.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not read this backup.",
      );
    }
  }
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
      setSaved(true);
    } catch {
      setSaved(false);
      setNotice(
        "Local saving is unavailable or full. Export a backup to keep your work.",
      );
    }
  }, [workspace]);
  useEffect(() => {
    document.title = `${lesson.concept} · tilapias — Learn TLA+`;
  }, [lesson.concept]);
  useEffect(() => {
    const query = matchMedia("(max-width: 900px)");
    const change = () => {
      setIsMobile(query.matches);
      if (!query.matches) setMobileOpen(false);
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobileOpen || !isMobile) return;
    const panel = sidebar.current;
    const focusable = () =>
      [
        ...(panel?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), summary",
        ) ?? []),
      ].filter((element) => element.getClientRects().length);
    const focusFrame = requestAnimationFrame(() => focusable()[0]?.focus());
    const containFocus = (event: KeyboardEvent) => {
      if (dialog.current?.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      } else if (!panel?.contains(document.activeElement)) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", containFocus);
    };
  }, [mobileOpen, isMobile]);
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    try {
      localStorage.setItem("tilapias.motion", motion ? "on" : "off");
    } catch {
      /* Decorative preferences are optional. */
    }
  }, [motion]);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openReference();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        !mobileOpen &&
        !dialog.current?.open
      ) {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const changed = () => navigate(location.hash.slice(1));
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
    };
  }, []);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to lesson
      </a>
      {mobileOpen && isMobile && (
        <button
          className="mobile-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={closeMobileNavigation}
        />
      )}
      <aside
        ref={sidebar}
        id="learning-path"
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
        inert={isMobile && !mobileOpen}
        role={isMobile && mobileOpen ? "dialog" : undefined}
        aria-modal={isMobile && mobileOpen ? true : undefined}
        aria-label="Learning path"
      >
        <button
          className="icon-button sidebar-close"
          onClick={closeMobileNavigation}
          aria-label="Close learning path"
        >
          <X size={20} />
        </button>
        <a
          href="#states"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("states");
          }}
        >
          <span className="brand-icon">
            <Fish size={28} strokeWidth={1.6} />
          </span>
          <span>
            tilapias<span className="brand-dot">.</span>
            <small>A TLA+ FIELD GUIDE</small>
          </span>
        </a>
        <button className="search-trigger" onClick={openReference}>
          <Search size={16} />
          <span>Find your bearings</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="journey-label">
          <span>YOUR LEARNING PATH</span>
          <span>
            {completed} / {lessons.length}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Lessons marked understood"
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-valuenow={completed}
        >
          <div style={{ width: `${(completed / lessons.length) * 100}%` }} />
        </div>
        <nav aria-label="Learning path" className="curriculum">
          {chapters.map((chapter) => (
            <details
              key={`${chapter}-${lesson.chapter === chapter}`}
              open={lesson.chapter === chapter && !scratch}
            >
              <summary>
                <span>{chapter}</span>
                <ChevronDown size={14} />
              </summary>
              <div>
                {lessons
                  .filter((l) => l.chapter === chapter)
                  .map((l) => (
                    <button
                      className={`lesson-link ${l.id === id ? "active" : ""}`}
                      key={l.id}
                      onClick={() => navigate(l.id)}
                      aria-current={l.id === id ? "page" : undefined}
                    >
                      <span className="lesson-number">
                        {workspace.completed.includes(l.id) ? (
                          <Check size={13} />
                        ) : (
                          String(lessons.indexOf(l) + 1).padStart(2, "0")
                        )}
                      </span>
                      <span>{l.concept}</span>
                      {l.id === id && (
                        <Fish
                          className="active-fish"
                          size={15}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
              </div>
            </details>
          ))}
        </nav>
        <div className="sidebar-tools">
          <button onClick={openReference}>
            <BookOpen size={17} /> Field reference <ArrowUpRight size={14} />
          </button>
          <button
            className={scratch ? "active" : ""}
            onClick={() => navigate("scratch-model")}
          >
            <FlaskConical size={17} /> Your scratchpad{" "}
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <Aquarium miniature />
          <div className="backup-actions">
            <button
              onClick={() =>
                download(
                  "tilapias-backup.json",
                  JSON.stringify(workspace, null, 2),
                  "application/json",
                )
              }
              title="Export all drafts, notes, and progress"
            >
              <Download size={14} /> Backup
            </button>
            <button
              onClick={() => importInput.current?.click()}
              title="Restore a tilapias backup"
            >
              <Upload size={14} /> Restore
            </button>
          </div>
          <input
            type="file"
            ref={importInput}
            hidden
            accept=".json,application/json"
            onChange={(e) => {
              void importBackup(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="local-status">
            <span className={saved ? "status-dot" : "status-dot warning-dot"} />{" "}
            {saved ? "Saved on this device" : "Local saving unavailable"}
          </span>
          <button
            className="motion-toggle"
            aria-pressed={motion}
            onClick={() => setMotion((m) => !m)}
          >
            <Waves size={13} />{" "}
            {motion
              ? "Still the water · pause motion"
              : "Let it flow · enable motion"}
          </button>
        </div>
      </aside>

      <main id="main" tabIndex={-1} inert={isMobile && mobileOpen}>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open learning path"
              aria-expanded={mobileOpen}
              aria-controls="learning-path"
              ref={mobileMenu}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="desktop-strapline">
              SMALL MODELS. DEEP UNDERSTANDING.
            </span>
            <span className="mobile-strapline">TLA+ field guide</span>
          </div>
          <span className="browser-badge">
            <span className="status-dot" />
            <span className="desktop-browser-label">
              Your browser is the lab
            </span>
            <span className="mobile-browser-label">Browser lab</span>
          </span>
        </header>
        {notice && (
          <div className="notice" role="status">
            <CircleAlert size={17} />
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <section className="hero" key={`hero-${id}`}>
          <div>
            <div className="hero-eyebrow">
              <span className="pill">
                {scratch
                  ? "FREE EXPLORATION"
                  : `LESSON ${String(index + 1).padStart(2, "0")}`}
              </span>
              <span>{lesson.subtitle}</span>
            </div>
            <h1 id="lesson-title" tabIndex={-1}>
              {lesson.title}
            </h1>
            <p>{lesson.intro}</p>
            <button
              className="workbench-jump"
              onClick={() => {
                const target = document.getElementById("workbench");
                target?.scrollIntoView({ block: "start" });
                target?.focus({ preventScroll: true });
              }}
            >
              <ArrowDown size={15} /> Jump to the workbench
            </button>
          </div>
          <Pond />
        </section>

        <div className={`lesson-layout ${scratch ? "scratch-layout" : ""}`}>
          <section className="lesson-body" aria-label="Lesson explanation">
            {!scratch ? (
              <>
                <div className="section-label">
                  <span className="section-dot">1</span>
                  <h2>Get the idea</h2>
                  <span className="thin-line" />
                </div>
                {lesson.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                <details className="disclosure notation">
                  <summary>
                    <Code2 size={16} />
                    <span>Read the notation</span>
                    <ChevronDown size={15} />
                  </summary>
                  <div>
                    {lesson.notation.map((n) => (
                      <div className="notation-row" key={n.code}>
                        <code>{n.code}</code>
                        <p>{n.meaning}</p>
                      </div>
                    ))}
                  </div>
                </details>
                <div className="prediction">
                  <span className="eyebrow">
                    <Lightbulb size={14} /> PAUSE & PREDICT
                  </span>
                  <p>{lesson.prediction}</p>
                  <details>
                    <summary>
                      Think first. Then reveal. <ChevronDown size={14} />
                    </summary>
                    <p>{lesson.reveal}</p>
                  </details>
                </div>
                <div className="section-label experiment-label">
                  <span className="section-dot">2</span>
                  <h2>Make one change</h2>
                  <span className="thin-line" />
                </div>
                <p>{lesson.task}</p>
                <div className="hints">
                  {lesson.hints.map((hint, i) => (
                    <details key={hint}>
                      <summary>
                        <Lightbulb size={14} />
                        <span>Hint {i + 1}</span>
                        <ChevronDown size={14} />
                      </summary>
                      <p>{hint}</p>
                    </details>
                  ))}
                  <details>
                    <summary>
                      <FileCode2 size={14} />
                      <span>Show the edit</span>
                      <ChevronDown size={14} />
                    </summary>
                    <pre>{lesson.solution}</pre>
                    <p className="small">
                      A snippet to edit into your file, not a replacement for
                      the whole module.
                    </p>
                  </details>
                </div>
              </>
            ) : (
              <>
                <div className="section-label">
                  <FlaskConical size={19} />
                  <h2>Choose your instrument</h2>
                </div>
                <div className="scratch-modes">
                  <button
                    className={lesson.mode === "model" ? "selected" : ""}
                    onClick={() => navigate("scratch-model")}
                  >
                    <Circle size={15} /> Model checking
                    <span>Actual TLC · finite models</span>
                  </button>
                  <button
                    className={lesson.mode === "proof" ? "selected" : ""}
                    onClick={() => navigate("scratch-proof")}
                  >
                    <ShieldCheck size={15} /> Propositional proofs
                    <span>Independent checker · not TLAPS</span>
                  </button>
                </div>
                <h3>Keep the question small.</h3>
                <p>
                  {lesson.mode === "model"
                    ? "Write one module using the bundled standard library. The .cfg tab selects constants, the initial and next-state predicates (or a temporal specification), and the properties you want TLC to check."
                    : "Declare propositions with CONSTANTS. Use ~, /\\, \\/, =>, <=>, TRUE, FALSE, and parentheses. Write a THEOREM and PROOF OBVIOUS, or flat <1> steps with OBVIOUS or BY references and a final QED."}
                </p>
                <div className="callout">
                  <CircleAlert size={19} />
                  <p>
                    {lesson.mode === "model"
                      ? "TLC does not check theorem proofs. A successful run says nothing about a property missing from the configuration."
                      : "Sets, arithmetic, quantifiers, definitions, temporal operators, and nested proofs are unsupported here. Use TLAPS for full TLA+ proof checking."}
                  </p>
                </div>
                <button className="text-button" onClick={openReference}>
                  Read the exact checking boundaries <ArrowUpRight size={15} />
                </button>
                <p className="small">
                  The model and proof scratchpads have separate drafts. Editing
                  here never changes your lesson work.
                </p>
              </>
            )}
          </section>

          <section
            className="workbench"
            id="workbench"
            tabIndex={-1}
            aria-label="Interactive TLA+ workbench"
          >
            <div className="workbench-heading">
              <span>
                <span className="live-square" />
                <strong>The workbench</strong>
              </span>
              <span className="engine-label">
                {lesson.mode === "model"
                  ? "TLC · 1.8.0 PRE"
                  : "PROPOSITIONAL CHECKER"}
              </span>
            </div>
            <div className="workbench-controls">
              <div
                className="file-tabs"
                role="tablist"
                aria-label="Workbench files"
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    lesson.mode === "proof" || event.key === "Home"
                      ? "spec"
                      : event.key === "End"
                        ? "cfg"
                        : tab === "spec"
                          ? "cfg"
                          : "spec";
                  setTab(next);
                  document.getElementById(`file-tab-${next}`)?.focus();
                }}
              >
                <button
                  role="tab"
                  id="file-tab-spec"
                  aria-controls="source-editor"
                  tabIndex={tab === "spec" ? 0 : -1}
                  aria-selected={tab === "spec"}
                  onClick={() => setTab("spec")}
                  className={tab === "spec" ? "selected" : ""}
                >
                  <FileCode2 size={14} />
                  {name}.tla
                </button>
                {lesson.mode === "model" && (
                  <button
                    role="tab"
                    id="file-tab-cfg"
                    aria-controls="source-editor"
                    tabIndex={tab === "cfg" ? 0 : -1}
                    aria-selected={tab === "cfg"}
                    onClick={() => setTab("cfg")}
                    className={tab === "cfg" ? "selected" : ""}
                  >
                    {name}.cfg
                  </button>
                )}
              </div>
              <div className="editor-tools">
                <button
                  className="icon-button"
                  onClick={() =>
                    download(
                      `${name}.${tab === "spec" ? "tla" : "cfg"}`,
                      draft[tab],
                    )
                  }
                  title="Download the current file"
                  aria-label="Download current file"
                >
                  <Download size={15} />
                </button>
                <button
                  className="icon-button"
                  onClick={reset}
                  title="Restore this starter"
                  aria-label="Restore starter"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
            <div
              id="source-editor"
              className="editor-panel"
              role="tabpanel"
              aria-labelledby={`file-tab-${tab}`}
            >
              <Editor
                key={`${id}-${tab}`}
                value={draft[tab]}
                onChange={(value) => updateDraft({ [tab]: value })}
                label={`${name}.${tab === "spec" ? "tla" : "cfg"} editor`}
              />
            </div>
            <div className="run-bar">
              <span className="editor-meta">
                <span className="status-dot" />{" "}
                {saved ? "Locally saved" : "Not saved"}{" "}
                <span className="keyboard-help">· ⌘/ctrl ↵ to run</span>
              </span>
              {running ? (
                <button
                  className="run-button stop-button"
                  onClick={() => controller.current?.abort()}
                >
                  <Square size={13} fill="currentColor" /> Stop
                </button>
              ) : (
                <button className="run-button" onClick={() => void run()}>
                  <Play size={14} fill="currentColor" />
                  {lesson.mode === "model" ? "Run TLC" : "Check proof"}
                </button>
              )}
            </div>
            <div className="output-heading">
              <span>
                <Terminal size={14} />{" "}
                {lesson.mode === "model"
                  ? "Model checker"
                  : "Proof obligations"}
              </span>
              <span>
                {running
                  ? `${elapsed}s elapsed`
                  : stale
                    ? "EDITOR CHANGED"
                    : result
                      ? "RESULT"
                      : "READY WHEN YOU ARE"}
              </span>
            </div>
            <div
              className="output"
              role="region"
              aria-label="Checker results"
              tabIndex={0}
              aria-live="polite"
              aria-busy={running}
            >
              {running ? (
                <div className="waiting">
                  <LoaderCircle className="spin" size={29} />
                  <h3>{phase}…</h3>
                  <p>
                    {phase.startsWith("Loading")
                      ? "The real Java runtime downloads from CheerpJ’s CDN. The first run can take a little while."
                      : "TLC is checking your specification, not a precomputed example. Larger models need more time."}
                  </p>
                  <span className="small">
                    {elapsed}s elapsed · You can stop at any time.
                  </span>
                </div>
              ) : runError ? (
                <div className="result-heading warning">
                  <CircleAlert size={23} />
                  <div>
                    <h3>No result established</h3>
                    <p>{runError}</p>
                    <p className="small">
                      Retry, reduce the model, or download the .tla and .cfg
                      files for local checking.
                    </p>
                  </div>
                </div>
              ) : result ? (
                <>
                  {stale && (
                    <div className="stale-warning">
                      <CircleAlert size={15} /> This result belongs to an
                      earlier draft. Run again.
                    </div>
                  )}
                  <Result
                    key={`${id}-${result.spec}-${result.cfg}`}
                    result={result.value}
                  />
                </>
              ) : (
                <div className="output-empty">
                  <div className="empty-art">
                    <div className="tiny-shoal" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Fish
                          key={i}
                          size={13 + (i % 3) * 3}
                          style={{ animationDelay: `${-i * 1.1}s` }}
                        />
                      ))}
                    </div>
                    <div className="mini-graph" aria-hidden="true">
                      <span>{lesson.mode === "model" ? "Init" : "P"}</span>
                      <ArrowRight size={21} />
                      <span>{lesson.mode === "model" ? "Next" : "P ⇒ Q"}</span>
                      <ArrowRight size={21} />
                      <span>{lesson.mode === "model" ? "…" : "Q"}</span>
                    </div>
                  </div>
                  <h3>
                    {lesson.mode === "model"
                      ? "Follow the possibilities."
                      : "Follow the reasoning."}
                  </h3>
                  <p>
                    {lesson.mode === "model"
                      ? "Run the model to see what your specification actually allows."
                      : "Check every obligation. A failed claim is an opportunity to understand why."}
                  </p>
                  <span className="empty-disclaimer">
                    Conceptual sketch · no check has run yet
                  </span>
                </div>
              )}
            </div>
            <div className="workbench-foot">
              <ShieldCheck size={13} />
              <span>
                {lesson.mode === "model"
                  ? "Runs in your browser via CheerpJ. Model checking ≠ theorem proving."
                  : "Boolean entailment only. This is not the full TLA+ Proof System."}
              </span>
            </div>
          </section>
        </div>

        {!scratch && (
          <section className="reflection">
            <div className="takeaway">
              <span className="eyebrow">
                <Sparkles size={15} /> TAKE THIS WITH YOU
              </span>
              <p>{lesson.takeaway}</p>
            </div>
            <div className="reflection-body">
              <div className="section-label">
                <span className="section-dot">3</span>
                <h2>Make it yours</h2>
              </div>
              <label htmlFor="notes">
                What surprised you? Explain it to your future self.
              </label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={(e) => updateDraft({ notes: e.target.value })}
                placeholder="I expected… but the checker showed…"
              />
              <span className="small">
                Private notes, saved on this device. Include them in a backup.
              </span>
            </div>
          </section>
        )}
        <section className="deeper-section">
          <div>
            <span className="eyebrow">
              {scratch ? "BEFORE YOU GO FURTHER" : "ONLY WHEN YOU’RE CURIOUS"}
            </span>
            <h2>
              {scratch ? "Know what you’re checking." : "A little deeper."}
            </h2>
          </div>
          <div className="deeper-list">
            {(scratch ? lessons[9].deeper : lesson.deeper).map((item) => (
              <details key={item.title}>
                <summary>
                  {item.title}
                  <ChevronDown size={16} />
                </summary>
                <p>{item.text}</p>
              </details>
            ))}
          </div>
        </section>
        {!scratch && (
          <>
            <section className="sources-row">
              <span>
                GO TO THE SOURCE <ArrowDown size={13} />
              </span>
              <div>
                {lesson.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                    <ArrowUpRight size={14} />
                  </a>
                ))}
              </div>
            </section>
            <div className="lesson-footer">
              <button
                className={`understood-button ${workspace.completed.includes(id) ? "is-complete" : ""}`}
                onClick={() =>
                  setWorkspace((w) => ({
                    ...w,
                    completed: w.completed.includes(id)
                      ? w.completed.filter((x) => x !== id)
                      : [...w.completed, id],
                  }))
                }
              >
                {workspace.completed.includes(id) ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle size={18} />
                )}{" "}
                {workspace.completed.includes(id)
                  ? "Marked understood"
                  : "Mark understood"}
                <span>Your call, not a test score.</span>
              </button>
              <div className="lesson-paging">
                {index > 0 && (
                  <button
                    className="icon-button"
                    onClick={() => navigate(lessons[index - 1].id)}
                    aria-label="Previous lesson"
                  >
                    <ArrowLeft size={19} />
                  </button>
                )}
                {index < lessons.length - 1 ? (
                  <button
                    className="next-lesson"
                    onClick={() => navigate(lessons[index + 1].id)}
                  >
                    <span>
                      <small>NEXT IDEA</small>
                      {lessons[index + 1].concept}
                    </span>
                    <ArrowRight size={20} />
                  </button>
                ) : (
                  <button
                    className="next-lesson"
                    onClick={() => navigate("scratch-model")}
                  >
                    <span>
                      <small>KEEP EXPLORING</small>Your own system
                    </span>
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        <Aquarium />
        <footer className="site-footer">
          <span>
            <Fish size={17} /> tilapias.{" "}
            <span>One idea at a time. No deep end.</span>
          </span>
          <button onClick={openReference}>
            Sources, scope & credits <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      <dialog
        aria-label="Field reference"
        ref={dialog}
        className="reference-dialog"
        onCancel={() => setReferenceOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) closeReference();
        }}
      >
        {referenceOpen && (
          <Reference navigate={navigate} close={closeReference} />
        )}
      </dialog>
    </div>
  );
}
