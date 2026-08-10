# 信念 —— AI 助手指引

## 项目

暖白极简 Web 信念觉察工具。用户输入念头，以 2D 神经网络呈现"核心信念→附属信念→思维/情绪模式→想法/情绪→行为→物质现实"连接。

**设计原则**：暖白极简、温柔不诊断、单画布沉浸、Canvas 60fps 丝滑

## 技术栈

React 18 + TypeScript 严格模式 + Vite + Tailwind CSS 3 + Zustand + Dexie.js (IndexedDB) + Framer Motion + 原生 Canvas API + DeepSeek Chat API (`deepseek-chat`)

## 核心约束

### 命名
- 软件名："信念"
- DeepSeek API Key → UI 中永远显示为"激活码"，代码中变量名 `activationCode`

### 设计
- 背景 `#FAF7F2`（暖白），永不用黑底
- 字体：Noto Serif SC（标题）、Noto Sans SC（正文）
- 节点：圆形光点，低饱和暖色系，不霓虹
- 不出现复杂按钮墙、标签墙

### 架构
- 单画布全屏 Canvas，不切多页面
- 辅助功能浮层/抽屉实现
- 数据存 IndexedDB（Dexie.js），按 userId 隔离
- 无激活码时 AI 功能降级为手动模式

### 数据模型（简化）

| 表 | 关键字段 |
|----|---------|
| BeliefNode | id, userId, type(8种), content, position{x,y,z}, status, attitude, category |
| BeliefEdge | id, userId, sourceId, targetId, type, strength |
| UserAccount | id, username, passwordHash, activationCode |

节点类型层级：core_belief → sub_belief → thought_emotion_pattern → thought/emotion → behavior → material_reality，外加 seed(未分类)

## 路由

- `/` → BrandScreen（登录）
- `/canvas` → BeliefCanvas（主画布）

## 文件索引

| 文件 | 用途 |
|------|------|
| `docs/requirements.md` | 完整功能需求 |
| `docs/tech-spec.md` | 数据模型 + API 细节 |
| `docs/design-standards.md` | 色板、字体、动画参数 |
| `docs/development-plan.md` | 开发进度 |
| `dev-logs/` | 每日开发日志 |
| `src/db/index.ts` | Dexie.js 数据库定义 |
| `src/stores/useBeliefStore.ts` | Zustand 状态管理 |
| `src/utils/deepseek.ts` | AI API 封装 |
| `src/components/utils.ts` | 共享工具函数 |

## 工作流程

1. 读 `docs/development-plan.md` 了解进度
2. 按需读其他 docs 了解技术/设计细节
3. 按执行计划推进，每步验证
4. 会话结束更新 `dev-logs/YYYY-MM-DD.md`
