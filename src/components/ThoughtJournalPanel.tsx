import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, type ThoughtJournal } from '../db'
import { formatDate } from './utils'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ThoughtJournalPanel({ open, onClose }: Props) {
  const [journals, setJournals] = useState<ThoughtJournal[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isNew, setIsNew] = useState(false)

  const userId = localStorage.getItem('currentUserId') || ''

  useEffect(() => {
    if (!open) return
    loadJournals()
  }, [open])

  const loadJournals = async () => {
    const list = await db.thoughtJournals
      .where('userId').equals(userId)
      .reverse()
      .sortBy('createdAt')
    setJournals(list)
  }

  const handleNew = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setIsNew(true)
  }

  const handleEdit = (j: ThoughtJournal) => {
    setEditingId(j.id)
    setTitle(j.title)
    setContent(j.content)
    setIsNew(false)
  }

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return
    if (isNew) {
      const journal: ThoughtJournal = {
        id: crypto.randomUUID(),
        userId,
        title: title.trim() || '无标题',
        content: content.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.thoughtJournals.add(journal)
    } else if (editingId) {
      await db.thoughtJournals.update(editingId, {
        title: title.trim() || '无标题',
        content: content.trim(),
        updatedAt: new Date(),
      })
    }
    setEditingId(null)
    setIsNew(false)
    setTitle('')
    setContent('')
    await loadJournals()
  }

  const handleDelete = async (id: string) => {
    await db.thoughtJournals.delete(id)
    await loadJournals()
    if (editingId === id) {
      setEditingId(null)
      setIsNew(false)
      setTitle('')
      setContent('')
    }
  }

  const handleClose = () => {
    setEditingId(null)
    setIsNew(false)
    setTitle('')
    setContent('')
    onClose()
  }


  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          <motion.div
            className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                深度思考
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: '#9C9088' }}
                  onClick={handleNew}
                >
                  + 新建
                </button>
                <button
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: '#9C9088' }}
                  onClick={handleClose}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 编辑器 */}
            {(isNew || editingId) && (
              <div className="px-6 pb-4 space-y-3">
                <input
                  className="input-underline w-full"
                  type="text"
                  placeholder="标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                <textarea
                  className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all"
                  style={{
                    borderColor: '#E0D8CC',
                    color: '#4A4036',
                    fontFamily: 'inherit',
                    minHeight: 100,
                  }}
                  placeholder="写下你的思考..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setIsNew(false)
                      setTitle('')
                      setContent('')
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    className="text-xs px-3 py-1 rounded-full btn-soft"
                    onClick={handleSave}
                  >
                    保存
                  </button>
                  <button
                    className="text-xs px-3 py-1"
                    style={{ color: '#9C9088' }}
                    onClick={() => {
                      setEditingId(null)
                      setIsNew(false)
                      setTitle('')
                      setContent('')
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {journals.length === 0 && !isNew && (
                <p className="text-sm text-center py-8" style={{ color: '#C4B8B0' }}>
                  还没有思考记录
                </p>
              )}
              <div className="space-y-2">
                {journals.map((j) => (
                  <div
                    key={j.id}
                    className="px-3 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: editingId === j.id
                        ? 'rgba(200, 169, 110, 0.08)'
                        : 'rgba(200, 169, 110, 0.03)',
                      border: editingId === j.id
                        ? '1px solid rgba(200, 169, 110, 0.25)'
                        : '1px solid transparent',
                    }}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleEdit(j)}
                    >
                      <div className="min-w-0 flex-1">
                        <span
                          className="text-sm block"
                          style={{ color: '#4A4036', wordBreak: 'break-word' }}
                        >
                          {j.title}
                        </span>
                        <span className="text-xs" style={{ color: '#C4B8B0' }}>
                          {formatDate(j.createdAt)}
                        </span>
                      </div>
                      <button
                        className="text-xs flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
                        style={{ color: '#C8A080' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(j.id)
                        }}
                      >
                        删除
                      </button>
                    </div>
                    {/* 展开预览 */}
                    {editingId !== j.id && j.content && (
                      <p
                        className="text-xs mt-1.5 leading-relaxed"
                        style={{ color: '#9C9088', wordBreak: 'break-word' }}
                      >
                        {j.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
