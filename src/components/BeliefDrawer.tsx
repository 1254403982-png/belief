import { getLanguage, tr } from '../i18n'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePanelFocus } from './usePanelFocus'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type BeliefNode, CATEGORIES } from '../db'
import { CATEGORY_CONFIG, hexToRgba, getTypeLabel } from './utils'

type Tab = 'tree' | 'categories' | 'break' | 'strengthen' | 'trash'

const TABS: { key: Tab; label: string }[] = [
  { key: 'tree', label: '信念树' },
  { key: 'categories', label: '领域分类' },
  { key: 'break', label: '待破除' },
  { key: 'strengthen', label: '待坚定' },
  { key: 'trash', label: '🗑️ 垃圾箱' },
]

export default function BeliefDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const store = useBeliefStore()
  const { panelRef, onPanelKeyDown } = usePanelFocus(open, onClose)
  const [activeTab, setActiveTab] = useState<Tab>('tree')

  const handleFocusNode = (nodeId: string) => {
    store.setFocusNode(nodeId)
    store.selectNode(nodeId)
    onClose()
  }

  // 构建信念树：核心信念 → 附属信念 → 模式 → 其他（排除已删除/释怀）
  const buildBeliefTree = () => {
    const nodes = store.nodes.filter(n => !n.deletedAt)
    const { edges } = store
    const coreBeliefs = nodes.filter(n => n.type === 'core_belief')

    const getChildren = (parentId: string): BeliefNode[] => {
      const childIds = edges
        .filter(e => e.sourceId === parentId)
        .map(e => e.targetId)
      return nodes.filter(n => childIds.includes(n.id))
    }

    return coreBeliefs.map(core => ({
      node: core,
      children: getChildren(core.id),
    }))
  }

  const [trashNodes, setTrashNodes] = useState<BeliefNode[]>([])

  // 打开时从 DB 加载垃圾箱节点
  useEffect(() => {
    if (!open) return
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    db.beliefNodes.where('userId').equals(userId).toArray().then(all => {
      setTrashNodes(all.filter(n => !!n.deletedAt))
    })
  }, [open])

  const activeNodes = store.nodes.filter(n => !n.deletedAt)
  const breakNodes = activeNodes.filter(n =>
    n.attitude === 'break' || n.markedForReview
  )
  const strengthenNodes = activeNodes.filter(n =>
    n.attitude === 'strengthen' || n.isLongTerm
  )

  const beliefTree = buildBeliefTree()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 点击遮罩关闭 */}
          <motion.div
            className="fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-title"
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 id="overview-title" className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                {tr("信念总览")}
              </h3>
              <button
                type="button"
                aria-label={tr("关闭信念总览")}
                data-panel-close
                className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-sm hover:bg-[#F3E9DB] transition-colors"
                style={{ color: '#9C9088' }}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            {/* Tab 栏 */}
            <div className="flex gap-0 px-6 pb-4">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className="text-sm px-3 py-1 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: activeTab === tab.key
                      ? 'rgba(200, 169, 110, 0.15)'
                      : 'transparent',
                    color: activeTab === tab.key ? '#5C4A3A' : '#9C9088',
                  }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tr(tab.label)}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {activeTab === 'tree' && (
                <div className="space-y-4">
                  {beliefTree.length === 0 && (
                    <EmptyHint text={tr("还没有核心信念")} />
                  )}
                  {beliefTree.map(({ node, children }) => (
                    <div key={node.id}>
                      <TreeNode
                        node={node}
                        onClick={() => handleFocusNode(node.id)}
                        highlight
                      />
                      {children.length > 0 && (
                        <div className="ml-3 mt-1 pl-3 space-y-1"
                          style={{ borderLeft: '1px solid #E0D8CC' }}
                        >
                          {children.map(child => (
                            <TreeNode
                              key={child.id}
                              node={child}
                              onClick={() => handleFocusNode(child.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'categories' && (
                <CategoriesOverview
                  nodes={activeNodes}
                  onFocus={handleFocusNode}
                />
              )}

              {activeTab === 'break' && (
                <NodeList
                  nodes={breakNodes}
                  onFocus={handleFocusNode}
                  emptyText={tr("还没有标记为破除的信念")}
                />
              )}

              {activeTab === 'strengthen' && (
                <NodeList
                  nodes={strengthenNodes}
                  onFocus={handleFocusNode}
                  emptyText={tr("还没有标记为坚定的信念")}
                />
              )}

              {activeTab === 'trash' && (
                <div className="space-y-1.5">
                  {trashNodes.length === 0 && (
                    <EmptyHint text={tr("垃圾箱是空的")} />
                  )}
                  {trashNodes.map(node => {
                    const daysLeft = node.deletedAt
                      ? Math.ceil(7 - (Date.now() - new Date(node.deletedAt).getTime()) / 86400000)
                      : 0
                    const isReleased = node.status === 'released'
                    return (
                      <div
                        key={node.id}
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5"
                        style={{
                          backgroundColor: 'rgba(200, 196, 180, 0.06)',
                          border: '1px solid rgba(200, 196, 180, 0.12)',
                          opacity: 0.65,
                        }}
                      >
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{ width: 7, height: 7, backgroundColor: '#C4B8B0' }}
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className="text-sm block leading-relaxed"
                            style={{ color: '#9C9088', wordBreak: 'break-word' }}
                          >
                            {node.content}
                          </span>
                          <span className="text-xs" style={{ color: '#C4B8B0' }}>
                            {getTypeLabel(node.type)}
                            {isReleased ? tr(" · 已释怀") : tr(" · 已删除")}
                            {daysLeft > 0 ? (getLanguage() === 'en' ? ` · deleted in ${daysLeft} days` : ` · ${daysLeft}天后清理`) : tr(" · 即将清理")}
                          </span>
                        </div>
                        <button
                          className="text-xs px-2 py-1 rounded-full transition-all hover:opacity-70 flex-shrink-0"
                          style={{
                            color: '#5A7A68',
                            backgroundColor: 'rgba(160, 200, 176, 0.1)',
                            border: '1px solid rgba(160, 200, 176, 0.2)',
                          }}
                          onClick={async () => {
                            const s = useBeliefStore.getState()
                            await db.beliefNodes.update(node.id, { status: 'active', deletedAt: undefined as any })
                            const existing = s.nodes.find(n => n.id === node.id)
                            if (existing) {
                              s.updateNode(node.id, { status: 'active', deletedAt: undefined as any })
                            } else {
                              const restored = { ...node, status: 'active' as const, deletedAt: undefined as any } as BeliefNode
                              s.addNode(restored)
                            }
                            setTrashNodes(prev => prev.filter(n => n.id !== node.id))
                          }}
                        >
                          {tr("恢复")}
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded-full transition-all hover:opacity-70 flex-shrink-0"
                          style={{ color: '#C8A080' }}
                          onClick={() => {
                            const confirmed = window.confirm(tr('确定要彻底删除这个信念吗？此操作不可恢复。'))
                            if (!confirmed) return
                            const s = useBeliefStore.getState()
                            s.removeNode(node.id)
                            db.beliefNodes.delete(node.id)
                            db.beliefEdges.where('sourceId').equals(node.id).or('targetId').equals(node.id).delete()
                            setTrashNodes(prev => prev.filter(n => n.id !== node.id))
                          }}
                        >
                          {tr("彻底删除")}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TreeNode({
  node,
  onClick,
  highlight,
}: {
  node: BeliefNode
  onClick: () => void
  highlight?: boolean
}) {
  const color = getNodeColor(node.type)
  const typeLabel = getTypeLabel(node.type)
  return (
    <button
      className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:opacity-80 flex items-center gap-2.5"
      style={{
        backgroundColor: highlight
          ? 'rgba(200, 169, 110, 0.1)'
          : 'rgba(200, 169, 110, 0.04)',
        border: highlight
          ? '1px solid rgba(200, 169, 110, 0.25)'
          : '1px solid transparent',
      }}
      onClick={onClick}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{
          width: highlight ? 10 : 8,
          height: highlight ? 10 : 8,
          backgroundColor: color,
        }}
      />
      <div className="min-w-0">
        <span
          className="text-sm block"
          style={{ color: '#4A4036', wordBreak: 'break-word' }}
        >
          {node.content}
        </span>
        <span className="text-xs" style={{ color: '#9C9088' }}>
          {typeLabel}
        </span>
      </div>
    </button>
  )
}

function NodeList({
  nodes,
  onFocus,
  emptyText,
}: {
  nodes: BeliefNode[]
  onFocus: (id: string) => void
  emptyText: string
}) {
  if (nodes.length === 0) {
    return <EmptyHint text={emptyText} />
  }
  return (
    <div className="space-y-1.5">
      {nodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          onClick={() => onFocus(node.id)}
        />
      ))}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-sm text-center py-8" style={{ color: '#C4B8B0' }}>
      {text}
    </p>
  )
}

function getNodeColor(type: string): string {
  switch (type) {
    case 'core_belief': return '#C8A96E'
    case 'sub_belief': return '#8BA4BC'
    case 'thought_emotion_pattern': return '#B8A0C8'
    case 'thought':
    case 'emotion': return '#C4B8B0'
    case 'behavior': return '#A0B89A'
    case 'material_reality': return '#B8A898'
    case 'seed': return '#E8E0D8'
    default: return '#C4B8B0'
  }
}

// 分类总览：按领域分组展示节点
function CategoriesOverview({
  nodes,
  onFocus,
}: {
  nodes: BeliefNode[]
  onFocus: (id: string) => void
}) {
  // 按 category 分组（未分类也作为一个组）
  const grouped = new Map<string, BeliefNode[]>()
  for (const cat of CATEGORIES) {
    grouped.set(cat, [])
  }
  grouped.set('_uncategorized', [])

  for (const node of nodes) {
    const key = node.category || '_uncategorized'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(node)
  }

  // 只显示有节点的分类
  const entries = Array.from(grouped.entries()).filter(([, ns]) => ns.length > 0)

  if (entries.length === 0) {
    return <EmptyHint text={tr("还没有设置领域分类")} />
  }

  return (
    <div className="space-y-4">
      {entries.map(([cat, catNodes]) => {
        const isUncategorized = cat === '_uncategorized'
        const config = CATEGORY_CONFIG[cat]
        const label = isUncategorized ? tr('未分类') : (config ? tr(config.label) : cat)
        const emoji = isUncategorized ? '🏷️' : (config?.emoji ?? '📌')
        const color = isUncategorized ? '#C4B8B0' : (config?.color ?? '#C4B8B0')

        return (
          <div key={cat}>
            {/* 分类标题 */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-base">{emoji}</span>
              <span className="text-sm font-medium" style={{ color: '#5C4A3A' }}>
                {label}
              </span>
              <span
                className="text-xs ml-auto px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: hexToRgba(color, 0.12),
                  color,
                }}
              >
                {catNodes.length}
              </span>
            </div>

            {/* 该分类下的节点 */}
            <div className="space-y-1">
              {catNodes.map(node => (
                <button
                  key={node.id}
                  className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:opacity-80 flex items-center gap-2.5"
                  style={{
                    backgroundColor: hexToRgba(color, 0.04),
                    border: '1px solid transparent',
                  }}
                  onClick={() => onFocus(node.id)}
                >
                  <span
                    className="inline-block rounded-full flex-shrink-0"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: getNodeColor(node.type),
                    }}
                  />
                  <div className="min-w-0">
                    <span
                      className="text-sm block"
                      style={{ color: '#4A4036', wordBreak: 'break-word' }}
                    >
                      {node.content}
                    </span>
                    <span className="text-xs" style={{ color: '#9C9088' }}>
                      {getTypeLabel(node.type)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
