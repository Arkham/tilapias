# tilapias 🐟

A freshwater field guide to TLA+. Twelve progressive lessons, an editable CodeMirror workbench, the real TLC model checker running in your browser, and a deliberately limited propositional proof lab.

Everything is static. No application server, accounts, analytics, or runtime API keys are needed. Your drafts, notes, and learning progress stay in your browser.

## Develop

Requires Node.js 24+ and npm. Java 11+ is needed for the native model tests and for rebuilding the browser bridge.

```sh
npm ci
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173/`.

## Verify

```sh
npx playwright install chromium
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:tlc
npm run test:ui
npm run build:pages
npm run test:pages
```

Browser tests use Playwright's bundled Chromium. If you prefer an installed Google Chrome, prefix the browser test command with `PLAYWRIGHT_CHANNEL=chrome`.

`test:tlc` runs every model lesson and suggested edit using the bundled real TLC jar, parses proof lessons with SANY, and checks their supported proof obligations with the browser kernel. Browser tests cover editing, persistence, proof checking, keyboard navigation, accessibility, and layouts from 320px to 1920px. The Pages tests verify the built site under `/tilapias/`, including assets and the Java classpath.

To also download and execute the real browser Java runtime in the Pages tests:

```sh
RUN_TLC_BROWSER=1 npm run test:pages
```

This opt-in test requires access to the CheerpJ CDN and can take several minutes. The normal tests do not depend on that external runtime.

## Build and deploy

For hosting at a domain's root:

```sh
npm run build
```

Upload the contents of `dist/` to any static host. This build has no hosting-provider dependency.

For a project site at `/tilapias/`:

```sh
npm run build:pages
```

For a different subdirectory, use `npm run build -- --base=/your-path/`. Image URLs, notices, the TLC iframe, and its Java classpath all respect the deployment path.

### GitHub Pages

The repository's **Checks and Pages** workflow runs validation on pushes to `main` and pull requests. It produces the Pages artifact, but publishing is explicitly opt-in:

1. In repository **Settings → Pages**, select **GitHub Actions** as the source.
2. Add the repository Actions variable `PAGES_ENABLED` with the value `true`.
3. Run **Checks and Pages** manually, or push to `main`.

The project-site URL for this repository is `https://arkham.github.io/tilapias/` once deployment is enabled and succeeds.

**A private repository requires GitHub Pro (or a qualifying organization plan) to use Pages.** Without that entitlement, checks can still run and the static build can be hosted elsewhere. A private repository does not make its published Pages site private: visitors can inspect the JavaScript and images delivered to their browsers. The workflow never changes repository visibility.

## What is actually checked?

### TLC workbench

The official `tla2tools.jar` from **TLA+ tools v1.8.0 prerelease** runs through **CheerpJ 4.3 / Java 11** in a disposable same-origin iframe. This version removes the RMI socket export that prevents v1.7.4 from running in the browser. No model-checking algorithm is reimplemented or patched here.

- Official artifact: https://github.com/tlaplus/tlaplus/releases/tag/v1.8.0
- Bundled jar SHA-256: `ab4694601923fd5ac06452abbf847c366a5054a3d739552085edd6ed986c29ec`
- `java/FieldnotesRunner.java` writes one module/configuration and calls TLC directly, capturing its output.
- One worker, finite models, 3-minute startup timeout and 90-second exploration timeout.
- Every run gets a fresh iframe/JVM to avoid shared Java static state between runs. Stop destroys the iframe and establishes no result.
- Parent and child messages validate origin and window identity.
- A successful result requires TLC's explicit completion message, not just process exit or a plausible state count.
- Unsupported features: uploading additional custom modules, PlusCal translation, and external Java module overrides. The standard TLA+ library is bundled.

Rebuild the tiny bridge after editing its source:

```sh
mkdir -p /tmp/tilapias-java
javac --release 11 -cp public/vendor/tla2tools-1.8.0.jar -d /tmp/tilapias-java java/FieldnotesRunner.java
jar cf public/vendor/fieldnotes-runner.jar -C /tmp/tilapias-java .
```

