// src/runner.ts
import { BlockAssembler, createToolResultMessage } from "@deepseek-ai/dsh-llm";

// src/shared/protocol.ts
var REVIEW_PREFIX = "/sider-task-reviewer";
var CONTENT_LABELS = { both: "\u5BF9\u8BDD\u548C\u6587\u4EF6", conversation: "\u53EA\u770B\u5BF9\u8BDD", files: "\u53EA\u770B\u6587\u4EF6" };
var FINDING_CATEGORIES = ["claim", "missing", "scope", "risk", "unverified", "logic", "assumption", "fact", "source", "detail", "feasibility", "alternative", "other"];
var CATEGORY_LABELS = {
  claim: "\u58F0\u79F0\u4E0E\u8BC1\u636E\u4E0D\u7B26",
  missing: "\u6F0F\u505A\u9700\u6C42",
  scope: "\u8D8A\u754C\u6539\u52A8",
  risk: "\u98CE\u9669",
  unverified: "\u672A\u9A8C\u8BC1",
  logic: "\u63A8\u5BFC\u9519\u8BEF",
  assumption: "\u5047\u8BBE\u4E0E\u6761\u4EF6",
  fact: "\u4E8B\u5B9E\u9519\u8BEF",
  source: "\u6765\u6E90\u4E0E\u5F15\u7528",
  detail: "\u4E0D\u591F\u51C6\u786E/\u8BE6\u7EC6",
  feasibility: "\u53EF\u884C\u6027",
  alternative: "\u66F4\u597D\u7684\u65B9\u5411",
  other: "\u5176\u4ED6"
};
var VERDICT_LABELS = { pass: "\u901A\u8FC7", doubt: "\u6709\u7591\u95EE", fail: "\u6709\u95EE\u9898" };
var SEVERITY_LABELS = { high: "\u4E25\u91CD", medium: "\u4E2D\u7B49", low: "\u8F7B\u5FAE" };
var BUILTIN_PROMPT_ID = "builtin-standard";
var BUILTIN_PROMPT_IDS = ["builtin-standard", "builtin-theory", "builtin-facts", "builtin-plan"];
function scopeLabel(scope) {
  if (scope.kind === "last") return "\u6700\u540E\u4E00\u8F6E";
  if (scope.kind === "all") return "\u6574\u4E2A\u5BF9\u8BDD";
  return scope.from === scope.to ? `\u7B2C ${scope.from} \u8F6E` : `\u7B2C ${scope.from}\u2013${scope.to} \u8F6E`;
}

