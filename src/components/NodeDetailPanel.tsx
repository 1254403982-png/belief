import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type BeliefNode, CATEGORIES, type Category } from '../db'
import { getCategoryLabel, getCategoryEmoji, CATEGORY_CONFIG, getTypeLabel, formatDate, hexToRgba, getConnectedComponent } from './utils'

const TYPE_OPTIONS: { value: BeliefNode['type']; label: string }[] = [
  { value: 'core_belief', label: '核心信念' },
  { value: 'sub_belief', label: '附属信念' },
  { value: 'thought_emotion_pattern', label: '思维/情绪模式' },
  { value: 'thought', label: '想法' },
  { value: 'emotion', label: '情绪' },
  { value: 'behavior', label: '行为' },
  { value: 'material_reality', label: '物质现实' },
  { value: 'seed', label: '未分类' },
]

const ATTITUDE_OPTIONS: { value: NonNullable<BeliefNode['attitude']>; label: string; desc: string }[] = [
  { value: 'break', label: '破除', desc: '想要放下这个信念' },
  { value: 'strengthen', label: '坚定', desc: '想要强化这个信念' },
  { value: 'observe', label: '观察', desc: '保持觉察，不急着判断' },
]

export default function NodeDetailPanel() {
  const store = useBeliefStore()
  const selectedNode = store.nodes.find(n => n.id === store.selectedNodeId)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editingContent, setEditingContent] = useState(false)
  const [contentText, setContentText] = useState('')

  if (!selectedNode) return null

  const currentTypeLabel = TYPE_OPTIONS.find(t => t.value === selectedNode.type)?.label || selectedNode.type
  const currentAttitude = selectedNode.attitude

  const handleTypeChange = (type: BeliefNode['type']) => {
    store.updateNode(selectedNode.id, { type })
    db.beliefNodes.update(selectedNode.id, { type })
  }

  const handleAttitudeChange = (attitude: NonNullable<BeliefNode['attitude']> | undefined) => {
    store.updateNode(selectedNode.id, { attitude })
    db.beliefNodes.update(selectedNode.id, { attitude })
  }

  const handleNoteSave = () => {
    store.updateNode(selectedNode.id, { userNote: noteText })
    db.beliefNodes.update(selectedNode.id, { userNote: noteText })
    setEditingNote(false)
  }

  const startEditNote = () => {
    setNoteText(selectedNode.userNote || '')
    setEditingNote(true)
  }

  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          key="detail-panel"
          className="absolute z-20 flex flex-col
            max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[55vh] max-md:rounded-t-2xl max-md:border-t max-md:border-[#E0D8CC]
            md:right-0 md:top-0 md:bottom-0 md:w-80 md:border-l md:border-[#E0D8CC]"
          style={{
            backgroundColor: 'rgba(255, 251, 245, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 -4px 24px rgba(74, 64, 54, 0.06)',
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
              节点详情
            </h3>
            <button
              className="text-sm hover:opacity-70 transition-opacity"
              style={{ color: '#9C9088' }}
              onClick={() => store.selectNode(null)}
            >
              ✕
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
            {/* 节点文字 */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                  内容
                </label>
                <button
                  className="text-xs px-2 py-0.5 rounded-full transition-all hover:opacity-70"
                  style={{
                    color: '#9C9088',
                    backgroundColor: 'rgba(200, 196, 180, 0.08)',
                    border: '1px solid rgba(200, 196, 180, 0.15)',
                  }}
                  onClick={() => {
                    setContentText(selectedNode.content)
                    setEditingContent(true)
                  }}
                >
                  ✏️ 修改
                </button>
              </div>
              {editingContent ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all"
                    style={{
                      borderColor: '#E0D8CC',
                      color: '#4A4036',
                      fontFamily: 'inherit',
                      minHeight: 60,
                    }}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingContent(false)
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (contentText.trim()) {
                          store.updateNode(selectedNode.id, { content: contentText.trim() })
                          db.beliefNodes.update(selectedNode.id, { content: contentText.trim() })
                        }
                        setEditingContent(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-3 py-1 rounded-full btn-soft"
                      onClick={() => {
                        if (contentText.trim()) {
                          store.updateNode(selectedNode.id, { content: contentText.trim() })
                          db.beliefNodes.update(selectedNode.id, { content: contentText.trim() })
                        }
                        setEditingContent(false)
                      }}
                    >
                      保存
                    </button>
                    <button
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ color: '#9C9088' }}
                      onClick={() => setEditingContent(false)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
                  {selectedNode.content}
                </p>
              )}
            </section>

            {/* 类型选择 */}
            <section>
              <label className="text-xs tracking-wide mb-2 block" style={{ color: '#9C9088' }}>
                类型 · {currentTypeLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all duration-200 ${
                      selectedNode.type === t.value ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: selectedNode.type === t.value
                        ? 'rgba(200, 169, 110, 0.18)'
                        : 'rgba(200, 169, 110, 0.06)',
                      color: '#5C4A3A',
                      border: selectedNode.type === t.value
                        ? '1px solid rgba(200, 169, 110, 0.35)'
                        : '1px solid transparent',
                    }}
                    onClick={() => handleTypeChange(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 态度标记 */}
            <section>
              <label className="text-xs tracking-wide mb-2 block" style={{ color: '#9C9088' }}>
                态度标记
              </label>
              <div className="flex flex-col gap-2">
                {ATTITUDE_OPTIONS.map(a => (
                  <button
                    key={a.value}
                    className={`text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                      currentAttitude === a.value ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: currentAttitude === a.value
                        ? getAttitudeBg(a.value, 0.2)
                        : getAttitudeBg(a.value, 0.06),
                      border: currentAttitude === a.value
                        ? `1px solid ${getAttitudeBorder(a.value)}`
                        : '1px solid transparent',
                    }}
                    onClick={() => handleAttitudeChange(
                      currentAttitude === a.value ? undefined : a.value
                    )}
                  >
                    <span className="text-sm font-medium block" style={{ color: getAttitudeText(a.value) }}>
                      {a.label}
                    </span>
                    <span className="text-xs mt-0.5 block" style={{ color: '#9C9088' }}>
                      {a.desc}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* 领域分类 */}
            <section>
              <label className="text-xs tracking-wide mb-2 block" style={{ color: '#9C9088' }}>
                领域 · {selectedNode.category ? getCategoryEmoji(selectedNode.category) + ' ' + getCategoryLabel(selectedNode.category) : '未分类'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all duration-200 ${
                      selectedNode.category === cat ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: selectedNode.category === cat
                        ? hexToRgba(CATEGORY_CONFIG[cat]?.color ?? '#C4B8B0', 0.18)
                        : 'rgba(200, 169, 110, 0.04)',
                      color: '#5C4A3A',
                      border: selectedNode.category === cat
                        ? `1px solid ${hexToRgba(CATEGORY_CONFIG[cat]?.color ?? '#C4B8B0', 0.35)}`
                        : '1px solid transparent',
                    }}
                    onClick={() => {
                      const newCat: Category | undefined = selectedNode.category === cat ? undefined : cat
                      const chainIds = getConnectedComponent(selectedNode.id, store.edges)
                      for (const nid of chainIds) {
                        store.updateNode(nid, { category: newCat })
                        db.beliefNodes.update(nid, { category: newCat })
                      }
                    }}
                  >
                    {getCategoryEmoji(cat)} {getCategoryLabel(cat)}
                  </button>
                ))}
                {/* 自定义分类按钮/输入 */}
                <CustomCategoryInput
                  currentNode={selectedNode}
                  onSetCategory={(cat: string | undefined) => {
                    const chainIds = getConnectedComponent(selectedNode.id, store.edges)
                    for (const nid of chainIds) {
                      store.updateNode(nid, { category: cat })
                      db.beliefNodes.update(nid, { category: cat })
                    }
                  }}
                />
              </div>
            </section>

            {/* 已连接节点 */}
            <ConnectedNodes nodeId={selectedNode.id} />

            {/* 笔记 */}
            <section>
              <label className="text-xs tracking-wide mb-2 block" style={{ color: '#9C9088' }}>
                笔记
              </label>
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all"
                    style={{
                      borderColor: '#E0D8CC',
                      color: '#4A4036',
                      fontFamily: 'inherit',
                      minHeight: 80,
                    }}
                    placeholder="写下你的想法..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingNote(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-3 py-1 rounded-full btn-soft"
                      onClick={handleNoteSave}
                    >
                      保存
                    </button>
                    <button
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ color: '#9C9088' }}
                      onClick={() => setEditingNote(false)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full text-left text-sm px-3 py-2 rounded-lg transition-all hover:opacity-70"
                  style={{
                    backgroundColor: 'rgba(200, 169, 110, 0.04)',
                    color: selectedNode.userNote ? '#4A4036' : '#C4B8B0',
                    border: '1px dashed #E0D8CC',
                  }}
                  onClick={startEditNote}
                >
                  {selectedNode.userNote || '添加笔记...'}
                </button>
              )}
            </section>

            {/* 长期信念 + 待清理 开关 */}
            <section className="space-y-2">
              <label className="text-xs tracking-wide block" style={{ color: '#9C9088' }}>
                标记
              </label>
              <button
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all duration-200 ${
                  selectedNode.isLongTerm ? 'ring-1' : ''
                }`}
                style={{
                  backgroundColor: selectedNode.isLongTerm
                    ? 'rgba(200, 169, 110, 0.12)'
                    : 'rgba(200, 169, 110, 0.04)',
                  color: '#4A4036',
                  border: selectedNode.isLongTerm
                    ? '1px solid rgba(200, 169, 110, 0.3)'
                    : '1px solid transparent',
                }}
                onClick={() => {
                  store.updateNode(selectedNode.id, { isLongTerm: !selectedNode.isLongTerm })
                  db.beliefNodes.update(selectedNode.id, { isLongTerm: !selectedNode.isLongTerm })
                }}
              >
                🌙 长期信念
                <span className="text-xs ml-1" style={{ color: '#C4B8B0' }}>
                  {selectedNode.isLongTerm ? '· 已标记' : '· 标记后纳入每月盘点'}
                </span>
              </button>
              <button
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all duration-200 ${
                  selectedNode.markedForReview ? 'ring-1' : ''
                }`}
                style={{
                  backgroundColor: selectedNode.markedForReview
                    ? 'rgba(160, 200, 176, 0.12)'
                    : 'rgba(200, 169, 110, 0.04)',
                  color: '#4A4036',
                  border: selectedNode.markedForReview
                    ? '1px solid rgba(160, 200, 176, 0.3)'
                    : '1px solid transparent',
                }}
                onClick={() => {
                  store.updateNode(selectedNode.id, { markedForReview: !selectedNode.markedForReview })
                  db.beliefNodes.update(selectedNode.id, { markedForReview: !selectedNode.markedForReview })
                }}
              >
                🧹 待清理
                <span className="text-xs ml-1" style={{ color: '#C4B8B0' }}>
                  {selectedNode.markedForReview ? '· 已标记' : '· 标记后纳入每周清理'}
                </span>
              </button>
            </section>

            {/* 元信息 */}
            <section>
              <p className="text-xs leading-relaxed" style={{ color: '#C4B8B0' }}>
                创建于 {formatDate(selectedNode.createdAt)}
              </p>
            </section>

            {/* 释怀 */}
            {selectedNode.status === 'active' && (
              <section>
                <button
                  className="w-full text-center text-sm px-4 py-2 rounded-lg transition-all hover:opacity-70"
                  style={{
                    color: '#B8A0C8',
                    border: '1px dashed rgba(184, 160, 200, 0.35)',
                  }}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `这个信念已经陪伴了你一段时间。确定要温柔地放下「${selectedNode.content.length > 16 ? selectedNode.content.slice(0, 16) + '...' : selectedNode.content}」吗？`
                    )
                    if (!confirmed) return
                    store.updateNode(selectedNode.id, { status: 'fading' })
                    db.beliefNodes.update(selectedNode.id, { status: 'fading' })
                  }}
                >
                  ✨ 释怀此信念
                </button>
              </section>
            )}

            {/* 删除 */}
            <section className="space-y-2">
              <button
                className="w-full text-center text-sm px-4 py-2 rounded-lg transition-all hover:opacity-70"
                style={{
                  color: '#C8A080',
                  border: '1px dashed rgba(200, 160, 128, 0.35)',
                }}
                onClick={() => {
                  const confirmed = window.confirm(
                    `确定要删除「${selectedNode.content}」吗？\n删除后会进入垃圾箱，7天内可恢复。`
                  )
                  if (!confirmed) return
                  const nid = selectedNode.id
                  store.selectNode(null)
                  store.updateNode(nid, { deletedAt: new Date() })
                  db.beliefNodes.update(nid, { deletedAt: new Date() })
                }}
              >
                删除此节点
              </button>
              <button
                className="w-full text-center text-sm px-4 py-2 rounded-lg transition-all hover:opacity-70"
                style={{
                  color: '#E08860',
                  border: '1px dashed rgba(224, 136, 96, 0.35)',
                }}
                onClick={() => {
                  const chainIds = getConnectedComponent(selectedNode.id, store.edges)
                  const count = chainIds.size
                  const confirmed = window.confirm(
                    `确定要删除包含「${selectedNode.content}」在内的整条链条吗？\n共 ${count} 个节点将进入垃圾箱，7天内可恢复。`
                  )
                  if (!confirmed) return
                  store.selectNode(null)
                  const now = new Date()
                  for (const nid of chainIds) {
                    store.updateNode(nid, { deletedAt: now })
                    db.beliefNodes.update(nid, { deletedAt: now })
                  }
                }}
              >
                删除整条链条（{getConnectedComponent(selectedNode.id, store.edges).size} 个节点）
              </button>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 自定义分类输入
function CustomCategoryInput({
  currentNode,
  onSetCategory,
}: {
  currentNode: BeliefNode
  onSetCategory: (cat: string | undefined) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const isCustom = currentNode.category && !CATEGORIES.includes(currentNode.category as any)

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          className="text-xs px-2.5 py-1 rounded-full outline-none transition-all"
          style={{
            backgroundColor: 'rgba(200, 169, 110, 0.06)',
            color: '#4A4036',
            border: '1px solid #E0D8CC',
            width: 100,
          }}
          placeholder="分类名..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              onSetCategory(value.trim())
              setEditing(false)
              setValue('')
            } else if (e.key === 'Escape') {
              setEditing(false)
              setValue('')
            }
          }}
          autoFocus
          onBlur={() => {
            if (value.trim()) {
              onSetCategory(value.trim())
            }
            setEditing(false)
            setValue('')
          }}
        />
        <button
          className="text-xs hover:opacity-70"
          style={{ color: '#5A7A68' }}
          onMouseDown={(e) => {
            e.preventDefault()
            if (value.trim()) onSetCategory(value.trim())
            setEditing(false)
            setValue('')
          }}
        >
          ✓
        </button>
        <button
          className="text-xs hover:opacity-70"
          style={{ color: '#C8A080' }}
          onMouseDown={(e) => {
            e.preventDefault()
            setEditing(false)
            setValue('')
          }}
        >
          ✕
        </button>
      </span>
    )
  }

  if (isCustom) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ring-1"
        style={{
          backgroundColor: 'rgba(196, 184, 176, 0.18)',
          color: '#5C4A3A',
          border: '1px solid rgba(196, 184, 176, 0.35)',
        }}
      >
        🏷️ {currentNode.category}
        <button
          className="ml-0.5 hover:opacity-70"
          style={{ color: '#C8A080' }}
          onClick={() => onSetCategory(undefined)}
        >
          ✕
        </button>
      </span>
    )
  }

  return (
    <button
      className="text-xs px-2.5 py-1 rounded-full transition-all duration-200 hover:opacity-70"
      style={{
        backgroundColor: 'rgba(200, 169, 110, 0.04)',
        color: '#9C9088',
        border: '1px dashed #E0D8CC',
      }}
      onClick={() => setEditing(true)}
    >
      + 自定义分类
    </button>
  )
}

// 已连接节点列表（可断开）
function ConnectedNodes({ nodeId }: { nodeId: string }) {
  const nodes = useBeliefStore(s => s.nodes)
  const edges = useBeliefStore(s => s.edges)
  const store = useBeliefStore()

  const connectedEdges = edges.filter(
    e => e.sourceId === nodeId || e.targetId === nodeId
  )

  if (connectedEdges.length === 0) return null

  const disconnect = (edgeId: string) => {
    store.removeEdge(edgeId)
    db.beliefEdges.delete(edgeId)
  }

  return (
    <section>
      <label className="text-xs tracking-wide mb-2 block" style={{ color: '#9C9088' }}>
        已连接 · {connectedEdges.length}
      </label>
      <div className="space-y-1">
        {connectedEdges.map(edge => {
          const otherId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
          const other = nodes.find(n => n.id === otherId)
          if (!other) return null
          return (
            <div
              key={edge.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(200, 169, 110, 0.04)' }}
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs block" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
                  {other.content}
                </span>
                <span className="text-xs" style={{ color: '#C4B8B0' }}>
                  {getTypeLabel(other.type)}
                </span>
              </div>
              <button
                className="flex-shrink-0 ml-2 text-xs hover:opacity-70 transition-opacity"
                style={{ color: '#C8A080' }}
                onClick={() => disconnect(edge.id)}
                title="断开连接"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function getAttitudeBg(attitude: string, alpha: number): string {
  switch (attitude) {
    case 'break': return `rgba(232, 200, 160, ${alpha})`
    case 'strengthen': return `rgba(160, 200, 176, ${alpha})`
    case 'observe': return `rgba(200, 196, 180, ${alpha})`
    default: return 'transparent'
  }
}

function getAttitudeBorder(attitude: string): string {
  switch (attitude) {
    case 'break': return 'rgba(232, 200, 160, 0.5)'
    case 'strengthen': return 'rgba(160, 200, 176, 0.5)'
    case 'observe': return 'rgba(200, 196, 180, 0.35)'
    default: return 'transparent'
  }
}

function getAttitudeText(attitude: string): string {
  switch (attitude) {
    case 'break': return '#8B6B4A'
    case 'strengthen': return '#5A7A68'
    case 'observe': return '#7A7670'
    default: return '#4A4036'
  }
}
