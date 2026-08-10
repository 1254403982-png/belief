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

/** 中文分词：取连续中文字符作为词（≥2字），去停用词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  // 提取中文词组（2-4 字）
  const matches = text.match(/[一-鿿]{2,4}/g)
  if (!matches) return tokens
  for (const m of matches) {
    if (!STOP_WORDS.has(m) && m.length >= 2) tokens.push(m)
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

/** 从书本中检索最相关的 N 个片段 */
export function searchBook(book: BookData, query: string, topN = 5): SearchResult[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const scored = book.chunks.map(chunk => ({
    chapter: chunk.chapter,
    snippet: chunk.text.slice(0, 1200), // 截取前 1200 字
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