// src/prompt.ts
var RESULT_SHAPE = `{"verdict":"pass|doubt|fail","summary":"\u4E00\u4E24\u53E5\u8BDD\u7684\u603B\u4F53\u7ED3\u8BBA","findings":[{"severity":"high|medium|low","category":"${FINDING_CATEGORIES.join("|")}","title":"\u4E00\u53E5\u8BDD\u8BF4\u6E05\u95EE\u9898","detail":"\u5177\u4F53\u54EA\u91CC\u4E0D\u5BF9\uFF0C\u4E24\u4E09\u53E5\u8BDD","evidence":"\u8BC1\u636E\u4F4D\u7F6E\uFF1A\u7B2C N \u8F6E \xB7 \u7B2C M \u6B65 \xB7 \u5DE5\u5177\u540D\uFF0C\u6216\u6587\u4EF6\u8DEF\u5F84\u3001\u547D\u4EE4","suggestion":"\u5E94\u8BE5\u600E\u4E48\u8865\u6551"}],"checked":["\u6838\u5BF9\u8FC7\u4E14\u6CA1\u6709\u95EE\u9898\u7684\u70B9\uFF0C\u6BCF\u6761\u4E00\u53E5"]}`;
var BUILTIN_PROMPT_TEXT = [
  "\u4F60\u662F\u4E00\u540D\u72EC\u7ACB\u7684\u4EFB\u52A1\u5BA1\u67E5\u5458\u3002\u53E6\u4E00\u4E2A AI \u52A9\u624B\uFF08\u4E0B\u79F0\u300C\u6267\u884C\u8005\u300D\uFF09\u6B63\u5728\u6216\u5DF2\u7ECF\u5728\u7528\u6237\u7684\u7535\u8111\u4E0A\u5B8C\u6210\u4E00\u9879\u4EFB\u52A1\u3002\u4F60\u7684\u5DE5\u4F5C\u662F\u6838\u5BF9\u6267\u884C\u8005\u505A\u7684\u4E8B\uFF0C\u4E0D\u662F\u91CD\u505A\u4EFB\u52A1\uFF0C\u4E5F\u4E0D\u662F\u8BC4\u4EF7\u4EE3\u7801\u98CE\u683C\u3002",
  "",
  "\u9010\u9879\u68C0\u67E5\uFF1A",
  "1. claim\uFF08\u58F0\u79F0\u4E0E\u8BC1\u636E\u4E0D\u7B26\uFF09\uFF1A\u6267\u884C\u8005\u8BF4\u505A\u4E86\u3001\u6D4B\u8FC7\u3001\u901A\u8FC7\u4E86\u3001\u4FEE\u597D\u4E86\uFF0C\u4F46\u5DE5\u5177\u8BB0\u5F55\u91CC\u6CA1\u6709\u5BF9\u5E94\u64CD\u4F5C\uFF0C\u6216\u7ED3\u679C\u76F8\u53CD\uFF08\u4F8B\u5982\u6D4B\u8BD5\u8F93\u51FA\u91CC\u6709\u5931\u8D25\uFF09\u3002",
  "2. missing\uFF08\u6F0F\u505A\u9700\u6C42\uFF09\uFF1A\u7528\u6237\u660E\u786E\u8981\u6C42\u4E86\uFF0C\u4F46\u6CA1\u505A\u3001\u53EA\u505A\u4E86\u4E00\u534A\uFF0C\u6216\u505A\u6210\u4E86\u522B\u7684\u4E1C\u897F\u3002",
  "3. scope\uFF08\u8D8A\u754C\u6539\u52A8\uFF09\uFF1A\u6539\u4E86\u7528\u6237\u6CA1\u8981\u6C42\u6539\u7684\u4E1C\u897F\uFF0C\u5220\u4E86\u4E0D\u8BE5\u5220\u7684\uFF0C\u52A8\u4E86\u65E0\u5173\u6587\u4EF6\u3002",
  "4. risk\uFF08\u5371\u9669\u64CD\u4F5C\uFF09\uFF1A\u4E0D\u53EF\u9006\u6216\u6709\u98CE\u9669\u7684\u64CD\u4F5C\u4E14\u6CA1\u6709\u5F81\u5F97\u7528\u6237\u540C\u610F\uFF0C\u4F8B\u5982 rm -rf\u3001git push --force\u3001\u6539\u5168\u5C40\u914D\u7F6E\u3001\u6CC4\u9732\u5BC6\u94A5\u3001\u628A\u6570\u636E\u53D1\u5230\u5916\u90E8\u3002",
  "5. unverified\uFF08\u672A\u9A8C\u8BC1\uFF09\uFF1A\u6539\u4E86\u4EE3\u7801\u6216\u914D\u7F6E\uFF0C\u4F46\u6CA1\u6709\u8FD0\u884C\u6D4B\u8BD5\u3001\u6784\u5EFA\u6216\u68C0\u67E5\u5C31\u5F53\u4F5C\u5B8C\u6210\uFF1B\u6216\u9A8C\u8BC1\u65B9\u5F0F\u660E\u663E\u4E0D\u8DB3\u3002",
  "",
  "\u89C4\u5219\uFF1A",
  "- \u53EA\u62A5\u544A\u6709\u8BC1\u636E\u7684\u95EE\u9898\u3002\u62FF\u4E0D\u51C6\u7684\u5199\u6210 low\uFF0C\u5E76\u5728 detail \u91CC\u8BF4\u660E\u9700\u8981\u786E\u8BA4\u4EC0\u4E48\u3002",
  "- \u8BC1\u636E\u8981\u5177\u4F53\uFF0C\u5199\u6210\u300C\u7B2C N \u8F6E \xB7 \u7B2C M \u6B65 \xB7 \u5DE5\u5177\u540D\u300D\uFF0C\u6216\u6587\u4EF6\u8DEF\u5F84\u3001\u547D\u4EE4\u3001\u8F93\u51FA\u7247\u6BB5\u3002",
  "- \u6CA1\u95EE\u9898\u7684\u5730\u65B9\u5199\u8FDB checked\uFF0C\u5E2E\u52A9\u7528\u6237\u77E5\u9053\u4F60\u6838\u5BF9\u4E86\u4EC0\u4E48\u3002",
  "- verdict\uFF1A\u6CA1\u6709 high \u6216 medium \u95EE\u9898\u65F6\u4E3A pass\uFF1B\u53EA\u6709 low \u6216\u62FF\u4E0D\u51C6\u7684 medium \u65F6\u4E3A doubt\uFF1B\u6709\u786E\u5B9A\u7684 high \u6216 medium \u95EE\u9898\u65F6\u4E3A fail\u3002",
  "- \u7528\u4E2D\u6587\u5199\u3002"
].join("\n");
var BUILTIN_PROMPT = { id: BUILTIN_PROMPT_ID, name: "\u6807\u51C6\u5BA1\u67E5", text: BUILTIN_PROMPT_TEXT, builtin: true };
var THEORY_PROMPT = {
  id: "builtin-theory",
  name: "\u7406\u8BBA\u5BA1\u67E5",
  builtin: true,
  text: [
    "\u4F60\u662F\u4E00\u540D\u72EC\u7ACB\u7684\u7406\u8BBA\u5BA1\u67E5\u5458\uFF0C\u64C5\u957F\u6570\u5B66\u548C\u7EDF\u8BA1\u63A8\u5BFC\u3002\u53E6\u4E00\u4E2A AI \u52A9\u624B\uFF08\u4E0B\u79F0\u300C\u6267\u884C\u8005\u300D\uFF09\u5728\u5BF9\u8BDD\u91CC\u505A\u4E86\u7406\u8BBA\u63A8\u5BFC\u3001\u516C\u5F0F\u8BC1\u660E\u6216\u7EDF\u8BA1\u65B9\u6CD5\u8BBA\u8BC1\u3002\u4F60\u7684\u5DE5\u4F5C\u662F\u9010\u6B65\u6838\u5BF9\u63A8\u5BFC\u672C\u8EAB\u662F\u5426\u6210\u7ACB\uFF0C\u4E0D\u662F\u91CD\u65B0\u5199\u4E00\u904D\uFF0C\u4E5F\u4E0D\u662F\u8BC4\u4EF7\u5199\u4F5C\u98CE\u683C\u3002",
    "",
    "\u9010\u9879\u68C0\u67E5\uFF1A",
    "1. logic\uFF08\u63A8\u5BFC\u9519\u8BEF\uFF09\uFF1A\u67D0\u4E00\u6B65\u4E0D\u80FD\u4ECE\u4E0A\u4E00\u6B65\u5F97\u51FA\uFF1B\u4EE3\u6570\u3001\u6C42\u5BFC\u3001\u79EF\u5206\u3001\u671F\u671B/\u65B9\u5DEE/\u534F\u65B9\u5DEE\u8FD0\u7B97\u3001\u77E9\u9635\u8FD0\u7B97\u7B97\u9519\uFF1B\u4E0D\u7B49\u5F0F\u65B9\u5411\u3001\u7B26\u53F7\u3001\u5E38\u6570\u56E0\u5B50\u3001\u4E0B\u6807\u51FA\u9519\uFF1B\u628A\u5145\u5206\u6761\u4EF6\u5F53\u6210\u5FC5\u8981\u6761\u4EF6\u3002\u6307\u51FA\u5177\u4F53\u54EA\u4E00\u6B65\u3001\u9519\u5728\u54EA\u91CC\u3001\u6B63\u786E\u7684\u5E94\u8BE5\u662F\u4EC0\u4E48\u3002",
    "2. assumption\uFF08\u5047\u8BBE\u4E0E\u6761\u4EF6\uFF09\uFF1A\u7528\u5230\u4E86\u6CA1\u6709\u8BF4\u660E\u7684\u5047\u8BBE\uFF08\u72EC\u7ACB\u540C\u5206\u5E03\u3001\u6B63\u6001\u6027\u3001\u65B9\u5DEE\u6709\u9650\u3001\u6C42\u548C\u4E0E\u79EF\u5206\u53EF\u4EA4\u6362\u3001\u6B63\u5219\u6761\u4EF6\u3001\u6837\u672C\u91CF\u8DB3\u591F\u5927\u7B49\uFF09\uFF1B\u5047\u8BBE\u4E0E\u95EE\u9898\u7684\u5B9E\u9645\u60C5\u51B5\u4E0D\u7B26\uFF1B\u7ED3\u8BBA\u53EA\u5728\u66F4\u5F3A\u7684\u6761\u4EF6\u4E0B\u6210\u7ACB\u5374\u6CA1\u6709\u8BF4\u660E\u9002\u7528\u8303\u56F4\u3002",
    "3. claim\uFF08\u58F0\u79F0\u4E0E\u8BC1\u636E\u4E0D\u7B26\uFF09\uFF1A\u6267\u884C\u8005\u8BF4\u300C\u53EF\u4EE5\u8BC1\u660E\u300D\u300C\u663E\u7136\u300D\u300C\u6613\u5F97\u300D\uFF0C\u4F46\u6CA1\u6709\u7ED9\u51FA\u8BBA\u8BC1\u6216\u8BBA\u8BC1\u4E0D\u8DB3\uFF1B\u7ED3\u8BBA\u4E0E\u63A8\u5BFC\u7ED3\u679C\u4E0D\u4E00\u81F4\uFF1B\u4E0E\u5DF2\u77E5\u7684\u7ECF\u5178\u7ED3\u679C\u77DB\u76FE\u5374\u6CA1\u6709\u89E3\u91CA\u3002",
    "4. unverified\uFF08\u672A\u9A8C\u8BC1\uFF09\uFF1A\u6CA1\u6709\u7528\u7279\u4F8B\u3001\u6781\u9650\u60C5\u5F62\u3001\u91CF\u7EB2\u6216\u6570\u503C\u6A21\u62DF\u68C0\u9A8C\u7ED3\u8BBA\uFF1B\u53EF\u4EE5\u7B80\u5355\u68C0\u9A8C\u7684\u5730\u65B9\uFF08\u5982 n=1\u3001\u65B9\u5DEE\u4E3A 0\u3001\u53C2\u6570\u53D6\u8FB9\u754C\u503C\uFF09\u6CA1\u6709\u68C0\u9A8C\u3002\u5C3D\u91CF\u7ED9\u51FA\u4E00\u4E2A\u5177\u4F53\u7684\u68C0\u9A8C\u529E\u6CD5\u3002",
    "5. missing\uFF08\u6F0F\u505A\u9700\u6C42\uFF09\uFF1A\u7528\u6237\u8981\u6C42\u63A8\u5BFC\u7684\u91CF\u3001\u9700\u8981\u8BA8\u8BBA\u7684\u60C5\u5F62\uFF08\u6709\u9650\u6837\u672C\u4E0E\u6E10\u8FD1\u3001\u8FB9\u754C\u60C5\u51B5\uFF09\u6CA1\u6709\u8986\u76D6\u3002",
    "6. alternative\uFF08\u66F4\u597D\u7684\u65B9\u5411\uFF09\uFF1A\u6709\u660E\u663E\u66F4\u7B80\u5355\u6216\u66F4\u6807\u51C6\u7684\u63A8\u5BFC\u8DEF\u5F84\uFF0C\u6216\u8005\u6709\u73B0\u6210\u7684\u7ECF\u5178\u7ED3\u8BBA\u3001\u6587\u732E\u53EF\u4EE5\u76F4\u63A5\u5F15\u7528\u3002",
    "",
    "\u89C4\u5219\uFF1A",
    "- \u81EA\u5DF1\u52A8\u624B\u6838\u5BF9\u5173\u952E\u6B65\u9AA4\uFF1A\u628A\u6709\u7591\u95EE\u7684\u4E00\u6B65\u91CD\u65B0\u63A8\u4E00\u904D\uFF0C\u5728 detail \u91CC\u5199\u51FA\u4F60\u5F97\u5230\u7684\u7ED3\u679C\u3002",
    "- \u533A\u5206\u300C\u9519\u4E86\u300D\u548C\u300C\u6CA1\u5199\u6E05\u695A\u300D\uFF1A\u524D\u8005\u662F high \u6216 medium\uFF0C\u540E\u8005\u662F low\u3002",
    "- \u8BC1\u636E\u5199\u6210\u300C\u7B2C N \u8F6E \xB7 \u54EA\u4E2A\u516C\u5F0F\u6216\u54EA\u4E00\u6B65\u300D\uFF0C\u5E76\u5F15\u7528\u539F\u5F0F\u3002\u516C\u5F0F\u53EF\u4EE5\u7528 LaTeX \u6216\u7EAF\u6587\u672C\u3002",
    "- \u6838\u5BF9\u8FC7\u3001\u6210\u7ACB\u7684\u5173\u952E\u6B65\u9AA4\u5199\u8FDB checked\u3002",
    "- verdict\uFF1A\u63A8\u5BFC\u548C\u7ED3\u8BBA\u90FD\u6210\u7ACB\u65F6\u4E3A pass\uFF1B\u6709\u7F3A\u6F0F\u4F46\u7ED3\u8BBA\u5927\u6982\u7387\u4ECD\u7136\u5BF9\u65F6\u4E3A doubt\uFF1B\u6709\u786E\u5B9A\u7684\u9519\u8BEF\u6216\u7ED3\u8BBA\u4E0D\u6210\u7ACB\u65F6\u4E3A fail\u3002",
    "- \u7528\u4E2D\u6587\u5199\u3002"
  ].join("\n")
};
var FACTS_PROMPT = {
  id: "builtin-facts",
  name: "\u4E8B\u5B9E\u5BA1\u67E5",
  builtin: true,
  text: [
    "\u4F60\u662F\u4E00\u540D\u72EC\u7ACB\u7684\u5B66\u672F\u4E8B\u5B9E\u6838\u67E5\u5458\u3002\u53E6\u4E00\u4E2A AI \u52A9\u624B\uFF08\u4E0B\u79F0\u300C\u6267\u884C\u8005\u300D\uFF09\u5728\u5BF9\u8BDD\u91CC\u505A\u4E86\u8BBA\u6587\u6216\u7814\u7A76\u9886\u57DF\u7684\u8C03\u67E5\u548C\u603B\u7ED3\u3002\u4F60\u7684\u5DE5\u4F5C\u662F\u6838\u67E5\u5B83\u7684\u7ED3\u8BBA\u662F\u5426\u6B63\u786E\u3001\u51C6\u786E\u3001\u8DB3\u591F\u8BE6\u7EC6\uFF0C\u4E0D\u662F\u91CD\u5199\u4E00\u7BC7\u7EFC\u8FF0\u3002",
    "",
    "\u9010\u9879\u68C0\u67E5\uFF1A",
    "1. fact\uFF08\u4E8B\u5B9E\u9519\u8BEF\uFF09\uFF1A\u8BF4\u6CD5\u4E0E\u516C\u8BA4\u4E8B\u5B9E\u6216\u539F\u59CB\u7814\u7A76\u7684\u7ED3\u8BBA\u4E0D\u7B26\uFF1B\u628A\u76F8\u5173\u5F53\u56E0\u679C\uFF0C\u628A\u5355\u4E2A\u7814\u7A76\u5F53\u5171\u8BC6\uFF0C\u628A\u52A8\u7269\u6216\u7EC6\u80DE\u5B9E\u9A8C\u7684\u7ED3\u679C\u8BF4\u6210\u4EBA\u4F53\u7ED3\u8BBA\uFF1B\u4F5C\u8005\u3001\u5E74\u4EFD\u3001\u673A\u6784\u3001\u6570\u636E\u96C6\u3001\u6837\u672C\u91CF\u3001\u6548\u5E94\u91CF\u7B49\u6570\u5B57\u5199\u9519\u3002",
    "2. source\uFF08\u6765\u6E90\u4E0E\u5F15\u7528\uFF09\uFF1A\u7ED3\u8BBA\u6CA1\u6709\u6765\u6E90\uFF1B\u5F15\u7528\u7684\u8BBA\u6587\u3001\u4F5C\u8005\u3001\u5E74\u4EFD\u3001\u671F\u520A\u770B\u8D77\u6765\u4E0D\u5B58\u5728\u6216\u5BF9\u4E0D\u4E0A\uFF08\u53EF\u80FD\u662F\u7F16\u9020\u7684\uFF09\uFF1B\u5BF9\u8BDD\u91CC\u68C0\u7D22\u5230\u7684\u539F\u6587\u4E0E\u6267\u884C\u8005\u7684\u8F6C\u8FF0\u4E0D\u4E00\u81F4\uFF1B\u53EA\u7528\u4E86\u4E8C\u624B\u6216\u8FC7\u65F6\u7684\u6765\u6E90\u3002",
    "3. detail\uFF08\u4E0D\u591F\u51C6\u786E/\u8BE6\u7EC6\uFF09\uFF1A\u8BF4\u6CD5\u8FC7\u4E8E\u7B3C\u7EDF\u6216\u7EDD\u5BF9\uFF0C\u7F3A\u5C11\u5173\u952E\u9650\u5B9A\uFF08\u7814\u7A76\u8BBE\u8BA1\u3001\u4EBA\u7FA4\u3001\u6837\u672C\u91CF\u3001\u7F6E\u4FE1\u533A\u95F4\u3001\u9002\u7528\u6761\u4EF6\uFF09\uFF1B\u8BE5\u7ED9\u7684\u6570\u5B57\u3001\u65B9\u6CD5\u3001\u5BF9\u6BD4\u6CA1\u6709\u7ED9\uFF1B\u6CA1\u6709\u8FBE\u5230\u7528\u6237\u8981\u7684\u8BE6\u7EC6\u7A0B\u5EA6\u3002",
    "4. missing\uFF08\u6F0F\u505A\u9700\u6C42\uFF09\uFF1A\u6F0F\u6389\u4E86\u8BE5\u9886\u57DF\u91CD\u8981\u7684\u7814\u7A76\u3001\u76F8\u53CD\u7684\u8BC1\u636E\u3001\u6700\u65B0\u8FDB\u5C55\u6216\u4E3B\u8981\u4E89\u8BAE\uFF1B\u7528\u6237\u95EE\u5230\u7684\u65B9\u9762\u6CA1\u6709\u8986\u76D6\u3002",
    "5. claim\uFF08\u58F0\u79F0\u4E0E\u8BC1\u636E\u4E0D\u7B26\uFF09\uFF1A\u6267\u884C\u8005\u8BF4\u300C\u591A\u9879\u7814\u7A76\u8868\u660E\u300D\u300C\u5DF2\u88AB\u8BC1\u5B9E\u300D\u300C\u76EE\u524D\u6CA1\u6709\u76F8\u5173\u7814\u7A76\u300D\uFF0C\u4F46\u5BF9\u8BDD\u91CC\u6CA1\u6709\u5BF9\u5E94\u7684\u68C0\u7D22\u6216\u8BC1\u636E\u3002",
    "",
    "\u89C4\u5219\uFF1A",
    "- \u4F60\u4E0D\u80FD\u8054\u7F51\u3002\u4EE5\u5BF9\u8BDD\u91CC\u6267\u884C\u8005\u68C0\u7D22\u5230\u7684\u5185\u5BB9\uFF08\u641C\u7D22\u7ED3\u679C\u3001\u8BFB\u5230\u7684\u7F51\u9875\u548C\u8BBA\u6587\uFF09\u4E3A\u7B2C\u4E00\u4F9D\u636E\uFF0C\u5176\u6B21\u624D\u662F\u4F60\u81EA\u5DF1\u7684\u77E5\u8BC6\u3002",
    "- \u51ED\u81EA\u5DF1\u7684\u77E5\u8BC6\u5224\u65AD\u800C\u53C8\u4E0D\u786E\u5B9A\u65F6\uFF0C\u5199\u6210 low\uFF0C\u8BF4\u660E\u300C\u9700\u8981\u6838\u5B9E\u300D\u4EE5\u53CA\u600E\u4E48\u6838\u5B9E\uFF08\u67E5\u54EA\u7BC7\u8BBA\u6587\u3001\u54EA\u4E2A\u6570\u636E\u5E93\uFF09\u3002\u4E0D\u8981\u628A\u81EA\u5DF1\u8BB0\u4E0D\u6E05\u7684\u4E1C\u897F\u5F53\u6210\u9519\u8BEF\u3002",
    "- \u6000\u7591\u5F15\u7528\u662F\u7F16\u9020\u7684\uFF0C\u8981\u8BF4\u660E\u7406\u7531\uFF0C\u4F8B\u5982\u4F5C\u8005\u4E0E\u5E74\u4EFD\u5BF9\u4E0D\u4E0A\u3001\u671F\u520A\u4E0D\u5B58\u5728\u3001\u6807\u9898\u4E0E\u5185\u5BB9\u4E0D\u7B26\u3002",
    "- \u8BC1\u636E\u5199\u6210\u300C\u7B2C N \u8F6E \xB7 \u54EA\u53E5\u8BDD\u300D\uFF0C\u5E76\u5F15\u7528\u539F\u6587\u3002",
    "- \u6838\u5BF9\u8FC7\u3001\u7AD9\u5F97\u4F4F\u7684\u7ED3\u8BBA\u5199\u8FDB checked\u3002",
    "- verdict\uFF1A\u4E3B\u8981\u7ED3\u8BBA\u6B63\u786E\u3001\u6765\u6E90\u53EF\u9760\u65F6\u4E3A pass\uFF1B\u6709\u4E0D\u51C6\u786E\u6216\u9700\u8981\u6838\u5B9E\u7684\u5730\u65B9\u65F6\u4E3A doubt\uFF1B\u6709\u786E\u5B9A\u7684\u4E8B\u5B9E\u9519\u8BEF\u3001\u7F16\u9020\u7684\u5F15\u7528\u6216\u8BEF\u5BFC\u6027\u7ED3\u8BBA\u65F6\u4E3A fail\u3002",
    "- \u7528\u4E2D\u6587\u5199\u3002"
  ].join("\n")
};
var PLAN_PROMPT = {
  id: "builtin-plan",
  name: "\u8BA1\u5212\u5BA1\u67E5",
  builtin: true,
  text: [
    "\u4F60\u662F\u4E00\u540D\u72EC\u7ACB\u7684\u8BA1\u5212\u5BA1\u67E5\u5458\u3002\u7528\u6237\u548C\u53E6\u4E00\u4E2A AI \u52A9\u624B\uFF08\u4E0B\u79F0\u300C\u6267\u884C\u8005\u300D\uFF09\u5728\u5BF9\u8BDD\u91CC\u4E3A\u67D0\u4E2A\u4EFB\u52A1\u505A\u4E86\u8BA1\u5212\u3002\u4F60\u7684\u5DE5\u4F5C\u662F\u5BA1\u67E5\u8FD9\u4E2A\u8BA1\u5212\u662F\u5426\u5468\u5168\u3001\u53EF\u884C\uFF0C\u4EE5\u53CA\u6709\u6CA1\u6709\u66F4\u597D\u7684\u65B9\u5411\uFF0C\u4E0D\u662F\u66FF\u4ED6\u4EEC\u91CD\u5199\u4E00\u4EFD\u8BA1\u5212\u3002",
    "",
    "\u9010\u9879\u68C0\u67E5\uFF1A",
    "1. missing\uFF08\u9057\u6F0F\uFF09\uFF1A\u6CA1\u6709\u8986\u76D6\u7528\u6237\u7684\u76EE\u6807\u6216\u7EA6\u675F\uFF1B\u7F3A\u5C11\u5FC5\u8981\u7684\u6B65\u9AA4\uFF08\u6570\u636E\u83B7\u53D6\u3001\u6E05\u6D17\u3001\u9A8C\u8BC1\u3001\u5907\u4EFD\u3001\u56DE\u6EDA\u3001\u4EA4\u4ED8\uFF09\uFF1B\u6B65\u9AA4\u4E4B\u95F4\u7684\u4F9D\u8D56\u3001\u987A\u5E8F\u3001\u7531\u8C01\u6765\u505A\u6CA1\u6709\u8BF4\u6E05\u3002",
    "2. feasibility\uFF08\u53EF\u884C\u6027\uFF09\uFF1A\u65F6\u95F4\u3001\u7B97\u529B\u3001\u6570\u636E\u3001\u6743\u9650\u3001\u8D39\u7528\u3001\u6280\u80FD\u7B49\u8D44\u6E90\u662F\u5426\u591F\u7528\uFF1B\u6709\u6CA1\u6709\u4F9D\u8D56\u8FD8\u4E0D\u5B58\u5728\u6216\u62FF\u4E0D\u5230\u7684\u4E1C\u897F\uFF1B\u5DE5\u4F5C\u91CF\u4F30\u8BA1\u662F\u5426\u660E\u663E\u504F\u4E50\u89C2\u3002",
    "3. risk\uFF08\u98CE\u9669\uFF09\uFF1A\u4E3B\u8981\u98CE\u9669\u548C\u5931\u8D25\u70B9\u662F\u4EC0\u4E48\uFF0C\u6709\u6CA1\u6709\u5E94\u5BF9\u529E\u6CD5\u548C\u5907\u9009\u65B9\u6848\uFF1B\u4E0D\u53EF\u9006\u6216\u4EE3\u4EF7\u9AD8\u7684\u6B65\u9AA4\u662F\u4E0D\u662F\u653E\u5F97\u592A\u65E9\u3002",
    "4. assumption\uFF08\u5047\u8BBE\u4E0E\u6761\u4EF6\uFF09\uFF1A\u8BA1\u5212\u5EFA\u7ACB\u5728\u54EA\u4E9B\u672A\u7ECF\u786E\u8BA4\u7684\u5047\u8BBE\u4E0A\uFF08\u6570\u636E\u683C\u5F0F\u3001\u63A5\u53E3\u884C\u4E3A\u3001\u65B9\u6CD5\u662F\u5426\u9002\u7528\u3001\u4ED6\u4EBA\u80FD\u5426\u914D\u5408\u7B49\uFF09\uFF0C\u54EA\u4E9B\u5E94\u8BE5\u5148\u9A8C\u8BC1\u3002",
    "5. unverified\uFF08\u672A\u9A8C\u8BC1\uFF09\uFF1A\u6CA1\u6709\u68C0\u67E5\u70B9\u3001\u6210\u529F\u6807\u51C6\u6216\u4E2D\u95F4\u9A8C\u8BC1\uFF0C\u8981\u505A\u5230\u6700\u540E\u624D\u4F1A\u53D1\u73B0\u95EE\u9898\uFF1B\u5EFA\u8BAE\u5728\u54EA\u91CC\u52A0\u5C0F\u89C4\u6A21\u8BD5\u9A8C\u6216\u91CC\u7A0B\u7891\u3002",
    "6. alternative\uFF08\u66F4\u597D\u7684\u65B9\u5411\uFF09\uFF1A\u6709\u6CA1\u6709\u66F4\u7B80\u5355\u3001\u66F4\u4FBF\u5B9C\u3001\u66F4\u7A33\u59A5\u6216\u66F4\u6807\u51C6\u7684\u505A\u6CD5\uFF1B\u6709\u6CA1\u6709\u53EF\u4EE5\u76F4\u63A5\u590D\u7528\u7684\u5DE5\u5177\u3001\u6570\u636E\u6216\u65B9\u6CD5\uFF1B\u76EE\u6807\u672C\u8EAB\u662F\u5426\u8BE5\u8C03\u6574\u3002",
    "7. scope\uFF08\u8D8A\u754C\uFF09\uFF1A\u8BA1\u5212\u91CC\u6709\u6CA1\u6709\u548C\u76EE\u6807\u65E0\u5173\u3001\u53EF\u4EE5\u53BB\u6389\u7684\u90E8\u5206\u3002",
    "",
    "\u89C4\u5219\uFF1A",
    "- \u7ED3\u5408\u5BF9\u8BDD\u91CC\u7684\u80CC\u666F\uFF08\u7528\u6237\u7684\u76EE\u6807\u3001\u5DF2\u6709\u7684\u6570\u636E\u548C\u5DE5\u5177\u3001\u65F6\u95F4\u8981\u6C42\uFF09\u5224\u65AD\uFF0C\u4E0D\u8981\u63D0\u6CDB\u6CDB\u7684\u5EFA\u8BAE\u3002",
    "- \u6BCF\u6761\u95EE\u9898\u90FD\u8BF4\u660E\u4F1A\u9020\u6210\u4EC0\u4E48\u540E\u679C\uFF0C\u5E76\u7ED9\u51FA\u5177\u4F53\u7684\u6539\u6CD5\u3002",
    "- \u8BC1\u636E\u5199\u6210\u300C\u7B2C N \u8F6E \xB7 \u8BA1\u5212\u91CC\u7684\u54EA\u4E00\u6B65\u300D\u3002",
    "- \u8BA1\u5212\u91CC\u8003\u8651\u5468\u5230\u7684\u5730\u65B9\u5199\u8FDB checked\u3002",
    "- verdict\uFF1A\u8BA1\u5212\u5468\u5168\u53EF\u884C\u65F6\u4E3A pass\uFF1B\u6709\u7F3A\u53E3\u4F46\u53EF\u4EE5\u8FB9\u505A\u8FB9\u8865\u65F6\u4E3A doubt\uFF1B\u6709\u4F1A\u5BFC\u81F4\u5931\u8D25\u6216\u660E\u663E\u6D6A\u8D39\u7684\u91CD\u5927\u95EE\u9898\u65F6\u4E3A fail\u3002",
    "- \u7528\u4E2D\u6587\u5199\u3002"
  ].join("\n")
};
var BUILTIN_PROMPTS = [BUILTIN_PROMPT, THEORY_PROMPT, FACTS_PROMPT, PLAN_PROMPT];
function systemPrompt(options) {
  const lines = [options.checks.trim() || BUILTIN_PROMPT_TEXT, "", "\u2014\u2014 \u4EE5\u4E0B\u7531\u5BA1\u67E5\u63D2\u4EF6\u9644\u52A0 \u2014\u2014"];
  lines.push("\u5DE5\u5177\u7ED3\u679C\u548C\u6587\u4EF6\u5185\u5BB9\u53EF\u80FD\u88AB\u622A\u65AD\uFF08\u6807\u6709\u300C\u7701\u7565\u300D\uFF09\uFF0C\u4E0D\u8981\u628A\u622A\u65AD\u672C\u8EAB\u5F53\u6210\u95EE\u9898\u3002");
  lines.push(
    "\u4F60\u53EA\u80FD\u9605\u8BFB\uFF0C\u4E0D\u80FD\u4FEE\u6539\u4EFB\u4F55\u6587\u4EF6\uFF0C\u4E5F\u4E0D\u80FD\u8FD0\u884C\u4EFB\u4F55\u547D\u4EE4\uFF08\u6D4B\u8BD5\u3001\u6784\u5EFA\u3001\u811A\u672C\u3001git \u90FD\u4E0D\u884C\uFF09\u3002\u6240\u6709\u4FEE\u6539\u548C\u8FD0\u884C\u90FD\u4EA4\u7ED9\u6267\u884C\u8005\uFF08\u4E3B\u4F1A\u8BDD\uFF09\u53BB\u505A\uFF1A",
    "- \u9700\u8981\u8FD0\u884C\u547D\u4EE4\u624D\u80FD\u786E\u8BA4\u7684\u4E8B\uFF08\u6D4B\u8BD5\u662F\u5426\u901A\u8FC7\u3001\u7A0B\u5E8F\u8F93\u51FA\u3001git diff \u7B49\uFF09\uFF0C\u5199\u6210\u7ED9\u6267\u884C\u8005\u7684\u5EFA\u8BAE\uFF0C\u4F8B\u5982\u300C\u8BF7\u8FD0\u884C pytest \u5E76\u8D34\u51FA\u5B8C\u6574\u8F93\u51FA\u300D\uFF0C\u7C7B\u522B\u7528 unverified\uFF0C\u4E0D\u8981\u56E0\u4E3A\u81EA\u5DF1\u65E0\u6CD5\u8FD0\u884C\u5C31\u5224\u5B9A\u6709\u95EE\u9898\u3002",
    "- suggestion \u5199\u6210\u6267\u884C\u8005\u53EF\u4EE5\u76F4\u63A5\u7167\u505A\u7684\u6B65\u9AA4\u3002"
  );
  if (options.content === "conversation") {
    lines.push("\u8FD9\u6B21\u53EA\u5BA1\u67E5\u5BF9\u8BDD\u672C\u8EAB\uFF1A\u4F60\u770B\u4E0D\u5230\u5DE5\u4F5C\u533A\u7684\u6587\u4EF6\uFF0C\u4E0D\u8981\u56E0\u4E3A\u770B\u4E0D\u5230\u6587\u4EF6\u800C\u62A5\u95EE\u9898\uFF0C\u53EA\u6839\u636E\u5BF9\u8BDD\u8BB0\u5F55\u5224\u65AD\u3002");
  } else if (options.content === "files") {
    lines.push("\u8FD9\u6B21\u53EA\u5BA1\u67E5\u6267\u884C\u8005\u5199\u51FA\u7684\u6587\u4EF6\uFF1A\u6839\u636E\u7528\u6237\u7684\u8981\u6C42\uFF0C\u5224\u65AD\u8FD9\u4E9B\u6587\u4EF6\u7684\u5185\u5BB9\u662F\u5426\u6B63\u786E\u3001\u5B8C\u6574\u3001\u5B89\u5168\u3002\u5BF9\u8BDD\u91CC\u6267\u884C\u8005\u8BF4\u4E86\u4EC0\u4E48\u4E0D\u662F\u91CD\u70B9\uFF0C\u4EE5\u6587\u4EF6\u5B9E\u9645\u5185\u5BB9\u4E3A\u51C6\u3002");
  } else {
    lines.push("\u5BF9\u8BDD\u8BB0\u5F55\u548C\u6267\u884C\u8005\u5199\u51FA\u7684\u6587\u4EF6\u90FD\u8981\u770B\uFF1A\u65E2\u6838\u5BF9\u6267\u884C\u8005\u7684\u8BF4\u6CD5\uFF0C\u4E5F\u68C0\u67E5\u6587\u4EF6\u5B9E\u9645\u5185\u5BB9\u3002");
  }
  if (options.live) {
    lines.push("\u8FD9\u662F\u5728\u4EFB\u52A1\u8FC7\u7A0B\u4E2D\u7684\u5BA1\u67E5\uFF0C\u4EFB\u52A1\u53EF\u80FD\u8FD8\u5728\u8FDB\u884C\u4E2D\uFF1A\u53EA\u770B\u5DF2\u7ECF\u53D1\u751F\u7684\u4E8B\u3002\u4E0D\u8981\u56E0\u4E3A\u8FD8\u6CA1\u8F6E\u5230\u7684\u6B65\u9AA4\u62A5 missing\uFF0C\u9664\u975E\u6267\u884C\u8005\u5DF2\u7ECF\u58F0\u79F0\u5B8C\u6210\u3002");
  }
  if (options.loop) {
    lines.push("\u8FD9\u662F\u8FDE\u7EED\u5BA1\u67E5\u7684\u4E00\u8F6E\uFF1A\u4E0A\u4E00\u8F6E\u5BA1\u67E5\u6307\u51FA\u7684\u95EE\u9898\u5DF2\u7ECF\u53D1\u7ED9\u6267\u884C\u8005\u4FEE\u6539\u3002\u91CD\u70B9\u68C0\u67E5\u8FD9\u4E9B\u95EE\u9898\u662F\u5426\u771F\u7684\u6539\u597D\u4E86\uFF0C\u4EE5\u53CA\u4FEE\u6539\u6709\u6CA1\u6709\u5E26\u6765\u65B0\u95EE\u9898\uFF1B\u5DF2\u7ECF\u6539\u597D\u7684\u5199\u8FDB checked\u3002");
  }
  if (options.depth === "deep" && options.content !== "conversation") {
    lines.push(
      `\u4F60\u53EF\u4EE5\u7528\u53EA\u8BFB\u5DE5\u5177\u67E5\u770B\u5DE5\u4F5C\u533A\u6765\u6838\u5B9E\uFF08\u6700\u591A ${options.maxToolCalls} \u6B21\uFF09\uFF1Aread_file \u8BFB\u6587\u4EF6\uFF0Clist_dir \u5217\u76EE\u5F55\uFF0Csearch \u641C\u7D22\u6587\u672C\u3002\u5B83\u4EEC\u53EA\u8BFB\u6587\u4EF6\uFF0C\u4E0D\u80FD\u8FD0\u884C\u547D\u4EE4\u3002\u8DEF\u5F84\u53EF\u4EE5\u5199\u76F8\u5BF9\u5DE5\u4F5C\u533A\u7684\u8DEF\u5F84\uFF0C\u4E5F\u53EF\u4EE5\u5199\u4E0B\u9762\u5217\u51FA\u7684\u6587\u4EF6\u7684\u7EDD\u5BF9\u8DEF\u5F84\u3002`,
      "\u5148\u60F3\u6E05\u695A\u8981\u6838\u5B9E\u4EC0\u4E48\uFF0C\u518D\u8C03\u7528\u5DE5\u5177\uFF0C\u4E0D\u8981\u6F2B\u65E0\u76EE\u7684\u5730\u6D4F\u89C8\u3002\u6838\u5B9E\u5B8C\u6BD5\u540E\uFF0C\u76F4\u63A5\u8F93\u51FA\u7ED3\u8BBA\u3002"
    );
  }
  lines.push("", "\u6700\u540E\u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\uFF0C\u4E0D\u8981\u7528\u4EE3\u7801\u5757\u5305\u88F9\u3002\u683C\u5F0F\uFF1A", RESULT_SHAPE);
  return lines.join("\n");
}
function userPrompt(parts) {
  const sections = [];
  if (parts.background !== "") sections.push(`# \u80CC\u666F\uFF1A\u7528\u6237\u4E4B\u524D\u7684\u8BF7\u6C42
${parts.background}`);
  if (parts.transcript !== void 0) sections.push(`# \u5BA1\u67E5\u8303\u56F4\uFF1A${parts.scopeLabel}
${parts.transcript}`);
  else if (parts.asks !== void 0) sections.push(`# \u5BA1\u67E5\u8303\u56F4\uFF1A${parts.scopeLabel}
## \u7528\u6237\u5728\u8FD9\u51E0\u8F6E\u7684\u8981\u6C42
${parts.asks}`);
  if (parts.files !== void 0) sections.push(`# \u6267\u884C\u8005\u5199\u51FA\u7684\u6587\u4EF6\uFF08\u5F53\u524D\u5185\u5BB9\uFF09
${parts.files}`);
  if (parts.workspace !== void 0) sections.push(`# \u5DE5\u4F5C\u533A
${parts.workspace}`);
  if (parts.previous !== void 0 && parts.previous !== "") sections.push(`# ${parts.previousLabel ?? "\u4E0A\u4E00\u6B21\u5BA1\u67E5\u7684\u7ED3\u8BBA\uFF08\u4E0D\u8981\u91CD\u590D\u5DF2\u7ECF\u62A5\u544A\u8FC7\u7684\u95EE\u9898\uFF0C\u9664\u975E\u60C5\u51B5\u53D8\u4E86\uFF09"}
${parts.previous}`);
  sections.push("\u8BF7\u5BA1\u67E5\u4E0A\u9762\u7684\u5185\u5BB9\uFF0C\u6309\u8981\u6C42\u8F93\u51FA JSON\u3002");
  return sections.join("\n\n");
}
var ANSWER_NOW = "\u4F60\u4E0A\u4E00\u6B21\u7684\u56DE\u7B54\u5728\u601D\u8003\u9636\u6BB5\u5C31\u7528\u5B8C\u4E86\u8F93\u51FA\u957F\u5EA6\uFF0C\u6CA1\u6709\u7ED9\u51FA\u7ED3\u8BBA\u3002\u8BF7\u5C11\u601D\u8003\uFF0C\u76F4\u63A5\u8F93\u51FA\u7EA6\u5B9A\u7684 JSON \u7ED3\u8BBA\uFF0C\u6BCF\u6761\u95EE\u9898\u5199\u5F97\u7B80\u77ED\u4E00\u4E9B\u3002";
var FINISH_NOW = "\u5DE5\u5177\u8C03\u7528\u6B21\u6570\u5DF2\u7528\u5B8C\u3002\u8BF7\u6839\u636E\u5DF2\u7ECF\u6838\u5B9E\u7684\u5185\u5BB9\uFF0C\u76F4\u63A5\u8F93\u51FA JSON \u7ED3\u8BBA\u3002";

