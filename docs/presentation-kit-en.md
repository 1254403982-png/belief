# Belief — English Product Presentation Kit

Prepared from the current web prototype on 15 October 2026. This is a source pack for a four-person presentation, not a claim that the product has launched commercially. The slide count is flexible; the outline below uses seven slides and gives each speaker roughly 1–2 minutes.

## 1. Product at a glance

**Product name:** Belief (Chinese name: 信念)

**One-line description:** Belief is a reflective web app that helps people capture thoughts, explore the beliefs behind them at their own pace, and see connections on a visual canvas.

**Tagline:** *Make room to think. See what connects.*

**Who it is for:** People who journal, reflect on recurring thoughts, or want to understand how their beliefs may relate to emotions and actions. Students and young adults are a sensible first group to test with, not a proven market segment.

**What it is not:** A therapist, a diagnosis tool, or a system that can determine a person's “true” core belief. AI suggestions are tentative; the user decides what to keep.

**Current status:** A working React/Vite web prototype. It supports local accounts, a visual belief canvas, guided exploration, book-based Q&A, tasks, and data export. Records currently live in each browser; cross-device sync and cloud accounts are planned, not available. All current user-facing features are free. The UI is currently in Chinese, so use English captions and speaker narration in the deck rather than presenting it as an English-language app.

### Fast answers for the team's content questions

| Question | Answer to use in the pitch |
| --- | --- |
| What is the project? | A reflective web app that combines personal writing, optional AI questioning, and a user-edited visual belief map. |
| What problem does it solve? | Notes can remain isolated, while an AI answer can arrive before someone has understood their own experience. Belief provides a slower path from a thought to a revisable picture of possible relationships. |
| Why does it matter? | People need space to interpret their own words. The product's value proposition is clarity and agency in reflection, not a claimed clinical benefit. |
| Who are the users? | People interested in journaling and self-reflection; students and young adults are an initial group to test with. |
| What is innovative? | One-question-at-a-time AI, preserved original wording and revisions, optional placement on a belief canvas, and per-question consent before book Q&A refers to personal beliefs. |
| What is the competitive advantage? | A focused combination of writing, guided exploration, and mapping with the user retaining control. This is a **design hypothesis**, not a proven superiority claim. |
| How might it earn revenue? | A future optional subscription for costly cloud and advanced services, after user research and development. The current prototype has no revenue or paid tier. |

## 2. Project prompt

Use this if a teammate or a slide-generation tool asks for the **project concept prompt**:

> Design a calm, non-clinical web product called **Belief**. A user should be able to write a thought in their own words before choosing whether to use AI. If requested, the AI asks one open question at a time to help the user reflect; it should not jump to a diagnosis or label a core belief from a single emotion. The user's original words, follow-up answers, drafts, and revisions must remain visible. When the user chooses to summarize, the app may offer tentative belief statements with the supporting words from the conversation. The user can edit, reject, or add each statement to a visual canvas and create connections between beliefs, patterns, thoughts, emotions, actions, and experiences. Include optional book-based Q&A: explain a book's concepts by default, and refer to the user's own belief map only when the user explicitly turns that option on for a question. Keep the visual design warm, minimal, and centered on one interactive canvas. Treat AI as a supporting tool and the user as the author of their own interpretation.

Use this if a teammate uses AI to **draft the presentation**:

> Create a seven-slide English product pitch for Belief, a working Chinese-language web prototype. Audience: classmates and instructors. Four speakers have 1–2 minutes each. Cover the problem and why it matters, target users, the product journey, distinctive design choices, comparison with journaling/AI-journal/mind-map alternatives, a proposed future revenue model, and current limitations/next steps. Use short slide text and natural spoken English. Base feature claims on the supplied product screenshots and this brief. Do not invent user counts, revenue, clinical outcomes, encryption, or cross-device sync. Label proposed business features and future plans clearly. Use a warm-white palette and real product screenshots with clearly marked fictional demo data.

## 3. Seven-slide structure and speaking script

The scripts are written to be spoken naturally, not read as slide bullets. At a moderate pace, each speaker's section is approximately 1–2 minutes. Replace **Belief** with **Xinnian** at first mention if the group wants to explain the Chinese name.

### Slide 1 — Belief: A space to understand your thoughts

**On-slide copy:**

- Belief / 信念
- Make room to think. See what connects.
- A reflective web app with optional AI guidance

**Visual:** Brand screen or clean canvas background. Do not use a stock photo of someone looking distressed.

**Speaker 1 — opening, problem, and why it matters:**

> Think about a thought that keeps returning: “If I make one mistake, people will think less of me.” We might write it in a diary and then forget it, or ask an AI chatbot and receive a confident explanation before we have even worked out what we mean. Belief started with a different question: what if a tool could help us slow down and notice our own patterns without taking over the conversation? The problem is not a lack of places to write. It is the gap between a single thought and a clearer understanding of how our thoughts, feelings, and actions may be connected. That gap matters because reflection takes time, and an answer that arrives too early can interrupt it. Our first users are people who already want to reflect—especially students and young adults facing recurring questions about work, relationships, or self-worth. Belief gives them a place to begin with their own words.

