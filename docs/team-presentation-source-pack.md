# “信念 / Belief”英语 Pre 统一素材包

**给组员的用途：**这是事实与素材的统一来源，不是规定每个人必须照读的讲稿。大家可以各自写 1–2 分钟英语发言，做 PPT 的同学可以从这里挑选短句与截图。另有[可选的四人讲稿与 7 页示例结构](presentation-kit-en.md)。

## 可直接发到小组群的任务说明

> 我整理了“信念 / Belief”项目的统一英文素材：产品介绍、问题与用户、核心功能、创新点、竞品定位、未来盈利设想、PPT 截图清单，以及 AI 制作 PPT 时可用的 Prompt。请大家先基于这份材料各自写 1–2 分钟英语讲稿。建议分工：①问题、重要性、目标用户；②产品具体怎么用；③创新点、竞品与差异；④未来盈利模式、现状与下一步。做 PPT 的同学用真实界面截图和虚构演示账号，不要用任何人的真实记录。当前原型免费，界面可切换简体中文和英语；跨设备同步尚未实现。示例讲稿只供参考，可以按各自风格改写。

## A. 项目是什么：英文事实卡

**Name:** Belief (信念, pronounced *Xìnniàn*).

**One-sentence introduction:** Belief is a reflective web app that helps people capture thoughts, explore possible underlying beliefs through optional AI questions, and organize meaningful connections on a visual canvas.

**Short product description:** Users begin by writing in their own words. They can save a thought without AI, ask for one open question at a time, and decide when to review tentative summaries. They may edit or reject every suggested statement before adding it to a belief map. The product also includes book-based Q&A, small action tasks, and data export. It is designed for reflection, not diagnosis.

**Tagline option:** *Make room to think. See what connects.*

**Current product:** A working React/Vite web prototype with Simplified Chinese and English interface options. Its AI guide is called **Bel** in English. It has a local account system and browser-based storage. It is free to use today. It does **not** currently sync records across devices.