// src/redact.ts
var RULES = [
  { label: "\u79C1\u94A5", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { label: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { label: "API key", pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b/g },
  { label: "Slack token", pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g },
  { label: "AWS key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "Google key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { label: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { label: "Bearer token", pattern: /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/g, keep: 1 },
  {
    label: "\u5BC6\u7801/\u5BC6\u94A5",
    pattern: /\b((?:api[_-]?key|access[_-]?key|secret|token|passw(?:or)?d|pwd|auth)["']?\s*[:=]\s*["']?)([^\s"'`,;]{8,})/gi,
    keep: 1
  }
];
function redact(text) {
  const counts = {};
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.pattern, (...match) => {
      counts[rule.label] = (counts[rule.label] ?? 0) + 1;
      const prefix = rule.keep !== void 0 ? String(match[rule.keep] ?? "") : "";
      return `${prefix}[\u5DF2\u9690\u85CF\u7684${rule.label}]`;
    });
  }
  return { text: out, counts };
}
function redactionNote(counts) {
  const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([label, n]) => `${label} ${n} \u5904`);
  return parts.length > 0 ? `\u53D1\u9001\u524D\u9690\u85CF\u4E86\uFF1A${parts.join("\u3001")}` : void 0;
}
function addCounts(into, more) {
  for (const [label, n] of Object.entries(more)) into[label] = (into[label] ?? 0) + n;
  return into;
}

// src/workspace.ts
import { lstat, open, readdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
var MAX_TOOL_OUTPUT = 24e3;
var MAX_FILE_BYTES = 2e6;
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", "node_modules", ".venv", "venv", "__pycache__", ".next", "dist", "build", ".cache", ".DS_Store"]);
function looksSecret(path) {
  const name2 = basename(path).toLowerCase();
  return name2 === ".env" || name2.startsWith(".env.") || /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(name2) || /\.(pem|key|p12|pfx|keystore|jks)$/.test(name2) || name2 === ".npmrc" || name2 === ".netrc" || name2 === ".pypirc" || name2 === "credentials" || name2 === "credentials.json";
}
function capOutput(text, limit = MAX_TOOL_OUTPUT) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}
\u2026\uFF08\u8F93\u51FA\u8FC7\u957F\uFF0C\u5DF2\u622A\u65AD\uFF0C\u5171 ${text.length} \u5B57\uFF09`;
}
var ToolRefusal = class extends Error {
};
async function insideRoots(roots, path) {
  const candidates2 = isAbsolute(path) ? roots : roots.slice(0, 1);
  let refusal;
  for (const root of candidates2) {
    try {
      return { full: await insideRoot(root, path), root: await realpath(root) };
    } catch (error) {
      refusal = error;
    }
  }
  throw refusal instanceof ToolRefusal ? new ToolRefusal(`\u62D2\u7EDD\u8BBF\u95EE\u5DE5\u4F5C\u533A\u4EE5\u5916\u7684\u8DEF\u5F84\uFF1A${path}`) : refusal ?? new ToolRefusal(`\u62D2\u7EDD\u8BBF\u95EE\u5DE5\u4F5C\u533A\u4EE5\u5916\u7684\u8DEF\u5F84\uFF1A${path}`);
}
async function insideRoot(root, path) {
  const realRoot = await realpath(root);
  const wanted = resolve(realRoot, path === "" ? "." : path);
  let existing = wanted;
  const rest = [];
  for (; ; ) {
    try {
      existing = await realpath(existing);
      break;
    } catch {
      const parent = resolve(existing, "..");
      if (parent === existing) throw new ToolRefusal(`\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${path}`);
      rest.unshift(basename(existing));
      existing = parent;
    }
  }
  const full = rest.length > 0 ? join(existing, ...rest) : existing;
  if (full !== realRoot && !full.startsWith(realRoot + sep)) throw new ToolRefusal(`\u62D2\u7EDD\u8BBF\u95EE\u5DE5\u4F5C\u533A\u4EE5\u5916\u7684\u8DEF\u5F84\uFF1A${path}`);
  return full;
}
function workspaceOverview(roots) {
  if (roots.length === 0) return "\uFF08\u8FD9\u4E2A\u5BF9\u8BDD\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55\uFF09";
  return [
    "\u53EF\u4EE5\u67E5\u770B\u7684\u76EE\u5F55\uFF1A",
    ...roots.map((root) => `- ${root}`),
    "\uFF08\u5BA1\u67E5\u63D2\u4EF6\u4E0D\u8FD0\u884C\u4EFB\u4F55\u547D\u4EE4\uFF0C\u6240\u4EE5\u8FD9\u91CC\u6CA1\u6709 git status / git diff\u3002\u9700\u8981\u8FD9\u4E9B\u4FE1\u606F\u65F6\uFF0C\u5728\u5EFA\u8BAE\u91CC\u8BF7\u6267\u884C\u8005\u8FD0\u884C\u5E76\u8D34\u51FA\u7ED3\u679C\u3002\uFF09"
  ].join("\n");
}
var TOOL_SCHEMAS = [
  {
    name: "read_file",
    description: "\u8BFB\u53D6\u5DE5\u4F5C\u533A\u91CC\u7684\u4E00\u4E2A\u6587\u672C\u6587\u4EF6\uFF08\u53EA\u8BFB\uFF09\u3002\u8FD4\u56DE\u5E26\u884C\u53F7\u7684\u5185\u5BB9\uFF0C\u4E00\u6B21\u6700\u591A 400 \u884C\u3002",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "\u76F8\u5BF9\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55\u7684\u8DEF\u5F84" },
        start_line: { type: "integer", description: "\u4ECE\u7B2C\u51E0\u884C\u5F00\u59CB\uFF081 \u8D77\uFF09\uFF0C\u9ED8\u8BA4 1" },
        max_lines: { type: "integer", description: "\u6700\u591A\u8BFB\u591A\u5C11\u884C\uFF0C\u9ED8\u8BA4 200\uFF0C\u6700\u5927 400" }
      },
      required: ["path"]
    }
  },
  {
    name: "list_dir",
    description: "\u5217\u51FA\u5DE5\u4F5C\u533A\u91CC\u4E00\u4E2A\u76EE\u5F55\u7684\u5185\u5BB9\uFF08\u53EA\u8BFB\uFF09\uFF0C\u53EF\u4EE5\u5C55\u5F00\u4E24\u5C42\u3002\u8DF3\u8FC7 .git\u3001node_modules \u7B49\u3002",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "\u76F8\u5BF9\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55\u7684\u8DEF\u5F84\uFF0C\u9ED8\u8BA4\u6839\u76EE\u5F55" },
        depth: { type: "integer", description: "\u5C55\u5F00\u5C42\u6570\uFF0C1 \u6216 2\uFF0C\u9ED8\u8BA4 1" }
      }
    }
  },
  {
    name: "search",
    description: "\u5728\u5DE5\u4F5C\u533A\u91CC\u641C\u7D22\u6587\u672C\uFF08\u6B63\u5219\uFF0C\u53EA\u8BFB\uFF09\u3002\u8FD4\u56DE\u300C\u6587\u4EF6:\u884C\u53F7:\u5185\u5BB9\u300D\uFF0C\u6700\u591A 150 \u6761\u3002",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "\u8981\u641C\u7D22\u7684\u6B63\u5219\u8868\u8FBE\u5F0F" },
        path: { type: "string", description: "\u53EA\u5728\u8FD9\u4E2A\u5B50\u76EE\u5F55\u6216\u6587\u4EF6\u91CC\u641C\uFF0C\u9ED8\u8BA4\u6574\u4E2A\u5DE5\u4F5C\u533A" }
      },
      required: ["pattern"]
    }
  }
];
async function readFileTool(roots, input) {
  const path = typeof input.path === "string" ? input.path : "";
  if (path === "") throw new ToolRefusal("\u7F3A\u5C11 path");
  const { full, root } = await insideRoots(roots, path);
  if (looksSecret(full)) throw new ToolRefusal(`\u62D2\u7EDD\u8BFB\u53D6\u53EF\u80FD\u542B\u5BC6\u94A5\u7684\u6587\u4EF6\uFF1A${path}`);
  const info = await stat(full).catch(() => void 0);
  if (info === void 0) throw new ToolRefusal(`\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${path}`);
  if (info.isDirectory()) throw new ToolRefusal(`\u8FD9\u662F\u76EE\u5F55\uFF0C\u8BF7\u7528 list_dir\uFF1A${path}`);
  if (info.size > MAX_FILE_BYTES) throw new ToolRefusal(`\u6587\u4EF6\u592A\u5927\uFF08${info.size} \u5B57\u8282\uFF09\uFF0C\u8BF7\u7528 search \u67E5\u770B\u7247\u6BB5\uFF0C\u6216\u7528 read_file \u5206\u6BB5\u8BFB\u53D6`);
  const handle = await open(full, "r");
  let buffer;
  try {
    buffer = await handle.readFile();
  } finally {
    await handle.close();
  }
  if (buffer.subarray(0, 8e3).includes(0)) throw new ToolRefusal(`\u8FD9\u662F\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF1A${path}`);
  const lines = buffer.toString("utf8").split("\n");
  const start = Math.max(1, Math.floor(Number(input.start_line) || 1));
  const count = Math.min(400, Math.max(1, Math.floor(Number(input.max_lines) || 200)));
  const slice = lines.slice(start - 1, start - 1 + count);
  const body = slice.map((line, i) => `${String(start + i).padStart(5)}  ${line}`).join("\n");
  const more = start - 1 + count < lines.length ? `
\u2026\uFF08\u5171 ${lines.length} \u884C\uFF0C\u8FD8\u6709 ${lines.length - (start - 1 + count)} \u884C\u672A\u663E\u793A\uFF09` : "";
  return capOutput(`${relative(root, full) || "."}\uFF08\u7B2C ${start}\u2013${start + slice.length - 1} \u884C\uFF09
${body}${more}`);
}
async function listDirTool(roots, input) {
  const path = typeof input.path === "string" ? input.path : ".";
  const depth = Math.min(2, Math.max(1, Math.floor(Number(input.depth) || 1)));
  const { full, root: realRoot } = await insideRoots(roots, path);
  const out = [];
  const walk = async (dir, level) => {
    if (out.length >= 300) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      throw new ToolRefusal(`\u65E0\u6CD5\u5217\u51FA\u76EE\u5F55\uFF1A${path}`);
    }
    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= 300) {
        out.push("\u2026\uFF08\u6761\u76EE\u8FC7\u591A\uFF0C\u5DF2\u622A\u65AD\uFF09");
        return;
      }
      const rel = relative(realRoot, join(dir, entry.name));
      const indent = "  ".repeat(level - 1);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          out.push(`${indent}${rel}/\uFF08\u5DF2\u8DF3\u8FC7\uFF09`);
          continue;
        }
        out.push(`${indent}${rel}/`);
        if (level < depth) await walk(join(dir, entry.name), level + 1);
      } else {
        const size = await lstat(join(dir, entry.name)).then((s) => s.size).catch(() => 0);
        out.push(`${indent}${rel}  ${size} B`);
      }
    }
  };
  await walk(full, 1);
  return capOutput(out.join("\n") || "\uFF08\u7A7A\u76EE\u5F55\uFF09");
}
async function searchTool(roots, input) {
  const pattern = typeof input.pattern === "string" ? input.pattern : "";
  if (pattern === "") throw new ToolRefusal("\u7F3A\u5C11 pattern");
  const path = typeof input.path === "string" && input.path !== "" ? input.path : ".";
  const { full, root: realRoot } = await insideRoots(roots, path);
  const rel = relative(realRoot, full) || ".";
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch {
    throw new ToolRefusal(`\u6B63\u5219\u5199\u6CD5\u6709\u8BEF\uFF1A${pattern}`);
  }
  const out = [];
  let files = 0;
  const visit = async (target) => {
    if (out.length >= 150 || files >= 3e3) return;
    const info = await lstat(target).catch(() => void 0);
    if (info === void 0 || info.isSymbolicLink()) return;
    if (info.isDirectory()) {
      if (SKIP_DIRS.has(basename(target))) return;
      for (const name2 of await readdir(target).catch(() => [])) await visit(join(target, name2));
      return;
    }
    files += 1;
    if (info.size > 512e3 || looksSecret(target)) return;
    const text = await open(target, "r").then(async (handle) => {
      try {
        return await handle.readFile();
      } finally {
        await handle.close();
      }
    }).catch(() => void 0);
    if (text === void 0 || text.subarray(0, 4e3).includes(0)) return;
    text.toString("utf8").split("\n").forEach((line, i) => {
      if (out.length < 150 && regex.test(line)) out.push(`${relative(realRoot, target)}:${i + 1}:${line.slice(0, 300)}`);
    });
  };
  await visit(full);
  return out.length > 0 ? capOutput(out.join("\n")) : "\uFF08\u6CA1\u6709\u5339\u914D\uFF09";
}
function toolTarget(name2, input) {
  if (name2 === "search") return `${String(input.pattern ?? "")}${typeof input.path === "string" ? ` \xB7 ${input.path}` : ""}`.slice(0, 160);
  return String(input.path ?? ".").slice(0, 160);
}
async function runTool(roots, name2, rawArgs) {
  let input = {};
  try {
    const parsed = rawArgs.trim() === "" ? {} : JSON.parse(rawArgs);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) input = parsed;
  } catch {
    return { text: "\u53C2\u6570\u4E0D\u662F\u5408\u6CD5\u7684 JSON", ok: false, input };
  }
  const list = typeof roots === "string" ? [roots] : roots;
  if (list.length === 0) return { text: "\u8FD9\u4E2A\u5BF9\u8BDD\u6CA1\u6709\u53EF\u4EE5\u67E5\u770B\u7684\u5DE5\u4F5C\u533A", ok: false, input };
  try {
    switch (name2) {
      case "read_file":
        return { text: await readFileTool(list, input), ok: true, input };
      case "list_dir":
        return { text: await listDirTool(list, input), ok: true, input };
      case "search":
        return { text: await searchTool(list, input), ok: true, input };
      default:
        return { text: `\u6CA1\u6709\u8FD9\u4E2A\u5DE5\u5177\uFF1A${name2}\u3002\u53EF\u7528\uFF1Aread_file\u3001list_dir\u3001search\uFF08\u5BA1\u67E5\u63D2\u4EF6\u4E0D\u80FD\u8FD0\u884C\u547D\u4EE4\uFF09`, ok: false, input };
    }
  } catch (error) {
    return { text: error instanceof Error ? error.message : String(error), ok: false, input };
  }
}

