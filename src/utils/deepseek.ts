/**
 * DeepSeek Chat API 封装
 *
 * 所有 AI 功能通过此模块调用，统一处理鉴权、超时、错误。
 * 任何失败都返回 null，调用方据此降级为手动模式。
 */
import type { BeliefNode, BeliefEdge } from '../db'
import { db } from '../db'

// ====== 类型定义 ======

export interface ClassifyResult {
  type: BeliefNode['type']
  polishedContent: string
  category?: import('../db').Category     // AI 建议的领域分类
  relatedNodeIds: string[]
  gentleInsight: string
}

export interface TraceResult {
  coreBeliefName: string
  possibleCoreBelief: string
  possibleSubBeliefs: string[]
  reverseDerivation: string
  possiblePatterns: string[]
  insight: string
  suggestedNodes: Array<{ content: string; type: BeliefNode['type'] }>
  /** 与已有信念相似的节点 */
  similarExistingNodes: Array<{
    nodeId: string
    content: string
    similarityNote: string
    suggestion: 'merge' | 'refine' | 'connect' | 'keep_separate'
  }>
  /** 信念之间的逻辑关系 */
  logicalConnections: Array<{
    fromId: string
    toId: string
    relation: string
    description: string
  }>
  /** 重新审视的角度 */
  reframedPerspective?: string
}

export interface ReviewResult {
  overallInsight: string
  nodeInsights: Array<{
    nodeId: string
    observation: string
    suggestion: string
    suggestedAttitude?: 'break' | 'strengthen' | 'observe'  // AI 建议的态度
  }>
  patternObservations: Array<{ description: string; relatedNodeIds: string[] }>
}

// ====== 内部工具 ======

const API_URL = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'

// DeepSeek API Key（从环境变量读取，不在代码中硬编码）
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

/**
 * 获取当前用户的 API Key 和激活状态
 * 优先使用环境变量中的 API Key
 */
async function getApiKey(): Promise<{ key: string; isActivated: boolean }> {
  const userId = localStorage.getItem('currentUserId')
  if (!userId) return { key: DEEPSEEK_API_KEY, isActivated: false }

  try {
    const status = await db.getActivationStatus(userId)
    return { key: DEEPSEEK_API_KEY, isActivated: status.isActivated }
  } catch {
    return { key: DEEPSEEK_API_KEY, isActivated: false }
  }
}

async function deepseekChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number; maxTokens?: number; previousMessages?: Array<{ role: string; content: string }> },
): Promise<Record<string, unknown> | null> {
  const { key, isActivated } = await getApiKey()
  if (!key || !isActivated) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeout ?? 20_000)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(options?.previousMessages ?? []),
          { role: 'user', content: userMessage },
        ],
        temperature: 0.6,
        max_tokens: options?.maxTokens ?? 800,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!res.ok) return null

    const data: any = await res.json()
    const raw = data?.choices?.[0]?.message?.content
    if (!raw) return null

    // 防御性剥离 markdown 代码块
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?\s*```$/i, '')
      .trim()

    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ====== System Prompts ======

const CLASSIFY_SYSTEM = `你是一个温柔的内在觉察助手，名叫"信念"。

用户在一个留白界面上随手写下念头。你需要帮ta理解这个念头可能属于哪一类信念结构，以及属于哪个生活领域。

信念层次（由深到浅）：
- core_belief（核心信念）：关于自己/世界的深层假设
- sub_belief（附属信念）：从核心衍生出的具体规则
- thought_emotion_pattern（思维/情绪模式）：反复出现的模式
- thought（想法）、emotion（情绪）：单次的念头或情绪
- behavior（行为）：具体行为描述
- material_reality（物质现实）：客观事件
- seed（未分类）：暂时无法判断

