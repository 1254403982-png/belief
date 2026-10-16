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
      title: '探索与 AI',
      icon: '🤖',
      content: <AIGuide />,
    },
    {
      id: 'data',
      title: '数据与备份',
      icon: '💾',
      content: <DataGuide />,
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
    { icon: '📚', name: '书本问答', desc: '选择已收录的书，提问书中概念；需要时可单次结合自己的信念' },
    { icon: '💡', name: '我的探索', desc: '保存自己的思考，需要时让 AI 问一个问题；旧深度思考笔记也在这里' },
    { icon: '🌿', name: '自动梳理布局', desc: '开启/关闭力导向自动布局，让节点自动排列。再次点击关闭' },
    { icon: '⚙️', name: '设置', desc: '账号信息、定期梳理开关、手动触发梳理、数据导出（JSON/Markdown）' },
    { icon: '❓', name: '使用手册', desc: '随时查看画布、探索和数据保存方式' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: '#9C9088' }}>
        顶部栏的常用入口：
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
        result="选中节点，桌面端右侧弹出详情面板，手机端底部弹出（不遮挡画布）"
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
        result="相连节点逐级跟随；拖到另一节点附近松手，会添加一条待厘清关系"
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
        result="取消选中、退出聚焦、关闭所有浮层"
      />

      <TipBox>
        <strong>小技巧：</strong>选中节点后点击连接图标，再点另一个节点；选择关系类型后才会创建连线。
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
      <GuideItem action="领域分类" result="9 个预设领域 + 自定义分类（学习/工作/金钱/感情等）" />
      <GuideItem action="态度标记" result="破除 / 坚定 / 观察 —— 标记你对这个信念的态度" />
      <GuideItem action="用户笔记" result="自由记录对这个信念的补充思考" />
      <GuideItem action="长期信念" result="标记后在「待坚定」列表中显示" />
      <GuideItem action="待清理" result="标记后在「待破除」列表中显示，并触发每周梳理提醒" />
      <GuideItem action="释怀" result="优雅的粒子消散动画（2.5 秒），自动进入垃圾箱" />
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
        画布底部的输入框是你与信念网络交互的主要入口。输入框左侧是 AI 按钮，右侧内置发送按钮。
      </p>

      <div className="rounded-lg p-3 space-y-3" style={{
        backgroundColor: 'rgba(200, 169, 110, 0.05)',
        border: '1px solid rgba(200, 169, 110, 0.1)',
      }}>
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>Enter / ➤ 直接发送</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            输入任何念头，按 Enter 或点击输入框内的发送按钮（纸飞机图标 ➤），内容会立即以「未分类」类型出现在画布上，不做 AI 处理。
            这是最快的输入方式，适合快速捕捉想法。
          </p>
          <p className="text-xs mt-1" style={{ color: '#C4B8B0' }}>
            输入框为空时发送按钮为灰色，输入文字后自动亮起。
          </p>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(200, 169, 110, 0.12)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#4A4036' }}>🤖 AI 按钮</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9C9088' }}>
            点击输入框左侧的 🤖 按钮，AI 会分析你的输入：判断信念类型 → 润色表达 → 建议分类领域 → 识别与已有节点的关联 → 给出温柔洞察。
            你可以选择「采纳建议」「仅分类」或「保留原样」。
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
        想快速记录？直接输入 + Enter 秒上画布。需要 AI 帮忙分类润色？点一下 🤖 按钮即可。
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
          在底部输入框输入文字后，点击左侧的 🤖 按钮，AI 会判断信念类型、润色表达、建议领域分类，并识别与已有节点的关联。
          结果以浮层卡片展示，可选择「采纳建议」「仅分类」或「保留原样」。
        </p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          AI 暂时无法回应时，原始输入仍在建议卡片中；点击「保留原文」即可将它加入画布。
        </p>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>💡 我的探索</p>
        <p className="text-xs leading-relaxed mt-1" style={{ color: '#9C9088' }}>
          点击顶部 💡，写下具体经历或尚未想明白的念头。可以一直自己写，也可以主动请 AI 帮忙：
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
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>📚 书本问答</p>
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
        <p className="text-sm font-medium" style={{ color: '#4A4036' }}>🌿 定期梳理</p>
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
      <GuideItem action="⚙️ 设置 → JSON 备份" result="导出当前账号的画布、日记、待办、探索和书籍问答记录，适合留存完整备份" />
      <GuideItem action="⚙️ 设置 → Markdown 报告" result="导出画布节点与连线的文字报告，不包含探索与待办" />
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
    { key: 'Esc', desc: '取消选中 / 退出聚焦 / 关闭编辑 / 关闭浮层' },
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
