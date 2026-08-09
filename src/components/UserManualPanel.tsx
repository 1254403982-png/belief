import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
}

// 章节定义
interface Section {
  id: string
  title: string
  icon: string
  content: React.ReactNode
}

export default function UserManualPanel({ open, onClose }: Props) {
  const [activeSection, setActiveSection] = useState('icons')

  const sections: Section[] = [
    {
      id: 'icons',
      title: '界面图标',
      icon: '🧭',
      content: <IconsGuide />,
    },
    {
      id: 'canvas',
      title: '画布操作',
      icon: '🖱️',
      content: <CanvasGuide />,
    },
    {
      id: 'nodes',
      title: '节点与连线',
      icon: '🔗',
      content: <NodeGuide />,
    },
    {
      id: 'input',
      title: '底部输入框',
      icon: '⌨️',
      content: <InputGuide />,
    },
    {
      id: 'ai',
      title: 'AI 功能',
      icon: '🤖',
      content: <AIGuide />,
    },
    {
      id: 'shortcuts',
      title: '快捷键',
      icon: '⚡',
      content: <ShortcutsGuide />,
    },
    {
      id: 'types',
      title: '信念类型体系',
      icon: '🗂️',
      content: <TypeGuide />,
    },
    {
      id: 'trash',
      title: '垃圾箱与释怀',
      icon: '🗑️',
      content: <TrashGuide />,
    },
  ]

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
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
            📖 使用手册
          </h3>
          <button
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: '#9C9088' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 章节导航 */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
          {sections.map((s) => (
            <button
              key={s.id}
              className="text-xs px-2.5 py-1 rounded-full transition-all flex-shrink-0 hover:opacity-80"
              style={{
                color: activeSection === s.id ? '#5C4A3A' : '#9C9088',
                backgroundColor: activeSection === s.id
                  ? 'rgba(200, 169, 110, 0.12)'
                  : 'transparent',
                border: activeSection === s.id
                  ? '1px solid rgba(200, 169, 110, 0.25)'
                  : '1px solid transparent',
              }}
              onClick={() => setActiveSection(s.id)}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
          {sections.find((s) => s.id === activeSection)?.content}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ====== 各章节内容组件 ======

function IconsGuide() {
  const items = [
    { icon: '📋', name: '信念总览', desc: '查看信念树、领域分类、待破除/待坚定列表、垃圾箱' },
    { icon: '📓', name: '深度思考记录本', desc: '撰写和保存反思笔记，支持随时编辑和删除' },
    { icon: '💡', name: '深度觉察', desc: 'AI 深度挖掘某个信念背后的根源，支持多轮追问（最多 10 轮）' },
    { icon: '🌿', name: '自动梳理布局', desc: '开启/关闭力导向自动布局，让节点自动排列。再次点击关闭' },
    { icon: '⚙️', name: '设置', desc: '账号信息、定期梳理开关、手动触发梳理、数据导出（JSON/Markdown）' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        顶部栏右侧有 5 个图标按钮，每个对应一项核心功能：
      </p>
      {items.map((item) => (
        <div key={item.name} className="flex gap-3 items-start">
          <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: '#4A4036' }}>{item.name}</p>
            <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#9C9088' }}>
              {item.desc}
            </p>
          </div>
        </div>
      ))}
      <TipBox>
        点击左上角的「信念」标题，可以一键将画布复位到中心位置。
      </TipBox>
    </div>
  )
}

function CanvasGuide() {
  return (
    <div className="space-y-4">
      <GuideItem
        action="拖拽空白区域"
        result="平移画布视野"
      />
      <GuideItem
        action="滚动鼠标滚轮"
        result="缩放画布（0.3x ~ 2.0x）"
      />
      <GuideItem
        action="单击节点"
        result="选中节点，顶部出现信息条，右侧弹出详情面板"
      />
      <GuideItem
        action="双击节点"
        result="原地编辑节点文字内容"
      />
      <GuideItem
        action="长按节点（0.6秒）"
        result="进入聚焦模式，高亮该节点所在的整条信念链路，其它区域轻微淡化"
      />
      <GuideItem
        action="拖拽节点"
        result="移动节点位置，同一链路上的节点会跟随移动（越远跟移越少）"
      />
      <GuideItem
        action="拖拽节点靠近另一节点"
        result="自动建立连线（距离足够近时触发）"
      />
      <GuideItem
        action="右键点击节点"
        result="弹出菜单：建立连接 / 标记待清理 / 长期信念 / 删除 / 删除整条链路"
      />
      <GuideItem
        action="点击连线"
        result="弹出连线信息浮层（两端节点名、类型、断开按钮）"
      />
      <GuideItem
        action="点击空白"
        result="取消选中、退出聚焦、关闭所有浮层"
      />

      <TipBox>
        <strong>小技巧：</strong>拖拽节点时，与其相连的整个链路会跟随移动，方便整理信念网络布局。
      </TipBox>
    </div>
  )
}

function NodeGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium" style={{ color: '#4A4036' }}>选中节点后的详情面板</p>

      <GuideItem action="内容编辑" result="点击编辑按钮修改节点文字" />
      <GuideItem action="类型切换" result="8 种信念类型可选（核心信念→物质现实）" />
      <GuideItem action="领域分类" result="10 个生活领域（学习/工作/金钱/感情等）" />
      <GuideItem action="态度标记" result="破除 / 坚定 / 观察 —— 标记你对这个信念的态度" />
      <GuideItem action="用户笔记" result="自由记录对这个信念的补充思考" />
      <GuideItem action="长期信念" result="标记后在「待坚定」列表中显示" />
      <GuideItem action="待清理" result="标记后在「待破除」列表中显示，并触发每周梳理提醒" />
      <GuideItem action="释怀" result="优雅的粒子消散动画（2.5 秒），自动进入垃圾箱" />
      <GuideItem action="删除" result="软删除，进入垃圾箱，7 天后自动清理" />

      <div className="pt-2">
        <p className="text-sm font-medium mb-2" style={{ color: '#4A4036' }}>连线类型</p>
        {[
          { type: 'derives_from', label: '派生自', desc: '一个信念从另一个信念中产生' },
          { type: 'leads_to', label: '导向', desc: '一个信念引导出另一个信念' },
          { type: 'related_to', label: '相关', desc: '两个信念存在关联' },
          { type: 'suggested_by_ai', label: 'AI 建议', desc: '由 AI 自动识别的关联' },
          { type: 'manual', label: '手动连接', desc: '你手动建立的连接' },
        ].map((t) => (
          <div key={t.type} className="flex items-start gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{
              backgroundColor: 'rgba(200, 169, 110, 0.08)',
              color: '#5C4A3A',
            }}>
              {t.label}
            </span>
            <span className="text-xs" style={{ color: '#9C9088' }}>{t.desc}</span>
          </div>
        ))}
      </div>

      <TipBox>
        连线方向会自动按信念层级调整（深层→浅层），无论你先点哪个节点建立连接。
      </TipBox>
    </div>
  )
}

