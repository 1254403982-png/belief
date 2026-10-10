# 技术规范 —— 信念

## 数据模型

### BeliefNode
```typescript
interface BeliefNode {
  id: string; content: string; userNote?: string
  type: 'core_belief' | 'sub_belief' | 'thought_emotion_pattern'
      | 'thought' | 'emotion' | 'behavior' | 'material_reality' | 'seed'
  position: { x: number; y: number; z: number }
  status: 'active' | 'fading' | 'released' | 'observed'
  attitude?: 'break' | 'strengthen' | 'observe'
  category?: string
  userId: string; createdAt: Date; updatedAt: Date
  isLongTerm?: boolean; markedForReview?: boolean
  sourceSessionId?: string; sourceSummaryId?: string; sourceCandidateId?: string
}
```

### BeliefEdge
```typescript
interface BeliefEdge {
  id: string; sourceId: string; targetId: string
  type: 'derives_from' | 'leads_to' | 'related_to' | 'suggested_by_ai' | 'manual'
  strength: number // 0-1
  userId: string; createdAt: Date
}
```

## IndexedDB 表 (Dexie.js)

- **userAccounts**: id(PK), username(index)
- **beliefNodes**: id(PK), type, status, attitude, category
- **beliefEdges**: id(PK), sourceId, targetId, type
- **thoughtJournals**: id(PK), userId, createdAt
- **dailyTasks**: id(PK), userId, date, status；仅记录行动，由用户明确标记完成
- **conversationSessions**: id(PK), userId, createdAt；保存探索原话、问题、草稿、整理版本和用户改写

## Canvas 渲染架构

- requestAnimationFrame 主循环
- DPR 适配 (`window.devicePixelRatio`)
- 分层渲染：背景→连线→光晕→节点→文字
- 视口裁剪（跳过视口外节点）、空闲降帧 10fps

## 探索与 AI

- Endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-chat`，兼容 OpenAI SDK 格式
- 当前仍由前端直连，无后端代理；所有本地账号免费使用已配置的 AI 功能。跨设备版本必须把模型凭据与请求鉴权迁到服务端
- 主探索流程：自由书写并持续保存 → 用户主动请求单问题问询 → 用户主动请求阶段整理 → 用户逐条改写/定类/入图
- 单问题问询不返回分类、清单或核心信念结论；整理结果最多给出 3 条候选，每条必须引用真实用户原话
- AI 候选与用户改写分开保存；用户明确入图后才创建节点，保留来源且不自动建立推测性连线
- 旧 `traceBelief()`、`continueTrace()` 等接口暂时保留供旧数据和其他功能兼容；新入口使用 `askExplorationQuestion()` 与 `summarizeExploration()`

## 本地保存与跨设备

- 当前账号和业务数据都在 IndexedDB；localStorage 仅保存当前账号 ID 与探索草稿的即时恢复快照
- JSON 备份包含节点、连线、日记、待办和探索记录
- 当前版本没有多设备同步。云端身份、迁移、离线队列与冲突处理方案见 `docs/cloud-sync-plan.md`
