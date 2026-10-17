import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ToolbarIcon from './ToolbarIcon'
import NianNian from './NianNian'

interface Props {
  open: boolean
  onClose: () => void
}

// 章节定义
interface Section {
  id: string
  title: string
  content: React.ReactNode
}

export default function UserManualPanel({ open, onClose }: Props) {
  const [activeSection, setActiveSection] = useState('icons')
  const contentRef = useRef<HTMLDivElement>(null)

  const sections: Section[] = [
    {
      id: 'icons',
      title: '先看入口',
      content: <IconsGuide />,
    },
    {
      id: 'canvas',
      title: '画布操作',
      content: <CanvasGuide />,
    },
    {
      id: 'nodes',
      title: '节点与连线',
      content: <NodeGuide />,
    },
    {
      id: 'input',
      title: '记录念头',
      content: <InputGuide />,
    },
    {
      id: 'ai',
      title: '念念与探索',
      content: <AIGuide />,
    },
    {
      id: 'data',
      title: '数据与备份',
      content: <DataGuide />,
    },
    {
      id: 'shortcuts',
      title: '快捷键',
      content: <ShortcutsGuide />,
    },
    {
      id: 'types',
      title: '信念类型',
      content: <TypeGuide />,
    },
    {
      id: 'trash',
      title: '垃圾箱与释怀',
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
        className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col"
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-start gap-2.5">
            <NianNian size={28} />
            <div>
              <h3 id="manual-title" className="font-serif text-lg" style={{ color: '#5C4A3A' }}>使用手册</h3>
              <p className="text-xs leading-5 mt-1" style={{ color: '#746A61' }}>想做什么，就从下面选一项。</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭使用手册"
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-sm hover:bg-[#F3E9DB] transition-colors"
            style={{ color: '#9C9088' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 章节导航 */}
        <nav aria-label="使用手册章节" className="px-4 pb-3 grid grid-cols-2 gap-1.5 flex-shrink-0 max-h-[38vh] overflow-y-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={activeSection === s.id ? 'page' : undefined}
              aria-controls="manual-section-content"
              className="min-h-10 flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm leading-5 transition-colors hover:bg-[#F3E9DB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8A96E]"
              style={{
                color: activeSection === s.id ? '#5C4A3A' : '#746A61',
                backgroundColor: activeSection === s.id
                  ? 'rgba(200, 169, 110, 0.14)'
                  : 'transparent',
                border: activeSection === s.id
                  ? '1px solid rgba(200, 169, 110, 0.25)'
                  : '1px solid transparent',
              }}
              onClick={() => {
                setActiveSection(s.id)
                contentRef.current?.scrollTo({ top: 0 })
              }}
            >
              <span className="flex-shrink-0" aria-hidden="true"><ManualSectionIcon name={s.id} /></span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <div ref={contentRef} id="manual-section-content" className="manual-content flex-1 overflow-y-auto border-t border-[#E9DFD1] px-5 pb-6 pt-4" role="region" aria-label={sections.find((s) => s.id === activeSection)?.title}>
          <h4 className="font-serif text-base mb-3" style={{ color: '#5C4A3A' }}>{sections.find((s) => s.id === activeSection)?.title}</h4>
          {sections.find((s) => s.id === activeSection)?.content}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ManualSectionIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'icons': return <ToolbarIcon name="help" />
    case 'canvas': return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
    case 'nodes': return <svg {...common}><circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="m7 11 10-4M7 13l10 4" /></svg>
    case 'input': return <svg {...common}><path d="M4 5h16v14H4zM7 9h10M7 13h6M7 16h10" /></svg>
    case 'ai': return <NianNian size={18} />
    case 'data': return <svg {...common}><path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6" /></svg>
    case 'shortcuts': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M6 9h2M10 9h2M14 9h2M6 13h2M10 13h2M14 13h2M7 16h10" /></svg>
    case 'types': return <svg {...common}><circle cx="7" cy="7" r="3" /><circle cx="16" cy="9" r="2.5" /><circle cx="12" cy="17" r="2" /></svg>
    case 'trash': return <svg {...common}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
    default: return null
  }
}

// ====== 各章节内容组件 ======

function IconsGuide() {
  const items = [
    { icon: 'overview', name: '信念总览', desc: '找回已记录的信念，也能查看分类和垃圾箱。' },
    { icon: 'books', name: '书本问答', desc: '先选书，再问书里的概念；只有你开启选项时，才会结合自己的信念。' },
    { icon: 'explore', name: '我的探索', desc: '先写下自己的想法。需要时，可以请念念问你一个问题。' },
    { icon: 'arrange', name: '自动梳理布局', desc: '让画布上的节点自动排开；再点一次就停止。' },
    { icon: 'settings', name: '设置', desc: '管理账号、梳理提醒，以及导出本机记录。' },
    { icon: 'help', name: '使用手册', desc: '想不起某个操作时，随时回来看看。' },
  ] as const

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6" style={{ color: '#746A61' }}>这些图标和画布顶部的一样，照着形状找就好。</p>
      {items.map((item) => (
        <div key={item.name} className="flex gap-3 items-start rounded-xl border border-[#EEE5D9] bg-[#FFFBF5]/70 p-3">
          <span className="w-9 h-9 rounded-full border border-[#E9DFD1] flex items-center justify-center flex-shrink-0" style={{ color: '#746A61' }}><ToolbarIcon name={item.icon} /></span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5" style={{ color: '#4A4036' }}>{item.name}</p>
            <p className="text-sm leading-6 mt-0.5" style={{ color: '#746A61' }}>
              {item.desc}
            </p>
          </div>
        </div>
      ))}
      <TipBox>
        画布找不到了？点左上角的「信念」，就能回到画布中心。
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
        result="放大或缩小画布，方便看清局部或整体。"
      />
      <GuideItem
        action="单击节点"
        result="打开这条信念的详情，可以编辑文字、分类或查看关系。"
      />
      <GuideItem
        action="双击节点"
        result="原地编辑节点文字内容"
      />
      <GuideItem
        action="长按节点（0.6秒）"
        result="只看和它相连的信念，其他内容会变淡。"
      />
      <GuideItem
        action="拖拽节点"
        result="相连的节点会轻轻跟随。拖到另一节点附近松手，会先连成一条「待厘清」关系。"
      />
      <GuideItem
        action="右键点击节点"
        result="弹出菜单：建立连接 / 标记待清理 / 长期信念 / 删除"
      />
      <GuideItem
        action="点击连线"
        result="查看和修改关系类型，也可请念念问一个问题或断开关系"
      />
      <GuideItem
        action="点击空白"
        result="取消节点选中，或退出聚焦。"
      />

      <TipBox>
        想自己决定关系类型？先选中节点，点连接图标，再点另一节点。
      </TipBox>
    </div>
  )
}

function NodeGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium" style={{ color: '#4A4036' }}>选中节点后的详情面板</p>

      <GuideItem action="内容编辑" result="点击编辑按钮修改节点文字" />
      <GuideItem action="类型切换" result="给这条记录选择合适的层次；不确定时可以先留在「未分类」。" />
      <GuideItem action="领域分类" result="9 个预设领域 + 自定义分类（学习/工作/金钱/感情等）" />
      <GuideItem action="态度标记" result="破除 / 坚定 / 观察 —— 标记你对这个信念的态度" />
      <GuideItem action="用户笔记" result="自由记录对这个信念的补充思考" />
      <GuideItem action="长期信念" result="标记后在「待坚定」列表中显示" />
      <GuideItem action="待清理" result="标记后在「待破除」列表中显示，并触发每周梳理提醒" />
      <GuideItem action="释怀" result="播放轻柔的消散动画后进入垃圾箱，7 天内可以恢复。" />
      <GuideItem action="删除" result="软删除，进入垃圾箱，7 天后自动清理" />

      <div className="pt-2">
        <p className="text-sm font-medium mb-2" style={{ color: '#4A4036' }}>连线类型</p>
        {[
          { type: 'leads_to', label: '可能影响', desc: '按点击顺序保留一个待验证的方向' },
          { type: 'related_to', label: '有关联', desc: '有关联，但不判定因果方向' },
          { type: 'manual', label: '待厘清', desc: '先留下关系，今后再整理' },
          { type: 'suggested_by_ai', label: '旧 AI 建议', desc: '旧数据保留，建议点开连线核对' },
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
        两个节点共同指向同一个节点，不意味着它们彼此影响。需要第三条关系时可以单独添加；已有关系不会因此消失。
      </TipBox>
    </div>
  )
}

function InputGuide() {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        想到一句话，就从画布底部开始写。左侧是念念，输入框里有发送按钮。
      </p>

      <div className="rounded-lg p-3 space-y-3" style={{
        backgroundColor: 'rgba(200, 169, 110, 0.05)',
        border: '1px solid rgba(200, 169, 110, 0.1)',
      }}>
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>直接记下：Enter 或纸飞机</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            你的原话会以「未分类」节点出现在画布上。先记下来，之后再整理也可以。
          </p>
          <p className="text-xs mt-1" style={{ color: '#C4B8B0' }}>
            输入框为空时发送按钮为灰色，输入文字后自动亮起。
          </p>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(200, 169, 110, 0.12)' }} />
        <div>
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4036' }}><NianNian size={20} />请念念帮忙</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            点击输入框左侧的念念头像，可以看看分类和表达建议。是否采纳由你决定，也能保留自己的原话。
          </p>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(200, 169, 110, 0.12)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>
            Ctrl + Enter 快速待办
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            将当前输入存入待办列表，适合记下想实际尝试的小行动。只有你选择完成，待办才会完成。
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">📌</span>
        <span className="text-xs" style={{ color: '#9C9088' }}>
          右侧的 📌 按钮显示未完成待办数量，点击打开「我的待办」。Ctrl+Enter 也可以快速添加。
        </span>
      </div>

      <TipBox>
        不想整理时，直接按 Enter 记下原话就好。想要建议时，再点念念头像。
      </TipBox>
    </div>
  )
}

function AIGuide() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4036' }}><NianNian size={20} />念念帮你分类</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          在底部写下念头，再点左侧的念念头像。念念会给出信念类型、表达和领域的建议。
          结果以浮层卡片展示，可选择「采纳建议」「仅分类」或「保留原样」。
        </p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          AI 暂时无法回应时，原始输入仍在建议卡片中；点击「保留原文」即可将它加入画布。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4036' }}><ToolbarIcon name="explore" />我的探索</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          点击顶部的探索图标，写下经历或还没想明白的念头。可以一直自己写，也可以主动请念念帮忙：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>「记下这段」保存原话，不调用 AI</li>
          <li>「问我一个问题」每次只推进一个问题</li>
          <li>「整理到这里」按需概括，类型与是否入图由你决定</li>
        </ul>
        <p className="text-xs mt-2" style={{ color: '#9C9088' }}>
          不需要先认可 AI 的解释，也没有必须得出结论的轮数。可以说不符合、暂时不知道，或停止问询后继续自己写。
        </p>
        <p className="text-xs mt-2" style={{ color: '#9C9088' }}>
          原话、问题、草稿、你改写的候选表达和历次整理会保存在当前浏览器。上方列表可以继续过去的探索；加入画布的内容能从节点详情回看来源。
        </p>
        <p className="text-xs mt-2" style={{ color: '#9C9088' }}>
          以前在“深度思考”写下的笔记保留在探索中的折叠区。可以阅读原文，或从一篇笔记继续探索；原笔记不会被改动。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4036' }}><ToolbarIcon name="books" />书本问答</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          先选书再提问。默认「仅讲书中概念」，回答依据当前收录的书中段落解释概念，并显示检索到的章节；收录内容不足时会说明范围。
          如果想对照自己的经历，本次提问前可开启「结合我的信念」，AI 才会参考当前账号画布中可用的信念记录。发送后此选项会自动关闭，下次提问仍默认只讲书。
        </p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          同一本书的交流按账号保存在当前浏览器。关闭或刷新后再打开，仍可查看之前的问答并继续追问。AI 会参考最近几轮相关对话理解「它」「这个」等指代；默认纯书籍模式不会带入之前选择过的个人信念内容。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>从节点继续探索</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          长按节点进入聚焦模式后，点击「从这里继续探索」，会打开同一个探索面板：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>首次进入时，把节点内容放入草稿</li>
          <li>已有相关探索时，继续上次的记录</li>
          <li>由你决定何时问询、整理或加入画布；AI 建议入图不会自行连线</li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>📌 我的待办</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          放想实际去做的事，由你勾选完成。未完成的旧待办会继续显示，已完成的也可以放回列表。整理思考与完成行动分别记录。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4036' }}><ToolbarIcon name="arrange" />定期梳理</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          设置中可开启每月/每周/每日梳理提醒。AI 会分析长期信念和待清理项，给出态度建议。
        </p>
      </div>
    </div>
  )
}

