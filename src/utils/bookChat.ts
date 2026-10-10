import { db, type BookChat, type BookChatMessage } from '../db'

function chatId(userId: string, bookId: string): string {
  return JSON.stringify([userId, bookId])
}

export async function loadBookChats(userId: string): Promise<BookChat[]> {
  if (!userId) return []
  return db.bookChats.where('userId').equals(userId).toArray()
}

export async function appendBookChatMessage(
  userId: string,
  bookId: string,
  message: BookChatMessage,
): Promise<BookChat> {
  if (!userId || !bookId) throw new Error('缺少账号或书籍')

  return db.transaction('rw', db.bookChats, async () => {
    const id = chatId(userId, bookId)
    const existing = await db.bookChats.get(id)
    if (existing?.messages.some(item => item.id === message.id)) return existing
    const now = new Date()
    const chat: BookChat = existing
      ? { ...existing, messages: [...existing.messages, message], updatedAt: now }
      : { id, userId, bookId, messages: [message], createdAt: now, updatedAt: now }
    await db.bookChats.put(chat)
    return chat
  })
}