// src/runner.ts
var ReviewError = class extends Error {
  constructor(message, code = "internal") {
    super(message);
    this.code = code;
    this.name = "ReviewError";
  }
};
function describeFinish(reason) {
  switch (reason.kind) {
    case "stop":
    case "tool-calls":
      return void 0;
    case "max-tokens":
      return "\u6A21\u578B\u8F93\u51FA\u8FBE\u5230\u957F\u5EA6\u4E0A\u9650";
    case "error":
    case "aborted":
      return `${reason.failure.message}${reason.failure.code !== "" ? `\uFF08${reason.failure.code}\uFF09` : ""}`;
    default:
      return String(reason.kind ?? reason);
  }
}
function toolsUnsupported(message) {
  return /tool|function[_ ]?call|not support|unsupported|不支持/i.test(message);
}
async function streamOnce(input, options, signal) {
  const assembler = new BlockAssembler();
  const iterator = input.llm.stream({ ...options, signal })[Symbol.asyncIterator]();
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
  let exhausted = false;
  try {
    for (; ; ) {
      const next = await Promise.race([iterator.next(), aborted]);
      if (next.done) {
        exhausted = true;
        break;
      }
      assembler.push(next.value);
      if (next.value.type === "text-delta") {
        try {
          input.onDelta?.(next.value.text);
        } catch {
        }
      }
    }
  } finally {
    if (onAbort !== void 0) signal.removeEventListener("abort", onAbort);
    if (!exhausted) void Promise.resolve(iterator.return?.()).catch(() => {
    });
  }
  return { blocks: assembler.blocks(), finish: assembler.finish, assembler };
}
function textOfBlocks(blocks) {
  return blocks.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
}
async function runReview(input) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, input.timeoutMs);
  const onCaller = () => controller.abort();
  if (input.signal.aborted) controller.abort();
  else input.signal.addEventListener("abort", onCaller, { once: true });
  const notes = [];
  const tools = [];
  const redactions = {};
  const base = {
    provider: input.route.provider,
    model: input.route.model,
    system: input.system,
    maxTokens: input.maxTokens,
    temperature: 0.2,
    ...input.effort !== void 0 ? { reasoningEffort: input.effort } : {}
  };
  const first = { role: "user", content: [{ type: "text", text: input.prompt }] };
  try {
    const quick = async () => {
      input.onPhase?.("\u7B49\u5F85\u5BA1\u67E5\u6A21\u578B\u56DE\u7B54");
      let result = await streamOnce(input, { ...base, messages: [first] }, controller.signal);
      if (result.finish.kind === "max-tokens" && textOfBlocks(result.blocks) === "") {
        notes.push("\u5BA1\u67E5\u6A21\u578B\u7B2C\u4E00\u6B21\u601D\u8003\u7528\u5B8C\u4E86\u8F93\u51FA\u957F\u5EA6\uFF0C\u5DF2\u52A0\u5927\u989D\u5EA6\u91CD\u8BD5");
        input.onPhase?.("\u5BA1\u67E5\u6A21\u578B\u6CA1\u5199\u51FA\u7ED3\u8BBA\uFF0C\u91CD\u8BD5\u4E2D");
        result = await streamOnce(input, { ...base, maxTokens: Math.min(input.maxTokens * 2, 64e3), messages: [first, { role: "user", content: [{ type: "text", text: ANSWER_NOW }] }] }, controller.signal);
      }
      const problem = describeFinish(result.finish);
      const text = textOfBlocks(result.blocks);
      if (problem !== void 0 && text === "") throw new ReviewError(`\u5BA1\u67E5\u6A21\u578B\u51FA\u9519\uFF1A${problem}`, "upstream");
      if (problem !== void 0) notes.push(problem);
      if (text === "") throw new ReviewError("\u5BA1\u67E5\u6A21\u578B\u6CA1\u6709\u7ED9\u51FA\u56DE\u7B54", "empty");
      return { text, usedDepth: "quick", tools, notes, redactions };
    };
    const roots = input.roots ?? [];
    if (input.depth === "quick" || roots.length === 0) {
      if (input.depth === "deep") notes.push("\u6CA1\u6709\u53EF\u4EE5\u67E5\u770B\u7684\u5DE5\u4F5C\u533A\uFF0C\u6DF1\u5165\u6A21\u5F0F\u9000\u56DE\u4E3A\u5FEB\u901F\u6A21\u5F0F");
      return await quick();
    }
    const messages = [first];
    let calls = 0;
    let nudged = false;
    for (let round = 0; round < input.maxToolCalls + 2; round++) {
      input.onPhase?.(round === 0 ? "\u7B49\u5F85\u5BA1\u67E5\u6A21\u578B\uFF08\u53EF\u67E5\u770B\u6587\u4EF6\uFF09" : "\u5BA1\u67E5\u6A21\u578B\u7EE7\u7EED\u6838\u5B9E");
      let result;
      try {
        result = await streamOnce(input, { ...base, messages, tools: TOOL_SCHEMAS }, controller.signal);
      } catch (error) {
        if (round === 0 && !controller.signal.aborted && toolsUnsupported(error instanceof Error ? error.message : String(error))) {
          notes.push("\u8FD9\u4E2A\u6A21\u578B\u4E0D\u80FD\u8C03\u7528\u5DE5\u5177\uFF0C\u5DF2\u9000\u56DE\u5FEB\u901F\u6A21\u5F0F");
          return await quick();
        }
        throw error;
      }
      const problem = describeFinish(result.finish);
      if (problem !== void 0 && round === 0 && (result.finish.kind === "error" || result.finish.kind === "aborted") && !controller.signal.aborted && toolsUnsupported(problem)) {
        notes.push("\u8FD9\u4E2A\u6A21\u578B\u4E0D\u80FD\u8C03\u7528\u5DE5\u5177\uFF0C\u5DF2\u9000\u56DE\u5FEB\u901F\u6A21\u5F0F");
        return await quick();
      }
      const toolCalls = result.blocks.filter((block) => block.type === "tool-call");
      if (toolCalls.length === 0) {
        const text = textOfBlocks(result.blocks);
        if (text === "" && result.finish.kind === "max-tokens" && !nudged) {
          nudged = true;
          notes.push("\u5BA1\u67E5\u6A21\u578B\u601D\u8003\u7528\u5B8C\u4E86\u8F93\u51FA\u957F\u5EA6\uFF0C\u5DF2\u63D0\u793A\u5B83\u76F4\u63A5\u7ED9\u7ED3\u8BBA");
          messages.push({ role: "user", content: [{ type: "text", text: ANSWER_NOW }] });
          continue;
        }
        if (problem !== void 0 && text === "") throw new ReviewError(`\u5BA1\u67E5\u6A21\u578B\u51FA\u9519\uFF1A${problem}`, "upstream");
        if (problem !== void 0) notes.push(problem);
        if (text === "") throw new ReviewError("\u5BA1\u67E5\u6A21\u578B\u6CA1\u6709\u7ED9\u51FA\u56DE\u7B54", "empty");
        return { text, usedDepth: "deep", tools, notes, redactions };
      }
      messages.push(result.assembler.message({ provider: input.route.provider, model: input.route.model, ...result.assembler.replayState !== void 0 ? { replayState: result.assembler.replayState } : {} }));
      for (const call of toolCalls) {
        let text;
        let ok2;
        if (calls >= input.maxToolCalls) {
          text = FINISH_NOW;
          ok2 = false;
        } else {
          calls += 1;
          const ran = await runTool(roots, call.name, call.arguments);
          const use = { name: call.name, target: toolTarget(call.name, ran.input), ok: ran.ok };
          tools.push(use);
          input.onTool?.(use);
          input.onPhase?.(`${call.name === "read_file" ? "\u8BFB" : call.name === "list_dir" ? "\u5217\u51FA" : call.name === "search" ? "\u641C\u7D22" : ""} ${use.target}`.trim());
          const cleaned = redact(ran.text);
          addCounts(redactions, cleaned.counts);
          text = cleaned.text;
          ok2 = ran.ok;
        }
        messages.push(createToolResultMessage({ callId: call.id, content: [{ type: "text", text }], isError: !ok2 }));
      }
      if (calls >= input.maxToolCalls) messages.push({ role: "user", content: [{ type: "text", text: FINISH_NOW }] });
    }
    throw new ReviewError("\u5BA1\u67E5\u6A21\u578B\u4E00\u76F4\u5728\u8C03\u7528\u5DE5\u5177\uFF0C\u6CA1\u6709\u7ED9\u51FA\u7ED3\u8BBA", "loop");
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    if (timedOut) throw new ReviewError(`\u5BA1\u67E5\u8D85\u65F6\uFF08${Math.round(input.timeoutMs / 1e3)} \u79D2\uFF09`, "timeout");
    if (controller.signal.aborted) throw new ReviewError("\u5BA1\u67E5\u5DF2\u53D6\u6D88", "cancelled");
    throw new ReviewError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
    input.signal.removeEventListener("abort", onCaller);
  }
}

// src/routes.ts
var MAX_BODY = 256 * 1024;
function send(res, status, body) {
  if (res.headersSent) return;
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(text);
}
function ok(res, value) {
  send(res, 200, { ok: true, value });
}
function fail(res, status, error) {
  send(res, status, { ok: false, error });
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY) throw new ReviewError("\u8BF7\u6C42\u592A\u5927", "too-large");
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return {};
  const value = JSON.parse(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ReviewError("\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F JSON \u5BF9\u8C61", "bad-request");
  return value;
}
function sessionOf(value) {
  if (typeof value !== "string" || value === "" || value.length > 200) throw new ReviewError("\u7F3A\u5C11 session", "bad-request");
  return value;
}
function scopeOf(value) {
  const record = typeof value === "object" && value !== null ? value : {};
  if (record.kind === "all") return { kind: "all" };
  if (record.kind === "range") {
    const from = Math.floor(Number(record.from));
    const to = Math.floor(Number(record.to));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) throw new ReviewError("\u8F6E\u6B21\u8303\u56F4\u4E0D\u5BF9", "bad-request");
    return { kind: "range", from: Math.min(from, to), to: Math.max(from, to) };
  }
  return { kind: "last" };
}
function depthOf(value) {
  return value === "deep" ? "deep" : "quick";
}
function routeOf(value) {
  if (typeof value !== "object" || value === null) return void 0;
  const record = value;
  if (typeof record.provider !== "string" || typeof record.model !== "string" || record.provider === "" || record.model === "") return void 0;
  return { provider: record.provider, model: record.model, ...typeof record.effort === "string" && record.effort !== "" ? { effort: record.effort } : {} };
}
function contentOf(value) {
  return value === "conversation" || value === "files" ? value : "both";
}
function openStream(req, res) {
  res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
  res.write(": open\n\n");
  let closed = false;
  const keepAlive = setInterval(() => {
    if (!closed) res.write(": ping\n\n");
  }, 15e3);
  const close = () => {
    closed = true;
    clearInterval(keepAlive);
  };
  req.on("close", close);
  res.on("close", close);
  return {
    write: (event) => {
      if (!closed) res.write(`data: ${JSON.stringify(event)}

`);
    },
    end: () => {
      close();
      if (!res.writableEnded) res.end();
    },
    closed: () => closed
  };
}
async function serveReviewer(service, req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname.slice(REVIEW_PREFIX.length) || "/";
  const method = (req.method ?? "GET").toUpperCase();
  try {
    if (method === "GET" && path === "/models") return ok(res, await service.catalog());
    if (method === "GET" && path === "/global") return ok(res, await service.globalSettings());
    if (method === "GET" && path === "/live") return ok(res, service.liveSessions());
    if (method === "GET" && path === "/prompts") return ok(res, await service.prompts());
    if (method === "GET" && path === "/efforts") {
      const provider = url.searchParams.get("provider") ?? "";
      const model = url.searchParams.get("model") ?? "";
      if (provider === "" || model === "") throw new ReviewError("\u7F3A\u5C11 provider \u6216 model", "bad-request");
      return ok(res, await service.efforts(provider, model));
    }
    if (method === "GET" && path === "/state") return ok(res, await service.state(sessionOf(url.searchParams.get("session"))));
    if (method === "GET" && path === "/export") {
      const markdown = await service.exportMarkdown(sessionOf(url.searchParams.get("session")), String(url.searchParams.get("report") ?? ""));
      if (markdown === void 0) return fail(res, 404, "\u6CA1\u6709\u8FD9\u4EFD\u62A5\u544A");
      res.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" });
      res.end(markdown);
      return;
    }
    if (method === "GET" && path === "/follow") {
      const sessionId = sessionOf(url.searchParams.get("session"));
      const stream = openStream(req, res);
      const stop = service.follow(sessionId, (event) => {
        stream.write(event);
        if (event.type === "done" || event.type === "error") {
          stop?.();
          stream.end();
        }
      });
      if (stop === void 0) stream.end();
      else req.on("close", stop);
      return;
    }
    if (method !== "POST") return fail(res, 405, "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42");
    const body = await readJson(req);
    switch (path) {
      case "/review": {
        const request = {
          session: sessionOf(body.session),
          scope: scopeOf(body.scope),
          depth: depthOf(body.depth),
          content: contentOf(body.content),
          ...routeOf(body.route) !== void 0 ? { route: routeOf(body.route) } : {},
          ...typeof body.promptId === "string" && body.promptId !== "" ? { promptId: body.promptId } : {}
        };
        const stream = openStream(req, res);
        let settled = false;
        await service.start(request, "manual", (event) => {
          if (event.type === "done" || event.type === "error") settled = true;
          stream.write(event);
        }).catch((error) => {
          if (!settled) stream.write({ type: "error", message: error instanceof Error ? error.message : String(error) });
        });
        stream.end();
        return;
      }
      case "/cancel":
        return ok(res, service.cancel(sessionOf(body.session)));
      case "/settings": {
        const patch = {};
        if (typeof body.live === "boolean") patch.live = body.live;
        if (body.depth === "deep" || body.depth === "quick") patch.depth = body.depth;
        if (body.route === null) patch.route = null;
        else if (routeOf(body.route) !== void 0) patch.route = routeOf(body.route);
        if (body.scope !== void 0) patch.scope = scopeOf(body.scope);
        if (body.content !== void 0) patch.content = contentOf(body.content);
        if (body.loopRounds !== void 0) patch.loopRounds = Number(body.loopRounds);
        return ok(res, await service.setSettings(sessionOf(body.session), patch));
      }
      case "/prompt":
        return ok(res, await service.savePrompt({ ...typeof body.id === "string" ? { id: body.id } : {}, name: typeof body.name === "string" ? body.name : "", text: typeof body.text === "string" ? body.text : "" }));
      case "/prompt/delete":
        return ok(res, await service.deletePrompt(String(body.id ?? "")));
      case "/loop/start":
        return ok(
          res,
          await service.startLoop({
            session: sessionOf(body.session),
            scope: scopeOf(body.scope),
            content: contentOf(body.content),
            depth: depthOf(body.depth),
            maxRounds: Number(body.maxRounds ?? 5),
            ...routeOf(body.route) !== void 0 ? { route: routeOf(body.route) } : {},
            ...typeof body.promptId === "string" && body.promptId !== "" ? { promptId: body.promptId } : {}
          })
        );
      case "/loop/stop":
        return ok(res, service.stopLoop(sessionOf(body.session)) ?? null);
      case "/global": {
        const patch = {};
        if (typeof body.activePromptId === "string" && body.activePromptId !== "") patch.activePromptId = body.activePromptId;
        if (body.liveTrigger === "turn" || body.liveTrigger === "step") patch.liveTrigger = body.liveTrigger;
        return ok(res, await service.setGlobal(patch));
      }
      case "/send":
        return ok(res, await service.send(sessionOf(body.session), typeof body.text === "string" ? body.text : "", typeof body.reportId === "string" ? body.reportId : void 0));
      case "/dismiss":
        return ok(res, await service.dismiss(sessionOf(body.session), String(body.reportId ?? ""), Math.floor(Number(body.index)), body.dismissed !== false));
      case "/remove":
        return ok(res, await service.remove(sessionOf(body.session), String(body.reportId ?? "")));
      default:
        return fail(res, 404, "\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3");
    }
  } catch (error) {
    if (error instanceof SyntaxError) return fail(res, 400, "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5\u7684 JSON");
    if (error instanceof ReviewError) return fail(res, error.code === "bad-request" || error.code === "too-large" ? 400 : 409, error.message);
    return fail(res, 500, error instanceof Error ? error.message : String(error));
  }
}

