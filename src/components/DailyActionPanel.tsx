import { useEffect, useState } from 'react'
import { db, type DailyTask } from '../db'
import { formatDate } from './utils'

interface Props {
  open: boolean
  onClose: () => void
  onTaskCountChange: (count: number) => void
}

export default function DailyActionPanel({ open, onClose, onTaskCountChange }: Props) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const today = formatDate(new Date())
  const userId = localStorage.getItem('currentUserId') || ''

  const loadTasks = async () => {
    const all = await db.dailyTasks.where('userId').equals(userId).toArray()
    setTasks(all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
    onTaskCountChange(all.filter(task => task.status === 'pending').length)
  }

  useEffect(() => {
    if (open) void loadTasks().catch(() => setError('暂时无法读取待办，请重新打开试试。'))
  }, [open, userId])

  const setStatus = async (task: DailyTask, status: DailyTask['status']) => {
    setSaving(true)
    setError('')
    try {
      await db.dailyTasks.update(task.id, { status })
      await loadTasks()
    } catch { setError('没有保存成功，请重试。') }
    finally { setSaving(false) }
  }

  const addTask = async () => {
    if (!content.trim() || !userId || saving) return
    setSaving(true)
    setError('')
    try {
      await db.dailyTasks.add({ id: crypto.randomUUID(), userId, content: content.trim(), date: today, status: 'pending', createdAt: new Date() })
      setContent('')
      await loadTasks()
    } catch { setError('没有保存成功，内容仍在输入框中，请重试。') }
    finally { setSaving(false) }
  }

  if (!open) return null
  const pending = tasks.filter(task => task.status === 'pending')
  const done = tasks.filter(task => task.status === 'done')
  return <section className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col" aria-label="我的待办">
    <header className="px-6 pt-6 pb-4 flex justify-between items-center">
      <h2 className="font-serif text-lg text-[#5C4A3A]">我的待办</h2>
      <button className="text-sm p-2 text-[#7A7670]" aria-label="关闭待办" onClick={onClose}>关闭</button>
    </header>
    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
      <p className="text-xs leading-6 text-[#7A7670]">这里放想实际去做的事。完成后由你勾选；还没做完的会一直留着。</p>
      <label className="block text-sm text-[#5C4A3A]">一个想尝试的小行动
        <textarea value={content} onChange={event => setContent(event.target.value)} rows={3}
          placeholder="例如：下次讨论时，表达一个自己的想法"
          className="w-full bg-transparent border border-[#E0D8CC] rounded-lg p-2 mt-2 text-sm" />
      </label>
      <button className="btn-soft text-sm disabled:opacity-40" disabled={saving || !content.trim()} onClick={() => void addTask()}>记下待办</button>
      {error && <p role="alert" className="text-sm text-[#9A573E]">{error}</p>}
      {pending.length === 0 && <p className="text-sm py-5 text-[#7A7670]">暂时没有待办，也可以先停留在思考里。</p>}
      {pending.map(task => <article key={task.id} className="rounded-xl border border-[#E0D8CC] p-3 space-y-2">
        <p className="text-sm leading-7 whitespace-pre-wrap break-words">{task.content}</p>
        <div className="flex justify-between items-center text-xs text-[#7A7670]">
          <span>{task.date === today ? '今天记下' : `${task.date} 记下`}</span>
          <button className="btn-soft text-xs" disabled={saving} onClick={() => void setStatus(task, 'done')}>我完成了</button>
        </div>
      </article>)}
      {done.length > 0 && <details className="text-sm text-[#7A7670]">
        <summary className="cursor-pointer py-2">已完成的待办（{done.length}）</summary>
        {done.map(task => <div key={task.id} className="py-3 border-b border-[#E0D8CC] space-y-1">
          <p className="whitespace-pre-wrap break-words">{task.content}</p>
          <button className="underline text-xs py-2" disabled={saving} onClick={() => void setStatus(task, 'pending')}>放回待办</button>
        </div>)}
      </details>}
    </div>
  </section>
}
