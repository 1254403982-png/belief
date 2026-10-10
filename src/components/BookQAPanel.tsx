import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BookData, SearchResult } from '../data/books/types'
import BookAnswer from './BookAnswer'
import { searchBook } from '../utils/bookSearch'
import { selectBookBeliefs } from '../utils/bookBeliefs'
import { askBook } from '../utils/deepseek'
import { useBeliefStore } from '../stores/useBeliefStore'

interface Props {
  open: boolean
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  mode?: 'book' | 'personal'
  sources?: string[]
}

export default function BookQAPanel({ open, onClose }: Props) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [includeBeliefs, setIncludeBeliefs] = useState(false)
  const [books, setBooks] = useState<BookData[]>([])
  const nodes = useBeliefStore(state => state.nodes)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 懒加载书本数据
  useEffect(() => {
    if (open && books.length === 0) {
      import('../data/books/registry').then(m => setBooks(m.books))
    }
  }, [open, books.length])

  const selectedBook = selectedBookId ? books.find((b: BookData) => b.meta.id === selectedBookId) : undefined
  const messages = selectedBookId ? (messagesMap[selectedBookId] ?? []) : []
  const personalBeliefs = selectBookBeliefs(nodes, localStorage.getItem('currentUserId') ?? '')

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSelectBook = (id: string) => {
    setIncludeBeliefs(false)
    setSelectedBookId(id)
  }

  const handleBack = () => {
    setIncludeBeliefs(false)
    setSelectedBookId(null)
  }

  const appendMessage = (bookId: string, msg: Message) => {
    setMessagesMap(prev => ({ ...prev, [bookId]: [...(prev[bookId] ?? []), msg] }))
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q || !selectedBook || loading) return

    const bookId = selectedBook.meta.id
    const usePersonal = includeBeliefs && personalBeliefs.length > 0
    setInput('')
    setIncludeBeliefs(false)
    appendMessage(bookId, { role: 'user', content: q, mode: usePersonal ? 'personal' : 'book' })
    setLoading(true)

    // 1. 本地检索
    const results = searchBook(selectedBook, q, 5)

    if (results.length === 0) {
      appendMessage(bookId, {
        role: 'assistant',
        content: '当前收录的章节里没有检索到直接相关的段落。可以换个问法，或试试书中的关键词。',
      })
      setLoading(false)
      return
    }

    // 只有用户主动选择个人模式时，才向模型传入画布中的信念。
    const answer = await askBook(
      selectedBook.meta.title,
      q,
      results.map((r: SearchResult) => ({ chapter: r.chapter, snippet: r.snippet })),
      usePersonal ? { personalBeliefs } : undefined,
    )

    if (answer) {
      appendMessage(bookId, { role: 'assistant', content: answer, sources: [...new Set(results.map(r => r.chapter))] })
    } else {
      appendMessage(bookId, {
        role: 'assistant',
        content: '抱歉，暂时无法回答，请稍后再试。',
      })
    }

    setLoading(false)
  }

  const handleClose = () => {
    setSelectedBookId(null)
    setMessagesMap({})
    setInput('')
    setIncludeBeliefs(false)
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
                    选择一本书，先理解书中的概念；需要时再选择是否结合自己的信念。
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
                          }}
                        >
                          {msg.role === 'user' ? (
                            <>
                              <p>{msg.content}</p>
                              <p className="text-[11px] mt-1 opacity-60">{msg.mode === 'personal' ? '结合我的信念' : '仅讲书中概念'}</p>
                            </>
                          ) : (
                            <>
                              <BookAnswer content={msg.content} />
                              {msg.sources && <p className="text-[11px] mt-2 opacity-60">检索段落：{msg.sources.join('、')}</p>}
                            </>
                          )}
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
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs" style={{ color: '#9C9088' }}>默认只解释书中概念</span>
                  <button type="button" role="switch" aria-checked={includeBeliefs}
                    aria-label="本次结合我的信念" disabled={loading || personalBeliefs.length === 0}
                    onClick={() => setIncludeBeliefs(value => !value)}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
                    style={{ color: includeBeliefs ? '#5A7A68' : '#7A7670', backgroundColor: includeBeliefs ? 'rgba(160, 200, 176, 0.15)' : 'rgba(200, 169, 110, 0.08)' }}>
                    {includeBeliefs ? '✓ ' : ''}结合我的信念
                  </button>
                </div>
                {personalBeliefs.length === 0 && <p className="text-xs mb-2" style={{ color: '#9C9088' }}>画布中还没有可参考的信念记录</p>}
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(74, 64, 54, 0.04)',
                      border: '1px solid #E0D8CC',
                      color: '#4A4036',
                    }}
                    placeholder="问一个关于这本书的问题..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void handleSend() }}
                  />
                  <button type="button" disabled={loading || !input.trim()}
                    className="flex-shrink-0 text-sm px-3 py-2 rounded-full disabled:opacity-40"
                    style={{ backgroundColor: 'rgba(200, 169, 110, 0.12)', color: '#5C4A3A' }}
                    onClick={() => void handleSend()}
                  >
                    发送
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