生活领域（category）：
- study（学习）：学习、考试、知识获取
- work（工作）：职业、事业、同事关系
- life（生活）：日常起居、习惯、生活方式
- money（金钱）：财务、收入、消费
- love（感情）：恋爱、亲密关系
- friendship（友情）：朋友、社交关系
- family（家庭）：父母、子女、家庭关系
- health（健康）：身体、心理健康、运动
- self（自我）：自我认知、个人成长、人生意义
- other（其他）：无法归入以上领域

只返回 JSON（不要 markdown）：
{
  "type": "上面列出的类型之一",
  "polishedContent": "润色后的表述，更清晰简洁，保持原意",
  "category": "上面列出的领域之一",
  "relatedNodeIds": ["已有节点ID，最多3个，不匹配则空数组"],
  "gentleInsight": "一句温柔觉察，以'也许'或'或许'开头，不超30字"
}

原则：用"可能""也许""或许"；不诊断、不给心理建议；输入模糊时返回 type:"seed"；润色只优化表达不变原意；category 选择最贴近的一个。`

const TRACE_SYSTEM = `你是一个温柔的信念探索助手，名叫"信念"。你的任务是帮助用户挖掘和确认他们内心最深层的信念结构。

用户描述一个反复出现的行为模式或情绪反应。你需要从两个方向同时工作：

**正向追溯（从表到里）：** 从用户描述的行为/情绪反推可能的信念链
**反向推导（从里到表）：** 从可能的核心信念出发，推导它会产生什么样的行为表现，用逻辑验证

信念层次（由深到浅）：核心信念 → 附属信念 → 思维/情绪模式 → 想法/情绪 → 行为 → 物质现实

**核心任务流程：**

1. **确认核心信念名称**：帮用户找到最可能的那个"核心信念"——不是表面的想法，而是关于自己/世界/他人的深层假设。比如不是"我考试会失败"，而是"我可能不够好"。给这个核心信念一个清晰的名称。

2. **确认附属信念**：从这个核心衍生出哪些具体的附属信念和规则。

3. **反向验证**：如果这个核心信念是真的，它会导致哪些行为模式？这些行为是否与用户描述的吻合？如果不吻合，调整核心信念的推测。

4. **与已有信念关联**：检测用户描述与已有节点的语义相似性、逻辑关系。

**关键能力：**
1. 深度追溯：掘到最底层——反复问自己"这背后还有什么？"直到触及关于自我价值/安全感/归属感/能力的根本假设
2. 核心信念命名：给核心信念一个简洁有力的名字（≤10字），让用户能立刻感知到"这说的就是我"
3. 反向逻辑推导：从核心信念出发，推导行为表现，与用户描述交叉验证
4. 相似检测：指出哪些已有节点相关、相似程度、以及建议操作（merge=建议合并，refine=建议精炼已有节点，connect=建议建立连接，keep_separate=虽相似但建议保持独立）
5. 逻辑梳理：发现信念之间可能的因果、矛盾、强化等逻辑关系
6. 视角转化：用另一种角度重新描述用户的困扰

只返回 JSON（不要 markdown）：
{
  "coreBeliefName": "核心信念的简洁命名（≤10字），如'我不够好''我必须完美''我不可爱'等",
  "possibleCoreBelief": "可能的核心信念详细描述，以'在内心深处，你可能相信...'开头，约30-50字",
  "possibleSubBeliefs": ["附属信念表述，每个≤25字"],
  "reverseDerivation": "从核心信念反向推导：如果是这样，你会表现出...（列出与用户描述吻合的行为，约40-60字）",
  "possiblePatterns": ["思维/情绪模式描述"],
  "insight": "温柔的觉察文字，呈现可能性而非断言，约80-120字",
  "suggestedNodes": [
    {"content": "简洁节点表述（≤20字）", "type": "core_belief|sub_belief|thought_emotion_pattern|thought|emotion|behavior|material_reality"}
  ],
  "similarExistingNodes": [
    {
      "nodeId": "已有节点ID",
      "content": "已有节点内容",
      "similarityNote": "简要说明相似之处，约15-25字",
      "suggestion": "merge|refine|connect|keep_separate"
    }
  ],
  "logicalConnections": [
    {
      "fromId": "来源节点ID（可以是已有节点的ID或suggestedNodes中的位置描述）",
      "toId": "目标节点ID",
      "relation": "因果关系|矛盾冲突|相互强化|层级包含|并列相关",
      "description": "关系描述约15-25字"
    }
  ],
  "reframedPerspective": "换一个角度重新审视这段话，温柔地呈现新的可能性，约40-60字。可留空字符串''但不可省略此字段。"
}