function InputGuide() {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        画布底部的输入框是你与信念网络交互的主要入口。
      </p>

      <div className="rounded-lg p-3 space-y-3" style={{
        backgroundColor: 'rgba(200, 169, 110, 0.05)',
        border: '1px solid rgba(200, 169, 110, 0.1)',
      }}>
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>Enter 直接输入</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            输入任何念头，AI 会自动：分析信念类型 → 润色表达 → 建议分类领域 → 识别与已有节点的关联 → 给出温柔洞察。
            你可以选择「采纳建议」「仅分类」或「保留原样」。
          </p>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(200, 169, 110, 0.12)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>
            Ctrl + Enter 快速待办
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            将当前输入存入今日待办列表，稍后可以逐一用 AI 分类处理。适合快速捕捉一闪而过的想法。
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">📌</span>
        <span className="text-xs" style={{ color: '#9C9088' }}>
          右侧的 📌 按钮显示今日待办数量，点击打开待办面板。Ctrl+Enter 也可以快速添加。
        </span>
      </div>

      <TipBox>
        如果你不确定一个想法属于什么类型，直接输入原话并选择「保留原样」，它会以「未分类」类型出现在画布上。
      </TipBox>
    </div>
  )
}

function AIGuide() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>🤖 输入分类</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          底部输入框输入文字后，AI 自动判断信念类型、润色表达、建议领域分类，并识别与已有节点的关联。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>💡 深度觉察</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          选择一个节点后点击顶部 💡，AI 会深入挖掘这个信念的：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>核心根源信念（coreBeliefName）</li>
          <li>反向推导链（reverseDerivation）</li>
          <li>建议补充的节点（suggestedNodes）—— 可逐个选择接受/拒绝</li>
        </ul>
        <p className="text-xs mt-2" style={{ color: '#9C9088' }}>
          在结果页面可以<strong style={{ color: '#4A4036' }}>追问</strong>（最多 10 轮）—— AI 会在已有分析基础上修正和补充，而非重新开始。
          追问时可以说「这个不准确」「还想加入XX」「说得对，还有呢？」。
        </p>
        <p className="text-xs mt-2" style={{ color: '#9C9088' }}>
          所有对话会自动保存，可以在 💡 面板的「💬 过去的对话」中查看和恢复。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>🔍 链路深度挖掘</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          长按节点进入聚焦模式后，点击「🔍 深度挖掘此链路」，AI 会分析整条信念链路的：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>链路总结和核心主题</li>
          <li>关键缺失环节</li>
          <li>节点表达的润色建议</li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>📌 待办 AI 分类</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          在待办面板中，点击「🤖 AI 分类」按钮，AI 会分析该待办并建议分类和关联节点。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>🌿 定期梳理</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          设置中可开启每月/每周/每日梳理提醒。AI 会分析长期信念和待清理项，给出态度建议。
        </p>
      </div>
    </div>
  )
}

