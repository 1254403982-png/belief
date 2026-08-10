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

## Canvas 渲染架构

- requestAnimationFrame 主循环
- DPR 适配 (`window.devicePixelRatio`)
- 分层渲染：背景→连线→光晕→节点→文字
- 视口裁剪（跳过视口外节点）、空闲降帧 10fps

## AI API

- Endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-chat`，兼容 OpenAI SDK 格式
- 前端直连，无后端代理
- 主要函数: `classifyInput()`, `traceBelief()`, `polishBelief()`, `reviewBeliefs()`, `exploreChain()`
