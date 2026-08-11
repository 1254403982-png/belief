import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BookData, SearchResult } from '../data/books/types'
import { searchBook } from '../utils/bookSearch'
import { askBook } from '../utils/deepseek'
import { useBeliefStore } from '../stores/useBeliefStore'

interface Props {
  open: boolean
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function BookQAPanel({ open, onClose }: Props) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [books, setBooks] = useState<BookData[]>([])
  const [flashAi, setFlashAi] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 懒加载书本数据
  useEffect(() => {
    if (open && books.length === 0) {
      import('../data/books/registry').then(m => setBooks(m.books))
    }
  }, [open, books.length])

  const selectedBook = selectedBookId ? books.find((b: BookData) => b.meta.id === selectedBookId) : undefined
  const messages = selectedBookId ? (messagesMap[selectedBookId] ?? []) : []

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSelectBook = (id: string) => setSelectedBookId(id)

  const handleBack = () => {
    setSelectedBookId(null)
  }

  const appendMessage = (bookId: string, msg: Message) => {
    setMessagesMap(prev => ({ ...prev, [bookId]: [...(prev[bookId] ?? []), msg] }))
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q || !selectedBook || loading) return

    if (!aiEnabled) {
      setFlashAi(true)
      setTimeout(() => setFlashAi(false), 600)
      return
    }

    const bookId = selectedBook.meta.id
    setInput('')
    appendMessage(bookId, { role: 'user', content: q })
    setLoading(true)

    // 1. 本地检索
    const results = searchBook(selectedBook, q, 5)

    if (results.length === 0) {
      appendMessage(bookId, {
        role: 'assistant',
        content: '书中没有找到与这个问题直接相关的内容。试试换个问法，或者用书中的关键词来提问？',
      })
      setLoading(false)
      return
    }

    // 2. AI 回答（附带用户信念作为个人背景）
    const nodes = useBeliefStore.getState().nodes
    const answer = await askBook(
      selectedBook.meta.title,
      q,
      results.map((r: SearchResult) => ({ chapter: r.chapter, snippet: r.snippet })),
      nodes.length > 0 ? nodes.map(n => n.content) : undefined,
    )

    if (answer) {
      appendMessage(bookId, { role: 'assistant', content: answer })
    } else {
      appendMessage(bookId, {
        role: 'assistant',
        content: '抱歉，暂时无法回答。请确认已设置激活码，或稍后再试。',
      })
    }

    setLoading(false)
  }

  const handleClose = () => {
    setSelectedBookId(null)
    setMessagesMap({})
    setInput('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          {/* 遮罩 */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(74, 64, 54, 0.06)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* 面板 */}
          <motion.div
            className="relative w-full max-w-lg mx-6 rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'rgba(255, 251, 245, 0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #E0D8CC',
              boxShadow: '0 8px 40px rgba(74, 64, 54, 0.1)',
              maxHeight: '80vh',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                {selectedBook ? `📖 ${selectedBook.meta.title}` : '📚 书本问答'}
              </h3>
              <div className="flex items-center gap-2">
                {selectedBook && (
                  <button
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: '#9C9088' }}
                    onClick={handleBack}
                  >
                    ← 返回
                  </button>
                )}
                <button
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: '#9C9088' }}
                  onClick={handleClose}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1" ref={scrollRef} style={{ maxHeight: 'calc(80vh - 70px)' }}>
              {!selectedBook ? (
                /* 书本列表 */
                <div className="px-6 pb-6 space-y-3">
                  <p className="text-sm" style={{ color: '#9C9088' }}>
                    选择一本书，基于书中内容提问。AI 会从书中检索相关段落并回答。
                  </p>
                  {books.map(book => (
                    <button
                      key={book.meta.id}
                      className="w-full text-left px-4 py-3.5 rounded-xl transition-all hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.06)',
                        border: '1px solid rgba(200, 169, 110, 0.12)',
                      }}
                      onClick={() => handleSelectBook(book.meta.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{book.meta.emoji}</span>
                        <span className="font-serif text-base" style={{ color: '#4A4036' }}>
                          {book.meta.title}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#9C9088' }}>
                        {book.meta.author}
                      </p>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#6B6560' }}>
                        {book.meta.description}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                /* 问答聊天 */
                <div className="px-6 pb-6">
                  {/* 书本简介 */}
                  <div
                    className="px-3 py-2.5 rounded-lg mb-4 text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.05)',
                      borderLeft: '2px solid #C8A96E',
                      color: '#6B6560',
                    }}
                  >
                    {selectedBook.meta.description}
                  </div>

                  {/* 消息列表 */}
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="text-sm text-center py-8" style={{ color: '#C4B8B0' }}>
                        在下方输入你对本书的疑问
                      </p>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                        <div
                          className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
                          style={msg.role === 'user' ? {
                            backgroundColor: 'rgba(200, 169, 110, 0.12)',
                            color: '#4A4036',
                            borderRadius: '16px 16px 4px 16px',
                          } : {
                            backgroundColor: 'rgba(139, 164, 188, 0.08)',
                            color: '#4A4036',
                            borderRadius: '16px 16px 16px 4px',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex items-center gap-2 py-2">
                        <span className="inline-block w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: '#C8A96E' }}
                        />
                        <span className="text-xs" style={{ color: '#C4B8B0' }}>思考中...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 输入框（仅在聊天视图显示） */}
            {selectedBook && (
              <div className="flex-shrink-0 px-6 pb-5 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(74, 64, 54, 0.04)',
                      border: '1px solid #E0D8CC',
                      color: '#4A4036',
                    }}
                    placeholder={aiEnabled ? '输入你的疑问，回车发送...' : '先点亮 AI 按钮，再输入提问...'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  />
                  {/* AI 功能启用键 */}
                  <motion.button
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all select-none"
                    style={{
                      backgroundColor: aiEnabled ? 'rgba(200, 169, 110, 0.18)' : 'rgba(200, 169, 110, 0.05)',
                      border: aiEnabled ? '1.5px solid #C8A96E' : '1.5px solid rgba(200, 169, 110, 0.15)',
                      color: aiEnabled ? '#8B6914' : '#C4B8B0',
                    }}
                    animate={flashAi ? { scale: [1, 1.15, 1], borderColor: ['#C8A96E', '#E8A840', '#C8A96E'] } : {}}
                    transition={{ duration: 0.3 }}
                    onClick={() => setAiEnabled(v => !v)}
                    title={aiEnabled ? 'AI 已启用 · 点击关闭' : '点击启用 AI 问答'}
                  >
                    <span className="font-serif text-[11px] font-bold tracking-wider">AI</span>
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
