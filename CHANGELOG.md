# Changelog

## 0.1.1 — 2026-11-20

- **Read-only, everything goes through the main conversation.** The plugin and the reviewer never write a file and never run a command: the deep-review `git` tool is gone (deep review keeps `read_file`, `list_dir` and `search`, all plain file reads), search no longer calls `git grep`, the workspace `git status` / `git diff` snapshot is no longer taken, and a file's repository is found by its `.git` folder on disk. The reviewer is told so: whatever needs a change or a command (tests, builds, `git diff`) becomes a suggestion for the main conversation, e.g. "run pytest and paste the output". The message sent to the main conversation says the same. A test fails if any source file can start a process.

## 0.1.0 — 2026-11-20

First release.

- **Right-sidebar tab 「任务审查」**: pick the reviewer (any model DSH has, external providers included) and its reasoning effort, the scope (last turn, whole conversation, turns N–M), what to look at (the conversation and the files it wrote, only the conversation, or only the files) and the depth; run, cancel, read the verdict and the findings with their evidence; saved reviews per conversation; export Markdown.
- **Quick review**: the conversation with every tool call and result, the current content of the files it wrote, and `git status` / `git diff` of the workspace. **Deep review**: the reviewer may also read files, list folders, search and run read-only git commands inside those folders (at most 12 calls; secrets files refused; falls back to quick when the model cannot call tools).
- Findings go back to the working model only on a press: into the composer to edit and send, or sent directly (steering while it runs, a follow-up turn when idle).
- **Continuous review**: review → send the findings to the working conversation → wait for its fix → review the fix, until a review passes or the round limit (5 by default, up to 20); stops on an interrupted turn, a 45-minute wait, or the stop button.
- **Live review** (off by default): a review at the end of every turn, or also during a turn; it only reports, never interrupts. Sub-agent sessions are skipped.
- **Review prompts**: four built-in ones (标准审查 for work done, 理论审查 for derivations and proofs, 事实审查 for literature and field surveys, 计划审查 for task plans); edit or reset any of them, add your own, pick the one reviews use. The plugin always adds the answer format.
- **The shield beside the composer**: its dot shows the verdict on the conversation's last turn; left click reviews the last turn and puts the suggestions into the input box; right click (or the context-menu key) opens a menu.
- One set of settings for every conversation.
- Long conversations are fitted into the reviewer's budget by squeezing older turns first; common secrets are hidden before anything leaves the machine; an answer cut off by the length limit keeps its complete part.
- 75 tests.
