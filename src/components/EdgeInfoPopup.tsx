import { useEffect, useRef } from 'react'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db } from '../db'
import type { BeliefEdge } from '../db'
import { isDirectionalLink, linkTypeLabel } from '../utils/beliefLinks'
import ConnectionQuestion from './ConnectionQuestion'

interface Props {
  edgeId: string
  screenX: number
  screenY: number
  onClose: () => void
}

export default function EdgeInfoPopup({ edgeId, screenX, screenY, onClose }: Props) {
  const store = useBeliefStore()
  const popupRef = useRef<HTMLDivElement>(null)

  const edge = store.edges.find(e => e.id === edgeId)
  const source = edge ? store.nodes.find(n => n.id === edge.sourceId) : null
  const target = edge ? store.nodes.find(n => n.id === edge.targetId) : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // 延迟绑定避免触发 click 的同一事件
    setTimeout(() => {
      window.addEventListener('click', handler)
      window.addEventListener('keydown', keyHandler)
    }, 0)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  if (!edge || !source || !target) return null

  const handleDisconnect = () => {
    store.removeEdge(edgeId)
    db.beliefEdges.delete(edgeId)
    onClose()
  }
  const changeType = (type: BeliefEdge['type']) => {
    store.setEdges(store.edges.map(item => item.id === edgeId ? { ...item, type } : item))
    void db.beliefEdges.update(edgeId, { type })
  }

  // 让浮层显示在点击位置附近，但保持在屏幕内
  const left = Math.min(screenX, window.innerWidth - 280)
  const top = Math.max(12, Math.min(screenY, window.innerHeight - 360))

  return (
    <div
      ref={popupRef}
      className="fixed z-50 rounded-lg px-4 py-3"
      style={{
        left,
        top,
        backgroundColor: 'rgba(255, 251, 245, 0.97)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #E0D8CC',
        boxShadow: '0 4px 20px rgba(74, 64, 54, 0.1)',
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      {/* 连线两端 */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-sm font-medium cursor-pointer hover:underline"
          style={{ color: '#4A4036', wordBreak: 'break-word' }}
          onClick={() => {
            store.setFocusNode(source.id)
            store.selectNode(source.id)
            onClose()
          }}
        >
          {source.content}
        </span>
        <span className="flex-shrink-0" style={{ color: '#C4B8B0' }}>{isDirectionalLink(edge.type) ? '→' : '—'}</span>
        <span
          className="text-sm font-medium cursor-pointer hover:underline"
          style={{ color: '#4A4036', wordBreak: 'break-word' }}
          onClick={() => {
            store.setFocusNode(target.id)
            store.selectNode(target.id)
            onClose()
          }}
        >
          {target.content}
        </span>
      </div>

      <p className="text-xs text-[#7A7670] mb-2">当前关系：{linkTypeLabel(edge.type)}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {([['manual', '待厘清'], ['related_to', '有关联'], ['leads_to', '前者可能影响后者']] as const).map(([type, label]) => <button key={type} type="button" className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: edge.type === type ? '#C8A96E' : '#E0D8CC', background: edge.type === type ? '#F8F0E2' : 'transparent', color: '#5C4A3A' }} onClick={() => changeType(type)}>{label}</button>)}
      </div>
      <ConnectionQuestion key={edgeId} nodes={[source, target]} edges={[edge]} compact />

      {/* 断开按钮 */}
      <button
        className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70 w-full mt-3"
        style={{
          color: '#C8A080',
          border: '1px solid rgba(200, 160, 128, 0.3)',
        }}
        onClick={handleDisconnect}
      >
        断开连接
      </button>
    </div>
  )
}
