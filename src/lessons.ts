export type Lesson = {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  concept: string;
  intro: string;
  paragraphs: string[];
  notation: { code: string; meaning: string }[];
  prediction: string;
  reveal: string;
  task: string;
  hints: string[];
  solution: string;
  takeaway: string;
  deeper: { title: string; text: string }[];
  sources: { label: string; url: string }[];
  spec: string;
  cfg: string;
  mode: "model" | "proof";
  expected: "success" | "violation";
};

const video = {
  label: "Lamport · The TLA+ video course",
  url: "https://lamport.azurewebsites.net/video/videos.html",
};
const core = (path: string, label: string) => ({
  label: `Learn TLA+ · ${label}`,
  url: `https://learntla.com/core/${path}.html`,
});
const proofSource = {
  label: "TLAPS · Proofs, facts, and definitions",
  url: "https://proofs.tlapl.us/doc/web/content/Documentation/Tutorial/A_simple_proof.html",
};
const counter = String.raw`---- MODULE Counter ----
EXTENDS Naturals
VARIABLE x

Init == x = 0
Next == x' = IF x < 2 THEN x + 1 ELSE 0

TypeOK == x \in 0..2
====`;
const counterCfg = "INIT Init\nNEXT Next\nINVARIANT TypeOK";
const proof = (body: string, declarations = "P, Q") =>
  `---- MODULE Reasoning ----\nCONSTANTS ${declarations}\n\n${body}\n====`;

