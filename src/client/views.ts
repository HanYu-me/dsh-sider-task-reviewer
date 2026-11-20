/**
 * Which view of the panel to show, asked from outside it (the shield's menu
 * opens the discussion). The tab may not be on screen yet when asked, so the
 * last request waits until a panel takes it.
 * @module dsh-sider-task-reviewer/client/views
 */

export type PaneView = 'review' | 'chat' | 'prompts'

let pending: PaneView | undefined
const listeners = new Set<(view: PaneView) => void>()

/** Ask the panel to show a view. */
export function showView(view: PaneView): void {
  pending = view
  for (const listener of listeners) listener(view)
}

/** Take the view asked for before this panel was there. */
export function takeRequestedView(): PaneView | undefined {
  const view = pending
  pending = undefined
  return view
}

/** Listen for requests; the listener takes them (they are not kept for later). */
export function onShowView(listener: (view: PaneView) => void): () => void {
  const wrapped = (view: PaneView): void => {
    pending = undefined
    listener(view)
  }
  listeners.add(wrapped)
  return () => listeners.delete(wrapped)
}
