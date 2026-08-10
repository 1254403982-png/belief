/** 书本知识库共享类型 */

export interface BookChunk {
  chapter: string   // 章节名
  text: string      // 正文
}

export interface BookMeta {
  id: string
  title: string
  author: string
  description: string
  emoji: string
}

export interface BookData {
  meta: BookMeta
  chunks: BookChunk[]
}

/** 检索结果 */
export interface SearchResult {
  chapter: string
  snippet: string   // 相关段落（截取前后文）
  score: number
}
