/**
 * Host half of Sider Task Reviewer: reads the live session log, runs reviews
 * through the harness LLM service, keeps the reports on disk and serves
 * /sider-task-reviewer/* for the browser half (the right-sidebar 「审查」 tab
 * and the shield button beside the composer).
 * @module dsh-sider-task-reviewer
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { serveReviewer } from './routes'
import { DEFAULT_CONFIG, ReviewService, type AgentFace, type HostFaces, type SessionFace } from './service'
import { REVIEW_PREFIX, type ModelRoute } from './shared/protocol'
import { createFileStore, type ReviewStore } from './store'

export const name = 'sider-task-reviewer'
/** The model service is the one hard requirement; everything else is read when used. */
export const inject = ['llm']

export { ReviewService } from './service'
export * from './shared/protocol'

/** Fetch a cordis service without letting a cordis-level throw escape. */
function serviceOf(ctx: Context, key: string): unknown {
  try {
    return ctx.get(key)
  } catch {
    return undefined
  }
}

function routeOf(value: unknown): ModelRoute | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as { provider?: unknown; model?: unknown }
  return typeof record.provider === 'string' && typeof record.model === 'string' && record.provider !== '' && record.model !== '' ? { provider: record.provider, model: record.model } : undefined
}

/** The harness-wide default model (dsh-agent-default-model), when there is one. */
function harnessDefault(ctx: Context): ModelRoute | undefined {
  const face = serviceOf(ctx, 'agentDefaultModel') as { currentSelection?: () => unknown } | undefined
  if (typeof face?.currentSelection !== 'function') return undefined
  try {
    return routeOf(face.currentSelection())
  } catch {
    return undefined
  }
}

/** Mount the host half. */
export function apply(ctx: Context, _config?: unknown, store: ReviewStore = createFileStore()): void {
  const faces: HostFaces = {
    session: (id) => {
      const sessions = serviceOf(ctx, 'sessions') as { get?: (id: string) => unknown } | undefined
      const session = typeof sessions?.get === 'function' ? sessions.get(id) : undefined
      return session !== null && typeof session === 'object' && typeof (session as SessionFace).snapshotEvents === 'function' ? (session as SessionFace) : undefined
    },
    sessionIds: () => {
      const sessions = serviceOf(ctx, 'sessions') as { list?: () => unknown[] } | undefined
      try {
        return (typeof sessions?.list === 'function' ? sessions.list() : []).map((item) => (item as { id?: unknown })?.id).filter((id): id is string => typeof id === 'string')
      } catch {
        return []
      }
    },
    agent: (id) => {
      const agents = serviceOf(ctx, 'agents') as { get?: (id: string) => unknown } | undefined
      const agent = typeof agents?.get === 'function' ? agents.get(id) : undefined
      return agent !== null && typeof agent === 'object' && typeof (agent as AgentFace).followup === 'function' ? (agent as AgentFace) : undefined
    },
    llm: () => serviceOf(ctx, 'llm') as ReturnType<HostFaces['llm']>,
    defaultRoute: () => harnessDefault(ctx),
  }
  const service = new ReviewService(faces, store, DEFAULT_CONFIG)
  ctx.effect(() => () => service.dispose(), 'sider-task-reviewer: service')

  // Live and continuous review watch the turn and step ends of every conversation; they only act on the ones switched on.
  ctx.on('session/event' as never, ((session: { id?: unknown }, event: { type?: unknown; seq?: unknown; data?: { reason?: { kind?: unknown } } }) => {
    if (typeof session?.id !== 'string' || typeof event?.type !== 'string') return
    const reason = typeof event.data?.reason?.kind === 'string' ? event.data.reason.kind : undefined
    void service.onSessionEvent(session.id, event.type, typeof event.seq === 'number' ? event.seq : 0, reason).catch(() => undefined)
  }) as never)

  ctx.inject(['webServer'], (routeCtx: Context) => {
    const webserver = routeCtx.get('webServer') as unknown as { register(route: unknown): unknown } | undefined
    if (webserver === undefined) return
    routeCtx.effect(() => {
      const dispose = webserver.register({
        kind: 'prefix',
        path: REVIEW_PREFIX,
        handler: (req: IncomingMessage, res: ServerResponse): Promise<void> => serveReviewer(service, req, res),
      })
      return typeof dispose === 'function' ? (dispose as () => void) : (): void => {}
    }, 'sider-task-reviewer: route')
  })
}
