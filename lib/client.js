window.__ModuleLoader__.load({
	id: "dsh-sider-task-reviewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  TAB_KIND: () => TAB_KIND,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/icons.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function svg(size, children, strokeWidth = 1.8) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", children });
}
var ShieldIcon = ({ size = 16 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Z" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m9 12 2.2 2.2L15.5 10" }, "b")]);
var PlayIcon = ({ size = 14 }) => svg(size, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 5v14l11-7L7 5Z" }));
var StopIcon = ({ size = 14 }) => svg(size, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 7h10v10H7z" }));
var GearIcon = ({ size = 16 }) => svg(size, [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }, "a"),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" }, "b")
], 1.6);
var SendIcon = ({ size = 13 }) => svg(size, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 12 20 4l-6 16-3-7-7-1Z" }));
var InsertIcon = ({ size = 13 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 17h12" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 12h16" }, "b"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h16" }, "c"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m17 15 3 2-3 2" }, "d")]);
var CopyIcon = ({ size = 13 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 9h10v10H9z" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 15V5h10" }, "b")]);
var EyeOffIcon = ({ size = 13 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 3l18 18" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9 6-.3.8-1.1 2.2-2.4 3.4M6.2 7.6C4.4 8.9 3.3 10.9 3 12c.5 1.5 4 6 9 6 1.6 0 3-.4 4.2-1.1" }, "b")]);
var DownloadIcon = ({ size = 13 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 4v11" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m7 10 5 5 5-5" }, "b"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 20h14" }, "c")]);
var TrashIcon = ({ size = 13 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h16" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 7V4h6v3" }, "b"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 7l1 13h10l1-13" }, "c")]);
var PanelIcon = ({ size = 14 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 5h16v14H4z" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 5v14" }, "b")]);
var LoopIcon = ({ size = 14 }) => svg(size, [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 11a8 8 0 0 0-14.3-4.9L4 8" }, "a"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 4v4h4" }, "b"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 13a8 8 0 0 0 14.3 4.9L20 16" }, "c"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 20v-4h-4" }, "d")]);

// src/client/ReviewPane.tsx
var import_react3 = require("react");

// src/shared/protocol.ts
var REVIEW_PREFIX = "/sider-task-reviewer";
var CONTENT_LABELS = { both: "\u5BF9\u8BDD\u548C\u6587\u4EF6", conversation: "\u53EA\u770B\u5BF9\u8BDD", files: "\u53EA\u770B\u6587\u4EF6" };
var CATEGORY_LABELS = {
  claim: "\u58F0\u79F0\u4E0E\u8BC1\u636E\u4E0D\u7B26",
  missing: "\u6F0F\u505A\u9700\u6C42",
  scope: "\u8D8A\u754C\u6539\u52A8",
  risk: "\u98CE\u9669",
  unverified: "\u672A\u9A8C\u8BC1",
  logic: "\u63A8\u5BFC\u9519\u8BEF",
  assumption: "\u5047\u8BBE\u4E0E\u6761\u4EF6",
  fact: "\u4E8B\u5B9E\u9519\u8BEF",
  source: "\u6765\u6E90\u4E0E\u5F15\u7528",
  detail: "\u4E0D\u591F\u51C6\u786E/\u8BE6\u7EC6",
  feasibility: "\u53EF\u884C\u6027",
  alternative: "\u66F4\u597D\u7684\u65B9\u5411",
  other: "\u5176\u4ED6"
};
var VERDICT_LABELS = { pass: "\u901A\u8FC7", doubt: "\u6709\u7591\u95EE", fail: "\u6709\u95EE\u9898" };
var SEVERITY_LABELS = { high: "\u4E25\u91CD", medium: "\u4E2D\u7B49", low: "\u8F7B\u5FAE" };
var BUILTIN_PROMPT_ID = "builtin-standard";
function scopeLabel(scope) {
  if (scope.kind === "last") return "\u6700\u540E\u4E00\u8F6E";
  if (scope.kind === "all") return "\u6574\u4E2A\u5BF9\u8BDD";
  return scope.from === scope.to ? `\u7B2C ${scope.from} \u8F6E` : `\u7B2C ${scope.from}\u2013${scope.to} \u8F6E`;
}