### Propositional proof lab

`src/proof.ts` is an independent, small propositional entailment checker. It is **not TLAPS**, does not certify general TLA+ proofs, and emits no externally certified proof object. It accepts one complete module, optional CONSTANT(S), one THEOREM, optional ASSUME/PROVE, and PROOF OBVIOUS or flat `<1>` steps with OBVIOUS/BY and final QED.

Formulas use up to 12 declared atoms, TRUE, FALSE, `~`, `/\`, `\/`, `=>`, `<=>`, and parentheses. Mixed binary operators require parentheses. Obligations are checked against Boolean valuations; an invalid obligation stops at a counterexample. Unknown and forward references, malformed syntax, unsupported operators, duplicate names, unfinished proofs, and excessive input are rejected. Contradictory assumptions produce a prominent vacuity warning.

Arithmetic, sets, quantifiers, definitions, temporal formulas, nested proofs, and general induction are **not** supported. The induction lesson checks only a propositional base-case composition and explicitly says it does not prove the counter invariant. The UI links to full TLAPS for the missing capabilities.

## Learning design

Twelve independently accessible lessons: states, actions, invariants, nondeterminism, sets, functions, atomicity, temporal properties, fairness, propositional proofs, structured proofs, and the shape of induction.

Each lesson offers one concept, a prediction, a concrete experiment, two progressively disclosed hints, a suggested edit, a takeaway, personal notes, optional deeper material, and primary-source links. Progress is explicitly self-assessed, never inferred from a green check.

The scratchpads preserve model and proof drafts separately. The searchable field reference includes the exact checker boundaries. Editing a file visibly invalidates an earlier result; the older result is retained only as stale evidence.

## Persistence and privacy

Drafts, notes, preferences, and progress use browser localStorage. JSON backup/restore is available, with schema and size validation. Failed storage writes are surfaced. A backup import never runs a specification. Local storage is not cloud sync and is not a durable backup.

TLC computation and proof checking happen locally. The browser downloads static site assets, fonts from Google Fonts, and the CheerpJ runtime from Leaning Technologies' CDN. The app has no analytics and does not submit specifications to a checking server. Hosting providers may keep their own access logs.

Drafts are tied to the site's origin. Before moving between hosts, export a backup on the old site and restore it on the new one.

## Fish, motion, and accessibility

Four distinct AI-generated natural-history tilapia illustrations (sage, silver-blue, rose, and gold) are optimized into reusable WebPs. Multiple depth layers, a sidebar aquarium, a footer shoal, bubbles, caustics, and pointer parallax share the small assets. The original SVG drawing is a fallback for the hero.

`scripts/generate-art.py` is an optional, paid build-time artwork tool using the OpenAI image API. Set `OPENAI_API_KEY` in your environment and install `cwebp` before running it. The existing artwork is included; building, testing, deploying, and using the site require no API key. Original generated PNGs and environment files are ignored by git.

The site respects `prefers-reduced-motion`; a persistent “Still the water” control also pauses decoration. Animations do not move the editor. The reference uses a native modal dialog. The mobile navigation contains keyboard focus, and file tabs support arrow keys. In CodeMirror, press Escape then Tab to leave the editor if Tab is being used for indentation. Cmd/Ctrl+Enter runs; Cmd/Ctrl+K opens the reference.

## Primary sources

- Leslie Lamport's video course: https://lamport.azurewebsites.net/video/videos.html
- Hillel Wayne's Learn TLA+: https://learntla.com/index.html
- TLAPS: https://proofs.tlapl.us/doc/web/content/Home.html
- Browser runtime precedent: https://learning.tlapl.us/intro/platform/

Lesson text and examples are original. See `public/THIRD_PARTY_NOTICES.txt` for dependency licenses and runtime attribution. CheerpJ's Community License permits personal learning and FOSS use; **organizational/internal business use may require a commercial license**. Review https://cheerpj.com/docs/licensing before expanding beyond personal use.