// src/service.ts
import { randomUUID } from "node:crypto";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

// src/files.ts
import { lstat as lstat2, open as open2, stat as stat2 } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute as isAbsolute2, resolve as resolve2 } from "node:path";

// src/transcript.ts
function obj(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const raw of content) {
    const block = obj(raw);
    if (block === void 0) continue;
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
    else if (block.type === "image") parts.push("[\u56FE\u7247]");
    else if (block.type === "file") {
      const attachment = obj(block.attachment);
      const name2 = typeof attachment?.name === "string" ? attachment.name : "\u9644\u4EF6";
      parts.push(`[\u6587\u4EF6 ${name2}]`);
    }
  }
  return parts.join("\n");
}
function endReasonOf(data) {
  const reason = obj(data?.reason);
  const kind = typeof reason?.kind === "string" ? reason.kind : void 0;
  if (kind === void 0 || kind === "success" || kind === "completed" || kind === "stop" || kind === "done") return void 0;
  return kind;
}
function turnsOf(events) {
  const turns = [];
  let open3;
  const calls = /* @__PURE__ */ new Map();
  const ensure = (turn, event) => {
    if (open3 !== void 0 && open3.turn === turn) return open3;
    open3 = { index: 0, turn, startSeq: event.seq, startedAt: event.time, items: [] };
    turns.push(open3);
    return open3;
  };
  for (const event of events) {
    const data = obj(event.data);
    switch (event.type) {
      case "turn/start": {
        const turn = typeof data?.turn === "number" ? data.turn : (open3?.turn ?? 0) + 1;
        open3 = { index: 0, turn, startSeq: event.seq, startedAt: event.time, items: [] };
        turns.push(open3);
        break;
      }
      case "turn/end": {
        const turn = typeof data?.turn === "number" ? data.turn : open3?.turn;
        const target = turns.findLast((item) => item.turn === turn) ?? open3;
        if (target !== void 0) {
          target.endedAt = event.time;
          const reason = endReasonOf(data);
          if (reason !== void 0) target.endReason = reason;
        }
        break;
      }
      case "user/message": {
        const target = open3 ?? ensure(0, event);
        const source = obj(data?.source);
        const kind = typeof source?.kind === "string" ? source.kind : "user";
        const text = textOf(data?.content);
        if (text.trim() === "") break;
        target.items.push(kind === "user" ? { kind: "user", text } : { kind: "user", text, context: kind });
        break;
      }
      case "assistant/message": {
        const turn = typeof data?.turn === "number" ? data.turn : open3?.turn ?? 0;
        const step = typeof data?.step === "number" ? data.step : 0;
        const message = obj(data?.message);
        const text = textOf(message?.content).trim();
        if (text === "") break;
        ensure(turn, event).items.push({ kind: "assistant", step, text, ...data?.interrupted === true ? { interrupted: true } : {} });
        break;
      }
      case "tool/call": {
        const turn = typeof data?.turn === "number" ? data.turn : open3?.turn ?? 0;
        const item = {
          kind: "tool",
          step: typeof data?.step === "number" ? data.step : 0,
          callId: String(data?.callId ?? ""),
          name: typeof data?.name === "string" ? data.name : "?",
          args: typeof data?.arguments === "string" ? data.arguments : JSON.stringify(data?.arguments ?? "")
        };
        ensure(turn, event).items.push(item);
        calls.set(item.callId, item);
        break;
      }
      case "tool/result": {
        const message = obj(data?.message);
        const callId = String(message?.toolCallId ?? "");
        const item = calls.get(callId);
        if (item === void 0) break;
        item.result = textOf(message?.content);
        const error = obj(data?.error);
        if (message?.isError === true || error !== void 0) item.isError = true;
        if (error !== void 0 && typeof error.reason === "string" && item.result.trim() === "") item.result = error.reason;
        break;
      }
      default:
        break;
    }
  }
  const kept = turns.filter((turn) => turn.items.length > 0);
  kept.forEach((turn, position) => {
    turn.index = position + 1;
  });
  return kept;
}
function selectTurns(turns, scope) {
  if (turns.length === 0) return { selected: [], before: [] };
  if (scope.kind === "all") return { selected: [...turns], before: [] };
  if (scope.kind === "last") return { selected: [turns[turns.length - 1]], before: turns.slice(0, -1) };
  const from = Math.max(1, Math.min(scope.from, scope.to));
  const to = Math.min(turns.length, Math.max(scope.from, scope.to));
  return { selected: turns.filter((turn) => turn.index >= from && turn.index <= to), before: turns.filter((turn) => turn.index < from) };
}
function clip(text, limit) {
  if (text.length <= limit) return text;
  if (limit < 40) return text.slice(0, limit) + "\u2026";
  const head = Math.ceil(limit * 0.6);
  const tail = limit - head;
  return `${text.slice(0, head)}
\u2026\uFF08\u7701\u7565 ${text.length - head - tail} \u5B57\uFF09\u2026
${text.slice(text.length - tail)}`;
}
var LEVELS = [
  { user: 6e3, assistant: 6e3, args: 1200, result: 2500 },
  { user: 3e3, assistant: 2e3, args: 500, result: 800 },
  { user: 1200, assistant: 600, args: 200, result: 200 },
  { user: 600, assistant: 200, args: 100, result: 0 }
];
function oneLine(text) {
  return text.replace(/\s+/g, " ").trim();
}
function renderTurn(turn, level = 0) {
  const limits = LEVELS[Math.min(level, LEVELS.length - 1)];
  const lines = [`## \u7B2C ${turn.index} \u8F6E${turn.endReason !== void 0 ? `\uFF08\u7ED3\u675F\u539F\u56E0\uFF1A${turn.endReason}\uFF09` : turn.endedAt === void 0 ? "\uFF08\u8FDB\u884C\u4E2D\uFF09" : ""}`];
  const lastAssistant = turn.items.findLastIndex((item) => item.kind === "assistant");
  turn.items.forEach((item, position) => {
    if (item.kind === "user") {
      if (item.context !== void 0) lines.push(`[\u6CE8\u5165\u7684\u4E0A\u4E0B\u6587 \xB7 ${item.context}] ${clip(oneLine(item.text), Math.min(400, limits.user))}`);
      else lines.push(`[\u7528\u6237] ${clip(item.text, limits.user)}`);
    } else if (item.kind === "assistant") {
      const limit = position === lastAssistant ? Math.max(limits.assistant, 1500) : limits.assistant;
      lines.push(`[\u52A9\u624B \xB7 \u7B2C ${item.step} \u6B65${item.interrupted === true ? " \xB7 \u88AB\u6253\u65AD" : ""}] ${clip(item.text, limit)}`);
    } else {
      const status = item.result === void 0 ? "\uFF08\u65E0\u7ED3\u679C\uFF09" : item.isError === true ? "\uFF08\u5931\u8D25\uFF09" : "";
      const head = `[\u5DE5\u5177 \xB7 \u7B2C ${item.step} \u6B65] ${item.name} ${clip(oneLine(item.args), limits.args)}${status}`;
      if (limits.result === 0 || item.result === void 0) lines.push(head);
      else lines.push(`${head}
  \u2192 ${clip(item.result, limits.result).replace(/\n/g, "\n    ")}`);
    }
  });
  return lines.join("\n");
}
function renderBackground(before, limit = 4e3) {
  const asks = [];
  for (const turn of before) {
    for (const item of turn.items) {
      if (item.kind === "user" && item.context === void 0) asks.push(`\u7B2C ${turn.index} \u8F6E\uFF1A${clip(oneLine(item.text), 500)}`);
    }
  }
  if (asks.length === 0) return "";
  const picked = asks.length <= 8 ? asks : [asks[0], "\u2026", ...asks.slice(-6)];
  return clip(picked.join("\n"), limit);
}
function fitTurns(turns, budget) {
  const levels = turns.map(() => 0);
  const render = () => turns.map((turn, position) => renderTurn(turn, levels[position]));
  let parts = render();
  const total = () => parts.reduce((sum, part) => sum + part.length + 2, 0);
  for (let level = 1; level < LEVELS.length && total() > budget; level++) {
    for (let position = 0; position < turns.length && total() > budget; position++) {
      if (position === turns.length - 1 && turns.length > 1 && level > 1) break;
      levels[position] = level;
      parts[position] = renderTurn(turns[position], level);
    }
  }
  let dropped = 0;
  while (total() > budget && parts.length - dropped > 1) {
    parts[dropped] = "";
    dropped += 1;
  }
  if (dropped > 0) parts[0] = `\uFF08\u8F83\u65E9\u7684 ${dropped} \u8F6E\u8D85\u51FA\u7BC7\u5E45\uFF0C\u672A\u5305\u542B\uFF09`;
  parts = parts.filter((part) => part !== "");
  let text = parts.join("\n\n");
  if (text.length > budget) text = clip(text, budget);
  return { text, squeezed: levels.filter((level) => level > 0).length, dropped };
}

// src/files.ts
var WRITERS = /write|edit|create|patch|replace|notebook|str_replace|apply|save|insert/i;
var PATH_KEYS = ["file_path", "filePath", "path", "target_file", "targetFile", "notebook_path", "filename", "file"];
function pathsOfArgs(name2, raw) {
  if (!WRITERS.test(name2)) return [];
  let args;
  try {
    args = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof args !== "object" || args === null) return [];
  const record = args;
  const out = [];
  for (const key of PATH_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "" && value.length < 1e3) out.push(value.trim());
  }
  for (const value of Object.values(record)) {
    if (typeof value !== "string") continue;
    for (const match of value.matchAll(/^\*\*\* (?:Update|Add) File: (.+)$/gm)) out.push(match[1].trim());
  }
  return out;
}
function touchedFiles(turns, cwd, limit = 30) {
  const seen = /* @__PURE__ */ new Map();
  let order = 0;
  for (const turn of turns) {
    for (const item of turn.items) {
      if (item.kind !== "tool" || item.isError === true) continue;
      for (const path of pathsOfArgs(item.name, item.args)) {
        const full = isAbsolute2(path) ? resolve2(path) : cwd !== void 0 ? resolve2(cwd, path) : void 0;
        if (full === void 0) continue;
        seen.delete(full);
        seen.set(full, order++);
      }
    }
  }
  return [...seen.keys()].slice(-limit);
}
async function filesSection(paths, budget = 6e4, perFile = 14e3) {
  if (paths.length === 0) return { text: "\uFF08\u8FD9\u51E0\u8F6E\u6CA1\u6709\u627E\u5230\u6267\u884C\u8005\u5199\u6587\u4EF6\u7684\u5DE5\u5177\u8C03\u7528\uFF09", shown: [], notes: [] };
  const parts = [];
  const shown = [];
  const notes = [];
  let used = 0;
  for (const path of [...paths].reverse()) {
    if (looksSecret(path)) {
      parts.push(`## ${path}
\uFF08\u53EF\u80FD\u542B\u5BC6\u94A5\uFF0C\u4E0D\u8BFB\u53D6\uFF09`);
      continue;
    }
    const info = await stat2(path).catch(() => void 0);
    if (info === void 0) {
      parts.push(`## ${path}
\uFF08\u6587\u4EF6\u73B0\u5728\u4E0D\u5B58\u5728\uFF1A\u53EF\u80FD\u88AB\u5220\u9664\u6216\u79FB\u52A8\u4E86\uFF09`);
      continue;
    }
    if (!info.isFile()) continue;
    if (info.size > 2e6) {
      parts.push(`## ${path}
\uFF08\u6587\u4EF6\u592A\u5927\uFF1A${info.size} \u5B57\u8282\uFF0C\u672A\u8BFB\u53D6\uFF09`);
      continue;
    }
    const buffer = await open2(path, "r").then(async (handle) => {
      try {
        return await handle.readFile();
      } finally {
        await handle.close();
      }
    }).catch(() => void 0);
    if (buffer === void 0) continue;
    if (buffer.subarray(0, 8e3).includes(0)) {
      parts.push(`## ${path}
\uFF08\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF0C${info.size} \u5B57\u8282\uFF09`);
      continue;
    }
    const room = Math.min(perFile, budget - used);
    if (room < 400) {
      notes.push(`\u6587\u4EF6\u8F83\u591A\uFF0C\u8FD8\u6709 ${paths.length - shown.length} \u4E2A\u6587\u4EF6\u6CA1\u6709\u9644\u4E0A\u5185\u5BB9\uFF08\u6DF1\u5165\u6A21\u5F0F\u4E0B\u5BA1\u67E5\u6A21\u578B\u53EF\u4EE5\u81EA\u5DF1\u53BB\u8BFB\uFF09`);
      break;
    }
    const text = clip(buffer.toString("utf8"), room);
    used += text.length;
    shown.push(path);
    parts.push(`## ${path}
\`\`\`
${text}
\`\`\``);
  }
  return { text: parts.join("\n\n"), shown, notes };
}
async function gitTop(dir) {
  let current = resolve2(dir);
  for (; ; ) {
    if (await lstat2(resolve2(current, ".git")).then(() => true, () => false)) return current;
    const parent = dirname(current);
    if (parent === current) return void 0;
    current = parent;
  }
}
async function reviewRoots(cwd, files) {
  const roots = [];
  const home = homedir();
  const allowed = (dir) => !(dir === "/" || dir === home || home.startsWith(dir + "/") || dir.split("/").length < 4);
  const add = (dir) => {
    if (dir === void 0 || !allowed(dir)) return;
    if (roots.some((root) => dir === root || dir.startsWith(root + "/"))) return;
    for (let i = roots.length - 1; i >= 0; i--) if (roots[i].startsWith(dir + "/")) roots.splice(i, 1);
    roots.push(dir);
  };
  const top = async (dir) => {
    const repo = await gitTop(dir);
    return repo !== void 0 && allowed(repo) ? repo : dir;
  };
  if (cwd !== void 0) add(await top(cwd));
  const dirs = [...new Set(files.map((file) => dirname(file)))];
  for (const dir of dirs) {
    const exists = await stat2(dir).then((info) => info.isDirectory()).catch(() => false);
    if (!exists) continue;
    add(await top(dir));
  }
  return roots.slice(0, 8);
}

