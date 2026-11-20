/**
 * What the reviewer can see of the workspace, read-only:
 * - {@link workspaceSnapshot}: `git status` + `git diff` for every review;
 * - {@link runTool}: the four tools of a deep review (read_file, list_dir,
 *   search, git). Paths stay inside the conversation's working directory
 *   (symlinks included), files that usually hold secrets are refused, git
 *   runs only read-only subcommands without pager, external diff or textconv,
 *   and every output is capped.
 * @module dsh-sider-task-reviewer/workspace
 */
import { execFile } from 'node:child_process'
import { lstat, open, readdir, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'

const MAX_TOOL_OUTPUT = 24_000
const MAX_FILE_BYTES = 2_000_000
const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.next', 'dist', 'build', '.cache', '.DS_Store'])

/** Files whose content is refused outright. */
export function looksSecret(path: string): boolean {
  const name = basename(path).toLowerCase()
  return (
    name === '.env' ||
    name.startsWith('.env.') ||
    /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(name) ||
    /\.(pem|key|p12|pfx|keystore|jks)$/.test(name) ||
    name === '.npmrc' ||
    name === '.netrc' ||
    name === '.pypirc' ||
    name === 'credentials' ||
    name === 'credentials.json'
  )
}

function capOutput(text: string, limit = MAX_TOOL_OUTPUT): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}\n…（输出过长，已截断，共 ${text.length} 字）`
}

/** A tool failure the reviewer is told about (not a crash). */
export class ToolRefusal extends Error {}

/**
 * Resolve `path` inside one of `roots` (relative paths against the first),
 * following symlinks, or refuse.
 */
export async function insideRoots(roots: readonly string[], path: string): Promise<{ full: string; root: string }> {
  const candidates = isAbsolute(path) ? roots : roots.slice(0, 1)
  let refusal: unknown
  for (const root of candidates) {
    try {
      return { full: await insideRoot(root, path), root: await realpath(root) }
    } catch (error) {
      refusal = error
    }
  }
  throw refusal instanceof ToolRefusal ? new ToolRefusal(`拒绝访问工作区以外的路径：${path}`) : refusal ?? new ToolRefusal(`拒绝访问工作区以外的路径：${path}`)
}

/**
 * Resolve `path` inside `root`, following symlinks, or refuse.
 * @returns the absolute real path.
 */
export async function insideRoot(root: string, path: string): Promise<string> {
  const realRoot = await realpath(root)
  const wanted = resolve(realRoot, path === '' ? '.' : path)
  // Walk up to the nearest existing ancestor, resolve it, and re-append the rest.
  let existing = wanted
  const rest: string[] = []
  for (;;) {
    try {
      existing = await realpath(existing)
      break
    } catch {
      const parent = resolve(existing, '..')
      if (parent === existing) throw new ToolRefusal(`路径不存在：${path}`)
      rest.unshift(basename(existing))
      existing = parent
    }
  }
  const full = rest.length > 0 ? join(existing, ...rest) : existing
  if (full !== realRoot && !full.startsWith(realRoot + sep)) throw new ToolRefusal(`拒绝访问工作区以外的路径：${path}`)
  return full
}

function run(cwd: string, args: string[], timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((done) => {
    execFile(
      'git',
      ['--no-pager', '-c', 'core.fsmonitor=false', '-c', 'diff.external=', ...args],
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' },
      },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : typeof (error as { code?: unknown }).code === 'number' ? ((error as { code: number }).code) : 1
        done({ stdout: String(stdout), stderr: String(stderr || (error !== null ? error.message : '')), code })
      },
    )
  })
}

/** Whether `cwd` is inside a git work tree. */
export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await run(cwd, ['rev-parse', '--is-inside-work-tree'], 5000)
  return result.code === 0 && result.stdout.trim() === 'true'
}

/**
 * The state of the workspace every review gets: status, a diff stat and the
 * diff itself (capped), or a line saying there is no repository.
 */
export async function workspaceSnapshots(roots: readonly string[], diffLimit = 30_000): Promise<string> {
  if (roots.length === 0) return '（这个对话没有工作目录）'
  const each = Math.max(6000, Math.floor(diffLimit / roots.length))
  const parts = await Promise.all(roots.map((root) => workspaceSnapshot(root, each)))
  return parts.join('\n\n')
}

export async function workspaceSnapshot(cwd: string | undefined, diffLimit = 30_000): Promise<string> {
  if (cwd === undefined) return '（这个对话没有工作目录）'
  try {
    if (!(await stat(cwd)).isDirectory()) return `（工作目录不存在：${cwd}）`
  } catch {
    return `（工作目录不存在：${cwd}）`
  }
  if (!(await isGitRepo(cwd))) return `工作目录：${cwd}\n（不是 git 仓库，无法给出改动；深入模式下可以用工具查看文件）`
  const [status, statDiff, diff] = await Promise.all([
    run(cwd, ['status', '--porcelain=v1', '-b', '--untracked-files=normal']),
    run(cwd, ['diff', 'HEAD', '--stat', '--no-ext-diff', '--no-textconv']),
    run(cwd, ['diff', 'HEAD', '--no-ext-diff', '--no-textconv', '--no-color', '-U3']),
  ])
  const parts = [`工作目录：${cwd}`, '## git status', status.stdout.trim() || '（无改动）']
  if (statDiff.stdout.trim() !== '') parts.push('## 未提交改动统计（相对 HEAD）', statDiff.stdout.trim())
  if (diff.stdout.trim() !== '') parts.push('## 未提交改动（相对 HEAD）', capOutput(diff.stdout, diffLimit))
  else if (diff.code !== 0 && diff.stderr.trim() !== '') parts.push(`（git diff 失败：${diff.stderr.trim().slice(0, 300)}）`)
  return parts.join('\n')
}

// ---------------------------------------------------------------- tools

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'read_file',
    description: '读取工作区里的一个文本文件（只读）。返回带行号的内容，一次最多 400 行。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相对工作区根目录的路径' },
        start_line: { type: 'integer', description: '从第几行开始（1 起），默认 1' },
        max_lines: { type: 'integer', description: '最多读多少行，默认 200，最大 400' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_dir',
    description: '列出工作区里一个目录的内容（只读），可以展开两层。跳过 .git、node_modules 等。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相对工作区根目录的路径，默认根目录' },
        depth: { type: 'integer', description: '展开层数，1 或 2，默认 1' },
      },
    },
  },
  {
    name: 'search',
    description: '在工作区里搜索文本（正则，只读）。返回「文件:行号:内容」，最多 150 条。',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '要搜索的正则表达式' },
        path: { type: 'string', description: '只在这个子目录或文件里搜，默认整个工作区' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'git',
    description: '运行一个只读的 git 命令。允许的子命令：status、diff、log、show、ls-files、blame。例如 ["log","--oneline","-10"] 或 ["show","HEAD","--stat"]。',
    parameters: {
      type: 'object',
      properties: {
        args: { type: 'array', items: { type: 'string' }, description: 'git 后面的参数，第一个是子命令' },
        repo: { type: 'string', description: '在哪个仓库里运行（列出的工作区目录之一的绝对路径），默认第一个' },
      },
      required: ['args'],
    },
  },
]

const GIT_SUBCOMMANDS = new Set(['status', 'diff', 'log', 'show', 'ls-files', 'blame'])

/** Refuse git arguments that could write, run programs or reach the network. */
export function checkGitArgs(args: readonly string[]): string[] {
  if (args.length === 0) throw new ToolRefusal('缺少 git 子命令')
  const [sub, ...rest] = args
  if (!GIT_SUBCOMMANDS.has(sub!)) throw new ToolRefusal(`不允许的 git 子命令：${sub}（只允许 ${[...GIT_SUBCOMMANDS].join('、')}）`)
  for (const arg of rest) {
    if (typeof arg !== 'string') throw new ToolRefusal('git 参数必须是字符串')
    const lower = arg.toLowerCase()
    if (lower.startsWith('--output') || lower === '-o' || lower.startsWith('--ext-diff') || lower.startsWith('--textconv') || lower.startsWith('--exec') || lower.startsWith('--upload-pack') || lower.startsWith('--open-files-in-pager') || lower.startsWith('-c') && lower.length > 2 && !lower.startsWith('--')) {
      throw new ToolRefusal(`不允许的 git 参数：${arg}`)
    }
  }
  const safety = sub === 'diff' || sub === 'show' || sub === 'log' ? ['--no-ext-diff', '--no-textconv', '--no-color'] : sub === 'blame' || sub === 'status' ? [] : []
  return [sub!, ...safety, ...rest]
}

async function readFileTool(roots: readonly string[], input: Record<string, unknown>): Promise<string> {
  const path = typeof input.path === 'string' ? input.path : ''
  if (path === '') throw new ToolRefusal('缺少 path')
  const { full, root } = await insideRoots(roots, path)
  if (looksSecret(full)) throw new ToolRefusal(`拒绝读取可能含密钥的文件：${path}`)
  const info = await stat(full).catch(() => undefined)
  if (info === undefined) throw new ToolRefusal(`文件不存在：${path}`)
  if (info.isDirectory()) throw new ToolRefusal(`这是目录，请用 list_dir：${path}`)
  if (info.size > MAX_FILE_BYTES) throw new ToolRefusal(`文件太大（${info.size} 字节），请用 search 或 git 查看片段`)
  const handle = await open(full, 'r')
  let buffer: Buffer
  try {
    buffer = await handle.readFile()
  } finally {
    await handle.close()
  }
  if (buffer.subarray(0, 8000).includes(0)) throw new ToolRefusal(`这是二进制文件：${path}`)
  const lines = buffer.toString('utf8').split('\n')
  const start = Math.max(1, Math.floor(Number(input.start_line) || 1))
  const count = Math.min(400, Math.max(1, Math.floor(Number(input.max_lines) || 200)))
  const slice = lines.slice(start - 1, start - 1 + count)
  const body = slice.map((line, i) => `${String(start + i).padStart(5)}  ${line}`).join('\n')
  const more = start - 1 + count < lines.length ? `\n…（共 ${lines.length} 行，还有 ${lines.length - (start - 1 + count)} 行未显示）` : ''
  return capOutput(`${relative(root, full) || '.'}（第 ${start}–${start + slice.length - 1} 行）\n${body}${more}`)
}

async function listDirTool(roots: readonly string[], input: Record<string, unknown>): Promise<string> {
  const path = typeof input.path === 'string' ? input.path : '.'
  const depth = Math.min(2, Math.max(1, Math.floor(Number(input.depth) || 1)))
  const { full, root: realRoot } = await insideRoots(roots, path)
  const out: string[] = []
  const walk = async (dir: string, level: number): Promise<void> => {
    if (out.length >= 300) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      throw new ToolRefusal(`无法列出目录：${path}`)
    }
    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (out.length >= 300) {
        out.push('…（条目过多，已截断）')
        return
      }
      const rel = relative(realRoot, join(dir, entry.name))
      const indent = '  '.repeat(level - 1)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          out.push(`${indent}${rel}/（已跳过）`)
          continue
        }
        out.push(`${indent}${rel}/`)
        if (level < depth) await walk(join(dir, entry.name), level + 1)
      } else {
        const size = await lstat(join(dir, entry.name)).then((s) => s.size).catch(() => 0)
        out.push(`${indent}${rel}  ${size} B`)
      }
    }
  }
  await walk(full, 1)
  return capOutput(out.join('\n') || '（空目录）')
}

async function searchTool(roots: readonly string[], input: Record<string, unknown>): Promise<string> {
  const pattern = typeof input.pattern === 'string' ? input.pattern : ''
  if (pattern === '') throw new ToolRefusal('缺少 pattern')
  const path = typeof input.path === 'string' && input.path !== '' ? input.path : '.'
  const { full, root: realRoot } = await insideRoots(roots, path)
  const rel = relative(realRoot, full) || '.'
  if (await isGitRepo(realRoot)) {
    const result = await run(realRoot, ['grep', '-n', '-I', '--no-color', '--untracked', '-E', '-e', pattern, '--', rel])
    if (result.code === 1 && result.stdout === '') return '（没有匹配）'
    if (result.code !== 0 && result.code !== 1) throw new ToolRefusal(`搜索失败：${result.stderr.trim().slice(0, 300)}`)
    const lines = result.stdout.split('\n').filter((line) => line !== '' && !looksSecret(line.split(':')[0] ?? ''))
    return capOutput(lines.slice(0, 150).join('\n') + (lines.length > 150 ? `\n…（共 ${lines.length} 条，只显示前 150 条）` : ''))
  }
  let regex: RegExp
  try {
    regex = new RegExp(pattern)
  } catch {
    throw new ToolRefusal(`正则写法有误：${pattern}`)
  }
  const out: string[] = []
  let files = 0
  const visit = async (target: string): Promise<void> => {
    if (out.length >= 150 || files >= 3000) return
    const info = await lstat(target).catch(() => undefined)
    if (info === undefined || info.isSymbolicLink()) return
    if (info.isDirectory()) {
      if (SKIP_DIRS.has(basename(target))) return
      for (const name of await readdir(target).catch(() => [] as string[])) await visit(join(target, name))
      return
    }
    files += 1
    if (info.size > 512_000 || looksSecret(target)) return
    const text = await open(target, 'r').then(async (handle) => {
      try {
        return await handle.readFile()
      } finally {
        await handle.close()
      }
    }).catch(() => undefined)
    if (text === undefined || text.subarray(0, 4000).includes(0)) return
    text.toString('utf8').split('\n').forEach((line, i) => {
      if (out.length < 150 && regex.test(line)) out.push(`${relative(realRoot, target)}:${i + 1}:${line.slice(0, 300)}`)
    })
  }
  await visit(full)
  return out.length > 0 ? capOutput(out.join('\n')) : '（没有匹配）'
}

async function gitTool(roots: readonly string[], input: Record<string, unknown>): Promise<string> {
  const args = Array.isArray(input.args) ? input.args.map((item) => String(item)) : typeof input.args === 'string' ? input.args.split(/\s+/).filter((item) => item !== '') : []
  const checked = checkGitArgs(args)
  // Which repository: the `repo` argument (one of the listed folders), else the first.
  const wanted = typeof input.repo === 'string' && input.repo !== '' ? input.repo : undefined
  const realRoot = wanted !== undefined ? (await insideRoots(roots, wanted)).full : await realpath(roots[0]!)
  // Path arguments must stay inside the workspace too.
  for (const arg of checked.slice(1)) {
    if (isAbsolute(arg) && !arg.startsWith(realRoot)) throw new ToolRefusal(`拒绝访问工作区以外的路径：${arg}`)
    // `git show HEAD:.env` would read a secret file the read_file tool refuses.
    if (looksSecret(arg.slice(arg.lastIndexOf(':') + 1))) throw new ToolRefusal(`拒绝读取可能含密钥的文件：${arg}`)
  }
  if (!(await isGitRepo(realRoot))) throw new ToolRefusal('工作区不是 git 仓库')
  const result = await run(realRoot, checked)
  if (result.code !== 0) throw new ToolRefusal(`git ${args.join(' ')} 失败：${result.stderr.trim().slice(0, 500)}`)
  return capOutput(result.stdout || '（无输出）')
}

/** A short description of a tool call for the report's trail. */
export function toolTarget(name: string, input: Record<string, unknown>): string {
  if (name === 'git') return `git ${Array.isArray(input.args) ? input.args.join(' ') : String(input.args ?? '')}`.slice(0, 160)
  if (name === 'search') return `${String(input.pattern ?? '')}${typeof input.path === 'string' ? ` · ${input.path}` : ''}`.slice(0, 160)
  return String(input.path ?? '.').slice(0, 160)
}

/**
 * Run one reviewer tool call.
 * @returns the text handed back to the reviewer, and whether it worked.
 */
export async function runTool(roots: string | readonly string[], name: string, rawArgs: string): Promise<{ text: string; ok: boolean; input: Record<string, unknown> }> {
  let input: Record<string, unknown> = {}
  try {
    const parsed: unknown = rawArgs.trim() === '' ? {} : JSON.parse(rawArgs)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) input = parsed as Record<string, unknown>
  } catch {
    return { text: '参数不是合法的 JSON', ok: false, input }
  }
  const list = typeof roots === 'string' ? [roots] : roots
  if (list.length === 0) return { text: '这个对话没有可以查看的工作区', ok: false, input }
  try {
    switch (name) {
      case 'read_file':
        return { text: await readFileTool(list, input), ok: true, input }
      case 'list_dir':
        return { text: await listDirTool(list, input), ok: true, input }
      case 'search':
        return { text: await searchTool(list, input), ok: true, input }
      case 'git':
        return { text: await gitTool(list, input), ok: true, input }
      default:
        return { text: `没有这个工具：${name}。可用：read_file、list_dir、search、git`, ok: false, input }
    }
  } catch (error) {
    return { text: error instanceof Error ? error.message : String(error), ok: false, input }
  }
}