**Demo site:** [belief-five.vercel.app](https://belief-five.vercel.app/) (may be inaccessible without VPN on some mainland networks). **Code:** [GitHub repository](https://github.com/1254403982-png/belief).

## B. 核心内容：英文要点库

| Presentation question | English answer to adapt for slides or speech |
| --- | --- |
| **What problem do we solve?** | People can write down many thoughts without seeing how they relate. General AI chat can also move too quickly from a single feeling to a confident interpretation. Belief gives users a slower, revisable path from raw writing to a picture of possible patterns. |
| **Why does it matter?** | Reflection is personal. People need time to choose what their words mean, and they should be able to revisit or correct an interpretation. Belief aims to support clarity and agency; we do not claim a proven mental-health outcome. |
| **Who is it for?** | People who already want to journal or reflect on recurring thoughts, feelings, and behaviors. Students and young adults are an initial user group we would test with; we have not validated the size of this market. |
| **What is the service?** | A single-canvas web app for capturing thoughts, optional guided exploration, user-controlled summaries, visual belief mapping, book-concept Q&A, action tasks, and export. |
| **What is innovative?** | AI follows the user's pace: it asks one question at a time and does not force a label. Original words and revisions are preserved. The user decides what enters the belief map. In book Q&A, personal beliefs are included only when explicitly chosen for that question. |
| **What is our advantage?** | Belief combines reflective writing, optional guided questions, and a belief-focused visual map in one workflow. Its advantage is a focused interaction design and user control, not a proven claim that it produces better psychological outcomes than competitors. |
| **How could it earn revenue?** | Today the prototype is free and has no revenue. A future hypothesis is to keep basic writing, mapping, and export free while offering an optional subscription for costly cloud sync, storage, and advanced AI services after those features are built and tested. We should not sell users' private writing. |

## C. 详细功能与真实使用路径

1. **Capture:** Enter a thought without deciding whether it is a “core belief” or any other category. Direct saving works without AI.
2. **Explore:** Open *My Exploration*. Write freely or ask AI for **one** open question. Continue, correct it, or stop whenever you want. Original input, follow-ups, drafts, and revisions are kept locally.
3. **Review:** When ready, request a short summary. Proposed belief statements remain tentative and show the source wording; the user can edit, reject, or keep each one.
4. **Map:** Place chosen statements on a canvas and connect them. Possible layers include core beliefs, subsidiary beliefs, recurring thought/emotion patterns, thoughts or emotions, behaviors, and reported experiences. The user controls the structure.
5. **Learn:** In book Q&A, the default is to explain the book's concepts from the material included in the app. A per-question option can relate an answer to the user's own recorded beliefs. Past exchanges about the same book remain available in that browser.
6. **Act and preserve:** A separate task list records small actions. JSON export preserves a backup of the current browser account's records. Current local accounts and records do not automatically travel to another device.

**One coherent fictional demo example:** “Before speaking in a group discussion, I worry that one mistake will make people judge me.” Use this same example in writing, the question, the optional summary, and the map. Any proposed belief is a *possible interpretation selected by the demo user*, not a diagnosis. Label all screenshots “Demo data.”

## D. 竞品与差异：仅使用可核对的说法

| Product/type | What its official site shows | Safe positioning for Belief |
| --- | --- | --- |
| [Day One](https://dayoneapp.com/plans/) / journal | Journaling, prompts, sync, and optional AI reflection in paid plans | Belief focuses on a specific journey from raw reflection to a user-edited belief map. Do **not** claim Day One has no AI or no sync. |
| [Rosebud](https://www.rosebud.app/) / AI journal | AI-guided journaling and reflection | Belief emphasizes one optional question at a time and user-controlled placement on a structured canvas. Do **not** claim Rosebud lacks follow-up questions. |
| [MindNode](https://www.mindnode.com/) / mind map | Visual mind maps and outlines, with newer AI features | Belief ties its map to preserved first-person reflection and tentative belief layers. Do **not** claim MindNode lacks AI. |

**Ready-to-use comparison line:** “Journals help us keep a record; mind maps help us arrange ideas; AI journals help us continue a conversation. Belief brings these actions into one reflective workflow while keeping the user's interpretation in control.” This is positioning, not a measured performance claim.

## E. 盈利模式：必须标为未来设想

**Proposed model:** Free core + optional premium subscription, after the product is validated.

| Free core to preserve | Potential paid value, only after implementation |
| --- | --- |
| Writing, viewing/editing a belief map, and exporting personal data | Reliable cross-device cloud sync and backup; larger cloud storage; optional advanced AI review or higher usage limits |

**Why this is plausible:** Cloud hosting, storage, and model calls have ongoing costs. Other journaling and mind-mapping products use subscription tiers; [Day One](https://dayoneapp.com/plans/) and [MindNode](https://www.mindnode.com/download) publicly describe theirs. That shows a model exists, **not** that Belief users will pay. Before quoting a price or forecasting revenue, the team would need user interviews, cost estimates, and a willingness-to-pay test.

**English copy for a business slide:** “The prototype is free today. In the future, we would test an optional subscription for cloud and advanced services while keeping core reflection and data export accessible. We will validate willingness to pay before setting a price.”

**Avoid:** “We already make money,” invented user numbers, revenue projections without assumptions, therapy/clinical claims, and selling private journal data as a revenue stream.

## F. PPT 素材任务单：交给负责截图的组员

目前**没有已截好的图片**。截图同学可从[演示网站](https://belief-five.vercel.app/)获取；如果网站在国内无法打开，可在本地仓库运行 `npm install`、`npm run dev`。用全新的演示账号和虚构内容，桌面宽屏截图，保留原始 PNG。截图前可在登录页或设置中切换英语；如线上尚未更新，请用本地最新版。书籍原文和用户自己输入的内容不会随界面语言自动翻译。

| ID | 需要截图的真实界面 | 用途/英文图注 | 建议位置 |
| --- | --- | --- | --- |
| S1 | 品牌首页“信念” | “A calm space for reflection” | 开场 |
| S2 | 画布和底部输入框 | “Capture a thought before choosing a label” | 产品路径 |
| S3 | “我的探索”中的原话和一次问询 | “One question at a time” | 产品路径/创新 |
| S4 | 主动整理后的候选表达与编辑选择 | “Suggestions remain under user control” | 创新 |
| S5 | 使用虚构内容的信念节点与连线 | “A visual map of possible connections” | 产品核心 |
| S6 | 节点详情/来源 | “Revisit and revise a statement” | 产品核心 |
| S7 | 书本问答及“结合我的信念”开关 | “Book knowledge first; personal context by choice” | 特色功能 |
| S8 | 设置里的 JSON 导出 | “Keep a local backup” | 现状/问答备用 |

**可选录屏：**20–30 秒，展示“写一句话 → 请 AI 问一个问题 → 用户选择整理 → 自己决定是否入图”。演示现场不要把实时 AI 回答当作唯一方案；准备录屏或截图备份。

**视觉规范：**暖白背景 `#FAF7F2`，正文深棕 `#4A4036`，低饱和金色 `#C8A96E`；简洁、留白、无诊断感。项目现有的是“信念”文字标识，没有独立 logo 文件。建议 PPT 统一写 **Belief / 信念**。

## G. 项目 Prompt 与 PPT Prompt

**Project concept prompt (English):**

> Build a calm, non-clinical web app called **Belief**. Let users capture thoughts in their own words without mandatory AI or pre-classification. When requested, an AI guide should ask one open question at a time rather than deliver an immediate verdict. Preserve the user's original writing, answers, drafts, and revisions. On request, offer short, tentative summaries with evidence from the user's words; let the user edit, reject, or add each statement to a visual canvas. The canvas should help users explore possible links among core beliefs, subsidiary beliefs, recurring patterns, thoughts, emotions, actions, and experiences, without claiming to diagnose them. Add optional book-based Q&A that explains book concepts by default and uses personal belief records only when the user explicitly opts in for a question. Use a warm-white, minimal, single-canvas design. Keep the user—not the AI—in control of interpretation.

**Prompt for a slide-generation tool (English):**

> Create an English product presentation for **Belief / 信念**, a working reflective web prototype with Simplified Chinese and English interface options. The AI guide's English name is Bel. The audience is classmates and instructors. Four team members will speak for about 1–2 minutes each. Cover: the problem and why it matters; target users; a detailed journey from writing to optional one-question AI exploration, user-controlled summary, and visual belief map; book-based Q&A; specific design innovations; an honest comparison with journaling apps, AI journals, and mind-map tools; a clearly hypothetical future freemium business model; current limitations and next steps. Use short slide text, large authentic screenshots with “Demo data” labels, and a warm-white minimal visual style. Do not invent user counts, revenue, pricing, clinical benefits, encryption, or cross-device sync. Treat all AI interpretations as tentative and user-editable. Use the supplied source pack and product screenshots as the factual basis.

## H. 发给组员前的核对

- [ ] 四个人各自选择对应板块并自己润色英文讲稿；[示例讲稿](presentation-kit-en.md)只是参考。
- [ ] 截图同学用虚构记录，统一一个故事，交原始 PNG 和标注版。
- [ ] PPT 同学用英文图注，正文短，避免整页复制讲稿。
- [ ] 事实核对同学检查所有“已实现 / 将来计划”的措辞。
- [ ] 讲者统一念法：Belief；第一次可解释中文“信念”。