// src/parse.ts
var VERDICTS = ["pass", "doubt", "fail"];
var SEVERITIES = ["high", "medium", "low"];
var CATEGORIES = FINDING_CATEGORIES;
function candidates(text) {
  const out = [];
  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) out.push(match[1].trim());
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) out.push(text.slice(start, i + 1));
    }
  }
  return out.sort((a, b) => b.length - a.length);
}
function str(value, limit = 2e3) {
  if (typeof value === "string") return value.trim().slice(0, limit);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function pick(value, allowed, fallback, aliases = {}) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (allowed.includes(text)) return text;
  return aliases[text] ?? fallback;
}
function finding(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const item = raw;
  const title = str(item.title, 300) || str(item.detail, 120);
  if (title === "") return void 0;
  return {
    severity: pick(item.severity, SEVERITIES, "medium", { critical: "high", major: "high", minor: "low", info: "low", \u4E25\u91CD: "high", \u4E2D\u7B49: "medium", \u8F7B\u5FAE: "low" }),
    category: pick(item.category, CATEGORIES, "other"),
    title,
    detail: str(item.detail),
    evidence: str(item.evidence, 600),
    suggestion: str(item.suggestion, 1e3)
  };
}
function impliedVerdict(findings) {
  if (findings.some((item) => item.severity === "high")) return "fail";
  if (findings.some((item) => item.severity === "medium")) return "doubt";
  return findings.length > 0 ? "doubt" : "pass";
}
function salvageCandidates(text, attempts = 60) {
  const start = text.indexOf("{");
  if (start < 0) return [];
  const cuts = [];
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') {
        inString = false;
        cuts.push({ at: i + 1, closers: [...stack].reverse().join("") });
      }
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 0) break;
      cuts.push({ at: i + 1, closers: [...stack].reverse().join("") });
    }
  }
  return cuts.slice(-attempts).reverse().map((cut) => text.slice(start, cut.at).replace(/,\s*$/, "") + cut.closers);
}
function fromRecord(record) {
  if (!("verdict" in record) && !("findings" in record) && !("summary" in record)) return void 0;
  const findings = Array.isArray(record.findings) ? record.findings.map(finding).filter((item) => item !== void 0).slice(0, 40) : [];
  const verdict = "verdict" in record ? pick(record.verdict, VERDICTS, impliedVerdict(findings), { ok: "pass", passed: "pass", warn: "doubt", warning: "doubt", failed: "fail", \u901A\u8FC7: "pass", \u6709\u7591\u95EE: "doubt", \u6709\u95EE\u9898: "fail" }) : impliedVerdict(findings);
  const checked = Array.isArray(record.checked) ? record.checked.map((item) => str(item, 300)).filter((item) => item !== "").slice(0, 30) : [];
  return { verdict, summary: str(record.summary, 1e3), findings, checked };
}
function parseReview(text) {
  const whole = parseWhole(text);
  if (whole !== void 0) return whole;
  for (const candidate of salvageCandidates(text)) {
    try {
      const value = JSON.parse(candidate);
      if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
      const parsed = fromRecord(value);
      if (parsed !== void 0 && (parsed.summary !== "" || parsed.findings.length > 0)) return { ...parsed, partial: true };
    } catch {
    }
  }
  return void 0;
}
function parseWhole(text) {
  for (const candidate of candidates(text)) {
    let value;
    try {
      value = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const parsed = fromRecord(value);
    if (parsed !== void 0) return parsed;
  }
  return void 0;
}

// src/shared/message.ts
function findingText(finding2, index) {
  const lines = [`${index}. \uFF08${SEVERITY_LABELS[finding2.severity]} \xB7 ${CATEGORY_LABELS[finding2.category]}\uFF09${finding2.title}`];
  if (finding2.detail !== "") lines.push(`   ${finding2.detail.replace(/\n/g, "\n   ")}`);
  if (finding2.evidence !== "") lines.push(`   \u8BC1\u636E\uFF1A${finding2.evidence}`);
  if (finding2.suggestion !== "") lines.push(`   \u5EFA\u8BAE\uFF1A${finding2.suggestion}`);
  return lines.join("\n");
}
function openFindings(report) {
  return report.findings.filter((item) => item.dismissed !== true);
}
function messageFor(report, findings, loop) {
  const range = report.turns.from === report.turns.to ? `\u7B2C ${report.turns.from} \u8F6E` : `\u7B2C ${report.turns.from}\u2013${report.turns.to} \u8F6E`;
  const who = `\u53E6\u4E00\u4E2A\u6A21\u578B\uFF08${report.model}\uFF09`;
  const head = loop !== void 0 ? `\u3010\u8FDE\u7EED\u5BA1\u67E5 \xB7 \u7B2C ${loop.round}/${loop.max} \u8F6E\u3011${who}\u5BA1\u67E5\u4E86${range}\u7684\u5DE5\u4F5C\uFF0C${findings.length === 1 ? "\u8FD8\u6709\u4E0B\u9762\u8FD9\u4E2A\u95EE\u9898" : `\u8FD8\u6709\u4E0B\u9762 ${findings.length} \u4E2A\u95EE\u9898`}\uFF1A` : `\u3010\u4EFB\u52A1\u5BA1\u67E5\u3011${who}\u5BA1\u67E5\u4E86${range}\u7684\u5DE5\u4F5C\uFF0C${findings.length === 1 ? "\u53D1\u73B0\u4E0B\u9762\u8FD9\u4E2A\u95EE\u9898" : `\u53D1\u73B0\u4E0B\u9762 ${findings.length} \u4E2A\u95EE\u9898`}\uFF1A`;
  const body = findings.map((finding2, i) => findingText(finding2, i + 1)).join("\n\n");
  const tail = loop !== void 0 ? "\u8BF7\u9010\u6761\u6838\u5B9E\uFF1A\u786E\u5B9E\u5B58\u5728\u7684\u8BF7\u76F4\u63A5\u4FEE\u6B63\uFF1B\u4F60\u8BA4\u4E3A\u4E0D\u6210\u7ACB\u7684\uFF0C\u8BF4\u660E\u7406\u7531\u3002\u9700\u8981\u8FD0\u884C\u547D\u4EE4\u6838\u5B9E\u7684\uFF08\u6D4B\u8BD5\u3001\u6784\u5EFA\u3001git diff \u7B49\uFF09\u8BF7\u4F60\u6765\u8FD0\u884C\u5E76\u8D34\u51FA\u7ED3\u679C\uFF0C\u5BA1\u67E5\u53EA\u8BFB\u3001\u4E0D\u8FD0\u884C\u547D\u4EE4\u3002\u6539\u5B8C\u540E\u7B80\u8981\u8BF4\u660E\u6539\u4E86\u4EC0\u4E48\uFF0C\u5BA1\u67E5\u4F1A\u81EA\u52A8\u518D\u770B\u4E00\u904D\u3002" : "\u8BF7\u9010\u6761\u6838\u5B9E\uFF1A\u786E\u5B9E\u5B58\u5728\u7684\u8BF7\u4FEE\u6B63\uFF1B\u4F60\u8BA4\u4E3A\u4E0D\u6210\u7ACB\u7684\uFF0C\u8BF4\u660E\u7406\u7531\u3002\u9700\u8981\u8FD0\u884C\u547D\u4EE4\u6838\u5B9E\u7684\uFF08\u6D4B\u8BD5\u3001\u6784\u5EFA\u3001git diff \u7B49\uFF09\u8BF7\u4F60\u6765\u8FD0\u884C\u5E76\u8D34\u51FA\u7ED3\u679C\uFF0C\u5BA1\u67E5\u53EA\u8BFB\u3001\u4E0D\u8FD0\u884C\u547D\u4EE4\u3002";
  return `${head}

${body}

${tail}`;
}

// src/store.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
var MAX_REPORTS = 100;
var MAX_PROMPTS = 30;
var MAX_PROMPT_CHARS = 2e4;
function defaultStoreDir() {
  return process.env.DSH_SIDER_TASK_REVIEWER_DIR ?? join2(homedir2(), ".dsh", "sider-task-reviewer");
}
var DEFAULT_SETTINGS = { live: false, depth: "quick", scope: { kind: "last" }, content: "both", loopRounds: 5 };
function routeOf2(value) {
  if (typeof value !== "object" || value === null) return void 0;
  const route = value;
  if (typeof route.provider !== "string" || typeof route.model !== "string" || route.provider === "" || route.model === "") return void 0;
  return { provider: route.provider, model: route.model, ...typeof route.effort === "string" && route.effort !== "" ? { effort: route.effort } : {} };
}
function scopeOf2(value) {
  const scope = typeof value === "object" && value !== null ? value : {};
  if (scope.kind === "all") return { kind: "all" };
  if (scope.kind === "range" && Number.isFinite(scope.from) && Number.isFinite(scope.to)) return { kind: "range", from: Math.max(1, Math.floor(scope.from)), to: Math.max(1, Math.floor(scope.to)) };
  return { kind: "last" };
}
function clampRounds(value) {
  const rounds = Math.floor(Number(value));
  return Number.isFinite(rounds) ? Math.min(20, Math.max(1, rounds)) : DEFAULT_SETTINGS.loopRounds;
}
function sanitizeSettings(value) {
  const settings = typeof value === "object" && value !== null ? value : {};
  const route = routeOf2(settings.route);
  return {
    live: settings.live === true,
    depth: settings.depth === "deep" ? "deep" : "quick",
    scope: scopeOf2(settings.scope),
    content: settings.content === "conversation" || settings.content === "files" ? settings.content : "both",
    loopRounds: settings.loopRounds === void 0 ? DEFAULT_SETTINGS.loopRounds : clampRounds(settings.loopRounds),
    ...route !== void 0 ? { route } : {}
  };
}
function sanitizeGlobal(value) {
  const record = typeof value === "object" && value !== null ? value : {};
  return {
    liveTrigger: record.liveTrigger === "step" ? "step" : "turn",
    activePromptId: typeof record.activePromptId === "string" && record.activePromptId !== "" ? record.activePromptId : BUILTIN_PROMPT_ID
  };
}
function reviewOf(raw) {
  const review = sanitizeSettings(raw?.review);
  const legacy = routeOf2(raw?.route);
  return review.route === void 0 && legacy !== void 0 ? { ...review, route: legacy } : review;
}
function sanitizePrompts(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw;
    if (typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,60}$/.test(item.id) || typeof item.text !== "string") continue;
    const name2 = typeof item.name === "string" && item.name.trim() !== "" ? item.name.trim().slice(0, 40) : "\u672A\u547D\u540D";
    out.push({ id: item.id, name: name2, text: item.text.slice(0, MAX_PROMPT_CHARS) });
    if (out.length >= MAX_PROMPTS) break;
  }
  return out;
}
function sanitize(value) {
  const record = typeof value === "object" && value !== null ? value : {};
  return {
    version: 1,
    settings: sanitizeSettings(record.settings),
    reports: Array.isArray(record.reports) ? record.reports.filter((item) => typeof item === "object" && item !== null && typeof item.id === "string").slice(0, MAX_REPORTS) : []
  };
}
function fileNameOf(sessionId) {
  return sessionId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) + ".json";
}
function makeStore(io) {
  const cache = /* @__PURE__ */ new Map();
  const queues = /* @__PURE__ */ new Map();
  let global;
  const serial = (key, task) => {
    const before = queues.get(key) ?? Promise.resolve();
    const next = before.then(task, task);
    queues.set(key, next.catch(() => void 0));
    return next;
  };
  const read = async (sessionId) => {
    const known = cache.get(sessionId);
    if (known !== void 0) return known;
    const file = sanitize(await io.read(`sessions/${fileNameOf(sessionId)}`));
    cache.set(sessionId, file);
    return file;
  };
  const write = async (sessionId, file) => {
    await io.write(`sessions/${fileNameOf(sessionId)}`, file);
    cache.set(sessionId, file);
  };
  const readGlobal = async () => {
    if (global !== void 0) return global;
    const raw = await io.read("settings.json");
    global = { settings: sanitizeGlobal(raw), review: reviewOf(raw), prompts: sanitizePrompts(raw?.prompts) };
    return global;
  };
  const writeGlobal = async (next) => {
    await io.write("settings.json", { ...next.settings, review: next.review, prompts: next.prompts });
    global = next;
  };
  return {
    loadGlobal: () => serial("", async () => (await readGlobal()).settings),
    saveGlobal: (settings) => serial("", async () => {
      const next = { ...await readGlobal(), settings: sanitizeGlobal(settings) };
      await writeGlobal(next);
      return next.settings;
    }),
    loadReview: () => serial("", async () => (await readGlobal()).review),
    saveReview: (settings) => serial("", async () => {
      const next = { ...await readGlobal(), review: sanitizeSettings(settings) };
      await writeGlobal(next);
      return next.review;
    }),
    loadPrompts: () => serial("", async () => (await readGlobal()).prompts),
    savePrompts: (prompts) => serial("", async () => {
      const next = { ...await readGlobal(), prompts: sanitizePrompts(prompts) };
      await writeGlobal(next);
      return next.prompts;
    }),
    load: (sessionId) => serial(sessionId, () => read(sessionId)),
    saveSettings: (sessionId, settings) => serial(sessionId, async () => {
      const file = { ...await read(sessionId), settings: sanitizeSettings(settings) };
      await write(sessionId, file);
      return file;
    }),
    addReport: (report) => serial(report.sessionId, async () => {
      const current = await read(report.sessionId);
      const file = { ...current, reports: [report, ...current.reports.filter((item) => item.id !== report.id)].slice(0, MAX_REPORTS) };
      await write(report.sessionId, file);
      return file;
    }),
    updateReport: (sessionId, id, change) => serial(sessionId, async () => {
      const current = await read(sessionId);
      const found = current.reports.find((item) => item.id === id);
      if (found === void 0) return void 0;
      const next = change(found);
      await write(sessionId, { ...current, reports: current.reports.map((item) => item.id === id ? next : item) });
      return next;
    }),
    removeReport: (sessionId, id) => serial(sessionId, async () => {
      const current = await read(sessionId);
      if (!current.reports.some((item) => item.id === id)) return false;
      await write(sessionId, { ...current, reports: current.reports.filter((item) => item.id !== id) });
      return true;
    })
  };
}
function createFileStore(dir = defaultStoreDir()) {
  return makeStore({
    read: async (name2) => {
      try {
        return JSON.parse(await readFile(join2(dir, name2), "utf8"));
      } catch {
        return void 0;
      }
    },
    write: async (name2, value) => {
      const target = join2(dir, name2);
      await mkdir(join2(target, ".."), { recursive: true });
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temp, JSON.stringify(value, null, 1), "utf8");
      await rename(temp, target);
    }
  });
}
function reportMarkdown(report, labels) {
  const lines = [
    `# \u4EFB\u52A1\u5BA1\u67E5\u62A5\u544A \xB7 ${labels.verdict[report.verdict] ?? report.verdict}`,
    "",
    `- \u65F6\u95F4\uFF1A${new Date(report.createdAt).toLocaleString("zh-CN", { hour12: false })}`,
    `- \u8303\u56F4\uFF1A${labels.scope}\uFF08\u7B2C ${report.turns.from}\u2013${report.turns.to} \u8F6E\uFF09 \xB7 ${labels.content[report.content] ?? report.content}`,
    `- \u5BA1\u67E5\u6A21\u578B\uFF1A${report.provider} / ${report.model}${report.effort !== void 0 ? `\uFF08\u601D\u8003\u5F3A\u5EA6 ${report.effort}\uFF09` : ""}`,
    `- \u63D0\u793A\u8BCD\uFF1A${report.promptName}`,
    `- \u6DF1\u5EA6\uFF1A${report.usedDepth === "deep" ? "\u6DF1\u5165\uFF08\u67E5\u770B\u4E86\u6587\u4EF6\uFF09" : "\u5FEB\u901F"}${report.trigger === "live" ? " \xB7 \u5B9E\u65F6\u5BA1\u67E5" : ""}${report.loop !== void 0 ? ` \xB7 \u8FDE\u7EED\u5BA1\u67E5\u7B2C ${report.loop.round}/${report.loop.max} \u8F6E` : ""}`,
    `- \u4F1A\u8BDD\uFF1A${report.sessionId}`,
    "",
    "## \u7ED3\u8BBA",
    "",
    report.summary || "\uFF08\u65E0\uFF09"
  ];
  const open3 = report.findings.filter((item) => item.dismissed !== true);
  if (open3.length > 0) {
    lines.push("", "## \u53D1\u73B0\u7684\u95EE\u9898", "");
    open3.forEach((item, i) => {
      lines.push(`### ${i + 1}. [${labels.severity[item.severity] ?? item.severity} \xB7 ${labels.category[item.category] ?? item.category}] ${item.title}`, "");
      if (item.detail !== "") lines.push(item.detail, "");
      if (item.evidence !== "") lines.push(`- \u8BC1\u636E\uFF1A${item.evidence}`);
      if (item.suggestion !== "") lines.push(`- \u5EFA\u8BAE\uFF1A${item.suggestion}`);
      lines.push("");
    });
  }
  if (report.checked.length > 0) lines.push("", "## \u6838\u5BF9\u8FC7\u3001\u6CA1\u6709\u95EE\u9898", "", ...report.checked.map((item) => `- ${item}`));
  if (report.files !== void 0 && report.files.length > 0) lines.push("", "## \u5BA1\u67E5\u7684\u6587\u4EF6", "", ...report.files.map((item) => `- ${item}`));
  if (report.tools.length > 0) lines.push("", "## \u5BA1\u67E5\u65F6\u67E5\u770B\u4E86", "", ...report.tools.map((item) => `- ${item.name} ${item.target}${item.ok ? "" : "\uFF08\u5931\u8D25\uFF09"}`));
  if (report.notes.length > 0) lines.push("", "## \u5907\u6CE8", "", ...report.notes.map((item) => `- ${item}`));
  if (report.raw !== void 0) lines.push("", "## \u5BA1\u67E5\u6A21\u578B\u539F\u6587", "", "```", report.raw, "```");
  return lines.join("\n") + "\n";
}