// src/client/api.ts
var import_react = require("react");
async function call(path, body) {
  const response = await fetch(REVIEW_PREFIX + path, body === void 0 ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new Error(`\u5BA1\u67E5\u63D2\u4EF6\u6CA1\u6709\u54CD\u5E94\uFF08HTTP ${response.status}\uFF09`);
  }
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}
var api = {
  state: (session) => call(`/state?session=${encodeURIComponent(session)}`),
  models: () => call("/models"),
  settings: (session, patch) => call("/settings", { session, ...patch }),
  global: (patch) => call("/global", patch),
  prompts: () => call("/prompts"),
  savePrompt: (prompt) => call("/prompt", prompt),
  deletePrompt: (id) => call("/prompt/delete", { id }),
  startLoop: (session, options) => call("/loop/start", { session, ...options }),
  stopLoop: (session) => call("/loop/stop", { session }),
  cancel: (session) => call("/cancel", { session }),
  send: (session, text, reportId) => call("/send", { session, text, ...reportId !== void 0 ? { reportId } : {} }),
  dismiss: (session, reportId, index, dismissed) => call("/dismiss", { session, reportId, index, dismissed }),
  remove: (session, reportId) => call("/remove", { session, reportId }),
  async exportMarkdown(session, reportId) {
    const response = await fetch(`${REVIEW_PREFIX}/export?session=${encodeURIComponent(session)}&report=${encodeURIComponent(reportId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`\u5BFC\u51FA\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`);
    return response.text();
  },
  /**
   * Start a review. Resolves when it is over (the progress itself is read
   * from the polled state); rejects with the reason when it fails.
   */
  async review(session, options) {
    const response = await fetch(`${REVIEW_PREFIX}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session, ...options })
    });
    if (!response.ok || response.body === null) {
      let message = `\u5BA1\u67E5\u6CA1\u6709\u5F00\u59CB\uFF08HTTP ${response.status}\uFF09`;
      try {
        const parsed = await response.json();
        if (!parsed.ok) message = parsed.error;
      } catch {
      }
      throw new Error(message);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let failure;
    let report2;
    for (; ; ) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut = buffer.indexOf("\n\n");
      while (cut >= 0) {
        const frame = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "error") failure = event.message;
            if (event.type === "done") report2 = event.report;
            if (event.type === "phase" || event.type === "tool" || event.type === "done" || event.type === "error") refreshSoon(session);
          } catch {
          }
        }
        cut = buffer.indexOf("\n\n");
      }
    }
    refreshSoon(session);
    if (failure !== void 0) throw new Error(failure);
    return report2;
  }
};
var entries = /* @__PURE__ */ new Map();
function entryOf(session) {
  let entry = entries.get(session);
  if (entry === void 0) {
    entry = { version: 0, listeners: /* @__PURE__ */ new Set(), users: 0, inflight: false };
    entries.set(session, entry);
  }
  return entry;
}
function notify(entry) {
  entry.version += 1;
  for (const listener of entry.listeners) listener();
}
async function poll(session) {
  const entry = entryOf(session);
  if (entry.timer !== void 0) clearTimeout(entry.timer);
  entry.timer = void 0;
  if (entry.users === 0) return;
  if (!entry.inflight && (typeof document === "undefined" || !document.hidden)) {
    entry.inflight = true;
    try {
      entry.state = await api.state(session);
      entry.error = void 0;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
    } finally {
      entry.inflight = false;
    }
    notify(entry);
  }
  if (entry.users > 0) entry.timer = setTimeout(() => void poll(session), entry.state?.running !== void 0 ? 1e3 : 5e3);
}
function refreshSoon(session) {
  const entry = entries.get(session);
  if (entry === void 0 || entry.users === 0) return;
  if (entry.timer !== void 0) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => void poll(session), 50);
}
function useReviewState(session) {
  (0, import_react.useEffect)(() => {
    if (session === void 0) return void 0;
    const entry = entryOf(session);
    entry.users += 1;
    if (entry.users === 1) void poll(session);
    const onVisible = () => {
      if (!document.hidden) refreshSoon(session);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      entry.users -= 1;
      document.removeEventListener("visibilitychange", onVisible);
      if (entry.users === 0 && entry.timer !== void 0) {
        clearTimeout(entry.timer);
        entry.timer = void 0;
      }
    };
  }, [session]);
  (0, import_react.useSyncExternalStore)(
    (listener) => {
      if (session === void 0) return () => {
      };
      const entry = entryOf(session);
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    () => session === void 0 ? 0 : entries.get(session)?.version ?? 0
  );
  const snapshot = session === void 0 ? void 0 : entries.get(session);
  return { ...snapshot?.state !== void 0 ? { state: snapshot.state } : {}, ...snapshot?.error !== void 0 ? { error: snapshot.error } : {} };
}
var catalog;
function loadCatalog(force = false) {
  if (!force && catalog !== void 0 && Date.now() - catalog.at < 6e4) return catalog.value;
  const value = api.models().catch((error) => {
    catalog = void 0;
    throw error;
  });
  catalog = { at: Date.now(), value };
  return value;
}
var effortCache = /* @__PURE__ */ new Map();
function loadEfforts(route) {
  const key = `${route.provider}\0${route.model}`;
  const known = effortCache.get(key);
  if (known !== void 0) return known;
  const value = call(`/efforts?provider=${encodeURIComponent(route.provider)}&model=${encodeURIComponent(route.model)}`).catch(() => {
    effortCache.delete(key);
    return { efforts: [] };
  });
  effortCache.set(key, value);
  return value;
}

// src/shared/message.ts
function findingText(finding, index) {
  const lines = [`${index}. \uFF08${SEVERITY_LABELS[finding.severity]} \xB7 ${CATEGORY_LABELS[finding.category]}\uFF09${finding.title}`];
  if (finding.detail !== "") lines.push(`   ${finding.detail.replace(/\n/g, "\n   ")}`);
  if (finding.evidence !== "") lines.push(`   \u8BC1\u636E\uFF1A${finding.evidence}`);
  if (finding.suggestion !== "") lines.push(`   \u5EFA\u8BAE\uFF1A${finding.suggestion}`);
  return lines.join("\n");
}
function openFindings(report2) {
  return report2.findings.filter((item) => item.dismissed !== true);
}
function messageFor(report2, findings, loop) {
  const range = report2.turns.from === report2.turns.to ? `\u7B2C ${report2.turns.from} \u8F6E` : `\u7B2C ${report2.turns.from}\u2013${report2.turns.to} \u8F6E`;
  const who = `\u53E6\u4E00\u4E2A\u6A21\u578B\uFF08${report2.model}\uFF09`;
  const head = loop !== void 0 ? `\u3010\u8FDE\u7EED\u5BA1\u67E5 \xB7 \u7B2C ${loop.round}/${loop.max} \u8F6E\u3011${who}\u5BA1\u67E5\u4E86${range}\u7684\u5DE5\u4F5C\uFF0C${findings.length === 1 ? "\u8FD8\u6709\u4E0B\u9762\u8FD9\u4E2A\u95EE\u9898" : `\u8FD8\u6709\u4E0B\u9762 ${findings.length} \u4E2A\u95EE\u9898`}\uFF1A` : `\u3010\u4EFB\u52A1\u5BA1\u67E5\u3011${who}\u5BA1\u67E5\u4E86${range}\u7684\u5DE5\u4F5C\uFF0C${findings.length === 1 ? "\u53D1\u73B0\u4E0B\u9762\u8FD9\u4E2A\u95EE\u9898" : `\u53D1\u73B0\u4E0B\u9762 ${findings.length} \u4E2A\u95EE\u9898`}\uFF1A`;
  const body = findings.map((finding, i) => findingText(finding, i + 1)).join("\n\n");
  const tail = loop !== void 0 ? "\u8BF7\u9010\u6761\u6838\u5B9E\uFF1A\u786E\u5B9E\u5B58\u5728\u7684\u8BF7\u76F4\u63A5\u4FEE\u6B63\uFF1B\u4F60\u8BA4\u4E3A\u4E0D\u6210\u7ACB\u7684\uFF0C\u8BF4\u660E\u7406\u7531\u3002\u9700\u8981\u8FD0\u884C\u547D\u4EE4\u6838\u5B9E\u7684\uFF08\u6D4B\u8BD5\u3001\u6784\u5EFA\u3001git diff \u7B49\uFF09\u8BF7\u4F60\u6765\u8FD0\u884C\u5E76\u8D34\u51FA\u7ED3\u679C\uFF0C\u5BA1\u67E5\u53EA\u8BFB\u3001\u4E0D\u8FD0\u884C\u547D\u4EE4\u3002\u6539\u5B8C\u540E\u7B80\u8981\u8BF4\u660E\u6539\u4E86\u4EC0\u4E48\uFF0C\u5BA1\u67E5\u4F1A\u81EA\u52A8\u518D\u770B\u4E00\u904D\u3002" : "\u8BF7\u9010\u6761\u6838\u5B9E\uFF1A\u786E\u5B9E\u5B58\u5728\u7684\u8BF7\u4FEE\u6B63\uFF1B\u4F60\u8BA4\u4E3A\u4E0D\u6210\u7ACB\u7684\uFF0C\u8BF4\u660E\u7406\u7531\u3002\u9700\u8981\u8FD0\u884C\u547D\u4EE4\u6838\u5B9E\u7684\uFF08\u6D4B\u8BD5\u3001\u6784\u5EFA\u3001git diff \u7B49\uFF09\u8BF7\u4F60\u6765\u8FD0\u884C\u5E76\u8D34\u51FA\u7ED3\u679C\uFF0C\u5BA1\u67E5\u53EA\u8BFB\u3001\u4E0D\u8FD0\u884C\u547D\u4EE4\u3002";
  return `${head}

${body}

${tail}`;
}

// src/client/compose.ts
var composers = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function registerComposer(sessionId, actions) {
  composers.set(sessionId, actions);
  for (const listener of listeners) listener();
  return () => {
    if (composers.get(sessionId) === actions) composers.delete(sessionId);
    for (const listener of listeners) listener();
  };
}
function composerOf(sessionId) {
  return composers.get(sessionId);
}
function onComposers(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function putIntoComposer(sessionId, text) {
  const composer = composers.get(sessionId);
  if (composer === void 0) return false;
  const current = composer.draft?.() ?? "";
  composer.setDraft(current.trim() === "" ? text : `${current.replace(/\s+$/, "")}

${text}`);
  return true;
}

// src/client/PromptsView.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function PromptsView({ global, onChanged }) {
  const [prompts, setPrompts] = (0, import_react2.useState)(void 0);
  const [editing, setEditing] = (0, import_react2.useState)(void 0);
  const [name, setName] = (0, import_react2.useState)("");
  const [text, setText] = (0, import_react2.useState)("");
  const [note, setNote] = (0, import_react2.useState)(void 0);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const load = (select) => {
    void api.prompts().then((list) => {
      setPrompts(list);
      const pick2 = list.find((item) => item.id === (select ?? editing)) ?? list.find((item) => item.id === global.activePromptId) ?? list[0];
      if (pick2 !== void 0) {
        setEditing(pick2.id);
        setName(pick2.name);
        setText(pick2.text);
      }
    }).catch((error) => setNote(error instanceof Error ? error.message : String(error)));
  };
  (0, import_react2.useEffect)(() => load(), []);
  (0, import_react2.useEffect)(() => {
    if (note === void 0) return void 0;
    const timer = setTimeout(() => setNote(void 0), 5e3);
    return () => clearTimeout(timer);
  }, [note]);
  if (prompts === void 0) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "rv-empty", children: "\u52A0\u8F7D\u4E2D\u2026" });
  const current = prompts.find((item) => item.id === editing);
  const isNew = editing === "new";
  const dirty = isNew || current !== void 0 && (current.name !== name || current.text !== text);
  const pick = (item) => {
    if (dirty && !window.confirm("\u6709\u6CA1\u4FDD\u5B58\u7684\u4FEE\u6539\uFF0C\u653E\u5F03\u5417\uFF1F")) return;
    setEditing(item.id);
    setName(item.name);
    setText(item.text);
  };
  const run = (task) => {
    setBusy(true);
    task().catch((error) => setNote(error instanceof Error ? error.message : String(error))).finally(() => setBusy(false));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "rv-hint", style: { margin: "0 0 10px" }, children: "\u63D0\u793A\u8BCD\u51B3\u5B9A\u5BA1\u67E5\u6A21\u578B\u68C0\u67E5\u4EC0\u4E48\u3001\u600E\u4E48\u5224\u65AD\u3002\u8FD9\u91CC\u53EA\u5199\u5BA1\u67E5\u8981\u6C42\uFF1B\u5BA1\u67E5\u7684\u5BF9\u8C61\u8BF4\u660E\u3001\u53EA\u8BFB\u5DE5\u5177\u8BF4\u660E\u548C\u7ED3\u8BBA\u7684 JSON \u683C\u5F0F\u7531\u63D2\u4EF6\u81EA\u52A8\u52A0\u4E0A\uFF0C\u4E0D\u7528\u5199\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-card", "aria-label": "\u63D0\u793A\u8BCD\u5217\u8868", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-prompt-list", children: [
        prompts.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-prompt-row" + (item.id === editing ? " is-on" : ""), children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "rv-prompt-name", onClick: () => pick(item), children: [
            item.name,
            item.builtin === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "rv-tag", children: item.edited === true ? "\u5185\u7F6E \xB7 \u5DF2\u4FEE\u6539" : "\u5185\u7F6E" }) : null
          ] }),
          item.id === global.activePromptId ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "rv-tag is-on", children: "\u4F7F\u7528\u4E2D" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "rv-link", onClick: () => run(async () => {
            await api.global({ activePromptId: item.id });
            onChanged();
            setNote(`\u4EE5\u540E\u7684\u5BA1\u67E5\u9ED8\u8BA4\u7528\u300C${item.name}\u300D`);
          }), children: "\u8BBE\u4E3A\u9ED8\u8BA4" })
        ] }, item.id)),
        isNew ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "rv-prompt-row is-on", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "rv-prompt-name", children: "\uFF08\u65B0\u63D0\u793A\u8BCD\uFF0C\u672A\u4FDD\u5B58\uFF09" }) }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm",
          style: { marginTop: 8 },
          onClick: () => {
            if (dirty && !window.confirm("\u6709\u6CA1\u4FDD\u5B58\u7684\u4FEE\u6539\uFF0C\u653E\u5F03\u5417\uFF1F")) return;
            const base = prompts.find((item) => item.id === BUILTIN_PROMPT_ID);
            setEditing("new");
            setName("\u65B0\u63D0\u793A\u8BCD");
            setText(base?.text ?? "");
          },
          children: "\uFF0B \u65B0\u5EFA\u63D0\u793A\u8BCD"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-card", "aria-label": "\u7F16\u8F91\u63D0\u793A\u8BCD", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "rv-label", children: "\u540D\u5B57" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "rv-input rv-grow", value: name, maxLength: 40, "aria-label": "\u63D0\u793A\u8BCD\u540D\u5B57", onChange: (event) => setName(event.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { className: "rv-textarea rv-mono", value: text, rows: 16, "aria-label": "\u63D0\u793A\u8BCD\u5185\u5BB9", spellCheck: false, onChange: (event) => setText(event.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rv-actions", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "rv-btn rv-btn-sm rv-btn-primary",
            disabled: busy || !dirty || name.trim() === "" || text.trim() === "",
            onClick: () => run(async () => {
              const saved = await api.savePrompt({ ...isNew ? {} : { id: editing }, name, text });
              setNote(isNew ? `\u5DF2\u65B0\u5EFA\u300C${name.trim()}\u300D` : "\u5DF2\u4FDD\u5B58");
              onChanged();
              load(saved.id);
            }),
            children: "\u4FDD\u5B58"
          }
        ),
        !isNew ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "rv-btn rv-btn-sm",
            disabled: busy || name.trim() === "" || text.trim() === "",
            title: "\u4E0D\u6539\u52A8\u5F53\u524D\u8FD9\u4E2A\uFF0C\u53E6\u5B58\u4E00\u4EFD\u65B0\u7684",
            onClick: () => run(async () => {
              const saved = await api.savePrompt({ name: `${name.trim()} \u526F\u672C`.slice(0, 40), text });
              setNote("\u5DF2\u53E6\u5B58\u4E3A\u65B0\u63D0\u793A\u8BCD");
              onChanged();
              load(saved.id);
            }),
            children: "\u53E6\u5B58\u4E3A\u65B0\u7684"
          }
        ) : null,
        current?.builtin === true && current.edited === true ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "rv-btn rv-btn-sm rv-btn-ghost",
            onClick: () => {
              if (!window.confirm(`\u628A\u300C${current.name}\u300D\u6062\u590D\u6210\u63D2\u4EF6\u81EA\u5E26\u7684\u7248\u672C\uFF1F`)) return;
              run(async () => {
                await api.deletePrompt(current.id);
                setNote(`\u5DF2\u6062\u590D\u300C${current.name}\u300D\u7684\u539F\u59CB\u5185\u5BB9`);
                onChanged();
                load(current.id);
              });
            },
            children: "\u6062\u590D\u9ED8\u8BA4"
          }
        ) : null,
        current !== void 0 && current.builtin !== true && !isNew ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "rv-btn rv-btn-sm rv-btn-ghost",
            onClick: () => {
              if (!window.confirm(`\u5220\u9664\u63D0\u793A\u8BCD\u300C${current.name}\u300D\uFF1F`)) return;
              run(async () => {
                await api.deletePrompt(current.id);
                setNote("\u5DF2\u5220\u9664");
                onChanged();
                load(BUILTIN_PROMPT_ID);
              });
            },
            children: "\u5220\u9664"
          }
        ) : null,
        isNew ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "rv-btn rv-btn-sm rv-btn-ghost", onClick: () => load(global.activePromptId), children: "\u53D6\u6D88" }) : null
      ] })
    ] }),
    note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "rv-banner is-info", children: note }) : null
  ] });
}