export const lessons: Lesson[] = [
  {
    id: "states",
    chapter: "01 · Think in states",
    title: "A system is a collection of possibilities.",
    subtitle: "Start with a snapshot, not a program.",
    concept: "State",
    intro:
      "Forget how the code runs for a moment. What can be true of your system right now? That snapshot is a state.",
    paragraphs: [
      "Our whole system is one counter, called x. When x is 0, that is one state. When x is 1, that is another. The specification describes which snapshots can follow which.",
      "Read Init as “we begin at zero.” Read Next as “count up to two, then return to zero.” You do not need to understand every symbol yet. Run it first, then change one thing.",
    ],
    notation: [
      {
        code: "VARIABLE x",
        meaning: "x can have a different value in different states.",
      },
      {
        code: "Init == x = 0",
        meaning: "The definition Init is true exactly when x equals zero.",
      },
      {
        code: "x'",
        meaning: "The value of x in the next state. We will unpack this next.",
      },
    ],
    prediction:
      "If the counter can run forever, does the checker need to explore infinitely many distinct states?",
    reveal:
      "No. This model has three reachable states: x = 0, x = 1, and x = 2. A finite graph can describe behaviors that go around a cycle forever. TLC explores states, not every possible execution separately.",
    task: "Run the starter. Then change Init to x = 1 and run again. Does the set of reachable states change?",
    hints: [
      "Look for the line beginning Init ==. Change only its right-hand side.",
      "Follow the cycle from 1: it goes to 2, then 0, then 1 again.",
    ],
    solution: "Init == x = 1",
    takeaway:
      "A state is a snapshot. A behavior is an infinite sequence of snapshots. A finite state graph can describe infinitely many steps.",
    deeper: [
      {
        title: "Why write a specification instead of code?",
        text: "A model keeps the choices relevant to a question and leaves out the rest. This counter has no memory layout, threads, or UI. That is intentional. A successful check says something about this abstraction, not automatically about an implementation.",
      },
      {
        title: "What are TypeOK and the .cfg file?",
        text: "TypeOK is the property we ask TLC to check in every reachable state. The configuration chooses Init, Next, and TypeOK. In lesson 3, you will deliberately break it. The configuration is editable under the .cfg tab.",
      },
    ],
    sources: [
      video,
      {
        label: "Learn TLA+ · Conceptual overview",
        url: "https://learntla.com/intro/conceptual-overview.html",
      },
    ],
    spec: counter,
    cfg: counterCfg,
    mode: "model",
    expected: "success",
  },
  {
    id: "actions",
    chapter: "01 · Think in states",
    title: "Describe a step. Don’t execute a line.",
    subtitle: "An action relates “now” to “next.”",
    concept: "Action",
    intro:
      "In ordinary code, statements run in an order. In TLA+, an action is a condition on a pair of states.",
    paragraphs: [
      "The prime in x' refers to the next state. x' = x + 1 does not assign to x; it says which next states are allowed. A guard such as x < 2 narrows those possibilities.",
      "The two lines joined by /\\ must both hold. Inc permits an increment below two. Reset permits a return to zero at two. Next allows either action.",
    ],
    notation: [
      { code: "x' = x + 1", meaning: "Next x is current x plus one." },
      { code: "/\\", meaning: "AND: both conditions must hold." },
      { code: "\\/", meaning: "OR: either action may occur." },
      {
        code: "==",
        meaning: "Defines an operator. A single = compares values.",
      },
    ],
    prediction:
      "Does swapping the two conjuncts of Inc change which next states it allows?",
    reveal:
      "No. The guard and the equation are a conjunction, not a sequence of instructions. Both constrain the same current/next pair. TLC does impose evaluation constraints on executable specifications, but this reordering has the same meaning.",
    task: "Change Reset so it returns to 1 instead of 0. Predict which states remain reachable from the initial state.",
    hints: [
      "Edit x' = 0 in Reset, not x = 0 in Init.",
      "The initial state still counts as reachable, even if you never return to it.",
    ],
    solution: "Reset == /\\ x = 2\n         /\\ x' = 1",
    takeaway:
      "Unprimed variables describe now. Primed variables describe next. Every variable needs a next-state constraint in each action.",
    deeper: [
      {
        title: "What if another variable should stay unchanged?",
        text: "Write UNCHANGED y, which means y' = y. A missing next-state constraint does not mean “leave it alone.” It leaves that variable unconstrained and can make the model impossible for TLC to enumerate.",
      },
    ],
    sources: [video, core("action-properties", "Action properties")],
    spec: String.raw`---- MODULE Actions ----
EXTENDS Naturals
VARIABLE x

Init == x = 0
Inc == /\ x < 2
       /\ x' = x + 1
Reset == /\ x = 2
         /\ x' = 0
Next == Inc \/ Reset

TypeOK == x \in 0..2
====`,
    cfg: counterCfg,
    mode: "model",
    expected: "success",
  },
  {
    id: "invariants",
    chapter: "01 · Think in states",
    title: "Make a promise. Try to break it.",
    subtitle: "Your first counterexample is a success.",
    concept: "Invariant",
    intro:
      "An invariant is a state predicate that should be true in every reachable state. Think “the balance is never negative,” not “the balance will eventually increase.”",
    paragraphs: [
      "Our promise is x ∈ 0..2. There is a small bug in the increment guard. Let TLC explore the consequences instead of arguing from the code.",
      "If a promise fails, the trace is evidence: an initial state, some allowed steps, and a state where the predicate is false. The first failing step is often more useful than the last line of output.",
    ],
    notation: [
      { code: "x \\in 0..2", meaning: "x is a member of the set {0, 1, 2}." },
      {
        code: "INVARIANT TypeOK",
        meaning: "Ask TLC to check TypeOK in every reachable state.",
      },
    ],
    prediction:
      "What is the first value that can violate TypeOK? Which action can produce it?",
    reveal:
      "The increment is enabled at x = 2 because the guard uses <=. It can produce x = 3. Reset being enabled too does not make the increment safe: TLC explores both choices.",
    task: "Run the buggy model, inspect the counterexample, then fix the guard without weakening TypeOK.",
    hints: [
      "The promise is correct. Change what the system can do, not what you promise.",
      "At the upper boundary, the increment must be disabled.",
    ],
    solution: "Inc == /\\ x < 2\n       /\\ x' = x + 1",
    takeaway:
      "A check is only as meaningful as its properties. Weakening the invariant until it passes can hide the design bug.",
    deeper: [
      {
        title: "Is TypeOK a type declaration?",
        text: "No. TLA+ is untyped. TypeOK is an ordinary predicate that constrains the values we expect to see. TLC checks it because we listed it in the configuration, not because of its name.",
      },
      {
        title: "Did I just prove the system correct?",
        text: "You checked the configured finite model against one predicate. You did not establish the result for every possible bound, prove that the predicate captures the real requirement, or prove that production code implements this model.",
      },
    ],
    sources: [core("invariants", "Writing an invariant"), video],
    spec: String.raw`---- MODULE Boundary ----
EXTENDS Naturals
VARIABLE x

Init == x = 0
Inc == /\ x <= 2
       /\ x' = x + 1
Reset == /\ x = 2
         /\ x' = 0
Next == Inc \/ Reset

TypeOK == x \in 0..2
====`,
    cfg: counterCfg,
    mode: "model",
    expected: "violation",
  },
  {
    id: "choices",
    chapter: "02 · Model real choices",
    title: "“Either” means explore both.",
    subtitle: "Nondeterminism is not randomness.",
    concept: "Nondeterminism",
    intro:
      "A specification can leave a choice open. It does not have to pick a scheduling policy, a random seed, or the most likely outcome.",
    paragraphs: [
      "Here, either a small deposit or a large deposit can happen. TLC explores every enabled alternative, including the awkward one at the boundary.",
      "The shared guard checks only the current balance. A condition that makes one alternative safe may not make every alternative safe.",
    ],
    notation: [
      {
        code: "x' = x + 1 \\/ x' = x + 2",
        meaning:
          "Either next value is permitted. No probabilities are assigned.",
      },
      {
        code: "/\\ x < 3",
        meaning: "A guard constrains the current state, not the next value.",
      },
    ],
    prediction:
      "At x = 2, is the two-unit deposit allowed? Is its result inside 0..3?",
    reveal:
      "It is allowed, and its result is 4. “There exists a safe choice” is not enough for an invariant; every allowed choice must preserve it.",
    task: "Give each deposit its own guard so that neither can leave 0..3. Keep both choices available where they fit.",
    hints: [
      "A one-unit deposit is safe below 3. A two-unit deposit is safe below 2.",
      "Write Deposit as an OR of two guarded actions. Leave Next == Deposit \\/ Reset unchanged.",
    ],
    solution: String.raw`Deposit == \/ /\ x < 3
              /\ x' = x + 1
           \/ /\ x < 2
              /\ x' = x + 2`,
    takeaway:
      "Nondeterminism models what could happen. An invariant must survive every allowed choice, not just the friendly ones.",
    deeper: [
      {
        title: "Why not model probabilities?",
        text: "For this safety question, we care whether an outcome is possible at all. Standard TLC is not a probabilistic model checker. Probability would answer a different question: how likely the failure is under a specific distribution.",
      },
    ],
    sources: [core("nondeterminism", "Nondeterminism")],
    spec: String.raw`---- MODULE Choices ----
EXTENDS Naturals
VARIABLE x

Init == x = 0
Deposit == /\ x < 3
           /\ (x' = x + 1 \/ x' = x + 2)
Reset == /\ x = 3
         /\ x' = 0
Next == Deposit \/ Reset

TypeOK == x \in 0..3
====`,
    cfg: counterCfg,
    mode: "model",
    expected: "violation",
  },
  {
    id: "sets",
    chapter: "02 · Model real choices",
    title: "Model membership, not machinery.",
    subtitle: "A set is often all the data structure you need.",
    concept: "Sets & quantifiers",
    intro:
      "If you care which tasks are done, but not the order they finished, a set says exactly that. Do not introduce a list just because you would implement one.",
    paragraphs: [
      "Tasks is the universe. done is the subset completed so far. Next chooses any task not yet done and adds it. The order is deliberately unspecified.",
      "The terminal state is intentional here. The configuration disables TLC’s deadlock check; it does not alter the allowed transitions. TypeOK is still checked.",
    ],
    notation: [
      {
        code: "done \\subseteq Tasks",
        meaning: "Every element of done belongs to Tasks.",
      },
      {
        code: "\\E t \\in Tasks \\ done :",
        meaning:
          "There exists an unfinished task t for which the following action holds.",
      },
      {
        code: "done \\union {t}",
        meaning: "Add t to the set. Duplicate elements do not accumulate.",
      },
    ],
    prediction:
      "Would “every task is done” be a valid invariant starting from an empty done set?",
    reveal:
      "No. It is false in the initial state. A condition you want at the end is not automatically a condition that should hold throughout execution.",
    task: 'Add NeverAda == "Ada" \\notin done and add INVARIANT NeverAda to the configuration. Ask TLC to find a way to complete Ada’s task.',
    hints: [
      "Add the definition above the closing ==== line.",
      "A deliberately false invariant can be a reachability query: its counterexample shows how to reach the state you were looking for.",
    ],
    solution:
      'NeverAda == "Ada" \\notin done\n\n\\* In the .cfg file:\n\\* INVARIANT NeverAda',
    takeaway:
      "Choose the simplest mathematical structure that preserves the question you are asking.",
    deeper: [
      {
        title: "For all versus there exists",
        text: "\\A t \\in Tasks : t \\in done says every task is done. \\E t \\in Tasks : t \\in done says at least one is done. On an empty domain, a universal statement is true and an existential statement is false.",
      },
    ],
    sources: [
      core("invariants", "Quantifiers"),
      core("operators", "Operators and values"),
    ],
    spec: String.raw`---- MODULE Tasks ----
Tasks == {"Ada", "Grace", "Leslie"}
VARIABLE done

Init == done = {}
Next == \E t \in Tasks \ done :
          done' = done \union {t}

TypeOK == done \subseteq Tasks
====`,
    cfg: "INIT Init\nNEXT Next\nINVARIANT TypeOK\nCHECK_DEADLOCK FALSE",
    mode: "model",
    expected: "success",
  },
  {
    id: "functions",
    chapter: "02 · Model real choices",
    title: "One rule. Many workers.",
    subtitle: "A function is a mapping, not a subroutine.",
    concept: "Functions",
    intro:
      "A mathematical function associates every input in a domain with a value. It is a natural way to model one piece of state per worker.",
    paragraphs: [
      'phase maps each worker to "idle" or "done". The initial function sends every worker to "idle". Each step chooses an idle worker and changes only its entry.',
      "EXCEPT produces an updated function. It does not mutate phase while the expression is being evaluated. The equation constrains the next value of the whole variable.",
    ],
    notation: [
      {
        code: '[w \\in Workers |-> "idle"]',
        meaning: 'Construct a function that maps every worker to "idle".',
      },
      {
        code: '[phase EXCEPT ![w] = "done"]',
        meaning: "A function equal to phase except at input w.",
      },
      {
        code: '[Workers -> {"idle", "done"}]',
        meaning:
          "The set of all functions with this domain and these allowed values.",
      },
    ],
    prediction: 'After worker "a" finishes, must worker "b" be done too?',
    reveal:
      "No. Only the chosen entry changes. With two workers, the model allows either to finish first.",
    task: 'Add a third worker "c" to Workers. Run again. Before running, explain why there are more reachable states.',
    hints: [
      "No other lines need to change. Both the initial function and Next use Workers.",
      "Each worker can independently be idle or done. More workers create more combinations.",
    ],
    solution: 'Workers == {"a", "b", "c"}',
    takeaway:
      "Use functions to represent indexed state. Quantify over the domain to describe symmetric participants.",
    deeper: [
      {
        title: "Why start with so few workers?",
        text: "Concurrent systems create combinations quickly. Small finite models often expose structural bugs without a huge search. Passing for two or three workers is useful evidence, but not a proof for every worker count.",
      },
    ],
    sources: [video, core("functions", "Structured data")],
    spec: String.raw`---- MODULE Workers ----
Workers == {"a", "b"}
VARIABLE phase

Init == phase = [w \in Workers |-> "idle"]
Next == \E w \in Workers :
          /\ phase[w] = "idle"
          /\ phase' = [phase EXCEPT ![w] = "done"]

TypeOK == phase \in [Workers -> {"idle", "done"}]
====`,
    cfg: "INIT Init\nNEXT Next\nINVARIANT TypeOK\nCHECK_DEADLOCK FALSE",
    mode: "model",
    expected: "success",
  },
  {
    id: "concurrency",
    chapter: "02 · Model real choices",
    title: "The bug lives between the steps.",
    subtitle: "Two workers. One lost update.",
    concept: "Atomicity",
    intro:
      "Both workers mean to increment the counter once. But reading and writing are separate actions. Another worker can act in between.",
    paragraphs: [
      "Read(w) remembers the counter in tmp[w]. Write(w) stores that remembered value plus one. pc tracks each worker’s next action.",
      "Correct only requires counter = 2 when both workers are done. It deliberately says nothing about the counter halfway through.",
    ],
    notation: [
      {
        code: "UNCHANGED <<counter, pc>>",
        meaning: "Leave both listed variables unchanged in this step.",
      },
      {
        code: "AllDone => counter = 2",
        meaning:
          "If everyone is done, the counter must be two. Otherwise the predicate is true.",
      },
    ],
    prediction:
      "Can both workers finish while the counter is only 1? Write down the ordering before you run.",
    reveal:
      "Yes: Read(a), Read(b), Write(a), Write(b). Both read zero, so both write one. The actions within each worker stay ordered; their interleaving is the problem.",
    task: "Find the lost-update trace. Then change Write to increment the current counter instead of the remembered value. Recheck Correct.",
    hints: [
      "The failing trace will show tmp values and pc, not just counter. Watch when each value was read.",
      "Replace counter' = tmp[w] + 1 with counter' = counter + 1. This changes the atomicity assumption.",
    ],
    solution: "counter' = counter + 1",
    takeaway:
      "Atomicity is part of the model. A “fix” that assumes atomic read-modify-write needs an implementation that really provides it.",
    deeper: [
      {
        title: "Why not simply call that fixed?",
        text: "Changing the model to an atomic increment is valid only if the system can supply that atomic operation, such as a lock-protected update or compare-and-swap loop with an appropriate argument. Modeling away the race is not an implementation of the fix.",
      },
      {
        title: "What does UNCHANGED really do?",
        text: "A Read step changes tmp and pc, but not counter. A Write step changes counter and pc, but not tmp. Each action must constrain the next value of all three variables. None is implicitly preserved.",
      },
    ],
    sources: [core("concurrency", "Concurrency")],
    spec: String.raw`---- MODULE LostUpdate ----
EXTENDS Naturals
Workers == {"a", "b"}
VARIABLES counter, tmp, pc

Init == /\ counter = 0
        /\ tmp = [w \in Workers |-> 0]
        /\ pc = [w \in Workers |-> "read"]

Read(w) == /\ pc[w] = "read"
           /\ tmp' = [tmp EXCEPT ![w] = counter]
           /\ pc' = [pc EXCEPT ![w] = "write"]
           /\ UNCHANGED counter

Write(w) == /\ pc[w] = "write"
            /\ counter' = tmp[w] + 1
            /\ pc' = [pc EXCEPT ![w] = "done"]
            /\ UNCHANGED tmp

Next == \E w \in Workers : Read(w) \/ Write(w)
AllDone == \A w \in Workers : pc[w] = "done"
Correct == AllDone => counter = 2
TypeOK == /\ counter \in 0..2
          /\ tmp \in [Workers -> 0..2]
          /\ pc \in [Workers -> {"read", "write", "done"}]
====`,
    cfg: "INIT Init\nNEXT Next\nINVARIANTS TypeOK Correct\nCHECK_DEADLOCK FALSE",
    mode: "model",
    expected: "violation",
  },
  {
    id: "time",
    chapter: "03 · Reason about time",
    title: "“Never wrong” is not “eventually done.”",
    subtitle: "Safety and liveness answer different questions.",
    concept: "Temporal properties",
    intro:
      "A system that does nothing can preserve every safety promise and still be useless. Liveness says that something good must eventually happen.",
    paragraphs: [
      "Spec permits incrementing and stuttering: steps that leave x unchanged. EventuallyDone asks that every allowed behavior eventually reach two.",
      "The model can stay at zero forever. That behavior does not violate TypeOK, but it does violate EventuallyDone. Look for a stuttering marker in TLC’s trace.",
    ],
    notation: [
      {
        code: "[]P",
        meaning: "P holds at every point in the behavior: always.",
      },
      {
        code: "<>P",
        meaning: "P holds now or at some later point: eventually.",
      },
      {
        code: "[][Next]_x",
        meaning: "Every step is a Next step or leaves x unchanged.",
      },
    ],
    prediction:
      "If Next is always able to increment at zero, must it ever be taken?",
    reveal:
      "Not without a progress assumption. Enabled means possible, not inevitable. Spec includes a behavior that stutters at zero forever.",
    task: "Run the model with PROPERTY EventuallyDone. Then remove only that line from .cfg and rerun. Explain why passing the invariant is a weaker claim.",
    hints: [
      "Keep INVARIANT TypeOK. You want to compare two different questions about the same model.",
      "Removing the property does not fix progress. It only stops asking about it.",
    ],
    solution: "SPECIFICATION Spec\nINVARIANT TypeOK\nCHECK_DEADLOCK FALSE",
    takeaway:
      "Safety rules out bad things. Liveness requires good things. A check cannot tell you about a property you did not ask it to check.",
    deeper: [
      {
        title: "Is disabling deadlock checking the same as fairness?",
        text: "No. CHECK_DEADLOCK FALSE disables a TLC diagnostic. It does not change Spec and cannot rule out infinite stuttering. A terminal state at x = 2 is intentional here, which is why the deadlock diagnostic is disabled.",
      },
      {
        title: "Why allow stuttering?",
        text: "A higher-level description should tolerate an implementation taking internal steps that do not change the abstract state. The square-bracket action idiom makes that possible. It is central to refinement, not just a technical nuisance.",
      },
    ],
    sources: [core("temporal-logic", "Temporal properties"), video],
    spec: String.raw`---- MODULE Progress ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
Next == /\ x < 2
        /\ x' = x + 1

Spec == Init /\ [][Next]_x
TypeOK == x \in 0..2
EventuallyDone == <>(x = 2)
====`,
    cfg: "SPECIFICATION Spec\nINVARIANT TypeOK\nPROPERTY EventuallyDone\nCHECK_DEADLOCK FALSE",
    mode: "model",
    expected: "violation",
  },
  {
    id: "fairness",
    chapter: "03 · Reason about time",
    title: "Progress needs an assumption.",
    subtitle: "State it. Don’t smuggle it in.",
    concept: "Weak fairness",
    intro:
      "Weak fairness rules out endlessly ignoring an action that remains enabled. It is a restriction on allowed behaviors, not an extra transition.",
    paragraphs: [
      "At zero, Next stays enabled until it occurs. At one, the same is true. Adding WF_x(Next) forces progress through both states, so eventually x reaches two.",
      "At two, Next is disabled. Weak fairness does not demand the impossible. The system may stutter there forever.",
    ],
    notation: [
      {
        code: "WF_x(Next)",
        meaning:
          "A continuously enabled nonstuttering Next action cannot be postponed forever.",
      },
      {
        code: "Spec == Init /\\ [][Next]_x /\\ WF_x(Next)",
        meaning: "Initial condition, allowed steps, and a fairness assumption.",
      },
    ],
    prediction: "Does weak fairness force a disabled action to run?",
    reveal:
      "No. It constrains behaviors where the action stays enabled. An action enabled only intermittently needs a different argument; strong fairness can matter there.",
    task: "Run the fair model. Then remove /\\ WF_x(Next) and watch the liveness counterexample return.",
    hints: [
      "Edit the Spec definition, not the property.",
      "The set of reachable states is the same. The allowed infinite behaviors are different.",
    ],
    solution: "Spec == Init /\\ [][Next]_x",
    takeaway:
      "Fairness belongs in the assumptions. Ask whether the real scheduler, worker, or environment can justify it.",
    deeper: [
      {
        title: "Weak versus strong fairness",
        text: "Weak fairness addresses continuous enablement. Strong fairness, SF_vars(A), addresses an action enabled infinitely often. A competing thread can make a lock acquisition repeatedly enabled but not continuously enabled. Do not add strong fairness simply because it makes a property pass.",
      },
      {
        title: "What comes next: refinement",
        text: "Once you have an abstract design, a refinement mapping explains how a more detailed state represents an abstract one. Implementation steps can correspond to an abstract action or to stuttering. Lamport’s lectures on implementation and refinement are the next primary-source stop.",
      },
    ],
    sources: [core("temporal-logic", "Liveness and fairness"), video],
    spec: String.raw`---- MODULE FairProgress ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
Next == /\ x < 2
        /\ x' = x + 1

Spec == Init /\ [][Next]_x /\ WF_x(Next)
TypeOK == x \in 0..2
EventuallyDone == <>(x = 2)
====`,
    cfg: "SPECIFICATION Spec\nINVARIANT TypeOK\nPROPERTY EventuallyDone\nCHECK_DEADLOCK FALSE",
    mode: "model",
    expected: "success",
  },
  {
    id: "proofs",
    chapter: "04 · Learn to prove",
    title: "A proof is not a bigger model check.",
    subtitle: "Start with a small, genuinely checkable claim.",
    concept: "Propositional proof",
    intro:
      "TLC explores a configured model. A deductive proof establishes a claim from assumptions. These are complementary tools, not two names for the same thing.",
    paragraphs: [
      "Here, P and Q stand for arbitrary propositions. The theorem says: if P holds and P implies Q, then Q holds. This is modus ponens.",
      "Our browser proof checker decides the propositional fragment by exhaustive Boolean semantics. Every accepted step must follow from its context. It is a small independent learning checker, not TLAPS, and it rejects arithmetic, sets, and temporal formulas.",
    ],
    notation: [
      { code: "THEOREM Apply ==", meaning: "Name the claim to be proved." },
      { code: "P => Q", meaning: "False only when P is true and Q is false." },
      {
        code: "PROOF OBVIOUS",
        meaning:
          "Ask the checker to discharge this obligation directly. “Obvious” is a request, not a bypass.",
      },
    ],
    prediction:
      "Is the converse valid: if Q holds and P implies Q, then P holds?",
    reveal:
      "No. Set P to FALSE and Q to TRUE. The assumptions hold but the conclusion P does not. This is affirming the consequent, a common invalid inference.",
    task: "Check the valid theorem. Then replace it with ((P => Q) /\\ Q) => P and inspect the countervaluation.",
    hints: [
      "The only change is the formula after THEOREM Apply ==.",
      "In this lab, a countervaluation assigns truth values to propositions. It is not a system execution trace.",
    ],
    solution: "THEOREM Apply == ((P => Q) /\\ Q) => P\nPROOF OBVIOUS",
    takeaway:
      "A proof checker must be able to say no. “Unsupported” is different from “false,” and neither is a proved theorem.",
    deeper: [
      {
        title: "Exactly what this checker supports",
        text: "One module, CONSTANT or CONSTANTS declarations, and one THEOREM. Formulas use declared propositional atoms, TRUE, FALSE, ~, /\\, \\/, =>, <=>, and parentheses. Parenthesize mixed binary operators. An optional ASSUME … PROVE … context and flat <1> steps are supported. At most 12 propositional atoms are allowed. No definitions, quantifiers, sets, arithmetic, temporal formulas, nested proofs, or TLAPS backend integration.",
      },
      {
        title: "Where full TLAPS fits",
        text: "TLAPS is the TLA+ Proof System. It decomposes structured proofs into obligations and uses backends such as SMT solvers and Isabelle. For general TLA+ proofs, download your module and check it in a local TLAPS installation. The browser lab is a focused introduction, not a substitute for that toolchain.",
      },
    ],
    sources: [
      proofSource,
      {
        label: "TLAPS · Home & installation",
        url: "https://proofs.tlapl.us/doc/web/content/Home.html",
      },
    ],
    spec: proof("THEOREM Apply == (P /\\ (P => Q)) => Q\nPROOF OBVIOUS"),
    cfg: "",
    mode: "proof",
    expected: "success",
  },
  {
    id: "structure",
    chapter: "04 · Learn to prove",
    title: "Make the reasoning inspectable.",
    subtitle: "Small claims. Explicit dependencies.",
    concept: "Structured proof",
    intro:
      "A structured proof turns one large claim into smaller obligations. Each step says what follows, and which earlier facts justify it.",
    paragraphs: [
      "The theorem’s assumptions are available throughout this flat proof. Step 1 establishes Q, step 2 establishes R, and QED closes the original goal.",
      "The browser checker verifies each step and the final goal. Earlier numbered steps are available only when named in BY. It will reject an unknown, forward, or self-reference instead of silently accepting it.",
    ],
    notation: [
      {
        code: "ASSUME P, P => Q, Q => R PROVE R",
        meaning: "Under these three hypotheses, establish R.",
      },
      { code: "<1>1. Q", meaning: "A named step at proof level one." },
      {
        code: "BY <1>1",
        meaning: "Make the established fact from step 1 available.",
      },
      {
        code: "<1> QED BY <1>2",
        meaning: "Close the theorem using step 2 and the theorem context.",
      },
    ],
    prediction:
      "What happens if a step cites itself, or a step that has not been established yet?",
    reveal:
      "The checker rejects the reference. A dependency cycle cannot justify a claim. The available context is the theorem assumptions and already checked facts that are explicitly cited.",
    task: "Check the proof. Change the conclusion of step 2 from R to ~R, keeping the assumptions. Inspect the failed obligation.",
    hints: [
      "Edit <1>2. R to <1>2. ~R. Do not edit QED yet.",
      "A failed step stops the proof. Later steps cannot use it as an established fact.",
    ],
    solution: "<1>2. ~R\n  BY <1>1",
    takeaway:
      "A proof is a dependency structure you can review. A conclusion and a green badge are not a substitute for understanding its assumptions.",
    deeper: [
      {
        title: "Why do some BY references feel redundant here?",
        text: "Propositional entailment is decidable by truth tables, and all theorem assumptions remain available. This little checker can often derive a later step directly from those assumptions. In full TLAPS, definitions are opaque unless expanded, backend automation has limits, and explicit facts and intermediate lemmas are essential.",
      },
      {
        title: "Contradictory assumptions",
        text: "If no Boolean assignment satisfies the assumptions, every conclusion follows vacuously. That is valid classical logic but often a modeling mistake. The lab prominently warns about this case rather than silently presenting an ordinary success.",
      },
    ],
    sources: [proofSource],
    spec: proof(
      String.raw`THEOREM Chain ==
  ASSUME P, P => Q, Q => R
  PROVE R
PROOF
<1>1. Q
  OBVIOUS
<1>2. R
  BY <1>1
<1> QED BY <1>2`,
      "P, Q, R",
    ),
    cfg: "",
    mode: "proof",
    expected: "success",
  },
  {
    id: "induction",
    chapter: "04 · Learn to prove",
    title: "The bridge from examples to all steps.",
    subtitle: "Understand the shape of an invariant proof.",
    concept: "Induction",
    intro:
      "To prove a state predicate I is invariant, show it holds initially and that every allowed step preserves it. Then reason about every step of every behavior, not just a sample bound.",
    paragraphs: [
      "The base obligation has the shape Init ⇒ I. The preservation obligation has the shape (I ∧ Next) ⇒ I′. For a specification using [Next]_vars, preservation must also cover stuttering. Strengthening I is often the hard part.",
      "This lab isolates only the propositional composition: if Init implies I, and I implies Safe, then Init implies Safe. The names are opaque propositions, not expanded state predicates. Checking this skeleton does not prove the counter invariant.",
    ],
    notation: [
      {
        code: "Init => I",
        meaning: "Base: all initial states satisfy the inductive invariant.",
      },
      {
        code: "(I /\\ Next) => I'",
        meaning: "Step: every transition from an I state leads to an I state.",
      },
      {
        code: "I => Safe",
        meaning:
          "The inductive invariant is strong enough to imply the desired property.",
      },
    ],
    prediction:
      "If an invariant passes in the initial state, have we proved it for the whole behavior?",
    reveal:
      "No. A later step can violate it. You need the preservation argument too. Conversely, preservation alone says nothing if the initial state does not satisfy the invariant.",
    task: "Check the propositional base skeleton. Remove I => Safe from the assumptions and find the missing implication in the countervaluation.",
    hints: [
      "This is only the base-case composition. There is no temporal induction rule in the browser checker.",
      "Init = TRUE, I = TRUE, Safe = FALSE demonstrates why the bridge from I to Safe matters.",
    ],
    solution:
      "THEOREM BaseBridge ==\n  ASSUME Init => I\n  PROVE Init => Safe\nPROOF OBVIOUS",
    takeaway:
      "Finite checking finds bugs quickly. Inductive proof explains why no step can break the property under stated assumptions. Use both.",
    deeper: [
      {
        title: "Your next project",
        text: "Model a tiny bounded queue. Write a type invariant, a capacity invariant, and a no-loss requirement. Deliberately split an operation and find a race. Only then attempt an inductive invariant. Work through Lamport’s Die Hard and Transaction Commit lectures and Learn TLA+’s concurrency chapter alongside your model.",
      },
      {
        title: "Move to full proof checking",
        text: "Install TLAPS from its official site, follow the Euclid tutorial, and learn BY … DEF … to expose the right facts and definitions. The preservation and temporal induction obligations go beyond this browser fragment. Exporting the skeleton is useful practice, but does not manufacture those missing obligations.",
      },
    ],
    sources: [proofSource, video, core("concurrency", "Concurrency")],
    spec: proof(
      String.raw`THEOREM BaseBridge ==
  ASSUME Init => I, I => Safe
  PROVE Init => Safe
PROOF OBVIOUS`,
      "Init, I, Safe",
    ),
    cfg: "",
    mode: "proof",
    expected: "success",
  },
];