function DataGuide() {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        当前账号和记录保存在这台设备的这个浏览器里，尚未跨设备同步。在另一台设备登录同名账号，也不会自动看到这里的画布与探索记录。清除浏览器网站数据前，请先导出备份。
      </p>
      <GuideItem action="设置 → JSON 备份" result="保存当前账号的画布、日记、待办、探索和书籍问答记录。" />
      <GuideItem action="设置 → Markdown 报告" result="导出画布节点与连线的文字版，不包含探索与待办。" />
      <TipBox>
        目前只有导出，没有在网站内导入备份的功能。请妥善保存 JSON 文件，暂时不要把它当作跨设备同步方式。
      </TipBox>
    </div>
  )
}

function ShortcutsGuide() {
  const shortcuts = [
    { key: 'Enter', desc: '底部输入框：直接发送到画布\n编辑模式：保存文字' },
    { key: 'Ctrl + Enter', desc: '将输入存入「我的待办」' },
    { key: 'Esc', desc: '取消选中 / 退出聚焦 / 关闭编辑' },
    { key: 'Delete', desc: '删除选中的节点（软删除，进入垃圾箱）\n删除选中的连线' },
    { key: '滚轮', desc: '缩放画布' },
    { key: '右键', desc: '节点上：弹出操作菜单\n连线上：不可用' },
    { key: '双击节点', desc: '编辑节点文字' },
    { key: '长按节点', desc: '进入聚焦模式（0.6 秒）' },
    { key: '拖拽空白', desc: '平移画布视野' },
    { key: '拖拽节点', desc: '相连节点逐级弹性跟随' },
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
    { type: 'material_reality', label: '物质现实', desc: '你记录的具体事件或现实情况', r: 14 },
    { type: 'seed', label: '未分类', desc: '刚刚捕捉的原始念头，尚未归类', r: 8 },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        节点有 8 种类型，帮助你区分不同层次。大小和颜色只是视觉提示，不代表哪一句更重要。
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
          层级帮助你理解节点类型，不会自动决定两句话之间的因果方向
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
        <p className="text-sm font-medium mb-2" style={{ color: '#4A4036' }}>生活领域（9 个预设 + 自定义分类）</p>
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
            { emoji: '✨', label: '自定义分类' },
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
          删除的节点会先进入垃圾箱。7 天内可以恢复，之后系统会自动清理。
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
          打开顶部的「信念总览」，再选择「垃圾箱」：
        </p>
        <ul className="text-xs mt-2 space-y-1" style={{ color: '#9C9088', listStyle: 'disc', paddingLeft: 16 }}>
          <li>每个节点显示剩余自动清理天数</li>
          <li>「恢复」—— 将节点恢复到画布</li>
          <li>「彻底删除」—— 立即永久删除，不可恢复</li>
        </ul>
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
    <div className="rounded-xl border border-[#EEE5D9] bg-[#FFFBF5]/60 px-3 py-2.5">
      <p className="text-sm font-medium" style={{ color: '#4A4036' }}>{action}</p>
      <p className="manual-guide-result mt-1">{result}</p>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-sm leading-6 px-3 py-2.5 rounded-xl mt-3"
      style={{
        backgroundColor: 'rgba(200, 169, 110, 0.06)',
        borderLeft: '2px solid #C8A96E',
        color: '#665A4D',
      }}
    >
      <span className="font-medium">小提示：</span>{children}
    </div>
  )
}
