# AIVault P0 + P1 设计规格

> 作者：Hermes（产品/交互设计）
> 实施：ClaudeCode（技术/代码）
> 更新：2026-06-02

---

## P0-1: Gemini 对话解析器

**无需设计规格，纯代码任务。**

技术要求：
- 新建 `src/lib/parsers/gemini.ts`
- 在 `src/lib/parsers/index.ts` 注册
- 在 `src/app/api/import/route.ts` 的 `validPlatforms` 中添加 `'gemini'`
- 参考现有 `chatgpt.ts` 和 `claude.ts` 的结构
- Gemini 导出格式需要先研究（Google Takeout JSON 格式）

---

## P0-2: 对话详情页优化

**文件：** `src/app/(dashboard)/conversations/[id]/page.tsx`

### 问题
- 消息用 `<p>` 渲染，无 Markdown 支持
- 无消息搜索
- platformColors 缺少 GEMINI

### 设计方案

**2a. Markdown 渲染**
- assistant 消息使用项目已有的 `MarkdownRenderer` 组件渲染
- user 消息保持 `whitespace-pre-wrap` 纯文本
- 代码块要有语法高亮（MarkdownRenderer 应该已有）

**2b. 消息搜索**
- 在对话详情页顶部加一个搜索栏（可折叠，默认隐藏）
- 快捷键 `Cmd/Ctrl + F` 唤起
- 搜索结果高亮显示，匹配数量显示
- 点击上下箭头跳转到上/下一个匹配
- 搜索范围：当前对话的所有消息内容

**2c. 平台颜色补全**
- `platformColors` map 中添加 GEMINI 的颜色（建议用 Google 品牌蓝 #4285F4）
- 确保对话头部的平台徽章正确显示

**2d. 消息元数据**
- 每条消息显示时间戳（hover 时显示完整时间，默认显示相对时间）
- 如果有 token_count，显示在消息底部

---

## P0-3: 对话列表分页

**文件：** `src/app/(dashboard)/conversations/page.tsx`

### 问题
- API 支持分页（page, limit, totalPages），但 UI 没用
- 一次加载 50 条，没有翻页

### 设计方案

**采用「无限滚动 + 虚拟化」方案**（对话列表可能很长）

- 初始加载 20 条（从 50 改为 20，提升首屏速度）
- 滚动到底部自动加载下一页，用 `IntersectionObserver`
- 加载中显示底部 loading spinner
- 全部加载完显示 "已加载全部 X 条对话"
- 列表顶部显示总数："共 X 条对话"

**或者采用「传统分页」方案**（更简单）
- 底部显示页码导航：`< 1 2 3 ... 10 >`
- 每页 20 条
- 显示 "第 1-20 条，共 156 条"

**推荐：无限滚动**（体验更好，实现也不复杂）

---

## P0-4: Chat RAG 上下文引用

**文件：** `src/lib/rag.ts`, `src/app/api/chat/route.ts`, `src/components/chat/message-list.tsx`

### 问题
- RAG 返回的上下文没有来源信息
- 用户不知道回答引用了哪些对话

### 设计方案

**4a. 后端：RAG 返回来源信息**
- `rag.ts` 的 `searchRelevantContext()` 除了返回文本，还需返回：
  ```ts
  {
    text: string,
    conversation_id: string,
    conversation_title: string,
    message_id: string,
    similarity: number
  }
  ```
- `match_embeddings` RPC 已返回 `conversation_id` 和 `message_id`，只需 join 查询标题
- chat route 将引用信息注入到 streaming response 的 metadata 中

**4b. 前端：引用展示**
- 在 AI 回答底部显示 "📚 参考来源" 区域
- 每个来源显示：
  - 对话标题（可点击跳转到 `/conversations/{id}`）
  - 相似度百分比
  - 引用的原文片段（截取前 100 字，高亮关键词）
- 折叠展示，默认收起，点击展开
- 最多显示 5 个来源

**4c. 流式传输格式**
- 在 SSE stream 中添加一种新 event type：`sources`
- 在 `data: [DONE]` 之前发送
- 格式：`data: {"type":"sources","sources":[...]}`

---

## P1-5: 对话标签管理

### 问题
- DB 有 `tags: string[]` 字段，但没有 UI 和 API

### 设计方案

**5a. API**
- `PATCH /api/conversations/{id}/tags` — 更新标签（替换整个数组）
- `GET /api/tags` — 获取用户所有已使用的标签（去重列表）
- Request body: `{ tags: string[] }`

**5b. 对话详情页 — 标签编辑**
- 在对话标题下方显示标签行
- 已有标签显示为 pill/badge，带 × 可删除
- 末尾有 + 按钮或输入框可添加标签
- 输入时自动补全已有标签（从 GET /api/tags 获取）
- 标签颜色：根据标签名 hash 自动分配颜色（从预定义的 8-10 种颜色中选取）

**5c. 对话列表页 — 标签筛选**
- 在搜索栏旁边加一个标签筛选下拉
- 下拉显示所有已有标签（带数量）
- 支持多选标签（OR 逻辑）
- 筛选后列表实时更新