function ShortcutsGuide() {
  const shortcuts = [
    { key: 'Enter', desc: '底部输入框：提交 AI 分类\n编辑模式：保存文字' },
    { key: 'Ctrl + Enter', desc: '将输入存入今日待办' },
    { key: 'Esc', desc: '取消选中 / 退出聚焦 / 关闭编辑 / 关闭浮层' },
    { key: 'Delete', desc: '删除选中的节点（软删除，进入垃圾箱）\n删除选中的连线' },
    { key: '滚轮', desc: '缩放画布' },
    { key: '右键', desc: '节点上：弹出操作菜单\n连线上：不可用' },
    { key: '双击节点', desc: '编辑节点文字' },
    { key: '长按节点', desc: '进入聚焦模式（0.6 秒）' },
    { key: '拖拽空白', desc: '平移画布视野' },
    { key: '拖拽节点', desc: '移动节点（链路跟随）' },
  ]

  return (
    <div className="space-y-3">
      {shortcuts.map((s) => (
        <div key={s.key} className="flex gap-3 items-start">
          <kbd
            className="text-xs px-2 py-0.5 rounded flex-shrink-0 text-center min-w-[70px]"
            style={{
              backgroundColor: 'rgba(200, 169, 110, 0.1)',
              color: '#8B6B3A',
              border: '1px solid rgba(200, 169, 110, 0.2)',
              whiteSpace: 'pre-line',
            }}
          >
            {s.key}
          </kbd>
          <span className="text-xs leading-relaxed" style={{ color: '#5C4A3A', whiteSpace: 'pre-line' }}>
            {s.desc}
          </span>
        </div>
      ))}
      <TipBox>
        选中连线后按 Delete 可以断开连接。也可以在点击连线弹出的浮层中点击「断开连接」。
      </TipBox>
    </div>
  )
}