### Slide 2 — From a thought to a clearer picture

**On-slide copy:**

1. Write freely
2. Ask one question, if wanted
3. Review tentative ideas
4. Keep and connect what fits

**Visual:** Four-step flow using real screenshots; show arrows between screenshots, not a fake app interface.

**Speaker 2 — product service, first half:**

> Belief is a web app built around a single visual canvas. You can start by typing a thought exactly as it comes to you. Saving it does not require AI, and it does not force a category. If you want help exploring, you open “My Exploration” and ask the AI for one question. The app then waits for your answer instead of producing a long analysis. You can continue for several turns, stop, or simply keep writing on your own. Your original writing and the conversation remain available, so an AI suggestion does not replace what you said.

### Slide 3 — The belief canvas

**On-slide copy:**

- A visual map of possible relationships
- User-edited statements and connections
- No automatic “final answer”

**Visual:** Canvas containing fictional demo nodes, plus a close-up of one node's details.

**Speaker 2 — product service, second half:**

> When you decide you are ready, Belief offers a short summary and possible statements. These are suggestions, not verdicts. You can revise a statement, reject it, or place it on the canvas. The canvas can distinguish broader beliefs from more specific rules, recurring patterns, thoughts, emotions, actions, and reported experiences. You decide which relationships are meaningful and can change them later. The map is not meant to tell you who you are; it gives you a way to see and reconsider what you have written over time. The app also includes a task list for small actions, while keeping tasks separate from reflection.

### Slide 4 — Learning from books without losing context

**On-slide copy:**

- Explain a book's concepts by default
- “Connect to my beliefs” is opt-in for each question
- Continue a conversation about the same book

**Visual:** Book Q&A view, with the personal-context switch visible. Show a short, real answer from the prototype only if it was actually generated; otherwise use the empty question state.

**Speaker 3 — innovation:**

> Belief also connects reflection with learning. In the book Q&A area, the default is simple: ask about a concept and receive an explanation based on the material available in that book. If you want to relate it to your own experience, you turn on “Connect to my beliefs” for that question. The next question returns to book-only mode by default. This small choice matters. It keeps a request for knowledge from turning automatically into personal interpretation. Across the product, the same principle appears again: AI asks before it concludes, preserves the original words, and leaves the final decision to the user. Our innovation is not a claim that AI understands people better than they understand themselves. It is an interaction design that makes AI easier to question and easier to set aside.

### Slide 5 — Positioning among existing tools

**On-slide copy:**

| Tool type | What it mainly offers | Belief's focus |
| --- | --- | --- |
| Journaling app | Record and revisit entries | Explore and map possible belief relationships |
| AI journal | Conversational prompts and insights | One question at a time, with user-controlled conclusions |
| Mind-map app | Organize ideas visually | Connect a visual map to reflective writing |

**Visual:** A simple comparison table. Use text, not competitors' logos unless needed and properly attributed.

**Speaker 3 — competition and advantage:**

> Existing tools already do important parts of this well. Day One is a mature journal with prompts and optional AI reflection. Rosebud supports AI-guided journaling. MindNode is strong at visual mind mapping. We should not pretend those products lack these capabilities. Belief's proposed advantage is the combination and the sequence: first-person writing, optional single-question exploration, evidence-linked tentative statements, and a belief-focused canvas in one experience. It also gives book learning a clear choice between a concept-only answer and a personal connection. This is a design difference we can demonstrate today, although we still need user testing to learn whether it helps people more than the alternatives.

### Slide 6 — A sustainable business model

**On-slide copy:**

- Today: free prototype
- Future hypothesis: free core reflection + optional paid cloud and advanced services
- No sale of personal writing

**Visual:** Two-column “Free core / Possible premium later” diagram. Label the premium side **proposed, not launched**.

**Speaker 4 — revenue:**

> The prototype is free today. If we develop it into a sustainable product, our first business-model hypothesis is a freemium subscription. Writing, viewing the canvas, and exporting personal data should remain part of the free core. A future paid tier could support features that create ongoing costs, such as reliable cross-device cloud sync, larger storage, and optional advanced AI reflection. We would need to build and test those features before charging for them. The subscription would pay for hosting, model usage, maintenance, and support. We would not base the business on selling private reflections or claiming therapeutic results. Before setting a price, we would interview users and test whether the proposed paid features solve a problem they actually value.

### Slide 7 — What is built, and what comes next

**On-slide copy:**

- Built: web prototype, canvas, exploration, book Q&A, tasks, export
- Next: domestic access, cloud accounts and sync, mobile refinement, user testing
- Goal: help people stay authors of their own understanding

**Visual:** Product screenshot with a narrow next-steps column. Mark cloud sync as **planned**.

**Speaker 4 — close:**