// src/service.ts
var DEFAULT_CONFIG = {
  maxTranscriptChars: 12e4,
  maxToolCalls: 12,
  maxTokens: 16e3,
  timeoutMs: 3e5,
  deepTimeoutMs: 6e5,
  liveDebounceMs: 6e3,
  liveMinGapMs: 45e3,
  loopWaitMs: 45 * 6e4,
  loopSettleMs: 1500
};
function isBuiltin(id) {
  return BUILTIN_PROMPTS.some((item) => item.id === id);
}
var ACTIVE_LOOP = /* @__PURE__ */ new Set(["reviewing", "sending", "waiting"]);
function routeOf3(value) {
  if (value === void 0 || typeof value.provider !== "string" || typeof value.model !== "string" || value.provider === "" || value.model === "") return void 0;
  return { provider: value.provider, model: value.model };
}
function findingsDigest(report) {
  const open3 = openFindings(report);
  if (open3.length === 0) return report.summary;
  return open3.map((item, i) => `${i + 1}. [${item.severity}] ${item.title}${item.evidence !== "" ? `\uFF08${item.evidence}\uFF09` : ""}${item.suggestion !== "" ? ` \u2014\u2014 \u5EFA\u8BAE\uFF1A${item.suggestion}` : ""}`).join("\n");
}
var ReviewService = class {
  constructor(faces, store, config = DEFAULT_CONFIG) {
    this.faces = faces;
    this.store = store;
    this.config = config;
  }
  jobs = /* @__PURE__ */ new Map();
  watches = /* @__PURE__ */ new Map();
  loops = /* @__PURE__ */ new Map();
  errors = /* @__PURE__ */ new Map();
  effortCache = /* @__PURE__ */ new Map();
  /** Session events seen per conversation (diagnostics: shows whether live review can hear anything). */
  heard = /* @__PURE__ */ new Map();
  disposed = false;
  updateConfig(config) {
    this.config = config;
  }
  // ---------------------------------------------------------------- models
  /** The working model of a conversation, from its last request header. */
  sessionRoute(sessionId) {
    try {
      return routeOf3(this.faces.session(sessionId)?.requestHeader?.()?.config);
    } catch {
      return void 0;
    }
  }
  /** The reviewer route: the one asked for, the panel's choice (shared by every conversation), the harness default, the conversation's own. */
  async routeFor(sessionId, picked) {
    if (picked !== void 0) return { ...picked, from: "settings" };
    const chosen = (await this.store.loadReview()).route ?? this.config.route;
    if (chosen !== void 0) return { ...chosen, from: "settings" };
    const harness = this.faces.defaultRoute();
    if (harness !== void 0) return { ...harness, from: "harness" };
    const own = this.sessionRoute(sessionId);
    return own !== void 0 ? { ...own, from: "conversation" } : void 0;
  }
  async catalog() {
    const llm = this.faces.llm();
    const fallback = this.config.route ?? this.faces.defaultRoute();
    if (llm?.listProviders === void 0 || llm.listModels === void 0) return { groups: [], ...fallback !== void 0 ? { fallback } : {} };
    const providers = llm.listProviders();
    const groups = await Promise.all(
      providers.map(async (provider) => {
        try {
          const models = await llm.listModels(provider.id);
          return { id: provider.id, name: provider.name !== void 0 && provider.name !== "" ? provider.name : provider.id, models: models.map((model) => ({ id: model.id, name: model.name || model.id })) };
        } catch {
          return void 0;
        }
      })
    );
    return { groups: groups.filter((group) => group !== void 0 && group.models.length > 0), ...fallback !== void 0 ? { fallback } : {} };
  }
  /** The reasoning efforts a model offers (empty when it has none or the host cannot say). */
  efforts(provider, model) {
    const key = `${provider}\0${model}`;
    const known = this.effortCache.get(key);
    if (known !== void 0) return known;
    const llm = this.faces.llm();
    const value = (async () => {
      if (typeof llm?.resolveModelInfo !== "function") return { efforts: [] };
      try {
        const info = await llm.resolveModelInfo(provider, model);
        const efforts = (info.reasoning?.efforts ?? []).filter((item) => typeof item.id === "string").map((item) => ({ id: item.id, name: item.name || item.id, ...item.description !== void 0 ? { description: item.description } : {} }));
        return { efforts, ...typeof info.reasoning?.defaultEffort === "string" ? { defaultEffort: info.reasoning.defaultEffort } : {} };
      } catch {
        return { efforts: [] };
      }
    })();
    this.effortCache.set(key, value);
    setTimeout(() => this.effortCache.delete(key), 10 * 6e4).unref?.();
    return value;
  }
  // ---------------------------------------------------------------- prompts
  /** The built-in prompts (as edited, where they were) and the user's own. */
  async prompts() {
    const stored = await this.store.loadPrompts();
    const builtins = BUILTIN_PROMPTS.map((builtin) => {
      const edited = stored.find((item) => item.id === builtin.id);
      return edited !== void 0 ? { ...builtin, name: edited.name, text: edited.text, edited: true } : builtin;
    });
    return [...builtins, ...stored.filter((item) => !isBuiltin(item.id))];
  }
  async promptFor(id) {
    const all = await this.prompts();
    return all.find((item) => item.id === id) ?? all[0];
  }
  /** Save a prompt: edit an existing one (the built-in one included) or add a new one (no id). */
  async savePrompt(input) {
    const name2 = input.name.trim().slice(0, 40);
    const text = input.text.slice(0, MAX_PROMPT_CHARS);
    if (name2 === "") throw new ReviewError("\u63D0\u793A\u8BCD\u9700\u8981\u4E00\u4E2A\u540D\u5B57", "bad-request");
    if (text.trim() === "") throw new ReviewError("\u63D0\u793A\u8BCD\u4E0D\u80FD\u662F\u7A7A\u7684", "bad-request");
    const stored = await this.store.loadPrompts();
    let id = input.id;
    if (id === void 0 || id === "") {
      if (stored.filter((item) => !isBuiltin(item.id)).length >= MAX_PROMPTS - BUILTIN_PROMPTS.length) throw new ReviewError(`\u6700\u591A ${MAX_PROMPTS - BUILTIN_PROMPTS.length} \u4E2A\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD`, "bad-request");
      id = `p-${randomUUID().slice(0, 8)}`;
      await this.store.savePrompts([...stored, { id, name: name2, text }]);
    } else if (isBuiltin(id) || stored.some((item) => item.id === id)) {
      const next = stored.some((item) => item.id === id) ? stored.map((item) => item.id === id ? { id, name: name2, text } : item) : [...stored, { id, name: name2, text }];
      await this.store.savePrompts(next);
    } else {
      throw new ReviewError("\u6CA1\u6709\u8FD9\u4E2A\u63D0\u793A\u8BCD", "bad-request");
    }
    return { prompts: await this.prompts(), id };
  }
  /** Delete a prompt of the user's; for a built-in one, put back the original. */
  async deletePrompt(id) {
    const stored = await this.store.loadPrompts();
    await this.store.savePrompts(stored.filter((item) => item.id !== id));
    const global = await this.store.loadGlobal();
    if (global.activePromptId === id && !isBuiltin(id)) await this.store.saveGlobal({ ...global, activePromptId: BUILTIN_PROMPT_ID });
    return this.prompts();
  }
  // ---------------------------------------------------------------- settings and state
  /** The loaded conversations, newest activity first (for diagnostics). */
  liveSessions() {
    const ids = this.faces.sessionIds?.() ?? [];
    return ids.map((id) => {
      const session = this.faces.session(id);
      let turns = 0;
      let lastAt;
      try {
        const events = session?.snapshotEvents() ?? [];
        turns = turnsOf(events).length;
        lastAt = events.at(-1)?.time;
      } catch {
        turns = 0;
      }
      const heard = this.heard.get(id);
      return { id, ...session?.header?.cwd !== void 0 ? { cwd: session.header.cwd } : {}, turns, ...lastAt !== void 0 ? { lastAt } : {}, ...heard !== void 0 ? { heard } : {} };
    }).sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  }
  async globalSettings() {
    return this.store.loadGlobal();
  }
  async setGlobal(patch) {
    const current = await this.store.loadGlobal();
    if (patch.activePromptId !== void 0 && !(await this.prompts()).some((item) => item.id === patch.activePromptId)) throw new ReviewError("\u6CA1\u6709\u8FD9\u4E2A\u63D0\u793A\u8BCD", "bad-request");
    return this.store.saveGlobal({ liveTrigger: patch.liveTrigger ?? current.liveTrigger, activePromptId: patch.activePromptId ?? current.activePromptId });
  }
  async state(sessionId) {
    const file = await this.store.load(sessionId);
    const session = this.faces.session(sessionId);
    let turns = 0;
    try {
      turns = session !== void 0 ? turnsOf(session.snapshotEvents()).length : 0;
    } catch {
      turns = 0;
    }
    const job = this.jobs.get(sessionId);
    const error = this.errors.get(sessionId);
    const global = await this.store.loadGlobal();
    const effective = await this.routeFor(sessionId);
    const loop = this.loops.get(sessionId);
    return {
      sessionId,
      global,
      ...effective !== void 0 ? { effectiveRoute: effective } : {},
      live: session !== void 0,
      busy: this.faces.agent(sessionId)?.status === "running",
      turns,
      ...session?.header?.cwd !== void 0 ? { cwd: session.header.cwd } : {},
      settings: await this.store.loadReview(),
      ...job !== void 0 ? { running: { ...job.running, tools: [...job.running.tools] } } : {},
      ...loop !== void 0 ? { loop: { ...loop.state, rounds: loop.state.rounds.map((item) => ({ ...item })) } } : {},
      reports: file.reports,
      ...error !== void 0 ? { error } : {}
    };
  }
  /**
   * Change the review choices. They are shared by every conversation: the
   * conversation id is only where the change came from.
   */
  async setSettings(_sessionId, patch) {
    const current = await this.store.loadReview();
    const next = {
      live: patch.live ?? current.live,
      depth: patch.depth ?? current.depth,
      scope: patch.scope ?? current.scope,
      content: patch.content ?? current.content,
      loopRounds: patch.loopRounds !== void 0 ? clampRounds(patch.loopRounds) : current.loopRounds,
      ...patch.route === null ? {} : patch.route !== void 0 ? { route: patch.route } : current.route !== void 0 ? { route: current.route } : {}
    };
    const saved = await this.store.saveReview(next);
    if (!saved.live) for (const sessionId of [...this.watches.keys()]) this.stopWatch(sessionId);
    return saved;
  }
  // ---------------------------------------------------------------- reviews
  /** Subscribe to a running review's events; returns undefined when none runs. */
  follow(sessionId, listener) {
    const job = this.jobs.get(sessionId);
    if (job === void 0) return void 0;
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }
  cancel(sessionId) {
    const job = this.jobs.get(sessionId);
    if (job === void 0) return false;
    job.controller.abort();
    return true;
  }
  /**
   * Start a review. A manual review replaces a live one that is running; a
   * second manual review of the same conversation is refused.
   * @returns the finished report (rejects with ReviewError).
   */
  async start(request, trigger = "manual", listener, extras = {}) {
    const sessionId = request.session;
    const existing = this.jobs.get(sessionId);
    if (existing !== void 0) {
      if (existing.running.trigger === "live" && trigger !== "live") {
        existing.controller.abort();
        await existing.done.catch(() => void 0);
      } else {
        throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u6B63\u5728\u5BA1\u67E5\u4E2D", "busy");
      }
    }
    const session = this.faces.session(sessionId);
    if (session === void 0) throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\uFF1A\u8BF7\u5148\u5728\u5DE6\u8FB9\u6253\u5F00\u5B83", "not-loaded");
    const llm = this.faces.llm();
    if (llm === void 0) throw new ReviewError("DSH \u7684\u6A21\u578B\u670D\u52A1\u4E0D\u53EF\u7528", "no-llm");
    const found = await this.routeFor(sessionId, request.route);
    if (found === void 0) throw new ReviewError("\u6CA1\u6709\u53EF\u7528\u7684\u5BA1\u67E5\u6A21\u578B\uFF1A\u8BF7\u5728\u9762\u677F\u91CC\u9009\u4E00\u4E2A", "no-route");
    const route = { provider: found.provider, model: found.model, ...found.effort !== void 0 ? { effort: found.effort } : {} };
    const prompt = await this.promptFor(request.promptId ?? (await this.store.loadGlobal()).activePromptId);
    const controller = new AbortController();
    const job = {
      running: { id: randomUUID(), trigger, startedAt: Date.now(), phase: "\u6574\u7406\u5BF9\u8BDD", text: "", tools: [] },
      controller,
      listeners: new Set(listener !== void 0 ? [listener] : []),
      done: Promise.resolve(void 0)
    };
    const emit = (event) => {
      if (event.type === "phase") job.running.phase = event.phase;
      else if (event.type === "delta") job.running.text = (job.running.text + event.text).slice(-4e3);
      else if (event.type === "tool") job.running.tools.push(event.tool);
      for (const each of job.listeners) {
        try {
          each(event);
        } catch {
        }
      }
    };
    job.done = this.execute(sessionId, session, request, route, prompt, trigger, controller, emit, extras);
    this.jobs.set(sessionId, job);
    this.errors.delete(sessionId);
    try {
      const report = await job.done;
      emit({ type: "done", report });
      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!(error instanceof ReviewError && error.code === "cancelled")) this.errors.set(sessionId, message);
      emit({ type: "error", message });
      throw error instanceof ReviewError ? error : new ReviewError(message);
    } finally {
      if (this.jobs.get(sessionId) === job) this.jobs.delete(sessionId);
    }
  }
  async execute(sessionId, session, request, route, prompt, trigger, controller, emit, extras) {
    const started = Date.now();
    const scope = request.scope;
    const content = request.content ?? "both";
    const events = session.snapshotEvents();
    const turns = turnsOf(events);
    if (turns.length === 0) throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u8FD8\u6CA1\u6709\u5185\u5BB9\u53EF\u4EE5\u5BA1\u67E5", "empty");
    const { selected, before } = selectTurns(turns, scope);
    if (selected.length === 0) throw new ReviewError(`\u6CA1\u6709${scopeLabel(scope)}\u53EF\u4EE5\u5BA1\u67E5\uFF08\u5171 ${turns.length} \u8F6E\uFF09`, "empty");
    const notes = [];
    const counts = {};
    const cwd = session.header?.cwd;
    const budget = this.config.maxTranscriptChars;
    const files = content === "conversation" ? [] : [.../* @__PURE__ */ new Set([...extras.extraFiles ?? [], ...touchedFiles(selected, cwd)])];
    let transcript;
    let asks;
    if (content !== "files") {
      const fitted = fitTurns(selected, content === "both" ? Math.floor(budget * 0.65) : budget);
      if (fitted.dropped > 0) notes.push(`\u5BF9\u8BDD\u8FC7\u957F\uFF0C\u8F83\u65E9\u7684 ${fitted.dropped} \u8F6E\u6CA1\u6709\u53D1\u7ED9\u5BA1\u67E5\u6A21\u578B`);
      else if (fitted.squeezed > 0) notes.push(`\u5BF9\u8BDD\u8F83\u957F\uFF0C\u8F83\u65E9\u7684 ${fitted.squeezed} \u8F6E\u505A\u4E86\u538B\u7F29`);
      transcript = fitted.text;
    } else {
      asks = renderBackground(selected, 8e3) || "\uFF08\u8FD9\u51E0\u8F6E\u91CC\u6CA1\u6709\u627E\u5230\u7528\u6237\u7684\u6587\u5B57\u8981\u6C42\uFF09";
    }
    let filesText;
    let shown = [];
    let workspace;
    let roots = [];
    if (content !== "conversation") {
      emit({ type: "phase", phase: "\u8BFB\u53D6\u751F\u6210\u7684\u6587\u4EF6" });
      const section = await filesSection(files, content === "files" ? Math.floor(budget * 0.75) : Math.floor(budget * 0.3));
      filesText = section.text;
      shown = section.shown;
      notes.push(...section.notes);
      roots = await reviewRoots(cwd, files);
      workspace = workspaceOverview(roots);
      if (roots.length > 1) notes.push(`\u67E5\u770B\u4E86 ${roots.length} \u4E2A\u76EE\u5F55\uFF1A${roots.join("\u3001")}`);
    }
    const depth = content === "conversation" ? "quick" : request.depth;
    if (content === "conversation" && request.depth === "deep") notes.push("\u53EA\u770B\u5BF9\u8BDD\u65F6\u4E0D\u67E5\u770B\u6587\u4EF6\uFF0C\u6309\u5FEB\u901F\u6A21\u5F0F\u5BA1\u67E5");
    let previous = extras.previous;
    let previousLabel = extras.previousLabel;
    if (previous === void 0 && trigger === "live") {
      const last = (await this.store.load(sessionId)).reports.find((report2) => report2.trigger === "live" && report2.turns.to === selected[selected.length - 1].index);
      if (last !== void 0) previous = findingsDigest(last);
      previousLabel = void 0;
    }
    const clean = (text) => {
      if (text === void 0) return void 0;
      const cleaned = redact(text);
      addCounts(counts, cleaned.counts);
      return cleaned.text;
    };
    const promptText = userPrompt({
      scopeLabel: `${scopeLabel(scope)}\uFF08\u7B2C ${selected[0].index}\u2013${selected[selected.length - 1].index} \u8F6E\uFF0C\u5171 ${turns.length} \u8F6E\uFF09`,
      background: clean(renderBackground(before)) ?? "",
      ...transcript !== void 0 ? { transcript: clean(transcript) } : {},
      ...asks !== void 0 ? { asks: clean(asks) } : {},
      ...filesText !== void 0 ? { files: clean(filesText) } : {},
      ...workspace !== void 0 ? { workspace: clean(workspace) } : {},
      ...previous !== void 0 ? { previous: clean(previous) } : {},
      ...previousLabel !== void 0 ? { previousLabel } : {}
    });
    const working = this.sessionRoute(sessionId);
    if (working !== void 0 && working.provider === route.provider && working.model === route.model) notes.push("\u5BA1\u67E5\u6A21\u578B\u548C\u6267\u884C\u8005\u662F\u540C\u4E00\u4E2A\u6A21\u578B\uFF0C\u6362\u4E00\u4E2A\u4E0D\u540C\u7684\u6A21\u578B\u66F4\u5BB9\u6613\u53D1\u73B0\u95EE\u9898");
    const out = await runReview({
      llm: this.faces.llm(),
      route,
      depth,
      system: systemPrompt({ checks: prompt.text, depth, content, live: trigger === "live", loop: extras.loop !== void 0 && extras.loop.round > 1, maxToolCalls: this.config.maxToolCalls }),
      prompt: promptText,
      roots,
      ...route.effort !== void 0 ? { effort: route.effort } : {},
      maxToolCalls: this.config.maxToolCalls,
      maxTokens: this.config.maxTokens,
      timeoutMs: depth === "deep" ? this.config.deepTimeoutMs : this.config.timeoutMs,
      signal: controller.signal,
      onPhase: (phase) => emit({ type: "phase", phase }),
      onDelta: (text) => emit({ type: "delta", text }),
      onTool: (tool) => emit({ type: "tool", tool })
    });
    addCounts(counts, out.redactions);
    const note = redactionNote(counts);
    if (note !== void 0) notes.push(note);
    notes.push(...out.notes);
    const parsed = parseReview(out.text);
    if (parsed?.partial === true) notes.push("\u5BA1\u67E5\u6A21\u578B\u7684\u56DE\u7B54\u88AB\u622A\u65AD\u4E86\uFF0C\u53EA\u4FDD\u7559\u4E86\u5B8C\u6574\u7684\u90E8\u5206");
    const report = {
      id: randomUUID(),
      sessionId,
      createdAt: Date.now(),
      trigger,
      scope,
      content,
      promptName: prompt.name,
      ...route.effort !== void 0 ? { effort: route.effort } : {},
      ...extras.loop !== void 0 ? { loop: extras.loop } : {},
      ...shown.length > 0 ? { files: shown } : {},
      turns: { from: selected[0].index, to: selected[selected.length - 1].index },
      depth: request.depth,
      usedDepth: out.usedDepth,
      provider: route.provider,
      model: route.model,
      verdict: parsed?.verdict ?? "doubt",
      summary: parsed?.summary ?? "\u5BA1\u67E5\u6A21\u578B\u7684\u56DE\u7B54\u4E0D\u662F\u7EA6\u5B9A\u7684\u683C\u5F0F\uFF0C\u4E0B\u9762\u662F\u539F\u6587\u3002",
      findings: parsed?.findings ?? [],
      checked: parsed?.checked ?? [],
      tools: out.tools,
      ...parsed === void 0 || parsed.partial === true ? { raw: out.text.slice(0, 2e4) } : {},
      notes,
      elapsedMs: Date.now() - started
    };
    if (this.disposed) return report;
    await this.store.addReport(report);
    return report;
  }
  async dismiss(sessionId, reportId, index, dismissed) {
    return this.store.updateReport(sessionId, reportId, (report) => ({
      ...report,
      findings: report.findings.map((item, i) => {
        if (i !== index) return item;
        const { dismissed: _old, ...rest } = item;
        return dismissed ? { ...rest, dismissed: true } : rest;
      })
    }));
  }
  remove(sessionId, reportId) {
    return this.store.removeReport(sessionId, reportId);
  }
  async exportMarkdown(sessionId, reportId) {
    const report = (await this.store.load(sessionId)).reports.find((item) => item.id === reportId);
    if (report === void 0) return void 0;
    return reportMarkdown(report, { verdict: VERDICT_LABELS, severity: SEVERITY_LABELS, category: CATEGORY_LABELS, content: CONTENT_LABELS, scope: scopeLabel(report.scope) });
  }
  /** Put a message to the working agent: steering while it runs, a follow-up turn when it is idle. */
  deliver(agent, text) {
    const message = createUserMessage({ content: [{ type: "text", text }], source: { kind: "sider-task-reviewer" } });
    const mode = agent.status === "running" ? "steer" : "followup";
    if (mode === "steer") agent.steer(message);
    else agent.followup(message);
    return mode;
  }
  /** Send text to the working agent. Only ever called because the user pressed send. */
  async send(sessionId, text, reportId) {
    const agent = this.faces.agent(sessionId);
    if (agent === void 0) throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\uFF1A\u8BF7\u5148\u5728\u5DE6\u8FB9\u6253\u5F00\u5B83", "not-loaded");
    const trimmed = text.trim();
    if (trimmed === "") throw new ReviewError("\u6CA1\u6709\u8981\u53D1\u9001\u7684\u5185\u5BB9", "empty");
    const mode = this.deliver(agent, trimmed);
    if (reportId !== void 0) await this.store.updateReport(sessionId, reportId, (report) => ({ ...report, sentAt: Date.now() }));
    return { mode };
  }
  // ---------------------------------------------------------------- continuous review
  /** Start a continuous review of a conversation. */
  async startLoop(request) {
    const sessionId = request.session;
    const current = this.loops.get(sessionId);
    if (current !== void 0 && ACTIVE_LOOP.has(current.state.status)) throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u5DF2\u7ECF\u5728\u8FDE\u7EED\u5BA1\u67E5\u4E2D", "busy");
    if (this.jobs.has(sessionId) && this.jobs.get(sessionId).running.trigger !== "live") throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u6B63\u5728\u5BA1\u67E5\u4E2D", "busy");
    if (this.faces.session(sessionId) === void 0 || this.faces.agent(sessionId) === void 0) throw new ReviewError("\u8FD9\u4E2A\u5BF9\u8BDD\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\uFF1A\u8BF7\u5148\u5728\u5DE6\u8FB9\u6253\u5F00\u5B83", "not-loaded");
    const maxRounds = clampRounds(request.maxRounds);
    await this.setSettings(sessionId, { loopRounds: maxRounds, scope: request.scope, content: request.content, depth: request.depth });
    const run = {
      state: { id: randomUUID(), status: "reviewing", round: 1, maxRounds, startedAt: Date.now(), rounds: [{ round: 1 }], message: "\u7B2C 1 \u8F6E\u5BA1\u67E5\u4E2D" },
      request: { ...request, maxRounds },
      files: []
    };
    this.loops.set(sessionId, run);
    void this.loopRound(sessionId, run);
    return { ...run.state };
  }
  /** Stop a continuous review (a review of it that is running is cancelled). */
  stopLoop(sessionId) {
    const run = this.loops.get(sessionId);
    if (run === void 0) return void 0;
    if (ACTIVE_LOOP.has(run.state.status)) {
      if (run.timer !== void 0) clearTimeout(run.timer);
      const job = this.jobs.get(sessionId);
      if (job?.running.trigger === "loop") job.controller.abort();
      this.finish(run, "stopped", "\u5DF2\u624B\u52A8\u505C\u6B62");
    }
    return { ...run.state };
  }
  finish(run, status, message) {
    if (!ACTIVE_LOOP.has(run.state.status)) return;
    if (run.timer !== void 0) clearTimeout(run.timer);
    run.state.status = status;
    run.state.message = message;
    run.state.endedAt = Date.now();
    run.pending = void 0;
  }
  async loopRound(sessionId, run) {
    const round = run.state.round;
    const session = this.faces.session(sessionId);
    if (session === void 0) return this.finish(run, "failed", "\u5BF9\u8BDD\u4E0D\u518D\u52A0\u8F7D");
    let scope = run.request.scope;
    if (round > 1) {
      const after = turnsOf(session.snapshotEvents()).filter((turn) => turn.startSeq > (run.sentSeq ?? Infinity));
      if (after.length === 0) return this.finish(run, "failed", "\u4E3B\u5BF9\u8BDD\u6CA1\u6709\u65B0\u7684\u56DE\u590D\uFF0C\u65E0\u6CD5\u7EE7\u7EED\u5BA1\u67E5");
      scope = { kind: "range", from: after[0].index, to: after[after.length - 1].index };
    }
    run.state.status = "reviewing";
    run.state.message = `\u7B2C ${round} \u8F6E\u5BA1\u67E5\u4E2D`;
    let report;
    try {
      report = await this.start(
        { session: sessionId, scope, depth: run.request.depth, content: run.request.content, ...run.request.route !== void 0 ? { route: run.request.route } : {}, ...run.request.promptId !== void 0 ? { promptId: run.request.promptId } : {} },
        "loop",
        void 0,
        {
          loop: { id: run.state.id, round, max: run.state.maxRounds },
          extraFiles: run.files,
          ...run.last !== void 0 ? { previous: findingsDigest(run.last), previousLabel: "\u4E0A\u4E00\u8F6E\u5BA1\u67E5\u6307\u51FA\u3001\u5DF2\u7ECF\u53D1\u7ED9\u6267\u884C\u8005\u4FEE\u6539\u7684\u95EE\u9898\uFF08\u68C0\u67E5\u662F\u5426\u90FD\u6539\u597D\u4E86\uFF09" } : {}
        }
      );
    } catch (error) {
      if (!ACTIVE_LOOP.has(run.state.status)) return;
      return this.finish(run, error instanceof ReviewError && error.code === "cancelled" ? "stopped" : "failed", `\u7B2C ${round} \u8F6E\u5BA1\u67E5\u6CA1\u6709\u5B8C\u6210\uFF1A${error instanceof Error ? error.message : String(error)}`);
    }
    if (!ACTIVE_LOOP.has(run.state.status)) return;
    run.last = report;
    run.files = [.../* @__PURE__ */ new Set([...run.files, ...report.files ?? []])];
    const open3 = openFindings(report);
    const entry = run.state.rounds.find((item) => item.round === round);
    if (entry !== void 0) {
      entry.reportId = report.id;
      entry.verdict = report.verdict;
      entry.open = open3.length;
    }
    if (report.verdict === "pass") return this.finish(run, "passed", `\u7B2C ${round} \u8F6E\u5BA1\u67E5\u901A\u8FC7`);
    if (round >= run.state.maxRounds) return this.finish(run, "limit", `\u5DF2\u5BA1\u67E5 ${round} \u8F6E\uFF0C\u8FBE\u5230\u4E0A\u9650\uFF0C\u4ECD\u6709\u95EE\u9898`);
    if (open3.length === 0) return this.finish(run, "passed", `\u7B2C ${round} \u8F6E\u6CA1\u6709\u9700\u8981\u4FEE\u6539\u7684\u95EE\u9898`);
    run.pending = { text: messageFor(report, open3, { round, max: run.state.maxRounds }), reportId: report.id };
    this.trySend(sessionId, run);
  }
  /** Send the pending findings when the working agent is idle; otherwise wait for its turn to end. */
  trySend(sessionId, run) {
    if (run.pending === void 0 || !ACTIVE_LOOP.has(run.state.status)) return;
    const agent = this.faces.agent(sessionId);
    const session = this.faces.session(sessionId);
    if (agent === void 0 || session === void 0) return this.finish(run, "failed", "\u5BF9\u8BDD\u4E0D\u518D\u52A0\u8F7D\uFF0C\u65E0\u6CD5\u628A\u95EE\u9898\u53D1\u7ED9\u4E3B\u5BF9\u8BDD");
    if (agent.status === "running") {
      run.state.status = "sending";
      run.state.message = "\u4E3B\u5BF9\u8BDD\u6B63\u5728\u5DE5\u4F5C\uFF0C\u7B49\u5B83\u8FD9\u4E00\u8F6E\u7ED3\u675F\u518D\u53D1\u95EE\u9898";
      return;
    }
    const events = session.snapshotEvents();
    run.sentSeq = events.length > 0 ? events[events.length - 1].seq : -1;
    try {
      agent.followup(createUserMessage({ content: [{ type: "text", text: run.pending.text }], source: { kind: "sider-task-reviewer" } }));
    } catch (error) {
      return this.finish(run, "failed", `\u95EE\u9898\u6CA1\u6709\u53D1\u51FA\u53BB\uFF1A${error instanceof Error ? error.message : String(error)}`);
    }
    const reportId = run.pending.reportId;
    run.pending = void 0;
    const entry = run.state.rounds.find((item) => item.round === run.state.round);
    if (entry !== void 0) entry.sentAt = Date.now();
    void this.store.updateReport(sessionId, reportId, (report) => ({ ...report, sentAt: Date.now() })).catch(() => void 0);
    run.state.status = "waiting";
    run.state.message = `\u5DF2\u628A\u7B2C ${run.state.round} \u8F6E\u7684\u95EE\u9898\u53D1\u7ED9\u4E3B\u5BF9\u8BDD\uFF0C\u7B49\u5B83\u4FEE\u6539`;
    if (run.timer !== void 0) clearTimeout(run.timer);
    run.timer = setTimeout(() => this.finish(run, "failed", "\u7B49\u4E3B\u5BF9\u8BDD\u4FEE\u6539\u8D85\u65F6"), this.config.loopWaitMs);
    run.timer.unref?.();
  }
  /** @returns whether a continuous review of this conversation was running (its events are not live review's). */
  onLoopEvent(sessionId, type, seq, reason) {
    const run = this.loops.get(sessionId);
    if (run === void 0 || !ACTIVE_LOOP.has(run.state.status)) return false;
    if (type !== "turn/end") return true;
    if (run.state.status === "sending") {
      setTimeout(() => this.trySend(sessionId, run), this.config.loopSettleMs);
      return true;
    }
    if (run.state.status !== "waiting" || seq <= (run.sentSeq ?? Infinity)) return true;
    if (reason !== void 0 && reason !== "success" && reason !== "completed" && reason !== "stop" && reason !== "done") {
      this.finish(run, "stopped", `\u4E3B\u5BF9\u8BDD\u8FD9\u4E00\u8F6E\u6CA1\u6709\u6B63\u5E38\u7ED3\u675F\uFF08${reason}\uFF09\uFF0C\u8FDE\u7EED\u5BA1\u67E5\u5DF2\u505C\u6B62`);
      return true;
    }
    setTimeout(() => {
      if (run.state.status !== "waiting") return;
      if (this.faces.agent(sessionId)?.status === "running") return;
      if (run.timer !== void 0) clearTimeout(run.timer);
      run.state.round += 1;
      run.state.rounds.push({ round: run.state.round });
      void this.loopRound(sessionId, run);
    }, this.config.loopSettleMs);
    return true;
  }
  // ---------------------------------------------------------------- live review
  stopWatch(sessionId) {
    const watch = this.watches.get(sessionId);
    if (watch?.timer !== void 0) clearTimeout(watch.timer);
    this.watches.delete(sessionId);
  }
  /**
   * Feed one session event: continuous reviews move on when the working
   * agent's turn ends; conversations with live review on get a review of
   * their current turn (it never sends anything).
   */
  async onSessionEvent(sessionId, type, seq, reason) {
    if (this.disposed) return;
    const heard = this.heard.get(sessionId) ?? { count: 0, lastType: "", lastAt: 0 };
    this.heard.set(sessionId, { count: heard.count + 1, lastType: type, lastAt: Date.now() });
    if (this.onLoopEvent(sessionId, type, seq, reason)) return;
    if (type !== "turn/end" && type !== "step/end") return;
    const settings = await this.store.loadReview();
    if (!settings.live) {
      this.stopWatch(sessionId);
      return;
    }
    const header = this.faces.session(sessionId)?.header;
    if (header?.origin === "subagent" || (header?.delegationDepth ?? 0) > 0) return;
    if (type === "step/end" && (await this.store.loadGlobal()).liveTrigger !== "step") return;
    const watch = this.watches.get(sessionId) ?? { lastAt: 0, lastSeq: -1 };
    this.watches.set(sessionId, watch);
    if (watch.timer !== void 0) clearTimeout(watch.timer);
    const wait = type === "turn/end" ? 800 : Math.max(this.config.liveDebounceMs, watch.lastAt + this.config.liveMinGapMs - Date.now());
    watch.timer = setTimeout(() => {
      watch.timer = void 0;
      void this.liveReview(sessionId, seq, type === "turn/end");
    }, wait);
  }
  async liveReview(sessionId, seq, turnEnded) {
    const watch = this.watches.get(sessionId);
    if (watch === void 0 || this.disposed) return;
    if (seq <= watch.lastSeq) return;
    const loop = this.loops.get(sessionId);
    if (loop !== void 0 && ACTIVE_LOOP.has(loop.state.status)) return;
    if (this.jobs.has(sessionId)) {
      if (turnEnded) {
        const job = this.jobs.get(sessionId);
        void job.done.catch(() => void 0).then(() => this.liveReview(sessionId, seq, true));
      }
      return;
    }
    const settings = await this.store.loadReview();
    if (!settings.live) return;
    watch.lastSeq = seq;
    watch.lastAt = Date.now();
    try {
      await this.start({ session: sessionId, scope: { kind: "last" }, depth: settings.depth, content: settings.content, ...settings.route !== void 0 ? { route: settings.route } : {} }, "live");
    } catch {
    }
  }
  dispose() {
    this.disposed = true;
    for (const job of this.jobs.values()) job.controller.abort();
    for (const sessionId of [...this.watches.keys()]) this.stopWatch(sessionId);
    for (const run of this.loops.values()) if (run.timer !== void 0) clearTimeout(run.timer);
  }
};