function TypeGuide() {
  const types = [
    { type: 'core_belief', label: '核心信念', desc: '你最深层的信念根基，如「我不够好」「世界是危险的」', r: 16 },
    { type: 'sub_belief', label: '附属信念', desc: '由核心信念派生出的二级信念', r: 13 },
    { type: 'thought_emotion_pattern', label: '思维/情绪模式', desc: '反复出现的思维或情绪反应模式', r: 12 },
    { type: 'thought', label: '想法', desc: '具体的想法或念头', r: 9 },
    { type: 'emotion', label: '情绪', desc: '具体的情绪体验', r: 9 },
    { type: 'behavior', label: '行为', desc: '由信念驱动的具体行为', r: 9 },
    { type: 'material_reality', label: '物质现实', desc: '客观发生的事件或事实', r: 14 },
    { type: 'seed', label: '未分类', desc: '刚刚捕捉的原始念头，尚未归类', r: 8 },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        信念按层次从深到浅分为 8 种类型。节点大小反映其在信念体系中的层级（越大越核心）。
      </p>

      {/* 层级示意 */}
      <div className="rounded-lg p-3 space-y-2" style={{
        backgroundColor: 'rgba(200, 169, 110, 0.04)',
        border: '1px solid rgba(200, 169, 110, 0.1)',
      }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#4A4036' }}>层级关系（深→浅）</p>
        <div className="text-xs leading-relaxed text-center" style={{ color: '#9C9088' }}>
          核心信念 → 附属信念 → 思维/情绪模式 → 想法/情绪 → 行为 → 物质现实
        </div>
        <div className="text-xs leading-relaxed text-center mt-0.5" style={{ color: '#C4B8B0' }}>
          连线方向会自动按此层级调整
        </div>
      </div>

      {types.map((t) => (
        <div key={t.type} className="flex gap-3 items-start">
          <span
            className="inline-block rounded-full flex-shrink-0 mt-0.5"
            style={{
              width: Math.max(14, t.r * 1.1),
              height: Math.max(14, t.r * 1.1),
              backgroundColor: (() => {
                switch (t.type) {
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
              })(),
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: '#4A4036' }}>{t.label}</p>
            <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#9C9088' }}>{t.desc}</p>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <p className="text-sm font-medium mb-2" style={{ color: '#4A4036' }}>生活领域（10 类）</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { emoji: '📚', label: '学习' },
            { emoji: '💼', label: '工作' },
            { emoji: '🏠', label: '生活' },
            { emoji: '💰', label: '金钱' },
            { emoji: '💕', label: '感情' },
            { emoji: '🤝', label: '友情' },
            { emoji: '👨‍👩‍👧', label: '家庭' },
            { emoji: '💚', label: '健康' },
            { emoji: '🧘', label: '自我' },
            { emoji: '🏷️', label: '其他' },
          ].map((c) => (
            <span
              key={c.label}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(200, 169, 110, 0.06)',
                color: '#5C4A3A',
                border: '1px solid rgba(200, 169, 110, 0.12)',
              }}
            >
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      </div>

      <TipBox>
        态度标记（破除/坚定/观察）可以帮助你明确对每个信念的立场，节点周围会出现对应颜色的光晕。
      </TipBox>
    </div>
  )
}

function TrashGuide() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>软删除机制</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          删除的节点不会立即消失，而是进入垃圾箱。7 天后系统会自动彻底清理。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>释怀 🌬️</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          在节点详情面板中点击「释怀」，节点会播放 2.5 秒的粒子消散动画，然后自动进入垃圾箱。
          这是为「放下某个信念」设计的仪式感操作。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>垃圾箱操作</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          打开 📋 → 选择「🗑️ 垃圾箱」tab：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>每个节点显示剩余自动清理天数</li>
          <li>「恢复」—— 将节点恢复到画布</li>
          <li>「彻底删除」—— 立即永久删除，不可恢复</li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>删除整条链路</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          右键节点 →「删除整条链条」，会将该节点所在连通链路上的所有节点一并软删除。
        </p>
      </div>

      <TipBox>
        如果你不小心删除了某个节点，可以去垃圾箱恢复它。但如果超过 7 天，系统会自动清理。
      </TipBox>
    </div>
  )
}

// ====== 小工具组件 ======

function GuideItem({ action, result }: { action: string; result: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#C8A96E' }}>▸</span>
      <div>
        <span className="text-sm" style={{ color: '#4A4036' }}>{action}</span>
        <span className="text-xs mx-1.5" style={{ color: '#C4B8B0' }}>→</span>
        <span className="text-xs" style={{ color: '#9C9088' }}>{result}</span>
      </div>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs leading-relaxed px-3 py-2 rounded-lg mt-3"
      style={{
        backgroundColor: 'rgba(200, 169, 110, 0.06)',
        borderLeft: '2px solid #C8A96E',
        color: '#7A7670',
      }}
    >
      💡 {children}
    </div>
  )
}
