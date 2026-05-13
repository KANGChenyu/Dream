# DreamAnalystWorkflow 设计文档

## 目标

把 DreamLog 从“单次 AI 解梦产品”升级为具备第一版 agent 能力的梦境分析系统。

第一版 agent 能力命名为 `DreamAnalystWorkflow`。用户在梦境详情页手动点击“深度分析”后，后端会收集当前梦境、历史相似梦境、近期梦境趋势和已有 AI 解读，再生成并保存一份结构化的个人深度分析报告。

这不是开放式聊天 agent，而是一个受控工作流 agent。它先把真正的 agent 内核做出来：目标驱动、工具取数、用户记忆检索、结构化输出、结果持久化、任务状态和失败恢复。

## 非目标

第一版不做以下内容：

- 对话式聊天 UI。
- 自动周报或月报。
- 外部心理学知识库或梦境符号库 RAG。
- 社区梦境检索。
- 真正独立运行的多 agent 编排。
- 完全自主的规划循环。

这些能力可以等第一版工作流稳定后再扩展。

## 产品行为

梦境详情页新增一个手动入口：

```text
深度分析
```

用户点击后：

1. 后端校验该梦境属于当前用户。
2. 后端创建一条 `agent_report` 记录，状态为 `pending`。
3. Celery 任务执行深度分析工作流。
4. 前端轮询报告状态。
5. 完成后，前端展示已保存的报告。
6. 失败时，报告状态变为 `failed`，前端提供重试入口。

用户看到的是一份混合版报告：

- 顶部是一段温柔、适合直接阅读的总结。
- 下方是结构化分析内容。

这份报告应该像一个私人梦境顾问，同时保留清晰、可检查的分析结构。

## Agent 边界

现有普通 AI 解梦是一次单梦模型调用：

```text
当前梦境 -> 模型 -> 解读结果
```

`DreamAnalystWorkflow` 是目标驱动的工作流：

```text
当前梦境
+ 已有普通解读
+ 历史相似梦境
+ 最近 7/30 天梦境趋势
-> 组装用户梦境记忆上下文
-> 模型
-> 保存 agent report
```

第一版体现的 agent 能力是：

- 有明确目标：生成个人梦境深度分析报告。
- 会在调用模型前使用产品工具收集上下文。
- 使用用户梦境记忆 RAG。
- 写入可复用的持久化结果。
- 暴露任务状态和失败状态。

## 数据模型

新增 `agent_reports` 表，不复用 `dream_interpretations`。

`dream_interpretations` 表示普通单梦 AI 解读；`agent_reports` 表示 agent 生成的报告产物。后者未来还可以支持周报、连续梦检测、对话式 agent 的上下文摘要等类型。

建议字段：

```text
id
user_id
dream_id nullable
report_type
status
input_snapshot
result
error_message nullable
provider nullable
model nullable
created_at
updated_at
```

第一版 `report_type`：

```text
dream_deep_analysis
```

第一版状态：

```text
pending
running
completed
failed
```

`input_snapshot` 保存本次生成时选取的上下文。这样即使后续梦境记录被修改，报告也仍然可追溯。

`result` 保存通过校验的结构化报告。

## 报告结构

生成结果必须包含：

```text
title
gentle_summary
current_themes
historical_connections
recurring_symbols
mood_trends
suggestions
evidence_notes
```

字段含义：

- `title`：简短的梦境分析标题。
- `gentle_summary`：顶部温柔总结，适合用户直接阅读。
- `current_themes`：当前梦境里的核心主题。
- `historical_connections`：与历史相似梦境或相关梦境的联系。
- `recurring_symbols`：反复出现的画面、地点、人物、行为或感受。
- `mood_trends`：最近 7/30 天梦境里的情绪趋势。
- `suggestions`：温和的反思建议或记录提示。
- `evidence_notes`：本次分析依据了哪些上下文，但不暴露内部技术细节。

前端不要展示 RAG、embedding、向量检索、agent workflow 等技术词。

## 用户梦境 RAG

第一版只使用当前用户自己的梦境历史。

不检索：

