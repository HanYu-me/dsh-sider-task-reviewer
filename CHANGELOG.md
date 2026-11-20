# Changelog

## 0.1.4 — 2026-11-20

- **The discussion looks like the sidebar's side chat.** It fills the panel under the header: your messages in bubbles on the right, the reviewer's replies across the width (Markdown: bold, code, lists, code blocks; never HTML), each review as a short line that opens its report, tool use and notes as folding lines, a shimmering status line while it answers, and a rounded composer at the bottom with the model pill, 重新开始 and a round send / stop button. Reply actions are small icon buttons (put into the input box, send directly, copy).
- **Fix: "审查模型没有给出回答" with Antigravity (Gemini through agy).** The model wanted to read the reviewed files with agy's own tools; in agy's read-only plan mode a read outside its folder is refused, and agy then ends the run without an answer. Reviews and discussions without the plugin's tools now tell the model that everything it needs is in the request and not to use any tools (its own included). If a call still ends without an answer, the plugin asks once more, in the same single message, to answer without tools (one message, because dsh-agy-link may keep only the last user message). The model's thinking running out of room is retried the same way.

## 0.1.3 — 2026-11-20

- **Reviews of one conversation remember each other.** Every review of a conversation (manual, shield, live, continuous) and the discussion about them go into one record per conversation. Each new review is sent with it: earlier reviews as their conclusions (with what the user did with the findings: waved away, sent to the main conversation), the newest with the material it was given, and the discussion. The reviewer is told to stay consistent: do not report what was fixed again, correct an earlier mistake, take what the user said into account. The record is cut from the oldest end to about 40,000 characters. It goes into the request as one block of text, not as earlier messages, so agent-style providers (dsh-agy-link rebuilds or drops earlier messages by its own rules) read it like every other provider.
- **Discuss a review with the reviewer.** A 「讨论」 view in the panel, a 「和审查 AI 讨论」 button on the latest report and an entry in the shield's menu. The reviewer answers with the record (the newest review with its material) and may look at files with the read-only tools (at most 8 calls); it is told it cannot change files or run commands and to write what the main conversation should do as a message for it. A reply can go into the input box or be sent directly. A message that got no answer is not kept. 「重新开始」 clears the record; the reports stay.
- The panel header stays on one line in a narrow sidebar (the verdict pill gives way under 400px).
- New routes: `POST /chat`, `POST /chat/cancel`, `POST /thread/reset`; the state carries the record (`thread`) and a reply being written (`chatting`).

## 0.1.2 — 2026-11-20

- **Reviews with Antigravity (Gemini through the agy CLI) work.** They used to end with "审查模型没有给出回答": dsh-agy-link dropped the system prompt and stopped at agy's first tool step, and it ran agy with the user's own permission mode. The system prompt now carries the `REVIEW_POLICY` marker (the word DSH's auto-review plugin uses). dsh-agy-link recognises it, forwards the review instructions, runs agy in its read-only plan mode, and lets it answer. Antigravity pins review calls to low reasoning effort.
- A quick review that ends at a tool step of an agent-style model says so ("代理型模型") instead of "没有给出回答".

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