// src/client/ReviewPane.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var SEP = "\0";
function routeKey(route) {
  return route === void 0 ? "" : `${route.provider}${SEP}${route.model}`;
}
function routeFromKey(key) {
  const [provider, model] = key.split(SEP);
  return provider !== void 0 && model !== void 0 && provider !== "" && model !== "" ? { provider, model } : void 0;
}
function modelName(catalog2, route) {
  if (route === void 0) return "\uFF08\u672A\u8BBE\u7F6E\uFF09";
  const group = catalog2?.groups.find((item) => item.id === route.provider);
  const model = group?.models.find((item) => item.id === route.model);
  return model !== void 0 ? `${model.name}${group !== void 0 ? ` \xB7 ${group.name}` : ""}` : `${route.model} \xB7 ${route.provider}`;
}
function timeLabel(at) {
  const date = new Date(at);
  const today = /* @__PURE__ */ new Date();
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (date.toDateString() === today.toDateString()) return hm;
  return `${date.getMonth() + 1}/${date.getDate()} ${hm}`;
}
function rangeLabel(report2) {
  return report2.turns.from === report2.turns.to ? `\u7B2C ${report2.turns.from} \u8F6E` : `\u7B2C ${report2.turns.from}\u2013${report2.turns.to} \u8F6E`;
}
function useComposerReady(sessionId) {
  return (0, import_react3.useSyncExternalStore)(onComposers, () => composerOf(sessionId) !== void 0);
}
function useTick(active) {
  const [now, setNow] = (0, import_react3.useState)(() => Date.now());
  (0, import_react3.useEffect)(() => {
    if (!active) return void 0;
    const timer = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
function useEfforts(route) {
  const [value, setValue] = (0, import_react3.useState)(void 0);
  const key = routeKey(route);
  (0, import_react3.useEffect)(() => {
    setValue(void 0);
    if (route === void 0) return void 0;
    let alive = true;
    void loadEfforts(route).then((efforts) => alive && setValue(efforts));
    return () => {
      alive = false;
    };
  }, [key]);
  return value;
}
function ModelSelect({ catalog: catalog2, value, defaultLabel, label, onChange }) {
  const key = routeKey(value);
  const known = catalog2?.groups.some((group) => group.id === value?.provider && group.models.some((model) => model.id === value?.model)) ?? false;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { className: "rv-select", "aria-label": label, value: key, onChange: (event) => onChange(routeFromKey(event.target.value)), children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "", children: defaultLabel }),
    value !== void 0 && !known ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: key, children: modelName(catalog2, value) }) : null,
    catalog2?.groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("optgroup", { label: group.name, children: group.models.map((model) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: `${group.id}${SEP}${model.id}`, children: model.name }, model.id)) }, group.id))
  ] });
}
function EffortSelect({ efforts, value, label, onChange }) {
  const fallback = efforts.efforts.find((item) => item.id === efforts.defaultEffort);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { className: "rv-select", "aria-label": label, value: value ?? "", onChange: (event) => onChange(event.target.value === "" ? void 0 : event.target.value), children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "", children: fallback !== void 0 ? `\u6A21\u578B\u9ED8\u8BA4\uFF08${fallback.name}\uFF09` : "\u6A21\u578B\u9ED8\u8BA4" }),
    efforts.efforts.map((item) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: item.id, title: item.description, children: item.name }, item.id))
  ] });
}
function Segmented({ value, options, label, onChange }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-seg", role: "radiogroup", "aria-label": label, children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", role: "radio", "aria-checked": option.value === value, className: option.value === value ? "is-on" : "", title: option.title, onClick: () => onChange(option.value), children: option.label }, option.value)) });
}
function FindingCard({ finding, index, report: report2, sessionId, onNote }) {
  const composerReady = useComposerReady(sessionId);
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const text = messageFor(report2, [finding]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: `rv-finding is-${finding.severity}${finding.dismissed === true ? " is-dismissed" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-finding-tags", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-sev", children: SEVERITY_LABELS[finding.severity] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: CATEGORY_LABELS[finding.category] }),
      finding.dismissed === true ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "\xB7 \u5DF2\u5FFD\u7565" }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { children: finding.title }),
    finding.detail !== "" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: finding.detail }) : null,
    finding.evidence !== "" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("code", { className: "rv-evidence rv-mono", children: [
      "\u8BC1\u636E\uFF1A",
      finding.evidence
    ] }) : null,
    finding.suggestion !== "" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "rv-suggest", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: "\u5EFA\u8BAE\uFF1A" }),
      finding.suggestion
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm",
          disabled: !composerReady,
          title: composerReady ? "\u628A\u8FD9\u6761\u95EE\u9898\u653E\u8FDB\u8FD9\u4E2A\u5BF9\u8BDD\u7684\u8F93\u5165\u6846\uFF0C\u4F60\u53EF\u4EE5\u4FEE\u6539\u540E\u518D\u53D1\u9001" : "\u627E\u4E0D\u5230\u8FD9\u4E2A\u5BF9\u8BDD\u7684\u8F93\u5165\u6846",
          onClick: () => {
            if (putIntoComposer(sessionId, text)) onNote("\u5DF2\u653E\u8FDB\u8F93\u5165\u6846\uFF1A\u4FEE\u6539\u540E\u6309\u53D1\u9001\uFF0C\u4E3B\u6A21\u578B\u624D\u4F1A\u6536\u5230\u3002");
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(InsertIcon, {}),
            " \u653E\u8FDB\u8F93\u5165\u6846"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm",
          disabled: busy,
          title: "\u76F4\u63A5\u53D1\u7ED9\u4E3B\u6A21\u578B\uFF1A\u4EFB\u52A1\u8FDB\u884C\u4E2D\u65F6\u4F5C\u4E3A\u63D2\u8BDD\uFF0C\u5426\u5219\u5F00\u59CB\u65B0\u4E00\u8F6E",
          onClick: () => {
            setBusy(true);
            api.send(sessionId, text, report2.id).then((result) => onNote(result.mode === "steer" ? "\u5DF2\u53D1\u7ED9\u4E3B\u6A21\u578B\uFF08\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF0C\u4F5C\u4E3A\u63D2\u8BDD\uFF09\u3002" : "\u5DF2\u53D1\u7ED9\u4E3B\u6A21\u578B\uFF08\u5F00\u59CB\u4E86\u65B0\u4E00\u8F6E\uFF09\u3002")).catch((error) => onNote(`\u6CA1\u6709\u53D1\u51FA\u53BB\uFF1A${error instanceof Error ? error.message : String(error)}`)).finally(() => {
              setBusy(false);
              refreshSoon(sessionId);
            });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SendIcon, {}),
            " \u76F4\u63A5\u53D1\u9001"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "rv-btn rv-btn-sm rv-btn-ghost", title: "\u590D\u5236\u8FD9\u6761\u95EE\u9898", onClick: () => void navigator.clipboard?.writeText(text).then(() => onNote("\u5DF2\u590D\u5236\u3002")), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CopyIcon, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm rv-btn-ghost",
          title: finding.dismissed === true ? "\u6062\u590D\u8FD9\u6761\u95EE\u9898" : "\u5FFD\u7565\u8FD9\u6761\u95EE\u9898\uFF08\u4E0D\u7B97\u8FDB\u72B6\u6001\uFF09",
          onClick: () => void api.dismiss(sessionId, report2.id, index, finding.dismissed !== true).finally(() => refreshSoon(sessionId)),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(EyeOffIcon, {}),
            " ",
            finding.dismissed === true ? "\u6062\u590D" : "\u5FFD\u7565"
          ]
        }
      )
    ] })
  ] });
}
function ReportView({ report: report2, sessionId, catalog: catalog2, onNote }) {
  const composerReady = useComposerReady(sessionId);
  const open = openFindings(report2);
  const unreadable = report2.raw !== void 0 && report2.findings.length === 0 && report2.summary.startsWith("\u5BA1\u67E5\u6A21\u578B\u7684\u56DE\u7B54\u4E0D\u662F\u7EA6\u5B9A\u7684\u683C\u5F0F");
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-card", "aria-label": "\u5BA1\u67E5\u62A5\u544A", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-report-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `rv-verdict is-${report2.verdict}`, children: VERDICT_LABELS[report2.verdict] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-meta", children: [
        rangeLabel(report2),
        " \xB7 ",
        CONTENT_LABELS[report2.content ?? "both"],
        " \xB7 ",
        report2.usedDepth === "deep" ? "\u6DF1\u5165" : "\u5FEB\u901F",
        report2.trigger === "live" ? " \xB7 \u5B9E\u65F6" : "",
        report2.loop !== void 0 ? ` \xB7 \u8FDE\u7EED\u7B2C ${report2.loop.round}/${report2.loop.max} \u8F6E` : "",
        " \xB7 ",
        timeLabel(report2.createdAt)
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "rv-summary", children: report2.summary || "\uFF08\u5BA1\u67E5\u6A21\u578B\u6CA1\u6709\u5199\u603B\u7ED3\uFF09" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-meta", children: [
      modelName(catalog2, report2),
      report2.effort !== void 0 ? ` \xB7 \u601D\u8003 ${report2.effort}` : "",
      " \xB7 ",
      report2.promptName ?? "\u6807\u51C6\u5BA1\u67E5",
      " \xB7 \u7528\u65F6 ",
      Math.max(1, Math.round(report2.elapsedMs / 1e3)),
      " \u79D2",
      report2.sentAt !== void 0 ? " \xB7 \u5DF2\u53D1\u7ED9\u4E3B\u6A21\u578B" : ""
    ] }),
    report2.findings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-findings", children: report2.findings.map((finding, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FindingCard, { finding, index, report: report2, sessionId, onNote }, index)) }) : null,
    open.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-actions", style: { marginTop: 10 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "button",
      {
        type: "button",
        className: "rv-btn rv-btn-sm",
        disabled: !composerReady,
        onClick: () => {
          if (putIntoComposer(sessionId, messageFor(report2, open))) onNote(`\u5DF2\u628A ${open.length} \u6761\u95EE\u9898\u653E\u8FDB\u8F93\u5165\u6846\uFF1A\u4FEE\u6539\u540E\u6309\u53D1\u9001\u3002`);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(InsertIcon, {}),
          " \u5168\u90E8 ",
          open.length,
          " \u6761\u653E\u8FDB\u8F93\u5165\u6846"
        ]
      }
    ) }) : null,
    report2.checked.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "rv-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
        "\u6838\u5BF9\u8FC7\u3001\u6CA1\u6709\u95EE\u9898\uFF08",
        report2.checked.length,
        "\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "rv-list", children: report2.checked.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: item }, i)) })
    ] }) : null,
    report2.files !== void 0 && report2.files.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "rv-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
        "\u5BA1\u67E5\u7684\u6587\u4EF6\uFF08",
        report2.files.length,
        "\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "rv-list rv-mono", children: report2.files.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: item }, i)) })
    ] }) : null,
    report2.tools.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "rv-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
        "\u5BA1\u67E5\u65F6\u67E5\u770B\u4E86\uFF08",
        report2.tools.length,
        "\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-chips", children: report2.tools.map((tool, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-chip rv-mono" + (tool.ok ? "" : " is-bad"), title: tool.target, children: [
        tool.name,
        " ",
        tool.target
      ] }, i)) })
    ] }) : null,
    report2.notes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "rv-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
        "\u5907\u6CE8\uFF08",
        report2.notes.length,
        "\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "rv-list", children: report2.notes.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: item }, i)) })
    ] }) : null,
    report2.raw !== void 0 && unreadable ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("pre", { className: "rv-raw rv-mono", children: report2.raw }) : null,
    report2.raw !== void 0 && !unreadable ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "rv-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("summary", { children: "\u5BA1\u67E5\u6A21\u578B\u539F\u6587" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("pre", { className: "rv-raw rv-mono", children: report2.raw })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-actions", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm rv-btn-ghost",
          onClick: () => {
            void api.exportMarkdown(sessionId, report2.id).then((markdown) => {
              const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
              const link = document.createElement("a");
              link.href = url;
              link.download = `\u4EFB\u52A1\u5BA1\u67E5-${new Date(report2.createdAt).toISOString().slice(0, 16).replace(/[T:]/g, "-")}.md`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 5e3);
            }).catch((error) => onNote(error instanceof Error ? error.message : String(error)));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(DownloadIcon, {}),
            " \u5BFC\u51FA Markdown"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "rv-btn rv-btn-sm rv-btn-ghost",
          onClick: () => {
            if (!window.confirm("\u5220\u9664\u8FD9\u4EFD\u5BA1\u67E5\u62A5\u544A\uFF1F")) return;
            void api.remove(sessionId, report2.id).finally(() => refreshSoon(sessionId));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TrashIcon, {}),
            " \u5220\u9664"
          ]
        }
      )
    ] })
  ] });
}
function Running({ state }) {
  const running = state.running;
  const now = useTick(running !== void 0);
  if (running === void 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-card rv-running", "aria-live": "off", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-phase", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-spinner" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-grow", children: [
        running.trigger === "live" ? "\u5B9E\u65F6\u5BA1\u67E5\uFF1A" : running.trigger === "loop" ? "\u8FDE\u7EED\u5BA1\u67E5\uFF1A" : "",
        running.phase
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-meta", children: [
        Math.max(0, Math.round((now - running.startedAt) / 1e3)),
        " \u79D2"
      ] }),
      running.trigger !== "loop" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "rv-btn rv-btn-sm", onClick: () => void api.cancel(state.sessionId).finally(() => refreshSoon(state.sessionId)), children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StopIcon, { size: 12 }),
        " \u53D6\u6D88"
      ] }) : null
    ] }),
    running.tools.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-chips", children: running.tools.map((tool, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-chip rv-mono" + (tool.ok ? "" : " is-bad"), title: tool.target, children: [
      tool.name,
      " ",
      tool.target
    ] }, i)) }) : null,
    running.text !== "" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-stream rv-mono", children: running.text }) : null
  ] });
}
var LOOP_TITLES = {
  reviewing: "\u8FDE\u7EED\u5BA1\u67E5\u8FDB\u884C\u4E2D",
  sending: "\u8FDE\u7EED\u5BA1\u67E5\uFF1A\u7B49\u4E3B\u5BF9\u8BDD\u7A7A\u4E0B\u6765",
  waiting: "\u8FDE\u7EED\u5BA1\u67E5\uFF1A\u7B49\u4E3B\u5BF9\u8BDD\u4FEE\u6539",
  passed: "\u8FDE\u7EED\u5BA1\u67E5\u5B8C\u6210\uFF1A\u6CA1\u6709\u95EE\u9898\u4E86",
  limit: "\u8FDE\u7EED\u5BA1\u67E5\u7ED3\u675F\uFF1A\u8FBE\u5230\u8F6E\u6570\u4E0A\u9650",
  stopped: "\u8FDE\u7EED\u5BA1\u67E5\u5DF2\u505C\u6B62",
  failed: "\u8FDE\u7EED\u5BA1\u67E5\u4E2D\u65AD"
};
function LoopCard({ loop, sessionId, onPick }) {
  const active = loop.status === "reviewing" || loop.status === "sending" || loop.status === "waiting";
  const now = useTick(active);
  const tone = loop.status === "passed" ? "pass" : loop.status === "limit" ? "doubt" : loop.status === "failed" ? "fail" : active ? "running" : "idle";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-card rv-loop is-" + tone, "aria-label": "\u8FDE\u7EED\u5BA1\u67E5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-phase", children: [
      active ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-spinner" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LoopIcon, { size: 14 }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-grow", children: [
        LOOP_TITLES[loop.status],
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-meta", children: [
          " ",
          "\xB7 \u7B2C ",
          loop.round,
          "/",
          loop.maxRounds,
          " \u8F6E \xB7 ",
          Math.max(0, Math.round(((loop.endedAt ?? now) - loop.startedAt) / 1e3)),
          " \u79D2"
        ] })
      ] }),
      active ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "rv-btn rv-btn-sm", onClick: () => void api.stopLoop(sessionId).finally(() => refreshSoon(sessionId)), children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StopIcon, { size: 12 }),
        " \u505C\u6B62"
      ] }) : null
    ] }),
    loop.message !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-hint", style: { marginTop: 4 }, children: loop.message }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ol", { className: "rv-rounds", children: loop.rounds.map((round) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-dot" + (round.verdict !== void 0 ? ` is-${round.verdict}` : "") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-grow", children: [
        "\u7B2C ",
        round.round,
        " \u8F6E\uFF1A",
        round.verdict === void 0 ? "\u5BA1\u67E5\u4E2D\u2026" : `${VERDICT_LABELS[round.verdict]}${round.open !== void 0 && round.open > 0 ? ` \xB7 ${round.open} \u4E2A\u95EE\u9898` : ""}${round.sentAt !== void 0 ? " \xB7 \u5DF2\u53D1\u7ED9\u4E3B\u5BF9\u8BDD" : ""}`
      ] }),
      round.reportId !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "rv-link", onClick: () => onPick(round.reportId), children: "\u770B\u62A5\u544A" }) : null
    ] }, round.round)) })
  ] });
}
function SettingsSection({ state }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-card is-sunk", "aria-label": "\u5BA1\u67E5\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u5B9E\u65F6\u65F6\u673A" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        Segmented,
        {
          label: "\u5B9E\u65F6\u5BA1\u67E5\u5728\u4EC0\u4E48\u65F6\u5019\u8FDB\u884C",
          value: state.global.liveTrigger,
          options: [
            { value: "turn", label: "\u6BCF\u8F6E\u7ED3\u675F", title: "\u6BCF\u8F6E\u4EFB\u52A1\u7ED3\u675F\u540E\u5BA1\u67E5\u4E00\u6B21\uFF08\u63A8\u8350\uFF09" },
            { value: "step", label: "\u8F6E\u4E2D\u4E5F\u5BA1", title: "\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF0C\u6BCF\u6B65\u4E4B\u540E\u505C\u987F\u7247\u523B\u5C31\u5BA1\u4E00\u6B21\uFF08\u66F4\u53CA\u65F6\uFF0C\u4E5F\u66F4\u8D39\uFF09" }
          ],
          onChange: (liveTrigger) => void api.global({ liveTrigger }).finally(() => refreshSoon(state.sessionId))
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "rv-hint", style: { margin: "8px 0 0" }, children: "\u5BA1\u67E5\u65F6\uFF0C\u5BF9\u8BDD\u8BB0\u5F55\u3001\u5DE5\u5177\u8F93\u51FA\u548C\u751F\u6210\u7684\u6587\u4EF6\u4F1A\u53D1\u7ED9\u4F60\u9009\u7684\u5BA1\u67E5\u6A21\u578B\uFF08\u53EF\u80FD\u662F\u53E6\u4E00\u5BB6\u670D\u52A1\u5546\uFF09\u3002\u5E38\u89C1\u7684\u5BC6\u94A5\u548C token \u4F1A\u5148\u9690\u85CF\uFF1B.env\u3001\u79C1\u94A5\u7B49\u6587\u4EF6\u4E0D\u4F1A\u88AB\u8BFB\u53D6\u3002\u5BA1\u67E5\u63D2\u4EF6\u53EA\u8BFB\uFF1A\u4E0D\u6539\u6587\u4EF6\u3001\u4E0D\u8FD0\u884C\u547D\u4EE4\uFF0C\u4FEE\u6539\u548C\u8FD0\u884C\u90FD\u4EA4\u7ED9\u4E3B\u4F1A\u8BDD\u3002" })
  ] });
}
function ReviewPane({ sessionId }) {
  const { state, error } = useReviewState(sessionId);
  const [catalog2, setCatalog] = (0, import_react3.useState)(void 0);
  const [catalogError, setCatalogError] = (0, import_react3.useState)(void 0);
  const [prompts, setPrompts] = (0, import_react3.useState)([]);
  const [view, setView] = (0, import_react3.useState)("review");
  const [showSettings, setShowSettings] = (0, import_react3.useState)(false);
  const [picked, setPicked] = (0, import_react3.useState)(void 0);
  const [note, setNote] = (0, import_react3.useState)(void 0);
  const [startError, setStartError] = (0, import_react3.useState)(void 0);
  const [starting, setStarting] = (0, import_react3.useState)(false);
  const [rounds, setRounds] = (0, import_react3.useState)("");
  const reloadPrompts = () => {
    void api.prompts().then(setPrompts).catch(() => void 0);
  };
  (0, import_react3.useEffect)(() => {
    let alive = true;
    loadCatalog().then((value) => alive && setCatalog(value)).catch((reason) => alive && setCatalogError(reason instanceof Error ? reason.message : String(reason)));
    reloadPrompts();
    return () => {
      alive = false;
    };
  }, []);
  (0, import_react3.useEffect)(() => {
    if (note === void 0) return void 0;
    const timer = setTimeout(() => setNote(void 0), 6e3);
    return () => clearTimeout(timer);
  }, [note]);
  const route = state?.settings.route ?? state?.effectiveRoute;
  const efforts = useEfforts(route === void 0 ? void 0 : { provider: route.provider, model: route.model });
  const shown = (0, import_react3.useMemo)(() => state?.reports.find((item) => item.id === picked) ?? state?.reports[0], [state?.reports, picked]);
  if (sessionId === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-root", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-empty", children: "\u6253\u5F00\u4E00\u4E2A\u5BF9\u8BDD\u540E\uFF0C\u8FD9\u91CC\u53EF\u4EE5\u5BA1\u67E5\u5B83\u505A\u7684\u4E8B\u3002" }) }) });
  }
  if (state === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-root", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-scroll", children: error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-banner is-error", children: error }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-empty", children: "\u52A0\u8F7D\u4E2D\u2026" }) }) });
  }
  const settings = state.settings;
  const turns = state.turns;
  const scope = settings.scope.kind === "range" ? { kind: "range", from: Math.min(settings.scope.from, Math.max(1, turns)), to: Math.min(settings.scope.to, Math.max(1, turns)) } : settings.scope;
  const running = state.running !== void 0;
  const loopActive = state.loop !== void 0 && ["reviewing", "sending", "waiting"].includes(state.loop.status);
  const effective = state.effectiveRoute;
  const fromLabel = effective === void 0 ? "" : effective.from === "harness" ? "\u8DDF\u968F DSH \u9ED8\u8BA4" : effective.from === "conversation" ? "\u548C\u6267\u884C\u8005\u76F8\u540C" : "";
  const save = (patch) => {
    void api.settings(sessionId, patch).catch((reason) => setNote(reason instanceof Error ? reason.message : String(reason))).finally(() => refreshSoon(sessionId));
  };
  const options = {
    scope,
    depth: settings.depth,
    content: settings.content,
    ...settings.route !== void 0 ? { route: settings.route } : {}
  };
  const maxRounds = Math.min(20, Math.max(1, Number(rounds || settings.loopRounds) || 5));
  const startOnce = () => {
    setStartError(void 0);
    setStarting(true);
    setPicked(void 0);
    refreshSoon(sessionId);
    api.review(sessionId, options).catch((reason) => setStartError(reason instanceof Error ? reason.message : String(reason))).finally(() => {
      setStarting(false);
      refreshSoon(sessionId);
    });
  };
  const startLoop = () => {
    setStartError(void 0);
    setPicked(void 0);
    api.startLoop(sessionId, { ...options, maxRounds }).catch((reason) => setStartError(reason instanceof Error ? reason.message : String(reason))).finally(() => refreshSoon(sessionId));
  };
  const promptName = (id) => prompts.find((item) => item.id === id)?.name ?? "\u6807\u51C6\u5BA1\u67E5";
  const latest = state.reports[0];
  const header = running || loopActive ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-verdict is-running", children: loopActive ? "\u8FDE\u7EED\u5BA1\u67E5\u4E2D" : "\u5BA1\u67E5\u4E2D" }) : latest !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `rv-verdict is-${latest.verdict}`, children: VERDICT_LABELS[latest.verdict] }) : null;
  const blocked = running || loopActive || starting || !state.live || turns === 0;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-root", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-scroll", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ShieldIcon, { size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: "\u4EFB\u52A1\u5BA1\u67E5" }),
      header,
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-views", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", "aria-pressed": view === "review", className: view === "review" ? "is-on" : "", onClick: () => setView("review"), children: "\u5BA1\u67E5" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", "aria-pressed": view === "prompts", className: view === "prompts" ? "is-on" : "", onClick: () => setView("prompts"), children: "\u63D0\u793A\u8BCD" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "rv-icon-btn" + (showSettings ? " is-on" : ""), "aria-expanded": showSettings, "aria-label": "\u5BA1\u67E5\u8BBE\u7F6E", title: "\u5BA1\u67E5\u8BBE\u7F6E", onClick: () => setShowSettings(!showSettings), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(GearIcon, {}) })
    ] }),
    showSettings ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SettingsSection, { state }) : null,
    view === "prompts" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      PromptsView,
      {
        global: state.global,
        onChanged: () => {
          reloadPrompts();
          refreshSoon(sessionId);
        }
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      !state.live ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-banner is-info", children: "\u8FD9\u4E2A\u5BF9\u8BDD\u73B0\u5728\u6CA1\u6709\u5728 DSH \u91CC\u52A0\u8F7D\uFF0C\u53EA\u80FD\u770B\u4EE5\u524D\u7684\u62A5\u544A\u3002\u5728\u5DE6\u8FB9\u6253\u5F00\u5B83\u540E\u5C31\u80FD\u5BA1\u67E5\u3002" }) : null,
      catalogError !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-banner is-error", children: [
        "\u8BFB\u4E0D\u5230\u6A21\u578B\u5217\u8868\uFF1A",
        catalogError
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-card", "aria-label": "\u5F00\u59CB\u5BA1\u67E5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u5BA1\u67E5\u6A21\u578B" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-grow", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            ModelSelect,
            {
              catalog: catalog2,
              value: settings.route,
              label: "\u5BA1\u67E5\u6A21\u578B",
              defaultLabel: effective !== void 0 && settings.route === void 0 ? `${fromLabel !== "" ? fromLabel : "\u9ED8\u8BA4"}\uFF08${modelName(catalog2, effective)}\uFF09` : "\u8DDF\u968F DSH \u9ED8\u8BA4",
              onChange: (next) => save({ route: next ?? null })
            }
          ) })
        ] }),
        route !== void 0 && efforts !== void 0 && efforts.efforts.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u601D\u8003\u5F3A\u5EA6" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-grow", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            EffortSelect,
            {
              efforts,
              value: route.effort,
              label: "\u5BA1\u67E5\u6A21\u578B\u7684\u601D\u8003\u5F3A\u5EA6",
              onChange: (effort) => save({ route: { provider: route.provider, model: route.model, ...effort !== void 0 ? { effort } : {} } })
            }
          ) })
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u8303\u56F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            Segmented,
            {
              label: "\u5BA1\u67E5\u8303\u56F4",
              value: scope.kind,
              options: [
                { value: "last", label: "\u6700\u540E\u4E00\u8F6E" },
                { value: "all", label: "\u6574\u4E2A\u5BF9\u8BDD" },
                { value: "range", label: "\u6307\u5B9A\u8F6E\u6B21" }
              ],
              onChange: (kind) => save({ scope: kind === "range" ? { kind: "range", from: Math.max(1, turns - 2), to: Math.max(1, turns) } : { kind } })
            }
          )
        ] }),
        scope.kind === "range" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-hint", children: "\u7B2C" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { className: "rv-num", type: "number", min: 1, max: Math.max(1, turns), value: scope.from, "aria-label": "\u4ECE\u7B2C\u51E0\u8F6E", onChange: (event) => save({ scope: { kind: "range", from: Math.max(1, Math.min(turns, Number(event.target.value) || 1)), to: scope.to } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-hint", children: "\u5230" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { className: "rv-num", type: "number", min: 1, max: Math.max(1, turns), value: scope.to, "aria-label": "\u5230\u7B2C\u51E0\u8F6E", onChange: (event) => save({ scope: { kind: "range", from: scope.from, to: Math.max(1, Math.min(turns, Number(event.target.value) || 1)) } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-hint", children: [
            "\u8F6E\uFF08\u5171 ",
            turns,
            " \u8F6E\uFF09"
          ] })
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u5185\u5BB9" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            Segmented,
            {
              label: "\u5BA1\u67E5\u5185\u5BB9",
              value: settings.content,
              options: [
                { value: "both", label: "\u5BF9\u8BDD\u548C\u6587\u4EF6", title: "\u65E2\u6838\u5BF9\u5BF9\u8BDD\u91CC\u7684\u8BF4\u6CD5\uFF0C\u4E5F\u68C0\u67E5\u751F\u6210\u7684\u6587\u4EF6" },
                { value: "conversation", label: "\u53EA\u770B\u5BF9\u8BDD", title: "\u53EA\u6839\u636E\u5BF9\u8BDD\u8BB0\u5F55\uFF08\u542B\u5DE5\u5177\u8C03\u7528\u548C\u7ED3\u679C\uFF09\u5BA1\u67E5" },
                { value: "files", label: "\u53EA\u770B\u6587\u4EF6", title: "\u53EA\u68C0\u67E5\u8FD9\u51E0\u8F6E\u5199\u51FA\u7684\u6587\u4EF6\u662F\u5426\u7B26\u5408\u8981\u6C42" }
              ],
              onChange: (content) => save({ content })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u6DF1\u5EA6" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            Segmented,
            {
              label: "\u5BA1\u67E5\u6DF1\u5EA6",
              value: settings.depth,
              options: [
                { value: "quick", label: "\u5FEB\u901F", title: "\u53EA\u770B\u53D1\u8FC7\u53BB\u7684\u5185\u5BB9\uFF0C\u4E0D\u81EA\u5DF1\u67E5\u770B\u6587\u4EF6" },
                { value: "deep", label: "\u6DF1\u5165", title: "\u5BA1\u67E5\u6A21\u578B\u8FD8\u53EF\u4EE5\u8BFB\u6587\u4EF6\u3001\u5217\u76EE\u5F55\u3001\u641C\u7D22\u6765\u6838\u5B9E\uFF08\u53EA\u8BFB\uFF0C\u4E0D\u8FD0\u884C\u547D\u4EE4\uFF1B\u66F4\u51C6\uFF0C\u66F4\u6162\uFF09" }
              ],
              onChange: (depth) => save({ depth })
            }
          ),
          settings.content === "conversation" && settings.depth === "deep" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-hint", children: "\u53EA\u770B\u5BF9\u8BDD\u65F6\u6309\u5FEB\u901F" }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-label", children: "\u63D0\u793A\u8BCD" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-grow", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "select",
            {
              className: "rv-select",
              "aria-label": "\u5BA1\u67E5\u63D0\u793A\u8BCD",
              value: state.global.activePromptId,
              onChange: (event) => void api.global({ activePromptId: event.target.value }).catch((reason) => setNote(reason instanceof Error ? reason.message : String(reason))).finally(() => refreshSoon(sessionId)),
              children: [
                prompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: state.global.activePromptId, children: promptName(state.global.activePromptId) }) : null,
                prompts.map((item) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: item.id, children: item.name }, item.id))
              ]
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "rv-link", onClick: () => setView("prompts"), children: "\u7BA1\u7406" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-row", style: { marginTop: 10 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "rv-btn rv-btn-primary rv-grow", disabled: blocked, onClick: startOnce, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PlayIcon, { size: 12 }),
          " \u5BA1\u67E5",
          scopeLabel(scope)
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "rv-btn rv-grow", disabled: blocked, title: "\u5BA1\u67E5 \u2192 \u628A\u95EE\u9898\u81EA\u52A8\u53D1\u7ED9\u4E3B\u5BF9\u8BDD \u2192 \u4E3B\u5BF9\u8BDD\u4FEE\u6539\u540E\u518D\u5BA1\u67E5\uFF0C\u76F4\u5230\u6CA1\u6709\u95EE\u9898\u6216\u8FBE\u5230\u8F6E\u6570", onClick: startLoop, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LoopIcon, { size: 13 }),
            " \u8FDE\u7EED\u5BA1\u67E5"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-hint", children: "\u6700\u591A" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "input",
            {
              className: "rv-num",
              type: "number",
              min: 1,
              max: 20,
              value: rounds === "" ? String(settings.loopRounds) : rounds,
              "aria-label": "\u8FDE\u7EED\u5BA1\u67E5\u6700\u591A\u51E0\u8F6E",
              onChange: (event) => setRounds(event.target.value),
              onBlur: () => {
                if (rounds !== "") save({ loopRounds: maxRounds });
                setRounds("");
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-hint", children: "\u8F6E" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-row", style: { justifyContent: "space-between" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "rv-check", title: "\u5F00\u542F\u540E\uFF0C\u6240\u6709\u5BF9\u8BDD\u6BCF\u8F6E\u4EFB\u52A1\u7ED3\u675F\u65F6\u81EA\u52A8\u5BA1\u67E5\u8FD9\u4E00\u8F6E\uFF08\u5B50\u4EE3\u7406\u7684\u4F1A\u8BDD\u9664\u5916\uFF09\uFF1B\u53EA\u63D0\u793A\uFF0C\u4E0D\u4F1A\u6253\u65AD\u4E3B\u6A21\u578B", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked: settings.live, onChange: (event) => save({ live: event.target.checked }) }),
            "\u5B9E\u65F6\u5BA1\u67E5"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-hint", children: [
            "\u5171 ",
            turns,
            " \u8F6E",
            state.busy ? " \xB7 \u4E3B\u6A21\u578B\u6B63\u5728\u5DE5\u4F5C" : ""
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "rv-hint rv-shared-note", children: "\u8FD9\u4E9B\u8BBE\u7F6E\u5BF9\u6240\u6709\u5BF9\u8BDD\u901A\u7528\u3002" }),
      startError !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-banner is-error", children: startError }) : null,
      state.error !== void 0 && !running && startError === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-banner is-error", children: [
        "\u4E0A\u6B21\u5BA1\u67E5\u6CA1\u6709\u5B8C\u6210\uFF1A",
        state.error
      ] }) : null,
      note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-banner is-info", children: note }) : null,
      state.loop !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LoopCard, { loop: state.loop, sessionId, onPick: setPicked }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Running, { state }),
      shown !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReportView, { report: shown, sessionId, catalog: catalog2, onNote: setNote }) : !running ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ShieldIcon, { size: 30 }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "\u8FD8\u6CA1\u6709\u5BA1\u67E5\u62A5\u544A\u3002\u9009\u597D\u8303\u56F4\u548C\u5185\u5BB9\uFF0C\u70B9\u300C\u5BA1\u67E5\u300D\uFF0C\u53E6\u4E00\u4E2A\u6A21\u578B\u4F1A\u6838\u5BF9\u8FD9\u4E2A\u5BF9\u8BDD\u505A\u7684\u4E8B\u548C\u5199\u51FA\u7684\u6587\u4EF6\uFF1A\u8BF4\u7684\u548C\u505A\u7684\u662F\u5426\u4E00\u81F4\u3001\u6709\u6CA1\u6709\u6F0F\u505A\u3001\u8D8A\u754C\u6216\u5371\u9669\u7684\u64CD\u4F5C\u3002" })
      ] }) : null,
      state.reports.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rv-section-title", children: [
          "\u4EE5\u524D\u7684\u5BA1\u67E5\uFF08",
          state.reports.length,
          "\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "rv-history", children: state.reports.map((report2) => {
          const open = openFindings(report2).length;
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "rv-hrow" + (report2.id === shown?.id ? " is-on" : ""), onClick: () => setPicked(report2.id), children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `rv-dot is-${report2.verdict}` }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "rv-grow", children: [
              rangeLabel(report2),
              report2.trigger === "live" ? " \xB7 \u5B9E\u65F6" : report2.loop !== void 0 ? ` \xB7 \u8FDE\u7EED ${report2.loop.round}/${report2.loop.max}` : "",
              " \xB7 ",
              VERDICT_LABELS[report2.verdict],
              open > 0 ? ` \xB7 ${open} \u4E2A\u95EE\u9898` : ""
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "rv-meta", children: timeLabel(report2.createdAt) })
          ] }, report2.id);
        }) })
      ] }) : null
    ] })
  ] }) });
}

// src/client/ShieldButton.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var pane = { open: () => {
} };
function standingVerdict(report2) {
  if (report2.findings.length === 0) return report2.verdict;
  const open = report2.findings.filter((item) => item.dismissed !== true);
  if (open.some((item) => item.severity === "high")) return report2.verdict === "pass" ? "doubt" : report2.verdict;
  if (open.length === 0) return "pass";
  return report2.verdict === "fail" && !open.some((item) => item.severity !== "low") ? "doubt" : report2.verdict;
}
function useDismiss(open, close) {
  const ref = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    if (!open) return void 0;
    const onDown = (event) => {
      if (ref.current !== null && !ref.current.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);
  return ref;
}
function ShieldButton({ sessionId, inputActions, useInput }) {
  const { state } = useReviewState(sessionId);
  const [open, setOpen] = (0, import_react4.useState)(false);
  const [message, setMessage] = (0, import_react4.useState)(void 0);
  const [working, setWorking] = (0, import_react4.useState)(false);
  const ref = useDismiss(open, () => setOpen(false));
  const draft = (0, import_react4.useRef)("");
  draft.current = (typeof useInput === "function" ? useInput((input) => input.draft) : void 0) ?? "";
  (0, import_react4.useEffect)(() => {
    if (inputActions === void 0 || typeof inputActions.setDraft !== "function") return void 0;
    return registerComposer(sessionId, { setDraft: (text) => inputActions.setDraft(text), draft: () => draft.current });
  }, [sessionId, inputActions]);
  (0, import_react4.useEffect)(() => {
    if (message === void 0) return void 0;
    const timer = setTimeout(() => setMessage(void 0), 8e3);
    return () => clearTimeout(timer);
  }, [message]);
  const latest = state?.reports[0];
  const loopActive = state?.loop !== void 0 && ["reviewing", "sending", "waiting"].includes(state.loop.status);
  const running = working || state?.running !== void 0 || loopActive;
  const current = latest !== void 0 && state !== void 0 && latest.turns.to >= state.turns;
  const status = running ? "running" : current ? standingVerdict(latest) : void 0;
  const settings = state?.settings;
  const lastNote = latest === void 0 ? "" : current ? `\uFF08\u6700\u540E\u4E00\u8F6E\uFF1A${VERDICT_LABELS[standingVerdict(latest)]}\uFF09` : `\uFF08\u4E0A\u6B21\u5BA1\u67E5\u7684\u662F\u7B2C ${latest.turns.to} \u8F6E\uFF0C\u4E4B\u540E\u5BF9\u8BDD\u6709\u4E86\u65B0\u5185\u5BB9\uFF09`;
  const title = running ? "\u4EFB\u52A1\u5BA1\u67E5\uFF1A\u6B63\u5728\u5BA1\u67E5\uFF08\u5DE6\u952E\u6253\u5F00\u9762\u677F\u770B\u8FDB\u5EA6\uFF0C\u53F3\u952E\u66F4\u591A\uFF09" : `\u5DE6\u952E\uFF1A\u5BA1\u67E5\u6700\u540E\u4E00\u8F6E\uFF0C\u5EFA\u8BAE\u653E\u8FDB\u8F93\u5165\u6846${lastNote}\uFF1B\u53F3\u952E\uFF1A\u66F4\u591A`;
  const lastTurn = settings === void 0 ? void 0 : { scope: { kind: "last" }, depth: settings.depth, content: settings.content, ...settings.route !== void 0 ? { route: settings.route } : {} };
  const loopOptions = settings === void 0 ? void 0 : { ...lastTurn, scope: settings.scope };
  const reviewIntoComposer = () => {
    setOpen(false);
    if (running) {
      pane.open();
      return;
    }
    if (lastTurn === void 0 || state === void 0 || state.turns === 0) return;
    setWorking(true);
    setMessage("\u6B63\u5728\u5BA1\u67E5\u6700\u540E\u4E00\u8F6E\u2026");
    refreshSoon(sessionId);
    void api.review(sessionId, lastTurn).then((report2) => {
      if (report2 === void 0) {
        setMessage("\u5BA1\u67E5\u6CA1\u6709\u8FD4\u56DE\u7ED3\u679C");
        return;
      }
      const findings = openFindings(report2);
      if (findings.length === 0) {
        setMessage(`\u5BA1\u67E5${VERDICT_LABELS[report2.verdict]}\uFF1A\u6CA1\u6709\u9700\u8981\u4FEE\u6539\u7684\u95EE\u9898`);
        return;
      }
      if (putIntoComposer(sessionId, messageFor(report2, findings))) setMessage(`\u5DF2\u628A ${findings.length} \u6761\u5EFA\u8BAE\u653E\u8FDB\u8F93\u5165\u6846\uFF0C\u4FEE\u6539\u540E\u6309\u53D1\u9001`);
      else setMessage(`\u5BA1\u67E5${VERDICT_LABELS[report2.verdict]}\uFF0C\u4F46\u627E\u4E0D\u5230\u8F93\u5165\u6846\uFF1A\u8BF7\u5728\u5BA1\u67E5\u9762\u677F\u91CC\u67E5\u770B`);
    }).catch((error) => setMessage(error instanceof Error ? error.message : String(error))).finally(() => {
      setWorking(false);
      refreshSoon(sessionId);
    });
  };
  const openMenu = () => setOpen(true);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rv-shield", ref, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "button",
      {
        type: "button",
        className: "rv-shield-btn",
        "aria-label": title,
        title,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: reviewIntoComposer,
        onContextMenu: (event) => {
          event.preventDefault();
          openMenu();
        },
        onKeyDown: (event) => {
          if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) {
            event.preventDefault();
            openMenu();
          }
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ShieldIcon, { size: 17 }),
          status !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `rv-shield-dot is-${status}` }) : null
        ]
      }
    ),
    message !== void 0 && !open ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rv-shield-note", children: message }) : null,
    open ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rv-menu", role: "menu", "aria-label": "\u4EFB\u52A1\u5BA1\u67E5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", role: "menuitem", className: "rv-menu-item", disabled: running || state === void 0 || state.turns === 0, onClick: reviewIntoComposer, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PlayIcon, { size: 12 }),
        " \u5BA1\u67E5\u6700\u540E\u4E00\u8F6E\uFF0C\u5EFA\u8BAE\u653E\u8FDB\u8F93\u5165\u6846"
      ] }),
      loopActive ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          role: "menuitem",
          className: "rv-menu-item",
          onClick: () => {
            setOpen(false);
            void api.stopLoop(sessionId).finally(() => refreshSoon(sessionId));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(StopIcon, { size: 12 }),
            " \u505C\u6B62\u8FDE\u7EED\u5BA1\u67E5"
          ]
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          role: "menuitem",
          className: "rv-menu-item",
          disabled: running || loopOptions === void 0 || state === void 0 || state.turns === 0,
          onClick: () => {
            setOpen(false);
            if (loopOptions === void 0 || settings === void 0) return;
            pane.open();
            void api.startLoop(sessionId, { ...loopOptions, maxRounds: settings.loopRounds }).catch((error) => setMessage(error instanceof Error ? error.message : String(error))).finally(() => refreshSoon(sessionId));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LoopIcon, { size: 12 }),
            " \u8FDE\u7EED\u5BA1\u67E5",
            settings !== void 0 ? `${scopeLabel(settings.scope)}\uFF08\u6700\u591A ${settings.loopRounds} \u8F6E\uFF09` : ""
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          role: "menuitem",
          className: "rv-menu-item",
          onClick: () => {
            setOpen(false);
            pane.open();
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PanelIcon, { size: 13 }),
            " \u6253\u5F00\u5BA1\u67E5\u9762\u677F"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rv-menu-sep" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          role: "menuitemcheckbox",
          "aria-checked": settings?.live === true,
          className: "rv-menu-item",
          disabled: state === void 0,
          onClick: () => {
            if (state === void 0) return;
            void api.settings(sessionId, { live: !state.settings.live }).finally(() => refreshSoon(sessionId));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { width: 13, display: "inline-block", textAlign: "center" }, children: settings?.live === true ? "\u2713" : "" }),
            " \u5B9E\u65F6\u5BA1\u67E5\uFF08\u6240\u6709\u5BF9\u8BDD\uFF0C\u6BCF\u8F6E\u7ED3\u675F\uFF09"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rv-menu-note", children: [
        "\u6A21\u578B\u3001\u5185\u5BB9\u3001\u6DF1\u5EA6\u3001\u63D0\u793A\u8BCD\u5728\u5BA1\u67E5\u9762\u677F\u91CC\u8BBE\u7F6E\uFF0C\u5BF9\u6240\u6709\u5BF9\u8BDD\u901A\u7528",
        settings !== void 0 ? `\uFF08\u73B0\u5728\uFF1A${CONTENT_LABELS[settings.content]} \xB7 ${settings.depth === "deep" ? "\u6DF1\u5165" : "\u5FEB\u901F"}\uFF09` : ""
      ] })
    ] }) : null
  ] });
}

// src/client/styles.ts
var STYLE_ID = "dsh-sider-task-reviewer-styles";
var TOKENS = `
  --rv-fg: var(--dsw-alias-label-primary, #1a1d24);
  --rv-fg-2: var(--dsw-alias-label-secondary, #4b5160);
  --rv-fg-3: var(--dsw-alias-label-tertiary, #7b8191);
  --rv-fg-4: var(--dsw-alias-label-caption, #9aa0ad);
  --rv-surface: var(--dsw-alias-bg-layer-3, #ffffff);
  --rv-sunk: color-mix(in srgb, var(--rv-fg) 3.5%, var(--rv-surface));
  --rv-sunk-2: color-mix(in srgb, var(--rv-fg) 6%, var(--rv-surface));
  --rv-border: var(--dsw-alias-border-l1, rgba(17, 24, 39, 0.08));
  --rv-border-2: var(--dsw-alias-border-l3, rgba(17, 24, 39, 0.16));
  --rv-hover: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.05));
  --rv-brand: var(--dsw-alias-brand-primary, #4d6bfe);
  /* DSH's brand colour is a neutral black/white: "in progress" needs a hue of its own. */
  --rv-busy: #4d6bfe;
  --rv-on-brand: var(--dsw-alias-label-primary-inverted, #ffffff);
  --rv-pass: var(--dsw-alias-state-success-primary, #2f9e6a);
  --rv-doubt: #d98e04;
  --rv-fail: var(--dsw-alias-state-error-primary, #e5484d);
  --rv-r-xs: var(--dsw-radius-xs, 4px);
  --rv-r-sm: var(--dsw-radius-sm, 8px);
  --rv-r-md: var(--dsw-radius-md, 12px);
  --rv-focus: 0 0 0 2px color-mix(in srgb, var(--rv-brand) 45%, transparent);
  --rv-shadow-pop: var(--dsw-elevation-prominent, 0 0 0 0.5px rgba(17,24,39,.08), 0 6px 16px rgba(0,0,0,.08), 0 0 28px rgba(0,0,0,.06));
  --rv-font: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  --rv-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
`;
var CSS = `
.rv-root {${TOKENS}
  height: 100%; min-height: 0; display: flex; flex-direction: column; font-family: var(--rv-font); color: var(--rv-fg); font-size: 13px; line-height: 1.5;
  container-type: inline-size; container-name: rv;
}
.rv-root *, .rv-root *::before, .rv-root *::after { box-sizing: border-box; }
.rv-scroll { flex: 1; min-height: 0; overflow: auto; padding: 12px 12px 40px; scrollbar-width: thin; }
.rv-head { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; }
.rv-head h2 { margin: 0; font-size: 14px; font-weight: 650; }
.rv-head .rv-spacer { flex: 1; }
.rv-hint { color: var(--rv-fg-3); font-size: 12px; }
.rv-mono { font-family: var(--rv-mono); font-size: 11.5px; }

.rv-card { border: 1px solid var(--rv-border); border-radius: var(--rv-r-md); background: var(--rv-surface); padding: 10px 12px; margin: 0 0 10px; }
.rv-card.is-sunk { background: var(--rv-sunk); }
.rv-row { display: flex; align-items: center; gap: 8px; min-height: 30px; }
.rv-row + .rv-row { margin-top: 6px; }
.rv-label { flex: none; width: 56px; color: var(--rv-fg-3); font-size: 12px; }
.rv-grow { flex: 1; min-width: 0; }

.rv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: var(--rv-r-sm);
  border: 1px solid var(--rv-border-2); background: var(--rv-surface); color: var(--rv-fg); font: inherit; font-weight: 500; cursor: pointer; white-space: nowrap; }
.rv-btn:hover { background: var(--rv-hover); }
.rv-btn:disabled { opacity: .5; cursor: default; }
.rv-btn:focus-visible, .rv-icon-btn:focus-visible, .rv-seg button:focus-visible, .rv-select:focus-visible, .rv-num:focus-visible, .rv-link:focus-visible { outline: none; box-shadow: var(--rv-focus); }
.rv-btn-primary { background: var(--rv-brand); border-color: transparent; color: var(--rv-on-brand); }
.rv-btn-primary:hover { background: color-mix(in srgb, var(--rv-brand) 88%, #000); }
.rv-btn-sm { height: 26px; padding: 0 9px; font-size: 12px; }
.rv-btn-ghost { border-color: transparent; background: transparent; color: var(--rv-fg-2); }
.rv-btn-block { width: 100%; }
.rv-icon-btn { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--rv-r-sm); background: transparent; color: var(--rv-fg-3); cursor: pointer; }
.rv-icon-btn:hover { background: var(--rv-hover); color: var(--rv-fg); }
.rv-icon-btn.is-on { background: var(--rv-sunk-2); color: var(--rv-fg); }
.rv-link { border: 0; padding: 0; background: none; color: var(--rv-brand); font: inherit; font-size: 12px; cursor: pointer; }
.rv-link:hover { text-decoration: underline; }

.rv-select, .rv-num { height: 30px; min-width: 0; padding: 0 8px; border: 1px solid var(--rv-border-2); border-radius: var(--rv-r-sm); background: var(--rv-surface); color: var(--rv-fg); font: inherit; font-size: 12.5px; }
.rv-select { width: 100%; }
.rv-num { width: 56px; text-align: center; }
.rv-seg { display: inline-flex; padding: 2px; gap: 2px; border-radius: var(--rv-r-sm); background: var(--rv-sunk-2); }
.rv-seg button { height: 26px; padding: 0 10px; border: 0; border-radius: calc(var(--rv-r-sm) - 2px); background: transparent; color: var(--rv-fg-2); font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
.rv-seg button.is-on { background: var(--rv-surface); color: var(--rv-fg); box-shadow: 0 1px 2px color-mix(in srgb, var(--rv-fg) 12%, transparent); font-weight: 550; }
.rv-check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.rv-check input { width: 15px; height: 15px; margin: 0; accent-color: var(--rv-brand); cursor: pointer; }

.rv-verdict { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.rv-verdict::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.rv-verdict.is-pass { color: var(--rv-pass); background: color-mix(in srgb, var(--rv-pass) 12%, transparent); }
.rv-verdict.is-doubt { color: var(--rv-doubt); background: color-mix(in srgb, var(--rv-doubt) 14%, transparent); }
.rv-verdict.is-fail { color: var(--rv-fail); background: color-mix(in srgb, var(--rv-fail) 12%, transparent); }
.rv-verdict.is-running { color: var(--rv-busy); background: color-mix(in srgb, var(--rv-busy) 13%, transparent); }
.rv-verdict.is-running::before { animation: rv-pulse 1s ease-in-out infinite; }

.rv-phase { display: flex; align-items: center; gap: 8px; font-weight: 550; }
.rv-spinner { width: 13px; height: 13px; flex: none; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--rv-busy) 25%, transparent); border-top-color: var(--rv-busy); animation: rv-spin .8s linear infinite; }
.rv-stream { margin-top: 8px; max-height: 140px; overflow: auto; padding: 8px; border-radius: var(--rv-r-sm); background: var(--rv-sunk); color: var(--rv-fg-2); white-space: pre-wrap; word-break: break-word; }
.rv-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.rv-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 20px; padding: 0 7px; border-radius: 999px; background: var(--rv-sunk-2); color: var(--rv-fg-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-chip.is-bad { color: var(--rv-fail); }

.rv-banner { padding: 8px 10px; margin: 0 0 10px; border-radius: var(--rv-r-sm); font-size: 12.5px; }
.rv-banner.is-error { background: color-mix(in srgb, var(--rv-fail) 10%, transparent); color: var(--rv-fail); }
.rv-banner.is-info { background: var(--rv-sunk); color: var(--rv-fg-2); }

.rv-report-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rv-summary { margin: 8px 0 4px; white-space: pre-wrap; word-break: break-word; }
.rv-meta { color: var(--rv-fg-4); font-size: 11.5px; }
.rv-findings { display: grid; gap: 8px; margin-top: 10px; }
.rv-finding { position: relative; padding: 8px 10px 8px 12px; border-radius: var(--rv-r-sm); background: var(--rv-sunk); }
.rv-finding::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: var(--rv-sev, var(--rv-fg-4)); }
.rv-finding.is-high { --rv-sev: var(--rv-fail); }
.rv-finding.is-medium { --rv-sev: var(--rv-doubt); }
.rv-finding.is-low { --rv-sev: var(--rv-fg-4); }
.rv-finding.is-dismissed { opacity: .5; }
.rv-finding-tags { display: flex; gap: 6px; align-items: center; font-size: 11px; color: var(--rv-fg-3); }
.rv-sev { font-weight: 650; color: var(--rv-sev); }
.rv-finding h4 { margin: 3px 0 4px; font-size: 13px; font-weight: 600; word-break: break-word; }
.rv-finding p { margin: 0 0 4px; color: var(--rv-fg-2); white-space: pre-wrap; word-break: break-word; }
.rv-evidence { display: block; margin: 4px 0; padding: 4px 6px; border-radius: var(--rv-r-xs); background: var(--rv-surface); color: var(--rv-fg-2); word-break: break-all; }
.rv-suggest { color: var(--rv-fg-2); }
.rv-suggest b { color: var(--rv-fg); font-weight: 600; }
.rv-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.rv-list { margin: 6px 0 0; padding-left: 18px; color: var(--rv-fg-2); }
.rv-list li { margin: 2px 0; }
.rv-details { margin-top: 8px; }
.rv-details summary { cursor: pointer; color: var(--rv-fg-3); font-size: 12px; }
.rv-raw { max-height: 240px; overflow: auto; padding: 8px; margin-top: 6px; border-radius: var(--rv-r-sm); background: var(--rv-sunk); white-space: pre-wrap; word-break: break-word; }

.rv-history { display: grid; gap: 2px; }
.rv-hrow { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 4px 8px; border: 0; border-radius: var(--rv-r-sm); background: transparent; color: var(--rv-fg); font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.rv-hrow:hover { background: var(--rv-hover); }
.rv-hrow.is-on { background: var(--rv-sunk-2); }
.rv-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--rv-fg-4); }
.rv-dot.is-pass { background: var(--rv-pass); }
.rv-dot.is-doubt { background: var(--rv-doubt); }
.rv-dot.is-fail { background: var(--rv-fail); }
.rv-section-title { margin: 14px 0 6px; font-size: 12px; font-weight: 600; color: var(--rv-fg-3); }
.rv-empty { padding: 18px 8px; text-align: center; color: var(--rv-fg-3); }
.rv-empty svg { color: var(--rv-fg-4); }

/* view switch, prompt editor, continuous review */
.rv-views { display: inline-flex; padding: 2px; gap: 2px; border-radius: var(--rv-r-sm); background: var(--rv-sunk-2); }
.rv-views button { height: 24px; padding: 0 9px; border: 0; border-radius: calc(var(--rv-r-sm) - 2px); background: transparent; color: var(--rv-fg-2); font: inherit; font-size: 12px; cursor: pointer; }
.rv-views button.is-on { background: var(--rv-surface); color: var(--rv-fg); font-weight: 550; box-shadow: 0 1px 2px color-mix(in srgb, var(--rv-fg) 12%, transparent); }
.rv-views button:focus-visible { outline: none; box-shadow: var(--rv-focus); }
.rv-input { height: 30px; padding: 0 8px; border: 1px solid var(--rv-border-2); border-radius: var(--rv-r-sm); background: var(--rv-surface); color: var(--rv-fg); font: inherit; font-size: 12.5px; min-width: 0; }
.rv-textarea { display: block; width: 100%; margin-top: 8px; padding: 8px; border: 1px solid var(--rv-border-2); border-radius: var(--rv-r-sm); background: var(--rv-surface); color: var(--rv-fg); line-height: 1.55; resize: vertical; }
.rv-input:focus-visible, .rv-textarea:focus-visible { outline: none; box-shadow: var(--rv-focus); }
.rv-prompt-list { display: grid; gap: 2px; }
.rv-prompt-row { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 2px 6px 2px 2px; border-radius: var(--rv-r-sm); }
.rv-prompt-row.is-on { background: var(--rv-sunk-2); }
.rv-prompt-name { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 4px 6px; border: 0; background: transparent; color: var(--rv-fg); font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-tag { flex: none; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--rv-sunk-2); color: var(--rv-fg-3); font-size: 10.5px; line-height: 18px; }
.rv-tag.is-on { background: color-mix(in srgb, var(--rv-pass) 14%, transparent); color: var(--rv-pass); font-weight: 600; }
.rv-loop.is-running { border-color: color-mix(in srgb, var(--rv-busy) 40%, var(--rv-border)); }
.rv-loop.is-pass { border-color: color-mix(in srgb, var(--rv-pass) 45%, var(--rv-border)); }
.rv-loop.is-doubt { border-color: color-mix(in srgb, var(--rv-doubt) 45%, var(--rv-border)); }
.rv-loop.is-fail { border-color: color-mix(in srgb, var(--rv-fail) 45%, var(--rv-border)); }
.rv-rounds { display: grid; gap: 4px; margin: 8px 0 0; padding: 0; list-style: none; font-size: 12.5px; }
.rv-rounds li { display: flex; align-items: center; gap: 8px; }

/* the shield button beside the composer, and its menu */
.rv-shared-note { margin: -4px 2px 10px; }
.rv-shield-note { position: absolute; z-index: 59; right: 0; bottom: calc(100% + 6px); width: max-content; max-width: min(280px, 70vw); padding: 6px 10px; line-height: 1.5; border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff);
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 0.5px rgba(17,24,39,.08), 0 6px 16px rgba(0,0,0,.08)); color: var(--dsw-alias-label-secondary, #4b5160); font-family: var(--dsw-font-family, -apple-system, "PingFang SC", sans-serif); font-size: 12px; white-space: normal; pointer-events: none; }
.rv-shield { position: relative; display: inline-flex; }
.rv-shield-btn { position: relative; display: inline-grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-tertiary, #7b8191); cursor: pointer; }
.rv-shield-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.05)); color: var(--dsw-alias-label-primary, #1a1d24); }
.rv-shield-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 45%, transparent); }
.rv-shield-dot { position: absolute; right: 5px; top: 5px; width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-3, #fff); }
.rv-shield-dot.is-pass { background: var(--dsw-alias-state-success-primary, #2f9e6a); }
.rv-shield-dot.is-doubt { background: #d98e04; }
.rv-shield-dot.is-fail { background: var(--dsw-alias-state-error-primary, #e5484d); }
.rv-shield-dot.is-running { background: #4d6bfe; animation: rv-pulse 1s ease-in-out infinite; }
.rv-menu { position: absolute; z-index: 60; right: 0; bottom: calc(100% + 6px); min-width: 196px; padding: 4px; border-radius: 10px; background: var(--dsw-alias-bg-layer-3, #fff);
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 0.5px rgba(17,24,39,.08), 0 6px 16px rgba(0,0,0,.08)); font-family: var(--dsw-font-family, -apple-system, "PingFang SC", sans-serif); font-size: 13px; color: var(--dsw-alias-label-primary, #1a1d24); }
.rv-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; padding: 0 10px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; white-space: nowrap; }
.rv-menu-item:hover, .rv-menu-item:focus-visible { outline: none; background: var(--dsw-alias-interactive-bg-hover, rgba(17, 24, 39, 0.05)); }
.rv-menu-item:disabled { opacity: .5; cursor: default; }
.rv-menu-sep { height: 1px; margin: 4px 6px; background: var(--dsw-alias-border-l1, rgba(17, 24, 39, 0.08)); }
.rv-menu-note { padding: 4px 10px 6px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #7b8191); white-space: normal; }

@keyframes rv-spin { to { transform: rotate(360deg); } }
@keyframes rv-pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
@container rv (max-width: 340px) {
  .rv-label { width: 44px; }
  .rv-seg button { padding: 0 7px; }
}
@media (prefers-reduced-motion: reduce) { .rv-root *, .rv-shield * { animation: none !important; } }
`;
function ensureStyles() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing !== null) {
    if (existing.textContent !== CSS) existing.textContent = CSS;
    return;
  }
  const element = document.createElement("style");
  element.id = STYLE_ID;
  element.textContent = CSS;
  document.head.appendChild(element);
}

// src/client/index.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var TAB_KIND = "sider-task-reviewer";
var TAB_ID = "dsh-sider-task-reviewer:review";
var inject = [];
function report(step, error) {
  try {
    console.warn(`[sider-task-reviewer] ${step} failed; that part stays off.`, error);
  } catch {
  }
  return () => {
  };
}
function apply(ctx) {
  try {
    ensureStyles();
  } catch (error) {
    report("stylesheet", error);
  }
  ctx.inject(["slots", "sidebarRightTabs", "sidebarRight"], (inner) => {
    const slots = inner.slots;
    const tabs = inner.get("sidebarRightTabs");
    const right = inner.get("sidebarRight");
    if (slots === void 0 || tabs === void 0) return;
    pane.open = () => {
      try {
        right?.openTab?.(TAB_KIND, { revealIfOpened: true });
      } catch (error) {
        report("open the tab", error);
      }
    };
    inner.effect(() => {
      let disposeType;
      let disposeBody;
      try {
        disposeType = tabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          keepMounted: true,
          priority: "extension",
          title: () => "\u4EFB\u52A1\u5BA1\u67E5",
          guide: [{ id: TAB_KIND, order: 60, title: () => "\u4EFB\u52A1\u5BA1\u67E5", description: () => "\u8BA9\u53E6\u4E00\u4E2A\u6A21\u578B\u6838\u5BF9\u8FD9\u4E2A\u5BF9\u8BDD\u505A\u7684\u4E8B", icon: (props) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ShieldIcon, { size: props.size ?? 16 }) }]
        });
        disposeBody = slots.inject(
          "sidebar.right.pane.tab",
          () => slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID, inject: (sessionId) => ({ sessionId }) }, (props) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ReviewPane, { sessionId: props.sessionId }))
        );
      } catch (error) {
        disposeBody?.();
        disposeType?.();
        return report("right sidebar tab", error);
      }
      return () => {
        pane.open = () => {
        };
        try {
          disposeBody?.();
        } finally {
          disposeType?.();
        }
      };
    }, "sider-task-reviewer: right tab");
  });
  ctx.inject(["slots"], (inner) => {
    const slots = inner.slots;
    if (slots === void 0) return;
    inner.effect(() => {
      try {
        return slots.inject("conversation.input.right", () => {
          try {
            return slots.register(
              // The conversation id comes from the framework through `inject` (the documented channel for session-scope slots),
              // so the shield always shows the conversation on screen, not one it was first drawn for.
              { name: "conversation.input.right", id: "sider-task-reviewer", order: 40, inject: (sessionId) => ({ boundSessionId: sessionId }) },
              (props) => {
                const sessionId = props.boundSessionId ?? props.sessionId;
                return sessionId !== void 0 && sessionId !== "" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ShieldButton, { sessionId, inputActions: props.inputActions, useInput: props.useInput }, sessionId) : null;
              }
            );
          } catch (error) {
            return report("composer button registration", error);
          }
        });
      } catch (error) {
        return report("composer button", error);
      }
    }, "sider-task-reviewer: composer button");
  });
}

		return module.exports;
	}
});