suggestedNodes 不超过 8 个，type 严格使用枚举值。核心信念节点放在第一位。
similarExistingNodes 最多 3 个，只标记真正语义相似的节点。
logicalConnections 最多 4 个，优先标注重要的逻辑关系。
coreBeliefName 必须简洁有力，像一面镜子让用户立刻感到被理解。
reverseDerivation 是检验核心信念是否合理的逻辑推导，必须包含。
reframedPerspective 必须存在（即使是空字符串）。

原则：用试探性表述（"也许""或许""有时候"）；不用心理诊断术语；核心信念要挖到根本，不是表面想法；像一面温柔的镜子，让用户看到自己没看到的。`

const REVIEW_SYSTEM = `你是一个温柔的信念梳理助手。用户正在做定期信念回顾。

你会收到用户标记的信念节点和连接关系。回顾类型：{reviewType}（monthly=每月盘点长期信念，weekly=每周清理标记节点）。

对每个节点，你需要温柔地思索：这个信念可能正在帮助用户，还是可能正在限制用户？并据此给出态度建议。

态度说明：
- break（建议破除）：这个信念似乎给用户带来限制、压力或痛苦，可能值得放下
- strengthen（建议坚定）：这个信念似乎在支持用户、带来力量或积极影响，可能值得强化
- observe（建议观察）：暂不确定，保持觉察看看

只返回 JSON（不要 markdown）：
{
  "overallInsight": "一段整体觉察文字，温柔不带评判，像在轻声询问，约80-120字",
  "nodeInsights": [
    {
      "nodeId": "节点ID",
      "observation": "温柔观察约20-30字",
      "suggestion": "开放式提问如'这个表述是否依然准确？'",
      "suggestedAttitude": "break | strengthen | observe"
    }
  ],
  "patternObservations": [
    {"description": "信念关联模式约30-50字", "relatedNodeIds": ["节点ID"]}
  ]
}

