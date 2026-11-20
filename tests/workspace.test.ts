import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { homedir } from 'node:os'
import { filesSection, reviewRoots, touchedFiles } from '../src/files'
import { turnsOf } from '../src/transcript'
import { checkGitArgs, insideRoot, insideRoots, looksSecret, runTool, ToolRefusal, workspaceSnapshot } from '../src/workspace'
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
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', 'src/a.ts', '.env'], { cwd: root })
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'first'], { cwd: root })
  writeFileSync(join(root, 'src', 'a.ts'), 'changed\n')
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

  it('only lets read-only git subcommands and arguments through', () => {
    expect(checkGitArgs(['log', '--oneline'])).toEqual(['log', '--no-ext-diff', '--no-textconv', '--no-color', '--oneline'])
    for (const args of [['push'], ['commit', '-m', 'x'], ['config', 'a'], ['diff', '--output=/tmp/x'], ['log', '--ext-diff'], ['show', '--textconv'], []]) {
      expect(() => checkGitArgs(args)).toThrow(ToolRefusal)
    }
  })
})

describe('the reviewer tools', () => {
  it('read_file returns numbered lines and a slice', async () => {
    const out = await runTool(root, 'read_file', JSON.stringify({ path: 'src/a.ts' }))
    expect(out.ok).toBe(true)
    expect(out.text).toContain('changed')
    execFileSync('git', ['checkout', '-q', 'src/a.ts'], { cwd: root })
    const slice = await runTool(root, 'read_file', JSON.stringify({ path: 'src/a.ts', start_line: 10, max_lines: 2 }))
    expect(slice.text).toContain('   10  line 10 needle HIT')
    expect(slice.text).toContain('还有')
    writeFileSync(join(root, 'src', 'a.ts'), 'changed\n')
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

  it('list_dir skips heavy folders; search finds lines; git runs read-only commands', async () => {
    const list = await runTool(root, 'list_dir', '{}')
    expect(list.text).toContain('src/')
    expect(list.text).toContain('node_modules/（已跳过）')
    const found = await runTool(root, 'search', JSON.stringify({ pattern: 'needle HIT' }))
    expect(found.ok).toBe(true)
    const git = await runTool(root, 'git', JSON.stringify({ args: ['log', '--oneline'] }))
    expect(git.ok).toBe(true)
    expect(git.text).toContain('first')
    const secret = await runTool(root, 'git', JSON.stringify({ args: ['show', 'HEAD:.env'] }))
    expect(secret.ok).toBe(false)
    expect(secret.text).toContain('密钥')
    const push = await runTool(root, 'git', JSON.stringify({ args: ['push'] }))
    expect(push.ok).toBe(false)
  })
})

describe('workspaceSnapshot', () => {
  it('gives status and the diff of a repository', async () => {
    const text = await workspaceSnapshot(root)
    expect(text).toContain('## git status')
    expect(text).toContain('src/a.ts')
    expect(text).toContain('+changed')
  })

  it('says so for a folder that is not a repository, a missing one, or none', async () => {
    expect(await workspaceSnapshot(outside)).toContain('不是 git 仓库')
    expect(await workspaceSnapshot(join(outside, 'nope'))).toContain('不存在')
    expect(await workspaceSnapshot(undefined)).toContain('没有工作目录')
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
    expect(roots.some((item) => item.endsWith(root.split('/').pop()!))).toBe(true)
    expect(roots).not.toContain(homedir())
    const found = await insideRoots([outside, root], join(root, 'src', 'a.ts'))
    expect(found.full).toContain('a.ts')
    await expect(insideRoots([outside], join(root, 'src', 'a.ts'))).rejects.toBeInstanceOf(ToolRefusal)
  })
})
