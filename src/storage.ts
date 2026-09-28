export type Draft = { spec: string; cfg: string; notes: string };
export type Workspace = {
  version: 1;
  current: string;
  drafts: Record<string, Draft>;
  completed: string[];
};
export const storageKey = "tilapias.workspace.v1";
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  current: "states",
  drafts: {},
  completed: [],
});

export function validateWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== "object")
    throw new Error("This is not a tilapias backup.");
  const obj = value as Record<string, unknown>;
  if (
    obj.version !== 1 ||
    typeof obj.current !== "string" ||
    !Array.isArray(obj.completed) ||
    !obj.completed.every((x) => typeof x === "string") ||
    !obj.drafts ||
    typeof obj.drafts !== "object" ||
    Array.isArray(obj.drafts)
  )
    throw new Error("The backup format is not supported.");
  const drafts: Record<string, Draft> = {};
  for (const [id, draft] of Object.entries(obj.drafts)) {
    if (
      !/^[a-z-]{1,40}$/.test(id) ||
      ["__proto__", "constructor", "prototype"].includes(id) ||
      !draft ||
      typeof draft !== "object"
    )
      throw new Error("Invalid lesson in backup.");
    const d = draft as Record<string, unknown>;
    if (
      ["spec", "cfg", "notes"].some(
        (k) => typeof d[k] !== "string" || (d[k] as string).length > 200000,
      )
    )
      throw new Error("Invalid or oversized draft in backup.");
    drafts[id] = {
      spec: d.spec as string,
      cfg: d.cfg as string,
      notes: d.notes as string,
    };
  }
  return { version: 1, current: obj.current, completed: obj.completed, drafts };
}

export function loadWorkspace(): { workspace: Workspace; error?: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    return {
      workspace: raw ? validateWorkspace(JSON.parse(raw)) : emptyWorkspace(),
    };
  } catch {
    return {
      workspace: emptyWorkspace(),
      error:
        "Local storage could not be read. Export a backup before leaving; saving may be unavailable in this browser.",
    };
  }
}

export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