> What we can show now is a working web prototype, not a finished health product. Its strongest parts are the writing flow, the optional AI questions, the visual canvas, and the user's control over what becomes part of the map. Its current limits are just as clear: the interface is in Chinese, data does not yet sync between devices, and access from mainland China needs a more suitable deployment. Our next steps are to improve access, add secure cloud accounts and synchronization, refine mobile use, and test the experience with real users. We want Belief to help people think with more clarity while keeping the meaning of their own words in their own hands.

## 4. Screenshot and media checklist

Use [the current demo site](https://belief-five.vercel.app/) where it is accessible, or run this repository locally with `npm run dev`. Since the product UI is currently in Chinese, keep the screenshots authentic and place short English captions beside them. Use a **new demo account with invented, non-sensitive content**. Never capture the owner's real journal, account details, API key, or browser address containing private information. A mainland live-demo connection may fail; embed screenshots or a short offline video in the deck.

| ID | Capture | How to prepare it | Best slide |
| --- | --- | --- | --- |
| S1 | Brand screen | Open `/` before login; capture the warm-white title screen | 1 |
| S2 | Blank canvas and input | Log into demo account; show where an unclassified thought can be entered | 2 |
| S3 | Exploration after two turns | Enter fictional text, save it, and request one question; show original words and the follow-up together | 2 |
| S4 | User-controlled summary | In the same demo session, choose “整理到这里”; capture the suggestion and edit/keep choices | 2–3 |
| S5 | Belief map | Add a few fictional nodes manually and connect only relationships the demo user chose | 3 or 7 |
| S6 | Node details | Select one demo node to show editable type, note, and source where available | 3 |
| S7 | Book Q&A | Select an available book; show the default book-only mode and the optional personal-context control | 4 |
| S8 | Data export | Show the Settings export area only for a transparency/Q&A slide; no private account details | 7 / backup |

**Suggested fictional demo story:** “Before speaking in a group discussion, I worry that one mistake will make people judge me.” A follow-up can explore what “being judged” means to the speaker. If you create a sample belief, label it as a **possible interpretation chosen by the demo user**, not as a diagnosis or AI-discovered fact. Keep the same story across screenshots so the presentation feels like one product journey.

**Design assets:** Warm-white `#FAF7F2`, warm brown text `#4A4036`, muted gold `#C8A96E`, serif headings and sans-serif body. The product currently uses a text wordmark (信念), not a separate logo file. For PPT, the team may typeset “Belief / 信念” rather than inventing a logo. Export screenshots at desktop resolution (for example, 1600 × 900) and crop consistently. Keep source PNGs separate from annotated slide images.

**Optional 20–30 second demo video:** (1) write a thought, (2) open My Exploration, (3) request a single question, (4) review a suggestion, (5) add a chosen statement to the canvas. Record this locally and keep a screenshot fallback. Do not make a live AI call the only way to finish the presentation.

## 5. Team handoff checklist

The owner can send this to the group:

> We are pitching **Belief**, a working reflective web app. Our four speaking parts are: **(1) problem, importance, and users; (2) how the product works; (3) innovation and competition; (4) business model and next steps.** Please use the English scripts as a first draft and speak naturally rather than reading slide bullets. The PPT should be visual and use real screenshots from a fictional demo account. Do not claim that we already have cloud sync, English UI, revenue, proven mental-health outcomes, or a final pricing plan. The proposed premium tier is a future business hypothesis. We need one person to build the deck, one to capture and label screenshots, and each speaker to rehearse their section to 1–2 minutes. Keep the same demo example throughout.

Before submission, agree on the required total duration, whether the instructor expects a live demo, and whether a references slide is required. If a course template arrives, map these seven content blocks to its headings instead of forcing the current slide count.

**给组员的中文消息，可直接复制：**

> 我把“信念”产品介绍分成 4 段英文讲稿，每人约 1–2 分钟：①问题、重要性和目标用户；②产品具体怎么用；③创新点和竞品；④未来盈利模式和下一步。建议做 7 页左右的 PPT，以真实界面截图为主。请用新建的演示账号和虚构内容截图，不要放任何人的真实思考记录。当前产品免费、中文界面、数据只存在本机浏览器；云同步和商业化都是未来计划，不能讲成已实现。每个人先熟悉自己那段并计时，我负责汇总素材；做 PPT 的同学按文档里的页面结构排版。若老师有固定页数或时长，我们再压缩。

## 6. Source notes for competition claims

- [Day One plans](https://dayoneapp.com/plans/) describe free journaling, paid cross-device features, and optional AI features in its Gold plan.
- [Rosebud's product site](https://www.rosebud.app/) and [help center](https://help.rosebud.app/) describe interactive AI journaling and guided reflection.
- [MindNode's site](https://www.mindnode.com/) describes visual mind maps and outlines; its current product also includes AI-related features.

These sources support the competitor categories, not a claim that Belief has superior outcomes. Avoid copying competitors' promotional imagery into the deck; use a text comparison and your own product screenshots.
