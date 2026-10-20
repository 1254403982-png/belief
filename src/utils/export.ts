/**
 * 数据导出工具
 *
 * 支持 JSON（完整备份）和 Markdown（人类可读日记）两种格式。
 */

import { db } from '../db'
import { getTypeLabel, getCategoryLabel, getCategoryEmoji, edgeTypeLabel } from '../components/utils'
import { getLanguage, text } from '../i18n'

// ====== JSON 导出 ======

export async function exportAsJSON(userId: string): Promise<void> {
  const nodes = await db.beliefNodes.where('userId').equals(userId).toArray()
  const edges = await db.beliefEdges.where('userId').equals(userId).toArray()
  const user = await db.userAccounts.get(userId)
  const thoughtJournals = await db.thoughtJournals.where('userId').equals(userId).toArray()
  const dailyTasks = await db.dailyTasks.where('userId').equals(userId).toArray()
  const conversationSessions = await db.conversationSessions.where('userId').equals(userId).toArray()
  const bookChats = await db.bookChats.where('userId').equals(userId).toArray()

  const data = {
    exportedAt: new Date().toISOString(),
    appVersion: '0.2.0',
    backupVersion: 3,
    user: user ? {
      username: user.username,
      reviewSettings: user.reviewSettings,
      createdAt: user.createdAt,
    } : null,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    thoughtJournals,
    dailyTasks,
    conversationSessions,
    bookChats,
  }

  downloadFile(
    JSON.stringify(data, null, 2),
    `${text('信念-备份', 'Belief-backup')}-${formatDateStr(new Date())}.json`,
    'application/json',
  )
}

// ====== Markdown 导出 ======

export async function exportAsMarkdown(userId: string): Promise<void> {
  const nodes = await db.beliefNodes.where('userId').equals(userId).toArray()
  const edges = await db.beliefEdges.where('userId').equals(userId).toArray()

  // 按分类分组
  const byCategory = new Map<string, typeof nodes>()
  for (const n of nodes) {
    const cat = n.category || '未分类'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(n)
  }

  // 按态度分组
  const breakNodes = nodes.filter(n => n.attitude === 'break')
  const strengthenNodes = nodes.filter(n => n.attitude === 'strengthen')
  const observeNodes = nodes.filter(n => n.attitude === 'observe')

  const lines: string[] = [
    text('# 信念 · 导出报告', '# Belief · Export report'),
    '',
    `${text('> 导出时间：', '> Exported: ')}${new Date().toLocaleString(getLanguage())}`,
    text(`> 节点总数：${nodes.length}　连线总数：${edges.length}`, `> Nodes: ${nodes.length} · Links: ${edges.length}`),
    '',
    '---',
    '',
    text('## 📋 按领域分类', '## 📋 By life area'),
    '',
  ]

  for (const [cat, catNodes] of byCategory) {
    const emoji = getCategoryEmoji(cat)
    const label = getCategoryLabel(cat)
    lines.push(text(`### ${emoji} ${label}（${catNodes.length}）`, `### ${emoji} ${label} (${catNodes.length})`))
    lines.push('')
    for (const n of catNodes) {
      const typeLabel = getTypeLabel(n.type)
      const attitude = n.attitude
        ? { break: text(' [破除]', ' [Release]'), strengthen: text(' [坚定]', ' [Strengthen]'), observe: text(' [观察]', ' [Observe]') }[n.attitude] ?? ''
        : ''
      lines.push(`- **${escapeMd(n.content)}** — *${typeLabel}*${attitude}`)
      if (n.userNote) lines.push(`  > ${escapeMd(n.userNote)}`)
    }
    lines.push('')
  }

  // 连线关系
  if (edges.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push(text('## 🔗 信念连线', '## 🔗 Belief links'))
    lines.push('')
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    for (const e of edges) {
      const src = nodeMap.get(e.sourceId)
      const tgt = nodeMap.get(e.targetId)
      if (src && tgt) {
        lines.push(text(
          `- **${escapeMd(src.content)}** → **${escapeMd(tgt.content)}**（${edgeTypeLabel(e.type)}）`,
          `- **${escapeMd(src.content)}** → **${escapeMd(tgt.content)}** (${edgeTypeLabel(e.type)})`,
        ))
      }
    }
    lines.push('')
  }

  // 态度汇总
  if (breakNodes.length > 0 || strengthenNodes.length > 0 || observeNodes.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push(text('## 🏷️ 态度标记', '## 🏷️ Reflection markers'))
    lines.push('')
    if (breakNodes.length > 0) {
      lines.push(text(`### 待破除（${breakNodes.length}）`, `### To release (${breakNodes.length})`))
      lines.push('')
      for (const n of breakNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
    if (strengthenNodes.length > 0) {
      lines.push(text(`### 待坚定（${strengthenNodes.length}）`, `### To strengthen (${strengthenNodes.length})`))
      lines.push('')
      for (const n of strengthenNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
    if (observeNodes.length > 0) {
      lines.push(text(`### 观察中（${observeNodes.length}）`, `### Observing (${observeNodes.length})`))
      lines.push('')
      for (const n of observeNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
  }

  downloadFile(
    lines.join('\n'),
    `${text('信念-报告', 'Belief-report')}-${formatDateStr(new Date())}.md`,
    'text/markdown;charset=utf-8',
  )
}

// ====== 工具 ======

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function escapeMd(text: string): string {
  return text.replace(/([*_`[\]])/g, '\\$1')
}
