/**
 * The files a conversation wrote: found in its tool calls (write / edit /
 * patch tools and their path arguments), read from disk as they are now, and
 * the folders a review may look into (the working directory plus the git
 * repositories those files live in — work often happens outside the
 * conversation's working directory). Everything here reads the disk; no
 * command is run.
 * @module dsh-sider-task-reviewer/files
 */
import { lstat, open, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'
import type { TurnRecord } from './transcript'
import { clip } from './transcript'
import { looksSecret } from './workspace'

/** Tool names that write files. */
const WRITERS = /write|edit|create|patch|replace|notebook|str_replace|apply|save|insert/i
const PATH_KEYS = ['file_path', 'filePath', 'path', 'target_file', 'targetFile', 'notebook_path', 'filename', 'file']

function pathsOfArgs(name: string, raw: string): string[] {
  if (!WRITERS.test(name)) return []
  let args: unknown
  try {
    args = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof args !== 'object' || args === null) return []
  const record = args as Record<string, unknown>
  const out: string[] = []
  for (const key of PATH_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '' && value.length < 1000) out.push(value.trim())
  }
  // apply_patch style: "*** Update File: path" / "*** Add File: path"
  for (const value of Object.values(record)) {
    if (typeof value !== 'string') continue
    for (const match of value.matchAll(/^\*\*\* (?:Update|Add) File: (.+)$/gm)) out.push(match[1]!.trim())
  }
  return out
}

/**
 * The files written in some turns, absolute, newest write last, at most `limit`.
 * @param cwd - the conversation's working directory (relative paths resolve against it).
 */
export function touchedFiles(turns: readonly TurnRecord[], cwd: string | undefined, limit = 30): string[] {
  const seen = new Map<string, number>()
  let order = 0
  for (const turn of turns) {
    for (const item of turn.items) {
      if (item.kind !== 'tool' || item.isError === true) continue
      for (const path of pathsOfArgs(item.name, item.args)) {
        const full = isAbsolute(path) ? resolve(path) : cwd !== undefined ? resolve(cwd, path) : undefined
        if (full === undefined) continue
        seen.delete(full)
        seen.set(full, order++)
      }
    }
  }
  return [...seen.keys()].slice(-limit)
}

/** The current content of the written files, within a character budget. */
export async function filesSection(paths: readonly string[], budget = 60_000, perFile = 14_000): Promise<{ text: string; shown: string[]; notes: string[] }> {
  if (paths.length === 0) return { text: '（这几轮没有找到执行者写文件的工具调用）', shown: [], notes: [] }
  const parts: string[] = []
  const shown: string[] = []
  const notes: string[] = []
  let used = 0
  // Newest writes first: if the budget runs out, the oldest are the ones left out.
  for (const path of [...paths].reverse()) {
    if (looksSecret(path)) {
      parts.push(`## ${path}\n（可能含密钥，不读取）`)
      continue
    }
    const info = await stat(path).catch(() => undefined)
    if (info === undefined) {
      parts.push(`## ${path}\n（文件现在不存在：可能被删除或移动了）`)
      continue
    }
    if (!info.isFile()) continue
    if (info.size > 2_000_000) {
      parts.push(`## ${path}\n（文件太大：${info.size} 字节，未读取）`)
      continue
    }
    const buffer = await open(path, 'r').then(async (handle) => {
      try {
        return await handle.readFile()
      } finally {
        await handle.close()
      }
    }).catch(() => undefined)
    if (buffer === undefined) continue
    if (buffer.subarray(0, 8000).includes(0)) {
      parts.push(`## ${path}\n（二进制文件，${info.size} 字节）`)
      continue
    }
    const room = Math.min(perFile, budget - used)
    if (room < 400) {
      notes.push(`文件较多，还有 ${paths.length - shown.length} 个文件没有附上内容（深入模式下审查模型可以自己去读）`)
      break
    }
    const text = clip(buffer.toString('utf8'), room)
    used += text.length
    shown.push(path)
    parts.push(`## ${path}\n\`\`\`\n${text}\n\`\`\``)
  }
  return { text: parts.join('\n\n'), shown, notes }
}

/** The repository a folder belongs to: the nearest folder upward holding `.git` (read from disk, no git command). */
async function gitTop(dir: string): Promise<string | undefined> {
  let current = resolve(dir)
  for (;;) {
    if (await lstat(resolve(current, '.git')).then(() => true, () => false)) return current
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/**
 * Where a review may look: the working directory first, then the git
 * repository (or, outside one, the folder) of every written file.
 */
export async function reviewRoots(cwd: string | undefined, files: readonly string[]): Promise<string[]> {
  const roots: string[] = []
  const home = homedir()
  // Never open up the home folder or anything above it because one file there was written.
  const allowed = (dir: string): boolean => !(dir === '/' || dir === home || home.startsWith(dir + '/') || dir.split('/').length < 4)
  const add = (dir: string | undefined): void => {
    if (dir === undefined || !allowed(dir)) return
    if (roots.some((root) => dir === root || dir.startsWith(root + '/'))) return
    // A new root that contains earlier ones replaces them.
    for (let i = roots.length - 1; i >= 0; i--) if (roots[i]!.startsWith(dir + '/')) roots.splice(i, 1)
    roots.push(dir)
  }
  // A repository at or above the home folder (dotfiles) does not open it up: the folder itself is used instead.
  const top = async (dir: string): Promise<string> => {
    const repo = await gitTop(dir)
    return repo !== undefined && allowed(repo) ? repo : dir
  }
  if (cwd !== undefined) add(await top(cwd))
  const dirs = [...new Set(files.map((file) => dirname(file)))]
  for (const dir of dirs) {
    const exists = await stat(dir).then((info) => info.isDirectory()).catch(() => false)
    if (!exists) continue
    add(await top(dir))
  }
  return roots.slice(0, 8)
}