- 其他用户的公开梦境。
- 社区梦境。
- 外部心理学资料。
- 外部梦境辞典。

上下文来源分为三类。

### 当前梦境

```text
content
dream_date
mood
clarity
is_lucid
title
tags
existing interpretation if present
```

### 历史相似梦境

用当前梦境的 embedding，在同一个用户的历史梦境里检索最多 5 条相似梦境，并排除当前梦境本身。

只返回紧凑上下文：

```text
dream_id
dream_date
title or content summary
mood
tags
similarity
```

如果当前梦境没有 embedding，工作流降级为只使用近期梦境，并在 `input_snapshot` 里记录这个限制。

### 近期梦境趋势

查询两个时间窗口：

```text
最近 7 天
最近 30 天
```

统计：

- 情绪分布。
- 高频标签。
- 可用情况下的重复主题或意象。
- 梦境数量。

简单计数和趋势摘要优先由后端确定性计算，再交给模型生成自然语言分析。

## 后端 API

新增接口：

```text
POST /api/v1/dreams/{dream_id}/agent-reports/deep-analysis
GET /api/v1/agent-reports/{report_id}
GET /api/v1/dreams/{dream_id}/agent-reports/deep-analysis/latest
```

### 创建深度分析报告

```text
POST /api/v1/dreams/{dream_id}/agent-reports/deep-analysis
```

行为：

- 需要登录。
- 校验梦境属于当前用户。
- 创建 `pending` 状态的 `agent_report`。
- 投递 Celery 任务。
- 返回新建报告的 id 和状态。
- 支持重新生成；重新生成会创建新报告。

### 查询报告

```text
GET /api/v1/agent-reports/{report_id}
```

行为：

- 需要登录。
- 校验报告属于当前用户。
- 返回状态、结果，以及失败时的错误信息。

### 查询最新完成报告

```text
GET /api/v1/dreams/{dream_id}/agent-reports/deep-analysis/latest
```

行为：

- 需要登录。
- 校验梦境属于当前用户。
- 如果该梦境已有完成的深度分析报告，返回最新一份。

## 后端组件

新增：

```text
app/models/agent_report.py
app/schemas/agent_report.py
app/services/agents/dream_analyst.py
app/services/agents/dream_memory.py
app/tasks/agent_tasks.py
app/api/v1/agent_reports.py
```

职责：

- `AgentReport` model：负责报告持久化和归属关系。
- agent report schemas：负责 API 请求和响应校验。
- `dream_memory.py`：负责用户梦境检索和确定性趋势摘要。
- `dream_analyst.py`：负责工作流编排和 prompt 构造。
- `agent_tasks.py`：负责 Celery 任务封装和状态流转。
- `agent_reports.py`：负责鉴权后的 API 入口。

API 层保持轻薄，不在 API 里拼 prompt，也不在 API 里实现检索逻辑。

## 多 Agent 演进路线

第一版不实现真正独立运行的多 agent 编排，但设计上预留多 agent 角色边界。也就是说，第一版仍然由 `DreamAnalystWorkflow` 统一执行，但代码职责和 prompt 上下文要避免写死成一个不可拆分的大函数。

未来可以拆成以下 agent 角色：

- `DreamAnalystCoordinator`：负责接收目标、控制流程、分配子任务、汇总结果。
- `DreamMemoryAgent`：负责检索用户历史梦境、相似梦境和近期趋势。
- `DreamInterpretationAgent`：负责分析当前梦境与历史梦境之间的心理、象征和情绪联系。
- `DreamReportWriterAgent`：负责把分析结果写成温柔、结构化、适合用户阅读的报告。
- `DreamSafetyAgent`：负责检查输出是否过度诊断、是否包含心理健康风险表达、是否需要温和免责声明。

第一版的实现映射：

```text
DreamAnalystWorkflow
-> 执行 Coordinator 的流程控制职责
-> 调用 dream_memory 工具承担 MemoryAgent 职责
-> 通过模型 prompt 承担 InterpretationAgent 和 ReportWriterAgent 职责
-> 通过结果校验和安全约束承担 SafetyAgent 的基础职责
```