原则：语气温柔像朋友轻轻问问题；不用诊断性语言；monthly关注整体结构变化，weekly关注标记节点更新；节点少（<3个）时简单鼓励即可；不评判信念对错；suggestedAttitude 要温柔，基于信念内容本身判断而非直接断言。`

// ====== 公开 API ======

/**
 * 输入分类 + 润色
 */
export async function classifyInput(
  content: string,
  existingNodes: Array<{ id: string; content: string; type: string }>,
): Promise<ClassifyResult | null> {
  const userMessage = JSON.stringify({
    userInput: content,
    existingNodes: existingNodes.map(n => ({
      id: n.id,
      content: n.content.slice(0, 30),
      type: n.type,
    })),
  })

  const raw = await deepseekChat(CLASSIFY_SYSTEM, userMessage, { timeout: 20_000, maxTokens: 600 })
  if (!raw) return null

  const type = validateNodeType(raw.type)
  if (!type) return null

  return {
    type,
    polishedContent: String(raw.polishedContent ?? content),
    category: validateCategory(raw.category),
    relatedNodeIds: Array.isArray(raw.relatedNodeIds)
      ? raw.relatedNodeIds.filter((id: unknown) => typeof id === 'string')
      : [],
    gentleInsight: String(raw.gentleInsight ?? ''),
  }
}

/**
 * 深度觉察：行为 → 信念追溯
 */
export async function traceBelief(
  description: string,
  existingNodes: Array<{ id: string; content: string; type: string }>,
): Promise<TraceResult | null> {
  const userMessage = JSON.stringify({
    userDescription: description,
    existingNodes: existingNodes.map(n => ({
      id: n.id,
      content: n.content.slice(0, 30),
      type: n.type,
    })),
  })

  const raw = await deepseekChat(TRACE_SYSTEM, userMessage, { timeout: 45_000, maxTokens: 1800 })
  if (!raw) return null

  const suggestedNodes = Array.isArray(raw.suggestedNodes)
    ? raw.suggestedNodes
        .filter((n: any) => typeof n?.content === 'string' && validateNodeType(n?.type))
        .slice(0, 8)
        .map((n: any) => ({ content: String(n.content), type: n.type as BeliefNode['type'] }))
    : []

  const similarExistingNodes = Array.isArray(raw.similarExistingNodes)
    ? raw.similarExistingNodes
        .filter((n: any) =>
          typeof n?.nodeId === 'string' &&
          typeof n?.content === 'string' &&
          typeof n?.similarityNote === 'string' &&
          ['merge', 'refine', 'connect', 'keep_separate'].includes(n?.suggestion)
        )
        .slice(0, 3)
        .map((n: any) => ({
          nodeId: String(n.nodeId),
          content: String(n.content),
          similarityNote: String(n.similarityNote),
          suggestion: n.suggestion as 'merge' | 'refine' | 'connect' | 'keep_separate',
        }))
    : []

  const logicalConnections = Array.isArray(raw.logicalConnections)
    ? raw.logicalConnections
        .filter((c: any) =>
          typeof c?.fromId === 'string' &&
          typeof c?.toId === 'string' &&
          typeof c?.relation === 'string' &&
          typeof c?.description === 'string'
        )
        .slice(0, 4)
        .map((c: any) => ({
          fromId: String(c.fromId),
          toId: String(c.toId),
          relation: String(c.relation),
          description: String(c.description),
        }))
    : []

  return {
    coreBeliefName: String(raw.coreBeliefName ?? raw.possibleCoreBelief ?? '').slice(0, 20),
    possibleCoreBelief: String(raw.possibleCoreBelief ?? ''),
    possibleSubBeliefs: Array.isArray(raw.possibleSubBeliefs)
      ? raw.possibleSubBeliefs.filter((s: unknown) => typeof s === 'string')
      : [],
    reverseDerivation: String(raw.reverseDerivation ?? ''),
    possiblePatterns: Array.isArray(raw.possiblePatterns)
      ? raw.possiblePatterns.filter((s: unknown) => typeof s === 'string')
      : [],
    insight: String(raw.insight ?? ''),
    suggestedNodes,
    similarExistingNodes,
    logicalConnections,
    reframedPerspective: String(raw.reframedPerspective ?? ''),
  }
}

const FOLLOW_UP_SYSTEM = `你是一个温柔的信念探索助手。用户已经看到了你的初始分析，现在要继续深入探讨。

**关键：你是在已有分析的基础上进行修正和补充，而不是从头开始。**

用户可能会说：
- "这个信念不太准确" → 修正那条建议，给出更准的表述
- "还想加入XX信念" → 在保留原有建议的基础上新增
- "这个说得很对" → 保留这个建议
- "帮我再深入看看" → 在原有基础上补充更深的分析

你的任务：
1. 保留用户认可的分析和建议
2. 修正用户觉得不准确的建议
3. 根据用户的新输入补充新的建议
4. insight 应该回应对话历史中的最新问题

只返回 JSON（不要 markdown）：
{
  "coreBeliefName": "如果用户认可则保留原名，否则更新（≤10字）",
  "possibleCoreBelief": "可能更新的核心信念描述",
  "possibleSubBeliefs": ["附属信念表述"],
  "reverseDerivation": "反向推导",
  "possiblePatterns": ["思维/情绪模式描述"],
  "insight": "回应用户追问的觉察文字，约80-120字",
  "suggestedNodes": [
    {"content": "节点内容（≤20字）", "type": "core_belief|sub_belief|thought_emotion_pattern|thought|emotion|behavior|material_reality"}
  ],
  "similarExistingNodes": [],
  "logicalConnections": [],
  "reframedPerspective": ""
}

