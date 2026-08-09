# 开发执行计划 —— 信念

## 当前进度

- **Phase**: 3 ✅ 完成
- **Step**: Phase 3 AI 集成全部完成
- **最后更新**: 2026-08-09

---

## Phase 1：骨架搭建 ✅

### Step 1.1 —— 项目初始化 ✅
- [x] Vite + React + TypeScript 项目创建
- [x] 依赖安装（tailwindcss, zustand, dexie, react-router-dom, framer-motion）
- [x] Tailwind 暖白主题配置
- [x] 全局 CSS（背景、字体、输入框、按钮样式）
- [x] 路由结构（`/` 品牌页，`/canvas` 画布页）
- [x] CLAUDE.md + docs/ + dev-logs/ 创建
- [x] 验证：`npm run build` 零错误

### Step 1.2 —— 品牌页 + 登录 ✅
- [x] BrandScreen：暖白全屏 + "信念"浮现动画
- [x] 点击 → LoginForm 展开
- [x] 三字段（账号名 / 密码 / 激活码）
- [x] Dexie.js UserAccount 表 + loginOrRegister()
- [x] SHA-256 密码哈希
- [x] 登录成功 → 跳转 `/canvas`

### Step 1.3 —— 数据层 ✅
- [x] Dexie.js BeliefNode + BeliefEdge 表 (v2, 含 userId)
- [x] Zustand useBeliefStore (完整 CRUD)
- [x] 数据按 userId 隔离

### Step 1.4 —— Canvas 画布基础 ✅
- [x] BeliefCanvas 全屏 Canvas + requestAnimationFrame
- [x] 节点渲染（7种类型，不同颜色/大小）
- [x] 连线渲染（贝塞尔曲线）
- [x] 态度标记光晕（破除/坚定/观察）
- [x] 拖拽平移 + 滚轮缩放

### Step 1.5 —— 节点交互基础 ✅
- [x] 点击选中（柔金光晕 + 顶部信息条）
- [x] 双击编辑（浮层 + Enter/Esc）
- [x] 右键菜单（标记清理/长期信念/删除）
- [x] 底部浮动输入框创建 seed 节点
- [x] 连线模式（🔗 选中源 → 点目标 → 创建连线）
- [x] 拖拽节点移动（松手持久化）
- [x] 键盘 Delete 删除 / Escape 取消

### Step 1.6 —— Phase 1 收尾
- [x] 连线创建功能
- [x] 数据 userId 隔离 + 持久化
- [x] 所有文档完成
- [x] 开发日志更新

---

## Phase 2：交互深化 ✅

### Step 2.1 —— 长按聚焦模式 ✅
- [x] 600ms 长按进入聚焦，移动 > 8px 取消
- [x] focusAlpha lerp 平滑过渡
- [x] 聚焦 UI 提示 + Esc/空白退出

### Step 2.2 —— 拖拽打磨 + 节点连接 ✅
- [x] 惯性滑行（指数衰减 0.94）
- [x] 弹性缩放边界（软限制 + 弹簧回弹）
- [x] 拖拽节点到另一节点 30px 内自动创建连线

### Step 2.3 —— 节点详情浮层 + 态度标记 ✅
- [x] NodeDetailPanel 右侧滑入
- [x] 类型选择 + 态度标记（破除/坚定/观察）
- [x] 用户笔记编辑

### Step 2.4 —— 信念总览抽屉 ✅
- [x] BeliefDrawer 三 Tab：信念树 / 待破除 / 待坚定
- [x] 点击列表项聚焦节点

### Step 2.5 —— 景深 + 力导向布局 + 引导 ✅
- [x] position.z 景深：大小 + 透明度变化
- [x] 力导向布局：排斥/吸引/中心引力 + 阻尼
- [x] 3 步新手引导

## Phase 3：AI 集成 ✅

### Step 3.0 —— 激活码包月制 + 按钮放大 ✅
- [x] UserAccount 新增 activatedAt / activationExpiresAt
- [x] `src/utils/activation.ts` 激活码验证 + 30天包月
- [x] 顶部栏按钮放大（text-xl + px-2 py-1）
- [x] 激活状态指示标签

### Step 3.1 —— DeepSeek API 接入 ✅
- [x] `src/utils/deepseek.ts` 完整 API 封装
- [x] classifyInput（分类+润色）、traceBelief（追溯）、reviewBeliefs（梳理）
- [x] System Prompts 精简，控制 token 消耗

### Step 3.2 —— 输入自动归类 + 润色 ✅
- [x] AISuggestionToast 底部 AI 建议浮层
- [x] 底部输入 → AI 分类 → 用户三选一（采纳/仅分类/保留原样）
- [x] 错误降级：自动保留原始输入

### Step 3.3 —— 深度觉察 ✅
- [x] DeepInsightPanel 居中面板
- [x] 行为描述 → AI 追溯信念链 → 建议节点 + 添加到画布

### Step 3.4 —— 设置 + 定期梳理 ✅
- [x] SettingsPanel 右侧面板（激活码/梳理开关）
- [x] ReviewPanel 梳理浮层（每月/每周）
- [x] 梳理到期提醒

### 代码重构
- [x] `src/components/utils.ts` 共享工具函数提取

## Phase 4：打磨（远期）
## Phase 5：跨端 & 部署（远期）