**5d. 标签样式**
```
[tag-name ×]  — 圆角 pill，浅色背景，深色文字
颜色池：蓝、绿、紫、橙、粉、青、红、黄（8 色循环）
```

---

## P1-6: 批量操作

**文件：** `src/app/(dashboard)/conversations/page.tsx`

### 设计方案

**6a. 选择模式**
- 对话列表每行左侧添加 checkbox（默认隐藏）
- 列表顶部添加 "选择" 按钮进入选择模式
- 选择模式下：
  - 所有行显示 checkbox
  - 顶部出现操作栏：已选 N 条 | 全选 | 取消选择 | 批量删除 | 批量打标签 | 导出选中
  - 点击行任意位置可切换选中状态
- 退出选择模式：点击 "取消" 或操作完成后自动退出

**6b. 全选逻辑**
- "全选" 选中当前页加载的所有对话
- 显示提示："已选择当前加载的 N 条，是否选择全部 X 条？"

**6c. 批量删除**
- 确认弹窗："确定删除选中的 N 条对话？此操作不可撤销"
- 删除后刷新列表，显示 toast 成功提示

**6d. 批量打标签**
- 弹出标签选择器（复用 P1-5 的组件）
- 可选：替换现有标签 / 追加到现有标签
- 确认后批量更新

**6e. 批量导出**
- 调用 P1-7 的导出功能，范围限定为选中的对话

---

## P1-7: 数据导出

### 问题
- 只有 chat session 的导出，没有导入对话的导出

### 设计方案

**7a. API**
- `GET /api/conversations/export?format=json|markdown|csv&ids=1,2,3`
- 不传 ids 则导出全部
- 支持结合筛选条件导出（platform, tags, search query）

**7b. 导出格式**

**JSON**（完整数据）
```json
{
  "exported_at": "2026-06-02T...",
  "conversations": [
    {
      "id": "...",
      "title": "...",
      "platform": "chatgpt",
      "tags": ["ai", "coding"],
      "created_at": "...",
      "messages": [
        { "role": "user", "content": "...", "created_at": "..." },
        { "role": "assistant", "content": "...", "created_at": "..." }
      ]
    }
  ]
}
```

**Markdown**（人类可读）
```markdown
# Conversation Title
> Platform: ChatGPT | Tags: ai, coding | Date: 2026-01-15

## User
message content...

## Assistant
message content...

---
```

**CSV**（表格分析）
```
conversation_id,title,platform,role,content,created_at,tags
```

**7c. UI 入口**
- 对话列表页顶部操作栏添加 "导出" 按钮
- 点击弹出格式选择：JSON / Markdown / CSV
- 选择后开始下载
- 在批量操作模式下，导出选中的对话

---

## P1-8: Activity 趋势图

**文件：** `src/app/(dashboard)/dashboard/page.tsx`, `src/app/api/stats/route.ts`

### 设计方案

**8a. API 扩展**
- `GET /api/stats/activity?range=7d|30d|90d`
- 返回每日聚合数据：
  ```json
  {
    "daily": [
      { "date": "2026-06-01", "imports": 5, "searches": 12, "chats": 3 },
      ...
    ],
    "platforms": {
      "chatgpt": 45,
      "claude": 30,
      "gemini": 10
    }
  }
  ```
- 如果没有 activity logging 表，可以退而求其次：
  - 从 conversations 的 `imported_at` 统计导入趋势
  - 从 messages 的 `created_at` 统计消息趋势

**8b. 图表设计**
- 使用 lightweight chart 库（推荐 recharts，已在 Next.js 生态中常用）
- Dashboard 页面在统计卡片下方添加两个图表：

**图表 1：导入趋势（折线图）**
- X 轴：日期
- Y 轴：导入对话数
- 支持 7天/30天/90天 切换
- 按平台分色显示（ChatGPT 绿、Claude 棕、Gemini 蓝）

**图表 2：平台分布（饼图/环形图）**
- 显示各平台对话占比
- hover 显示具体数字
- 中间显示总数

**8c. 布局**
```
┌─────────────────────────────────────────┐
│  统计卡片（现有 4 个）                      │
├──────────────────────┬──────────────────┤
│                      │                  │
│   导入趋势折线图       │   平台分布饼图     │
│                      │                  │
├──────────────────────┴──────────────────┤
│  最近对话（现有）                          │
└─────────────────────────────────────────┘
```

---

## 实施顺序建议

1. **P0-1** Gemini 解析器（独立，可立即开始）
2. **P0-3** 列表分页（独立，体验提升明显）
3. **P0-2** 详情页优化（Markdown 渲染优先）
4. **P0-4** RAG 引用（最复杂，需要前后端联调）
5. **P1-5** 标签管理（需要先做 API）
6. **P1-6** 批量操作（依赖标签管理的组件）
7. **P1-7** 数据导出（可独立做）
8. **P1-8** Activity 趋势图（需要 recharts 依赖）
