/**
 * HTTP routes under /sider-task-reviewer (loopback, served by the dsh web server).
 *
 *   GET  /models                      model catalog
 *   GET  /state?session=ID            settings, running review, saved reports
 *   POST /review   {session, scope, depth, route?}   run a review, streamed as server-sent events
 *   GET  /follow?session=ID           the running review's events (SSE), e.g. a live one
 *   POST /cancel   {session}
 *   POST /settings {session, live?, depth?, route?|null, scope?, content?, loopRounds?}   the review choices (one set for every conversation)
 *   GET  /global · POST /global {liveTrigger?, activePromptId?}
 *   GET  /efforts?provider=&model=     the reasoning efforts a model offers
 *   GET  /prompts · POST /prompt {id?, name, text} · POST /prompt/delete {id}   review prompts
 *   POST /loop/start {session, scope, content, depth, route?, promptId?, maxRounds} · POST /loop/stop {session}
 *   POST /send     {session, text, reportId?}        steer / follow-up, only on the user's press
 *   POST /dismiss  {session, reportId, index, dismissed}
 *   POST /remove   {session, reportId}
 *   GET  /export?session=ID&report=ID                Markdown
 *   POST /chat     {session, text, route?}           discuss the reviews with the reviewer (SSE)
 *   POST /chat/cancel {session} · POST /thread/reset {session}   stop a reply · start the reviewer's conversation afresh
 * @module dsh-sider-task-reviewer/routes
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { ReviewError } from './runner'
import type { ReviewService } from './service'
import { REVIEW_PREFIX, type ChatStreamEvent, type ModelRoute, type ReviewContent, type ReviewDepth, type ReviewScope, type ReviewStreamEvent } from './shared/protocol'

const MAX_BODY = 256 * 1024

function send(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return
  const text = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(text)
}

function ok(res: ServerResponse, value: unknown): void {
  send(res, 200, { ok: true, value })
}

function fail(res: ServerResponse, status: number, error: string): void {
  send(res, status, { ok: false, error })
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    size += buffer.length
    if (size > MAX_BODY) throw new ReviewError('请求太大', 'too-large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  const value: unknown = JSON.parse(text)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ReviewError('请求体必须是 JSON 对象', 'bad-request')
  return value as Record<string, unknown>
}

function sessionOf(value: unknown): string {
  if (typeof value !== 'string' || value === '' || value.length > 200) throw new ReviewError('缺少 session', 'bad-request')
  return value
}

function scopeOf(value: unknown): ReviewScope {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  if (record.kind === 'all') return { kind: 'all' }
  if (record.kind === 'range') {
    const from = Math.floor(Number(record.from))
    const to = Math.floor(Number(record.to))
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) throw new ReviewError('轮次范围不对', 'bad-request')
    return { kind: 'range', from: Math.min(from, to), to: Math.max(from, to) }
  }
  return { kind: 'last' }
}

function depthOf(value: unknown): ReviewDepth {
  return value === 'deep' ? 'deep' : 'quick'
}

function routeOf(value: unknown): ModelRoute | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.provider !== 'string' || typeof record.model !== 'string' || record.provider === '' || record.model === '') return undefined
  return { provider: record.provider, model: record.model, ...(typeof record.effort === 'string' && record.effort !== '' ? { effort: record.effort } : {}) }
}

function contentOf(value: unknown): ReviewContent {
  return value === 'conversation' || value === 'files' ? value : 'both'
}

/** Open a server-sent event stream; returns the writer and a closed flag. */
function openStream(req: IncomingMessage, res: ServerResponse): { write(event: ReviewStreamEvent | ChatStreamEvent): void; end(): void; closed(): boolean } {
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' })
  res.write(': open\n\n')
  let closed = false
  const keepAlive = setInterval(() => {
    if (!closed) res.write(': ping\n\n')
  }, 15_000)
  const close = (): void => {
    closed = true
    clearInterval(keepAlive)
  }
  req.on('close', close)
  res.on('close', close)
  return {
    write: (event) => {
      if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`)
    },
    end: () => {
      close()
      if (!res.writableEnded) res.end()
    },
    closed: () => closed,
  }
}

/**
 * Serve one request under {@link REVIEW_PREFIX}.
 * @param service - the reviewer service.
 */
export async function serveReviewer(service: ReviewService, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.slice(REVIEW_PREFIX.length) || '/'
  const method = (req.method ?? 'GET').toUpperCase()
  try {
    if (method === 'GET' && path === '/models') return ok(res, await service.catalog())
    if (method === 'GET' && path === '/global') return ok(res, await service.globalSettings())
    if (method === 'GET' && path === '/live') return ok(res, service.liveSessions())
    if (method === 'GET' && path === '/prompts') return ok(res, await service.prompts())
    if (method === 'GET' && path === '/efforts') {
      const provider = url.searchParams.get('provider') ?? ''
      const model = url.searchParams.get('model') ?? ''
      if (provider === '' || model === '') throw new ReviewError('缺少 provider 或 model', 'bad-request')
      return ok(res, await service.efforts(provider, model))
    }
    if (method === 'GET' && path === '/state') return ok(res, await service.state(sessionOf(url.searchParams.get('session'))))
    if (method === 'GET' && path === '/export') {
      const markdown = await service.exportMarkdown(sessionOf(url.searchParams.get('session')), String(url.searchParams.get('report') ?? ''))
      if (markdown === undefined) return fail(res, 404, '没有这份报告')
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' })
      res.end(markdown)
      return
    }
    if (method === 'GET' && path === '/follow') {
      const sessionId = sessionOf(url.searchParams.get('session'))
      const stream = openStream(req, res)
      const stop = service.follow(sessionId, (event) => {
        stream.write(event)
        if (event.type === 'done' || event.type === 'error') {
          stop?.()
          stream.end()
        }
      })
      if (stop === undefined) stream.end()
      else req.on('close', stop)
      return
    }
    if (method !== 'POST') return fail(res, 405, '不支持的请求')
    const body = await readJson(req)
    switch (path) {
      case '/review': {
        const request = {
          session: sessionOf(body.session),
          scope: scopeOf(body.scope),
          depth: depthOf(body.depth),
          content: contentOf(body.content),
          ...(routeOf(body.route) !== undefined ? { route: routeOf(body.route)! } : {}),
          ...(typeof body.promptId === 'string' && body.promptId !== '' ? { promptId: body.promptId } : {}),
        }
        const stream = openStream(req, res)
        let settled = false
        // Closing the page does not cancel the review: it finishes and is saved.
        await service
          .start(request, 'manual', (event) => {
            if (event.type === 'done' || event.type === 'error') settled = true
            stream.write(event)
          })
          .catch((error: unknown) => {
            // Refused before it started (not loaded, busy, no model): the stream still says why.
            if (!settled) stream.write({ type: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        stream.end()
        return
      }
      case '/cancel':
        return ok(res, service.cancel(sessionOf(body.session)))
      case '/chat': {
        const session = sessionOf(body.session)
        const text = typeof body.text === 'string' ? body.text : ''
        const route = routeOf(body.route)
        const stream = openStream(req, res)
        let settled = false
        // Closing the page does not stop the reply: it finishes and is kept.
        await service
          .chat(session, text, route, (event) => {
            if (event.type === 'done' || event.type === 'error') settled = true
            stream.write(event)
          })
          .catch((error: unknown) => {
            if (!settled) stream.write({ type: 'error', message: error instanceof Error ? error.message : String(error) })
          })
        stream.end()
        return
      }
      case '/chat/cancel':
        return ok(res, service.cancelChat(sessionOf(body.session)))
      case '/thread/reset':
        await service.resetThread(sessionOf(body.session))
        return ok(res, true)
      case '/settings': {
        const patch: Parameters<ReviewService['setSettings']>[1] = {}
        if (typeof body.live === 'boolean') patch.live = body.live
        if (body.depth === 'deep' || body.depth === 'quick') patch.depth = body.depth
        if (body.route === null) patch.route = null
        else if (routeOf(body.route) !== undefined) patch.route = routeOf(body.route)!
        if (body.scope !== undefined) patch.scope = scopeOf(body.scope)
        if (body.content !== undefined) patch.content = contentOf(body.content)
        if (body.loopRounds !== undefined) patch.loopRounds = Number(body.loopRounds)
        return ok(res, await service.setSettings(sessionOf(body.session), patch))
      }
      case '/prompt':
        return ok(res, await service.savePrompt({ ...(typeof body.id === 'string' ? { id: body.id } : {}), name: typeof body.name === 'string' ? body.name : '', text: typeof body.text === 'string' ? body.text : '' }))
      case '/prompt/delete':
        return ok(res, await service.deletePrompt(String(body.id ?? '')))
      case '/loop/start':
        return ok(
          res,
          await service.startLoop({
            session: sessionOf(body.session),
            scope: scopeOf(body.scope),
            content: contentOf(body.content),
            depth: depthOf(body.depth),
            maxRounds: Number(body.maxRounds ?? 5),
            ...(routeOf(body.route) !== undefined ? { route: routeOf(body.route)! } : {}),
            ...(typeof body.promptId === 'string' && body.promptId !== '' ? { promptId: body.promptId } : {}),
          }),
        )
      case '/loop/stop':
        return ok(res, service.stopLoop(sessionOf(body.session)) ?? null)
      case '/global': {
        const patch: { liveTrigger?: 'turn' | 'step'; activePromptId?: string } = {}
        if (typeof body.activePromptId === 'string' && body.activePromptId !== '') patch.activePromptId = body.activePromptId
        if (body.liveTrigger === 'turn' || body.liveTrigger === 'step') patch.liveTrigger = body.liveTrigger
        return ok(res, await service.setGlobal(patch))
      }
      case '/send':
        return ok(res, await service.send(sessionOf(body.session), typeof body.text === 'string' ? body.text : '', typeof body.reportId === 'string' ? body.reportId : undefined))
      case '/dismiss':
        return ok(res, await service.dismiss(sessionOf(body.session), String(body.reportId ?? ''), Math.floor(Number(body.index)), body.dismissed !== false))
      case '/remove':
        return ok(res, await service.remove(sessionOf(body.session), String(body.reportId ?? '')))
      default:
        return fail(res, 404, '没有这个接口')
    }
  } catch (error) {
    if (error instanceof SyntaxError) return fail(res, 400, '请求体不是合法的 JSON')
    if (error instanceof ReviewError) return fail(res, error.code === 'bad-request' || error.code === 'too-large' ? 400 : 409, error.message)
    return fail(res, 500, error instanceof Error ? error.message : String(error))
  }
}