第二版再考虑拆成可独立调用的 agent 节点。届时可以让 `DreamMemoryAgent` 和 `DreamInterpretationAgent` 并行执行，`DreamAnalystCoordinator` 汇总后交给 `DreamReportWriterAgent`，最后由 `DreamSafetyAgent` 做输出检查。

这个设计让第一版保留清晰边界，同时避免一开始就引入多 agent 调度、并发状态、跨 agent 消息协议和调试成本。

## 工作流

任务成功流程：

```text
report.status = running
加载 report
加载当前梦境
加载已有普通解读
加载历史相似梦境
加载最近 7/30 天梦境
构造 input_snapshot
用严格 JSON 要求调用模型
校验 result
保存 result
report.status = completed
```

任务失败流程：

```text
捕获异常
report.status = failed
report.error_message = 安全的用户可读错误
技术细节只写入日志
```

任务失败后不能让报告长期停留在 `running`。

## Prompt 契约

第一版要求模型输出严格 JSON。

Prompt 意图：

```text
你是 DreamLog 的个人梦境分析 Agent。
请基于当前梦境、历史相似梦境和近期梦境趋势，生成一份温柔但结构清晰的深度分析报告。
只返回 JSON，不要输出 Markdown。
```

必填 JSON 字段：

```text
title
gentle_summary
current_themes
historical_connections
recurring_symbols
mood_trends
suggestions
evidence_notes
```

后端必须校验模型返回的 JSON。校验失败时，报告状态设为 `failed`，不要把坏数据交给前端。

## 前端体验

第一版入口放在现有梦境详情页里。

状态：

```text
not_generated -> 显示“深度分析”
pending/running -> 显示分析中
completed -> 显示报告和“重新分析”
failed -> 显示失败信息和“重试”
```

报告展示结构：

```text
标题
温柔总结
当前主题
历史关联
重复意象
情绪趋势
建议
依据说明
```

详情页加载时，前端默认查询并展示最新完成报告。

重新分析会创建一份新报告。历史报告可以继续保留，UI 默认展示最新完成的一份。

## 错误处理

需要覆盖的情况：

- 梦境不存在或不属于当前用户：返回 404。
- 报告不存在或不属于当前用户：返回 404。
- 模型服务不可用：报告变为 `failed`。
- 模型返回 JSON 非法：报告变为 `failed`。
- 当前梦境缺少 embedding：降级使用近期梦境上下文。
- 没有历史梦境：仍然生成以当前梦为主的报告，并说明历史上下文有限。

## 测试

后端测试：

- 用户不能为别人的梦境创建报告。
- 创建报告后返回 `pending` 状态。
- 任务成功后保存 `completed` 报告，并包含必填 result 字段。
- 任务失败后保存 `failed` 状态和安全错误信息。
- latest 接口返回最新完成报告。
- 相似梦检索只包含当前用户自己的梦。
- 相似梦检索会排除当前梦本身。
- 缺少 embedding 时会降级到近期梦境上下文。

前端测试：

- 梦境详情页在没有报告时显示深度分析入口。
- `pending/running` 报告显示生成中状态。
- `completed` 报告展示所有章节。
- `failed` 报告展示重试入口。
- 重新分析会发起新的报告创建请求。

## 实施顺序

推荐顺序：

1. 新增后端模型和 schemas。
2. 新增 dream memory 检索工具。
3. 新增工作流编排服务。
4. 新增 Celery 任务。
5. 新增 API 接口。
6. 补后端测试。
7. 新增前端 API client 类型和方法。
8. 在梦境详情页加入报告面板。
9. 补前端测试。

## 验收标准

完成后应该满足：

- 用户可以手动为自己的某条梦境请求深度分析。
- 系统会创建并跟踪 agent report。
- 工作流会读取当前梦境、同用户历史相似梦境和近期梦境趋势。
- AI 输出会保存为结构化混合版报告。
- 梦境详情页可以展示已完成报告。
- 失败后用户可以重试。
- 用户可以重新生成新报告。
- 报告上下文不会包含其他用户的梦境。
