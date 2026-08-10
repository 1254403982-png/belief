import type { BookData } from '../types'
import ref01 from './ref01.md?raw'
import ref02 from './ref02.md?raw'
import ref03 from './ref03.md?raw'
import ref04 from './ref04.md?raw'
import ref05 from './ref05.md?raw'
import ref06 from './ref06.md?raw'
import ref07 from './ref07.md?raw'
import ref08 from './ref08.md?raw'
import ref09 from './ref09.md?raw'
import ref10 from './ref10.md?raw'
import ref11 from './ref11.md?raw'
import ref12 from './ref12.md?raw'

const chunk = (chapter: string, text: string) => {
  // 按段落切分，保留足够长的片段用于检索（≥200字）
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  const chunks: Array<{ chapter: string; text: string }> = []
  let buf = ''
  for (const p of paras) {
    buf += (buf ? '\n\n' : '') + p
    if (buf.length >= 800) {
      chunks.push({ chapter, text: buf.trim() })
      buf = ''
    }
  }
  if (buf.trim().length >= 200) chunks.push({ chapter, text: buf.trim() })
  return chunks
}

export const soulEternal: BookData = {
  meta: {
    id: 'soul-eternal',
    title: '灵魂永生',
    author: 'Jane Roberts (赛斯 口授)',
    description:
      '赛斯书《灵魂永生》(Seth Speaks: The Eternal Validity of the Soul) 完整中文版。赛斯通过珍·罗勃兹口授，探讨多次元人格、意识本质、转世、梦、内在感官、灵魂等主题。',
    emoji: '📖',
  },
  chunks: [
    ...chunk('第1章 我不具形体，但我却在写书', ref01),
    ...chunk('第2章 我现在的环境、工作与活动', ref02),
    ...chunk('第3章 我的工作及它带我进入的那些实相次元', ref03),
    ...chunk('第4章 转世剧', ref04),
    ...chunk('第5章 思想如何形成物质——交会点', ref05),
    ...chunk('第6-7章 灵魂与其知觉的本质 / 灵魂的潜力', ref06),
    ...chunk('第8章 睡眠、梦与意识 (上)', ref07),
    ...chunk('第8章 睡眠、梦与意识 (中)', ref08),
    ...chunk('第8章 睡眠、梦与意识 (下)', ref09),
    ...chunk('第8章 睡眠、梦与意识 (末)', ref10),
    ...chunk('第21章 宗教的意义', ref11),
    ...chunk('目录与作者序', ref12),
  ],
}
