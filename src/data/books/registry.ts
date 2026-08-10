import type { BookData } from './types'
import { soulEternal } from './soul-eternal'

/** 新增书本在这里注册 */
export const books: BookData[] = [soulEternal]

export function getBook(id: string): BookData | undefined {
  return books.find(b => b.meta.id === id)
}
