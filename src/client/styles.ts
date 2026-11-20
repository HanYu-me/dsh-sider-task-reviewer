/**
 * Self-contained stylesheet. Neutral colours, radii and shadows come from
 * DSH's design tokens (`--dsw-*`, with light fallbacks), so the panel follows
 * DSH's light/dark theme. Laid out for a right sidebar about 340–480px wide.
 * @module dsh-sider-task-reviewer/client/styles
 */

const STYLE_ID = 'dsh-sider-task-reviewer-styles'

const TOKENS = `
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
`

export const CSS = `
.rv-root {${TOKENS}
  height: 100%; min-height: 0; display: flex; flex-direction: column; font-family: var(--rv-font); color: var(--rv-fg); font-size: 13px; line-height: 1.5;
  container-type: inline-size; container-name: rv;
}
.rv-root *, .rv-root *::before, .rv-root *::after { box-sizing: border-box; }
.rv-scroll { flex: 1; min-height: 0; overflow: auto; padding: 12px 12px 40px; scrollbar-width: thin; }
.rv-head { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; }
.rv-head h2 { margin: 0; font-size: 14px; font-weight: 650; }
.rv-head h2, .rv-head > .rv-verdict, .rv-views button { white-space: nowrap; }
/* A narrow sidebar: the verdict pill gives way to the view switch (the shield's dot and the report still show it). */
@container rv (max-width: 400px) { .rv-head > .rv-verdict { display: none; } .rv-views button { padding: 0 7px; } }
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
/* The discussion with the reviewer. */
.rv-chat { display: flex; flex-direction: column; gap: 10px; }
.rv-chat-intro { display: flex; flex-direction: column; gap: 6px; }
.rv-chat-intro p { margin: 0; }
.rv-chat-list { display: flex; flex-direction: column; gap: 10px; }
.rv-chat-review { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; border: 1px dashed var(--rv-border-2); border-radius: var(--rv-r-sm);
  background: transparent; color: var(--rv-fg-2); font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.rv-chat-review:hover:not(:disabled) { background: var(--rv-hover); }
.rv-chat-review:disabled { cursor: default; opacity: .7; }
.rv-chat-user { display: flex; justify-content: flex-end; }
.rv-chat-bubble { max-width: 88%; padding: 7px 11px; border-radius: 12px 12px 4px 12px; background: var(--rv-sunk-2); white-space: pre-wrap; word-break: break-word; }
.rv-chat-reply { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border: 1px solid var(--rv-border); border-radius: var(--rv-r-md); background: var(--rv-surface); }
.rv-chat-reply.is-pending { border-color: color-mix(in srgb, var(--rv-busy) 40%, var(--rv-border)); }
.rv-chat-text { white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.rv-chat-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 2px; }
.rv-chat-compose { position: sticky; bottom: 0; margin: 0 -12px; padding: 8px 12px 10px; background: var(--rv-surface); border-top: 1px solid var(--rv-border); }
.rv-chat-compose .rv-textarea { margin-top: 0; resize: none; max-height: 40vh; }

@media (prefers-reduced-motion: reduce) { .rv-root *, .rv-shield * { animation: none !important; } }
`

/**
 * Inject the stylesheet, or bring an existing one up to date: DSH swaps a
 * plugin live and the page keeps the stylesheet of the version it replaced.
 */
export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) {
    if (existing.textContent !== CSS) existing.textContent = CSS
    return
  }
  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = CSS
  document.head.appendChild(element)
}
