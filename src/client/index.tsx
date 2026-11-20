/**
 * Browser half of Sider Task Reviewer.
 *
 * - The right-sidebar tab 「任务审查」: a tab type in DSH's native right
 *   sidebar (`ctx.sidebarRightTabs`) plus its body in the keyed
 *   `sidebar.right.pane.tab` slot, which hands the body its conversation id.
 * - The shield button in `conversation.input.right` (session-scoped: it gets
 *   `sessionId` and the composer's `inputActions`).
 *
 * Every wiring step is wrapped so a failure is logged and the rest of DSH
 * keeps booting.
 * @module dsh-sider-task-reviewer/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ShieldIcon } from './icons'
import { ReviewPane } from './ReviewPane'
import { pane, ShieldButton } from './ShieldButton'
import { ensureStyles } from './styles'

/** The tab kind in DSH's right sidebar. */
export const TAB_KIND = 'sider-task-reviewer'
const TAB_ID = 'dsh-sider-task-reviewer:review'

export const inject: string[] = []

interface SlotsFace {
  inject(name: string, callback: () => unknown): unknown
  register(spec: Record<string, unknown>, component: unknown): () => void
}

interface TabsFace {
  register(definition: Record<string, unknown>): () => void
}

interface RightFace {
  openTab?(kind: string, options?: { revealIfOpened?: boolean }): void
}

function report(step: string, error: unknown): () => void {
  try {
    console.warn(`[sider-task-reviewer] ${step} failed; that part stays off.`, error)
  } catch {
    // A throwing console must not fail the boot.
  }
  return () => {}
}

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  try {
    ensureStyles()
  } catch (error) {
    report('stylesheet', error)
  }

  // The tab type and its body. The registry may arrive after the slot seat, so wait for both.
  ctx.inject(['slots', 'sidebarRightTabs', 'sidebarRight'], (inner: ClientContext) => {
    const slots = (inner as unknown as { slots?: SlotsFace }).slots
    const tabs = inner.get('sidebarRightTabs' as never) as unknown as TabsFace | undefined
    const right = inner.get('sidebarRight' as never) as unknown as RightFace | undefined
    if (slots === undefined || tabs === undefined) return
    pane.open = () => {
      try {
        right?.openTab?.(TAB_KIND, { revealIfOpened: true })
      } catch (error) {
        report('open the tab', error)
      }
    }
    inner.effect(() => {
      let disposeType: (() => void) | undefined
      let disposeBody: (() => void) | undefined
      try {
        disposeType = tabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          keepMounted: true,
          priority: 'extension',
          title: () => '任务审查',
          guide: [{ id: TAB_KIND, order: 60, title: () => '任务审查', description: () => '让另一个模型核对这个对话做的事', icon: (props: { size?: number }) => <ShieldIcon size={props.size ?? 16} /> }],
        })
        disposeBody = slots.inject('sidebar.right.pane.tab', () =>
          slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID, inject: (sessionId: string) => ({ sessionId }) }, (props: { sessionId?: string }) => <ReviewPane sessionId={props.sessionId} />),
        ) as () => void
      } catch (error) {
        disposeBody?.()
        disposeType?.()
        return report('right sidebar tab', error)
      }
      return () => {
        pane.open = () => {}
        try {
          disposeBody?.()
        } finally {
          disposeType?.()
        }
      }
    }, 'sider-task-reviewer: right tab')
  })

  // The shield beside the composer.
  ctx.inject(['slots'], (inner: ClientContext) => {
    const slots = (inner as unknown as { slots?: SlotsFace }).slots
    if (slots === undefined) return
    inner.effect(() => {
      try {
        return slots.inject('conversation.input.right', () => {
          try {
            return slots.register(
              // The conversation id comes from the framework through `inject` (the documented channel for session-scope slots),
              // so the shield always shows the conversation on screen, not one it was first drawn for.
              { name: 'conversation.input.right', id: 'sider-task-reviewer', order: 40, inject: (sessionId: string) => ({ boundSessionId: sessionId }) },
              (props: { boundSessionId?: string; sessionId?: string; inputActions?: { setDraft(text: string): void }; useInput?: <S>(select: (state: { draft: string }) => S) => S | undefined }) => {
                const sessionId = props.boundSessionId ?? props.sessionId
                return sessionId !== undefined && sessionId !== '' ? <ShieldButton key={sessionId} sessionId={sessionId} inputActions={props.inputActions} useInput={props.useInput} /> : null
              },
            )
          } catch (error) {
            return report('composer button registration', error)
          }
        }) as () => void
      } catch (error) {
        return report('composer button', error)
      }
    }, 'sider-task-reviewer: composer button')
  })
}
