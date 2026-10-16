import { useState } from 'react'
import type { BeliefEdge, BeliefNode } from '../db'
import { askConnectionQuestion, describeAIRequestFailure } from '../utils/deepseek'
import NianNian from './NianNian'

export default function ConnectionQuestion({ nodes, edges, compact = false }: { nodes: BeliefNode[]; edges: BeliefEdge[]; compact?: boolean }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ask = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    const result = await askConnectionQuestion(
      nodes.map(node => ({ id: node.id, content: node.content, type: node.type })),
      edges.map(edge => ({ sourceId: edge.sourceId, targetId: edge.targetId, type: edge.type })),
      reason => setError(describeAIRequestFailure(reason)),
    )
    if (result) setQuestion(result)
    else setError(current => current || '念念暂时没有想到合适的问题，你仍可以自己决定关系。')
    setLoading(false)
  }

  return <div className={compact ? 'space-y-2' : 'rounded-xl border border-[#E9DCC9] bg-[#FFFBF5] p-3 space-y-2'}>
    <div className="flex items-center gap-2">
      <NianNian size={compact ? 25 : 30} />
      <span className="text-xs font-medium text-[#5C4A3A]">念念陪你想</span>
    </div>
    <p className="text-xs leading-5 text-[#7A7670]">关系不必一次说清。念念只会问一个问题，是否保留连线由你决定。</p>
    {question && <p className="text-sm leading-6 text-[#4A4036]" aria-live="polite">{question}</p>}
    {error && <p className="text-xs text-[#9A573E]" role="alert">{error}</p>}
    <button type="button" className="text-xs text-[#8B6B3A] underline disabled:opacity-40" disabled={loading} onClick={() => void ask()}>
      {loading ? '念念正在想一个问题…' : question ? '换一个问题' : '请念念问一个问题'}
    </button>
  </div>
}