// src/index.ts
var name = "sider-task-reviewer";
var inject = ["llm"];
function serviceOf(ctx, key) {
  try {
    return ctx.get(key);
  } catch {
    return void 0;
  }
}
function routeOf4(value) {
  if (typeof value !== "object" || value === null) return void 0;
  const record = value;
  return typeof record.provider === "string" && typeof record.model === "string" && record.provider !== "" && record.model !== "" ? { provider: record.provider, model: record.model } : void 0;
}
function harnessDefault(ctx) {
  const face = serviceOf(ctx, "agentDefaultModel");
  if (typeof face?.currentSelection !== "function") return void 0;
  try {
    return routeOf4(face.currentSelection());
  } catch {
    return void 0;
  }
}
function apply(ctx, _config, store = createFileStore()) {
  const faces = {
    session: (id) => {
      const sessions = serviceOf(ctx, "sessions");
      const session = typeof sessions?.get === "function" ? sessions.get(id) : void 0;
      return session !== null && typeof session === "object" && typeof session.snapshotEvents === "function" ? session : void 0;
    },
    sessionIds: () => {
      const sessions = serviceOf(ctx, "sessions");
      try {
        return (typeof sessions?.list === "function" ? sessions.list() : []).map((item) => item?.id).filter((id) => typeof id === "string");
      } catch {
        return [];
      }
    },
    agent: (id) => {
      const agents = serviceOf(ctx, "agents");
      const agent = typeof agents?.get === "function" ? agents.get(id) : void 0;
      return agent !== null && typeof agent === "object" && typeof agent.followup === "function" ? agent : void 0;
    },
    llm: () => serviceOf(ctx, "llm"),
    defaultRoute: () => harnessDefault(ctx)
  };
  const service = new ReviewService(faces, store, DEFAULT_CONFIG);
  ctx.effect(() => () => service.dispose(), "sider-task-reviewer: service");
  ctx.on("session/event", ((session, event) => {
    if (typeof session?.id !== "string" || typeof event?.type !== "string") return;
    const reason = typeof event.data?.reason?.kind === "string" ? event.data.reason.kind : void 0;
    void service.onSessionEvent(session.id, event.type, typeof event.seq === "number" ? event.seq : 0, reason).catch(() => void 0);
  }));
  ctx.inject(["webServer"], (routeCtx) => {
    const webserver = routeCtx.get("webServer");
    if (webserver === void 0) return;
    routeCtx.effect(() => {
      const dispose = webserver.register({
        kind: "prefix",
        path: REVIEW_PREFIX,
        handler: (req, res) => serveReviewer(service, req, res)
      });
      return typeof dispose === "function" ? dispose : () => {
      };
    }, "sider-task-reviewer: route");
  });
}
export {
  BUILTIN_PROMPT_ID,
  BUILTIN_PROMPT_IDS,
  CATEGORY_LABELS,
  CONTENT_LABELS,
  FINDING_CATEGORIES,
  REVIEW_PREFIX,
  ReviewService,
  SEVERITY_LABELS,
  VERDICT_LABELS,
  apply,
  inject,
  name,
  scopeLabel
};