export const glossary = [
  [
    "State",
    "The values of all variables at one point. A snapshot, not a line of code.",
    "states",
  ],
  [
    "Behavior",
    "An infinite sequence of states. A finite graph can represent infinite behaviors.",
    "states",
  ],
  [
    "Action",
    "A predicate over current and next states. Primed variables refer to next-state values.",
    "actions",
  ],
  [
    "Prime · x'",
    "The value of x in the next state. Not assignment, not a derivative.",
    "actions",
  ],
  [
    "Definition · ==",
    "Names an expression. Unlike =, it is not an equality test.",
    "actions",
  ],
  [
    "UNCHANGED",
    "Constrains listed variables to have the same values in the next state.",
    "actions",
  ],
  [
    "Invariant",
    "A state predicate required to hold in every reachable state of a specification.",
    "invariants",
  ],
  [
    "Counterexample",
    "Evidence of a violated property. For safety, a finite trace reaching a bad state.",
    "invariants",
  ],
  [
    "Nondeterminism",
    "Multiple possible choices, without assigning probabilities or preference.",
    "choices",
  ],
  ["Membership · \\in", "x \\in S means x is an element of the set S.", "sets"],
  [
    "Quantifiers · \\A / \\E",
    "For all / there exists. Quantification is over a domain, not an imperative loop.",
    "sets",
  ],
  [
    "Function",
    "A mapping from each element of a domain to a value. It is data, not a procedure.",
    "functions",
  ],
  [
    "EXCEPT",
    "Constructs a function equal to another function except at specified inputs.",
    "functions",
  ],
  [
    "Atomicity",
    "The choice of which changes happen in one indivisible model step.",
    "concurrency",
  ],
  [
    "Implication · =>",
    "P => Q is false exactly when P is true and Q is false. Otherwise it is true.",
    "concurrency",
  ],
  [
    "Stuttering",
    "A step leaving the specified variables unchanged. Not the same as a deadlock diagnostic.",
    "time",
  ],
  [
    "Safety",
    "A property whose violation has a finite bad prefix. Invariants are safety properties, but not all safety properties are invariants.",
    "time",
  ],
  [
    "Liveness",
    "A property requiring eventual progress, such as eventually completing a request.",
    "time",
  ],
  ["Always · []", "[]P says P holds at every point in a behavior.", "time"],
  [
    "Eventually · <>",
    "<>P says P holds now or at some later point in a behavior.",
    "time",
  ],
  [
    "Leads to · ~>",
    "P ~> Q means every occurrence of P is followed by Q now or later. Equivalent to [](P => <>Q).",
    "time",
  ],
  [
    "Weak fairness · WF",
    "Rules out indefinitely postponing a continuously enabled nonstuttering action.",
    "fairness",
  ],
  [
    "Strong fairness · SF",
    "Rules out indefinitely postponing an action enabled infinitely often.",
    "fairness",
  ],
  [
    "Refinement",
    "Relates a more detailed specification to an abstract one, often through a mapping of states.",
    "fairness",
  ],
  [
    "TLC",
    "The TLA+ model checker. Explores reachable states and checks configured properties of a model.",
    "proofs",
  ],
  [
    "TLAPS",
    "The TLA+ Proof System. Checks structured deductive proofs using proof backends. It is not TLC.",
    "proofs",
  ],
  [
    "OBVIOUS",
    "A request to discharge a proof obligation automatically. It does not mean skip checking.",
    "proofs",
  ],
  [
    "BY / DEF",
    "BY cites usable facts; DEF names definitions to expand. DEF is not supported by this browser proof fragment.",
    "structure",
  ],
  [
    "Inductive invariant",
    "A predicate true initially and preserved by all allowed steps, often stronger than the desired safety property.",
    "induction",
  ],
  [
    "Vacuity",
    "A claim can follow from impossible assumptions. Check that the context is satisfiable.",
    "structure",
  ],
];
