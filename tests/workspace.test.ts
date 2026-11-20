import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { homedir } from 'node:os'
import { filesSection, reviewRoots, touchedFiles } from '../src/files'
import { turnsOf } from '../src/transcript'
import { insideRoot, insideRoots, looksSecret, runTool, TOOL_SCHEMAS, ToolRefusal, workspaceOverview } from '../src/workspace'
import { Log } from './fixtures'

let root: string
let outside: string

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'rv-ws-'))
  outside = mkdtempSync(join(tmpdir(), 'rv-out-'))
  writeFileSync(join(outside, 'secret.txt'), 'outside the workspace')
  mkdirSync(join(root, 'src'))
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'src', 'a.ts'), Array.from({ length: 30 }, (_, i) => `line ${i + 1} needle${i === 9 ? ' HIT' : ''}`).join('\n'))
  writeFileSync(join(root, '.env'), 'API_KEY=abc')
  writeFileSync(join(root, 'bin.dat'), Buffer.from([0, 1, 2, 3]))
  symlinkSync(join(outside, 'secret.txt'), join(root, 'escape.txt'))
  // A repository is recognised by its .git folder on disk; no git command is run.
  mkdirSync(join(root, '.git'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('staying inside the workspace', () => {
  it('refuses ../ and absolute paths outside, and symlinks that lead out', async () => {
    await expect(insideRoot(root, '../')).rejects.toBeInstanceOf(ToolRefusal)
    await expect(insideRoot(root, outside)).rejects.toBeInstanceOf(ToolRefusal)
    await expect(insideRoot(root, 'escape.txt')).rejects.toBeInstanceOf(ToolRefusal)
    await expect(insideRoot(root, 'src/a.ts')).resolves.toContain('a.ts')
    await expect(insideRoot(root, 'src/not-yet.ts')).resolves.toContain('not-yet.ts')
  })

  it('knows the files that usually hold secrets', () => {
    for (const name of ['.env', '.env.local', 'id_rsa', 'server.pem', 'x.key', '.npmrc', 'credentials.json']) expect(looksSecret(name)).toBe(true)
    for (const name of ['env.ts', 'keys.md', 'README.md']) expect(looksSecret(name)).toBe(false)
  })

})

describe('the plugin only reads', () => {
  it('offers the reviewer read tools only; git, shell and writes are refused', async () => {
    expect(TOOL_SCHEMAS.map((tool) => tool.name)).toEqual(['read_file', 'list_dir', 'search'])
    for (const name of ['git', 'bash', 'shell', 'run', 'write_file', 'edit']) {
      const out = await runTool(root, name, JSON.stringify({ args: ['log'], command: 'ls', path: 'x' }))
      expect(out.ok).toBe(false)
      expect(out.text).toContain('不能运行命令')
    }
  })

  it('no source file can start a process', () => {
    const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name))
        else if (/\.tsx?$/.test(entry.name)) files.push(join(dir, entry.name))
      }
    }
    walk(src)
    expect(files.length).toBeGreaterThan(10)
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/child_process|execFile|spawn\(|\bexecSync\b/)
  })
})

describe('the reviewer tools', () => {
  it('read_file returns numbered lines and a slice', async () => {
    const out = await runTool(root, 'read_file', JSON.stringify({ path: 'src/a.ts' }))
    expect(out.ok).toBe(true)
    expect(out.text).toContain('    1  line 1 needle')
    const slice = await runTool(root, 'read_file', JSON.stringify({ path: 'src/a.ts', start_line: 10, max_lines: 2 }))
    expect(slice.text).toContain('   10  line 10 needle HIT')
    expect(slice.text).toContain('还有')
  })

  it('refuses secrets, binaries, folders, escapes and bad JSON — as answers, not crashes', async () => {
    for (const [args, expected] of [
      [{ path: '.env' }, '密钥'],
      [{ path: 'bin.dat' }, '二进制'],
      [{ path: 'src' }, '目录'],
      [{ path: '../x' }, '工作区以外'],
      [{ path: 'escape.txt' }, '工作区以外'],
    ] as const) {
      const out = await runTool(root, 'read_file', JSON.stringify(args))
      expect(out.ok).toBe(false)
      expect(out.text).toContain(expected)
    }
    expect((await runTool(root, 'read_file', '{oops')).ok).toBe(false)
    expect((await runTool(root, 'rm', '{}')).text).toContain('没有这个工具')
  })

  it('list_dir skips heavy folders; search finds lines and skips secrets files', async () => {
    const list = await runTool(root, 'list_dir', '{}')
    expect(list.text).toContain('src/')
    expect(list.text).toContain('node_modules/（已跳过）')
    const found = await runTool(root, 'search', JSON.stringify({ pattern: 'needle HIT' }))
    expect(found.ok).toBe(true)
    expect(found.text).toContain('src/a.ts:10:')
    const secret = await runTool(root, 'search', JSON.stringify({ pattern: 'API_KEY' }))
    expect(secret.text).toContain('没有匹配')
    expect((await runTool(root, 'search', JSON.stringify({ pattern: '(' }))).text).toContain('正则')
  })
})

describe('workspaceOverview', () => {
  it('lists the folders and says no command is run', () => {
    const text = workspaceOverview([root, outside])
    expect(text).toContain(root)
    expect(text).toContain(outside)
    expect(text).toContain('不运行任何命令')
    expect(workspaceOverview([])).toContain('没有工作目录')
  })
})

describe('the files a conversation wrote', () => {
  it('finds them in write / edit / patch calls, relative paths against the working directory, newest last', () => {
    const log = new Log()
      .start()
      .tool('write', { file_path: '/abs/one.ts', content: 'x' }, 'ok')
      .tool('Edit', { path: 'rel/two.ts', old: 'a', new: 'b' }, 'ok')
      .tool('apply_patch', { input: '*** Begin Patch\n*** Update File: three.ts\n@@\n*** End Patch' }, 'ok')
      .tool('read', { path: 'not-written.ts' }, 'content')
      .tool('write', { file_path: '/abs/failed.ts' }, 'denied', { error: true })
      .tool('write', { file_path: '/abs/one.ts', content: 'y' }, 'ok')
      .end()
    expect(touchedFiles(turnsOf(log.events), '/w')).toEqual(['/w/rel/two.ts', '/w/three.ts', '/abs/one.ts'])
  })

  it('reads their current content, refusing secrets and saying what is gone', async () => {
    const section = await filesSection([join(root, 'src', 'a.ts'), join(root, '.env'), join(root, 'gone.ts')])
    expect(section.shown).toEqual([join(root, 'src', 'a.ts')])
    expect(section.text).toContain('可能含密钥')
    expect(section.text).toContain('现在不存在')
  })

  it('opens the repositories of the written files to the tools, never the home folder', async () => {
    const roots = await reviewRoots(outside, [join(root, 'src', 'a.ts'), join(homedir(), '.zshrc')])
    expect(roots).toContain(outside)
    // src/a.ts lives in the repository whose .git sits at root: the whole repository opens, not just src/.
    expect(roots).toContain(root)
    expect(roots).not.toContain(join(root, 'src'))
    expect(roots).not.toContain(homedir())
    const found = await insideRoots([outside, root], join(root, 'src', 'a.ts'))
    expect(found.full).toContain('a.ts')
    await expect(insideRoots([outside], join(root, 'src', 'a.ts'))).rejects.toBeInstanceOf(ToolRefusal)
  })
})