suggestedNodes 不超过 8 个，type 严格使用枚举值。
**重要：suggestedNodes 应该包含之前分析中仍然有效的建议 + 根据用户反馈修正的 + 新增的。总数不超过 8 个。**
similarExistingNodes 保持空数组（不用每次都检测相似）。
原则：像朋友在对话中逐渐深入理解你，保留对的，修正错的，补充新的。`

/**
 * 深度探索多轮追问
 * @param originalDescription 原始用户输入
 * @param conversationHistory 对话历史 [{role, content}]
 * @param existingNodes 已有节点
 * @param existingSuggestions 已有的建议节点（用于保留/修正）
 */
export async function continueTrace(
  originalDescription: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  existingNodes: Array<{ id: string; content: string; type: string }>,
  existingSuggestions?: Array<{ content: string; type: string }>,
): Promise<TraceResult | null> {
  const userMessage = JSON.stringify({
    userDescription: originalDescription,
    existingNodes: existingNodes.map(n => ({
      id: n.id,
      content: n.content.slice(0, 30),
      type: n.type,
    })),
    existingSuggestions: existingSuggestions?.map(s => ({ content: s.content, type: s.type })) ?? [],
    context: '这是继续对话。请在上一次分析的基础上进行修正和补充，不要完全重写。保留仍然有效的建议，修正不准确的，补充新的。总数不超过 8 个 suggestedNodes。',
  })

  const raw = await deepseekChat(FOLLOW_UP_SYSTEM, userMessage, {
    timeout: 45_000,
    maxTokens: 1800,
    previousMessages: conversationHistory,
  })
  if (!raw) return null

  const suggestedNodes = Array.isArray(raw.suggestedNodes)
    ? raw.suggestedNodes
        .filter((n: any) => typeof n?.content === 'string' && validateNodeType(n?.type))
        .slice(0, 8)
        .map((n: any) => ({ content: String(n.content), type: n.type as BeliefNode['type'] }))
    : []

  const similarExistingNodes = Array.isArray(raw.similarExistingNodes)
    ? raw.similarExistingNodes
        .filter((n: any) =>
          typeof n?.nodeId === 'string' &&
          typeof n?.content === 'string' &&
          typeof n?.similarityNote === 'string' &&
          ['merge', 'refine', 'connect', 'keep_separate'].includes(n?.suggestion)
        )
        .slice(0, 3)
        .map((n: any) => ({
          nodeId: String(n.nodeId),
          content: String(n.content),
          similarityNote: String(n.similarityNote),
          suggestion: n.suggestion as 'merge' | 'refine' | 'connect' | 'keep_separate',
        }))
    : []

  const logicalConnections = Array.isArray(raw.logicalConnections)
    ? raw.logicalConnections
        .filter((c: any) =>
          typeof c?.fromId === 'string' &&
          typeof c?.toId === 'string' &&
          typeof c?.relation === 'string' &&
          typeof c?.description === 'string'
        )
        .slice(0, 4)
        .map((c: any) => ({
          fromId: String(c.fromId),
          toId: String(c.toId),
          relation: String(c.relation),
          description: String(c.description),
        }))
    : []

  return {
    coreBeliefName: String(raw.coreBeliefName ?? raw.possibleCoreBelief ?? '').slice(0, 20),
    possibleCoreBelief: String(raw.possibleCoreBelief ?? ''),
    possibleSubBeliefs: Array.isArray(raw.possibleSubBeliefs)
      ? raw.possibleSubBeliefs.filter((s: unknown) => typeof s === 'string')
      : [],
    reverseDerivation: String(raw.reverseDerivation ?? ''),
    possiblePatterns: Array.isArray(raw.possiblePatterns)
      ? raw.possiblePatterns.filter((s: unknown) => typeof s === 'string')
      : [],
    insight: String(raw.insight ?? ''),
    suggestedNodes,
    similarExistingNodes,
    logicalConnections,
    reframedPerspective: String(raw.reframedPerspective ?? ''),
  }
}

/**
 * 定期梳理
 */
export async function reviewBeliefs(
  nodes: Array<{ id: string; content: string; type: string; attitude?: string; isLongTerm?: boolean }>,
  edges: Array<{ sourceId: string; targetId: string }>,
  reviewType: 'monthly' | 'weekly' | 'daily',
): Promise<ReviewResult | null> {
  const systemPrompt = REVIEW_SYSTEM.replace('{reviewType}', reviewType)

  const userMessage = JSON.stringify({
    reviewType,
    nodes: nodes.map(n => ({
      id: n.id,
      content: n.content,
      type: n.type,
      attitude: n.attitude,
      isLongTerm: n.isLongTerm,
    })),
    edges: edges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId })),
  })

  const raw = await deepseekChat(systemPrompt, userMessage, { timeout: 40_000, maxTokens: 1500 })
  if (!raw) return null

  return {
    overallInsight: String(raw.overallInsight ?? ''),
    nodeInsights: Array.isArray(raw.nodeInsights)
      ? raw.nodeInsights
          .filter((n: any) => typeof n?.nodeId === 'string')
          .map((n: any) => ({
            nodeId: String(n.nodeId),
            observation: String(n.observation ?? ''),
            suggestion: String(n.suggestion ?? ''),
            suggestedAttitude: validateAttitude(n.suggestedAttitude),
          }))
      : [],
    patternObservations: Array.isArray(raw.patternObservations)
      ? raw.patternObservations
          .filter((p: any) => typeof p?.description === 'string')
          .map((p: any) => ({
            description: String(p.description),
            relatedNodeIds: Array.isArray(p.relatedNodeIds)
              ? p.relatedNodeIds.filter((id: unknown) => typeof id === 'string')
              : [],
          }))
      : [],
  }
}

// ====== 链路深度挖掘 ======

export interface ChainExploreResult {
  insight: string
  /** 建议新增的节点 */
  suggestedNodes: Array<{ content: string; type: BeliefNode['type'] }>
  /** 建议替换的节点（更精准的表达） */
  suggestedRefinements: Array<{
    nodeId: string
    originalContent: string
    refinedContent: string
    reason: string
  }>
  /** 链路中可能缺失的环节 */
  missingLinks: Array<{
    fromContent: string
    toContent: string
    relation: string
    suggestedNode?: { content: string; type: BeliefNode['type'] }
  }>
}

const CHAIN_EXPLORE_SYSTEM = `你是一个温柔的信念探索助手。用户给你一条已有的信念链路（一系列相互连接的信念节点），请你帮助深度挖掘这条链路。

