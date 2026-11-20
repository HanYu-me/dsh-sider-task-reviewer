/**
 * Getting a finding back to the working model, only when the user asks:
 * - into the composer: the conversation's own input box gets the text and the
 *   user edits and sends it (the shield button, which lives in that input
 *   area, registers the box's actions here per conversation);
 * - or sent directly through the host (steering while the agent runs, a new
 *   turn when it is idle).
 * @module dsh-sider-task-reviewer/client/compose
 */

/** The part of DSH's composer actions this plugin uses. */
export interface ComposerActions {
  setDraft(text: string): void
  /** What is in the box now (to add to it rather than overwrite it). */
  draft?(): string
}

const composers = new Map<string, ComposerActions>()
const listeners = new Set<() => void>()

/** Register the composer of a conversation; returns the undo. */
export function registerComposer(sessionId: string, actions: ComposerActions): () => void {
  composers.set(sessionId, actions)
  for (const listener of listeners) listener()
  return () => {
    if (composers.get(sessionId) === actions) composers.delete(sessionId)
    for (const listener of listeners) listener()
  }
}

export function composerOf(sessionId: string): ComposerActions | undefined {
  return composers.get(sessionId)
}

export function onComposers(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Put text into a conversation's input box: below what is already typed there
 * (separated by a blank line), never over it.
 * @returns false when the conversation's box is not known.
 */
export function putIntoComposer(sessionId: string, text: string): boolean {
  const composer = composers.get(sessionId)
  if (composer === undefined) return false
  const current = composer.draft?.() ?? ''
  composer.setDraft(current.trim() === '' ? text : `${current.replace(/\s+$/, '')}\n\n${text}`)
  return true
}

export { messageFor, openFindings } from '../shared/message'
