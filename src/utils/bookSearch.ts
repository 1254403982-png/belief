/**
 * 书本知识库检索 —— 前端关键词匹配，不调 API
 */
import type { BookData, SearchResult } from '../data/books/types'

// 中文停用词
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '什么', '怎么', '如何', '为什么', '可以', '这个', '那个', '还是',
  '但', '而', '与', '或', '之', '被', '从', '以', '及', '等', '所',
  '能', '让', '把', '将', '对', '向', '于', '其', '中', '已', '更',
  '最', '只', '又', '才', '刚', '便', '则', '却', '因为', '所以',
  '如果', '虽然', '但是', '然而', '然后', '于是', '因此', '不过',
])

/** 中文分词：滑动窗口生成 2-gram + 3-gram，去停用词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  // 先提取纯中文序列
  const cleaned = text.replace(/[^一-鿿]+/g, '')
  if (cleaned.length < 2) return tokens

  // 滑动 2-gram
  for (let i = 0; i <= cleaned.length - 2; i++) {
    const bigram = cleaned.slice(i, i + 2)
    if (!STOP_WORDS.has(bigram)) tokens.push(bigram)
  }
  // 滑动 3-gram
  for (let i = 0; i <= cleaned.length - 3; i++) {
    const trigram = cleaned.slice(i, i + 3)
    if (!STOP_WORDS.has(trigram)) tokens.push(trigram)
  }
  return tokens
}

function scoreChunk(queryTokens: string[], chunkText: string): number {
  let score = 0
  for (const t of queryTokens) {
    // 精确匹配得分最高
    const count = (chunkText.match(new RegExp(t, 'g')) || []).length
    if (count > 0) score += 1 + Math.log2(count + 1)
  }
  // 短片段惩罚
  if (chunkText.length < 200) score *= 0.5
  return score
}

function excerptAroundMatch(text: string, queryTokens: string[]): string {
  const matches = queryTokens.map(token => text.indexOf(token)).filter(index => index >= 0)
  const firstMatch = matches.length > 0 ? Math.min(...matches) : 0
  const start = Math.max(0, firstMatch - 280)
  const end = Math.min(text.length, start + 1600)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/** 从书本中检索最相关的 N 个片段 */
export function searchBook(book: BookData, query: string, topN = 5): SearchResult[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const scored = book.chunks.map(chunk => ({
    chapter: chunk.chapter,
    snippet: excerptAroundMatch(chunk.text, tokens),
    score: scoreChunk(tokens, chunk.text),
  }))

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/** 估算字符数 */
export function estimateChars(text: string): number {
  return text.replace(/\s/g, '').length
}
