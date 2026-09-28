import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  keymap,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

const tla = StreamLanguage.define({
  startState: () => ({ commentDepth: 0 }),
  token(stream, state) {
    if (state.commentDepth) {
      while (!stream.eol()) {
        if (stream.match("(*")) state.commentDepth++;
        else if (stream.match("*)")) {
          if (--state.commentDepth === 0) break;
        } else stream.next();
      }
      return "comment";
    }
    if (stream.eatSpace()) return null;
    if (stream.match("\\*")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match("(*")) {
      state.commentDepth = 1;
      return "comment";
    }
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return "string";
    if (
      stream.match(
        /\b(?:MODULE|EXTENDS|VARIABLES?|CONSTANTS?|ASSUME|PROVE|THEOREM|PROOF|OBVIOUS|BY|DEF|QED|UNCHANGED|IF|THEN|ELSE|EXCEPT|LET|IN|CASE|OTHER|DOMAIN|SUBSET|UNION|CHOOSE|INIT|NEXT|INVARIANTS?|PROPERTY|PROPERTIES|SPECIFICATION|CHECK_DEADLOCK)\b/,
      )
    )
      return "keyword";
    if (stream.match(/\b(?:TRUE|FALSE|BOOLEAN)\b/)) return "bool";
    if (stream.match(/\b\d+\b/)) return "number";
    if (
      stream.match(/\\[A-Za-z]+|\/\\|\\\/|<=>|=>|==|\[\]|<>|~>|\|->|->|[=~'#]/)
    )
      return "operator";
    if (stream.match(/[A-Za-z][A-Za-z0-9_]*/)) return "variableName";
    stream.next();
    return null;
  },
});
const colors = HighlightStyle.define([
  { tag: tags.keyword, color: "#78538a", fontWeight: "600" },
  { tag: tags.comment, color: "#566b5c", fontStyle: "italic" },
  { tag: tags.string, color: "#a5682d" },
  { tag: tags.number, color: "#247c86" },
  { tag: tags.bool, color: "#247c86" },
  { tag: tags.operator, color: "#9a5c5b" },
  { tag: tags.variableName, color: "#264c3e" },
]);

export function Editor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightSpecialChars(),
          drawSelection(),
          history(),
          bracketMatching(),
          tla,
          syntaxHighlighting(colors),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.contentAttributes.of({
            "aria-label": label,
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callback.current(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              lineHeight: "1.75",
            },
            ".cm-content": { padding: "16px 0" },
            ".cm-gutters": {
              background: "transparent",
              color: "#687d68",
              border: "none",
              paddingLeft: "8px",
            },
            ".cm-line": { paddingLeft: "12px", paddingRight: "20px" },
            ".cm-activeLine": { background: "#ecf0e84d" },
            ".cm-cursor": { borderLeftColor: "#2a644b" },
            "&.cm-focused": { outline: "none" },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
              background: "#dbe8d3",
            },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The document is synchronized below so editing does not recreate the view.
  }, [label]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value]);
  return <div className="editor" ref={host} />;
}