你的任务：
1. 分析这条链路的逻辑结构，给出整体洞察
2. 发现链路中可以优化表达的信念，给出更精准的替代表述
3. 发现链路中可能缺失的环节（两个节点之间可能需要一个中间节点来桥接）
4. 建议可以新增的信念节点来丰富这条链路

只返回 JSON：
{
  "insight": "对整条链路的温柔洞察，像在轻声解读一个故事，约80-120字",
  "suggestedNodes": [
    {"content": "建议新增的节点内容（≤20字）", "type": "core_belief|sub_belief|thought_emotion_pattern|thought|emotion|behavior|material_reality"}
  ],
  "suggestedRefinements": [
    {
      "nodeId": "需要优化的节点ID",
      "originalContent": "原来的表述",
      "refinedContent": "更精准的表述",
      "reason": "为什么建议优化，约15-25字"
    }
  ],
  "missingLinks": [
    {
      "fromContent": "上游节点内容（或ID）",
      "toContent": "下游节点内容（或ID）",
      "relation": "缺失的连接关系描述",
      "suggestedNode": {"content": "建议的中间节点", "type": "thought_emotion_pattern|thought|emotion|behavior"}
    }
  ]
}

suggestedNodes 不超过 5 个，suggestedRefinements 不超过 4 个，missingLinks 不超过 3 个。
原则：温柔解读、不评判对错、像朋友轻语。`

export async function exploreChain(
  chainNodes: Array<{ id: string; content: string; type: string }>,
  chainEdges: Array<{ sourceId: string; targetId: string }>,
): Promise<ChainExploreResult | null> {
  const userMessage = JSON.stringify({
    chain: chainNodes.map(n => ({ id: n.id, content: n.content, type: n.type })),
    edges: chainEdges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId })),
  })

  const raw = await deepseekChat(CHAIN_EXPLORE_SYSTEM, userMessage, { timeout: 45_000, maxTokens: 1800 })
  if (!raw) return null

  const suggestedNodes = Array.isArray(raw.suggestedNodes)
    ? raw.suggestedNodes
        .filter((n: any) => typeof n?.content === 'string' && validateNodeType(n?.type))
        .slice(0, 5)
        .map((n: any) => ({ content: String(n.content), type: n.type as BeliefNode['type'] }))
    : []

  const suggestedRefinements = Array.isArray(raw.suggestedRefinements)
    ? raw.suggestedRefinements
        .filter((r: any) =>
          typeof r?.nodeId === 'string' &&
          typeof r?.originalContent === 'string' &&
          typeof r?.refinedContent === 'string' &&
          typeof r?.reason === 'string'
        )
        .slice(0, 4)
        .map((r: any) => ({
          nodeId: String(r.nodeId),
          originalContent: String(r.originalContent),
          refinedContent: String(r.refinedContent),
          reason: String(r.reason),
        }))
    : []

  const missingLinks = Array.isArray(raw.missingLinks)
    ? raw.missingLinks
        .filter((m: any) =>
          typeof m?.fromContent === 'string' &&
          typeof m?.toContent === 'string' &&
          typeof m?.relation === 'string'
        )
        .slice(0, 3)
        .map((m: any) => ({
          fromContent: String(m.fromContent),
          toContent: String(m.toContent),
          relation: String(m.relation),
          suggestedNode: m.suggestedNode && typeof m.suggestedNode?.content === 'string' && validateNodeType(m.suggestedNode?.type)
            ? { content: String(m.suggestedNode.content), type: m.suggestedNode.type as BeliefNode['type'] }
            : undefined,
        }))
    : []

  return {
    insight: String(raw.insight ?? ''),
    suggestedNodes,
    suggestedRefinements,
    missingLinks,
  }
}

// ====== 类型校验 ======

const VALID_NODE_TYPES = new Set<BeliefNode['type']>([
  'core_belief', 'sub_belief', 'thought_emotion_pattern',
  'thought', 'emotion', 'behavior', 'material_reality', 'seed',
])

function validateNodeType(value: unknown): BeliefNode['type'] | null {
  if (typeof value === 'string' && VALID_NODE_TYPES.has(value as BeliefNode['type'])) {
    return value as BeliefNode['type']
  }
  return null
}

const VALID_ATTITUDES = new Set(['break', 'strengthen', 'observe'])

function validateAttitude(value: unknown): 'break' | 'strengthen' | 'observe' | undefined {
  if (typeof value === 'string' && VALID_ATTITUDES.has(value)) {
    return value as 'break' | 'strengthen' | 'observe'
  }
  return undefined
}

const VALID_CATEGORIES = new Set(['study', 'work', 'life', 'money', 'love', 'friendship', 'family', 'health', 'self', 'other'])

function validateCategory(value: unknown): import('../db').Category | undefined {
  if (typeof value === 'string' && VALID_CATEGORIES.has(value)) {
    return value as import('../db').Category
  }
  return undefined
}
