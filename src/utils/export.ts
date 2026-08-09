/**
 * 数据导出工具
 *
 * 支持 JSON（完整备份）和 Markdown（人类可读日记）两种格式。
 */

import { db } from '../db'
import { getTypeLabel, getCategoryLabel, getCategoryEmoji, edgeTypeLabel } from '../components/utils'

// ====== JSON 导出 ======

export async function exportAsJSON(userId: string): Promise<void> {
  const nodes = await db.beliefNodes.where('userId').equals(userId).toArray()
  const edges = await db.beliefEdges.where('userId').equals(userId).toArray()
  const user = await db.userAccounts.get(userId)

  const data = {
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0',
    user: user ? {
      username: user.username,
      reviewSettings: user.reviewSettings,
      createdAt: user.createdAt,
    } : null,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
  }

  downloadFile(
    JSON.stringify(data, null, 2),
    `信念-备份-${formatDateStr(new Date())}.json`,
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
    const cat = n.category || 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(n)
  }

  // 按态度分组
  const breakNodes = nodes.filter(n => n.attitude === 'break')
  const strengthenNodes = nodes.filter(n => n.attitude === 'strengthen')
  const observeNodes = nodes.filter(n => n.attitude === 'observe')

  const lines: string[] = [
    '# 信念 · 导出报告',
    '',
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    `> 节点总数：${nodes.length}　连线总数：${edges.length}`,
    '',
    '---',
    '',
    '## 📋 按领域分类',
    '',
  ]

  for (const [cat, catNodes] of byCategory) {
    const emoji = getCategoryEmoji(cat)
    const label = getCategoryLabel(cat)
    lines.push(`### ${emoji} ${label}（${catNodes.length}）`)
    lines.push('')
    for (const n of catNodes) {
      const typeLabel = getTypeLabel(n.type)
      const attitude = n.attitude
        ? { break: ' [破除]', strengthen: ' [坚定]', observe: ' [观察]' }[n.attitude] ?? ''
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
    lines.push('## 🔗 信念连线')
    lines.push('')
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    for (const e of edges) {
      const src = nodeMap.get(e.sourceId)
      const tgt = nodeMap.get(e.targetId)
      if (src && tgt) {
        lines.push(`- **${escapeMd(src.content)}** → **${escapeMd(tgt.content)}**（${edgeTypeLabel(e.type)}）`)
      }
    }
    lines.push('')
  }

  // 态度汇总
  if (breakNodes.length > 0 || strengthenNodes.length > 0 || observeNodes.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## 🏷️ 态度标记')
    lines.push('')
    if (breakNodes.length > 0) {
      lines.push(`### 待破除（${breakNodes.length}）`)
      lines.push('')
      for (const n of breakNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
    if (strengthenNodes.length > 0) {
      lines.push(`### 待坚定（${strengthenNodes.length}）`)
      lines.push('')
      for (const n of strengthenNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
    if (observeNodes.length > 0) {
      lines.push(`### 观察中（${observeNodes.length}）`)
      lines.push('')
      for (const n of observeNodes) lines.push(`- ${escapeMd(n.content)}`)
      lines.push('')
    }
  }

  downloadFile(
    lines.join('\n'),
    `信念-报告-${formatDateStr(new Date())}.md`,
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
