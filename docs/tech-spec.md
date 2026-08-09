# 技术设计规范 —— 信念 v0.1

## 技术栈

| 层 | 选型 | 版本 |
|----|------|------|
| 框架 | React | ^18.3 |
| 语言 | TypeScript | ^5.5 |
| 构建工具 | Vite | ^5.4 |
| 样式 | Tailwind CSS | ^3.4 |
| 状态管理 | Zustand | ^4.5 |
| 本地数据库 | Dexie.js (IndexedDB) | ^4.0 |
| 动画 | Framer Motion | ^11.0 |
| 路由 | React Router DOM | ^6.26 |
| Canvas | 原生 Canvas API + requestAnimationFrame | — |
| AI | DeepSeek Chat API (`deepseek-chat`) | — |

## 数据模型

### BeliefNode（信念节点）
```typescript
interface BeliefNode {
  id: string                    // UUID
  type: 'core_belief' | 'sub_belief' | 'thought_emotion_pattern'
      | 'thought' | 'emotion' | 'behavior' | 'material_reality' | 'seed'
  content: string               // 用户输入文字
  userNote?: string             // 补充笔记
  position: { x: number; y: number; z: number }
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'fading' | 'released' | 'observed'
  attitude?: 'break' | 'strengthen' | 'observe'
  isLongTerm?: boolean
  markedForReview?: boolean
  reviewHistory?: { date: string; note: string }[]
}
```

### BeliefEdge（连线）
```typescript
interface BeliefEdge {
  id: string
  sourceId: string
  targetId: string
  type: 'derives_from' | 'leads_to' | 'related_to' | 'suggested_by_ai' | 'manual'
  strength: number              // 0-1
  createdAt: Date
}
```

### UserAccount（本地账号）
```typescript
interface UserAccount {
  id: string
  username: string
  passwordHash: string          // SHA-256(password + 'belief-salt')
  activationCode: string        // DeepSeek API Key（UI中称"激活码"）
  createdAt: Date
  reviewSettings?: {
    monthlyEnabled: boolean
    weeklyEnabled: boolean
    lastMonthlyReview?: string
    lastWeeklyReview?: string
  }
  hasCompletedOnboarding?: boolean
}
```

## IndexedDB 表结构

- **userAccounts**: `id (PK)`, `username (index)`
- **beliefNodes**: `id (PK)`, `type`, `status`, `attitude`, `isLongTerm`, `markedForReview`
- **beliefEdges**: `id (PK)`, `sourceId`, `targetId`, `type`

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | BrandScreen | 品牌页 + 登录 |
| `/canvas` | BeliefCanvas | 主画布（需登录） |

## Canvas 渲染架构

- 主渲染循环：`requestAnimationFrame`
- 像素比适配：`window.devicePixelRatio`
- 变换：translate(中心) + scale + 节点位置偏移
- 分层渲染：背景 → 连线 → 节点光晕 → 节点主体 → 节点文字

## AI API 调用

```typescript
// utils/deepseek.ts

// 分类建议
async function classifyInput(
  content: string,
  existingNodes: BeliefNode[],
  activationCode: string
): Promise<{ type: string; relatedNodes: string[]; gentleInsight?: string }>

// 信念润色（Phase 3 新增）
async function polishBelief(
  content: string,
  activationCode: string
): Promise<{ polished: string; explanation?: string }>
```

### 信念润色功能（用户反馈 #3）
- 用户输入后，AI 可选地将表述打磨得更清晰、更简洁
- 保持原意不变，只优化表达方式
- 例如："我就是觉得好像什么事情都做不好" → "我觉得自己什么都做不好"
- 润色建议以温和方式呈现，用户可选择采纳或保留原文
- 出现在 AI 建议浮层中，和分类建议一同展示

- Endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-chat`
- 兼容 OpenAI SDK 格式
- 前端直连，无需后端代理
