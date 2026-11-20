import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'

// Tests must never read or write the user's real review store.
export default defineConfig({
  test: {
    env: { DSH_SIDER_TASK_REVIEWER_DIR: join(tmpdir(), `dsh-sider-task-reviewer-test-${process.pid}`) },
  },
})
