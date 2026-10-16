import { useState } from 'react'
import type { BeliefEdge, BeliefNode } from '../db'
import { sharedTargets, type ChosenLinkType } from '../utils/beliefLinks'
import ConnectionQuestion from './ConnectionQuestion'

export default function CreateLinkDialog({ source, target, nodes, edges, onConfirm, onClose }: {
  source: BeliefNode
  target: BeliefNode
  nodes: BeliefNode[]
  edges: BeliefEdge[]
  onConfirm: (type: ChosenLinkType) => void
  onClose: () => void
}) {
  const [type, setType] = useState<ChosenLinkType>('manual')
  const common = sharedTargets(source.id, target.id, edges, nodes)
  const relevantEdges = edges.filter(edge =>
    edge.sourceId === source.id || edge.targetId === source.id || edge.sourceId === target.id || edge.targetId === target.id,
  ).slice(0, 12)

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A4036]/15" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="选择连线关系" className="w-full max-w-md rounded-2xl bg-[#FFFBF5] border border-[#E0D8CC] shadow-xl p-5 space-y-4" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-[#5C4A3A]">这两句话是什么关系？</h2>
        <button type="button" className="text-sm text-[#7A7670]" aria-label="关闭" onClick={onClose}>关闭</button>
      </div>
      <p className="text-sm leading-6 text-[#4A4036] break-words">「{source.content}」<span className="text-[#9C9088]"> 和 </span>「{target.content}」</p>
      {common.length > 0 && <p className="text-xs leading-5 text-[#7A7670]">它们都指向「{common.map(node => node.content).join('、')}」。这不代表它们彼此影响；如果另有依据，可以再标记它们之间的关系。</p>}
      <div className="space-y-2" role="radiogroup" aria-label="关系类型">
        {([
          ['manual', '还不确定', '先记下关联，之后再厘清。'],
          ['related_to', '有关联', '两句话有关，但不确定方向。'],
          ['leads_to', '前者可能影响后者', '按你点击的顺序，画一条方向线。'],
        ] as const).map(([value, label, description]) => <button key={value} type="button" role="radio" aria-checked={type === value}
          className="w-full text-left rounded-xl border px-3 py-2 transition-colors"
          style={{ borderColor: type === value ? '#C8A96E' : '#E0D8CC', backgroundColor: type === value ? '#F8F0E2' : 'transparent' }}
          onClick={() => setType(value)}>
          <span className="block text-sm text-[#4A4036]">{label}</span>
          <span className="block text-xs text-[#7A7670] mt-0.5">{description}</span>
        </button>)}
      </div>
      <ConnectionQuestion nodes={[source, target, ...common]} edges={relevantEdges} compact />
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="text-sm text-[#7A7670] px-3 py-2" onClick={onClose}>先不连接</button>
        <button type="button" className="text-sm text-[#5C4A3A] rounded-full bg-[#EEDFC6] px-4 py-2" onClick={() => onConfirm(type)}>保存关系</button>
      </div>
    </section>
  </div>
}
