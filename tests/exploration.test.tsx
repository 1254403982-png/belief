import 'fake-indexeddb/auto'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { create, act } from 'react-test-renderer'
import { db } from '../src/db'
import { continueFromJournal, listExplorations, retainExplorationCandidate, saveExploration } from '../src/db/explorations'
import { appendThought, newExploration, normalizeExploration, parseExplorationQuestion, parseExplorationSummary } from '../src/utils/exploration'
import { readExplorationRecovery, storeExplorationRecovery } from '../src/utils/explorationRecovery'
import ExplorationPanel from '../src/components/ExplorationPanel'
import DailyActionPanel from '../src/components/DailyActionPanel'
import AISuggestionToast from '../src/components/AISuggestionToast'
import { classifyInput, type ClassifyResult } from '../src/utils/deepseek'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
} })
globalThis.document = { activeElement: { focus() {} } } as any
let renderer: ReturnType<typeof create> | undefined
let calls: any[] = []
let reply: (body: any) => Promise<unknown>
const userId = 'test-user'

beforeEach(async () => {
  memory.clear()
  localStorage.setItem('currentUserId', userId)
  calls = []
  reply = async () => ({ question: '这件事当时对你意味着什么？' })
  globalThis.fetch = async (_url: unknown, init: any) => {
    const body = JSON.parse(init.body)
    calls.push(body)
    const payload = await reply(body)
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) } as any
  }
  await db.open()
  await Promise.all(db.tables.map(table => table.clear()))
  await db.userAccounts.add({
    id: userId, username: 'test', passwordHash: 'not-a-real-password', createdAt: new Date(),
  })
})

afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount() })
  renderer = undefined
})

const pause = () => new Promise(resolve => setTimeout(resolve, 5))
async function settle() { await act(async () => { await pause(); await pause() }) }
async function mount() {
  await act(async () => { renderer = create(<ExplorationPanel open onClose={() => {}} />) })
  await settle()
}
function button(label: string) {
  return renderer!.root.findAllByType('button').find(node => node.children.join('') === label)!
}
async function click(label: string) {
  assert.ok(button(label), `missing button ${label}`)
  await act(async () => { await button(label).props.onClick() })
  await settle()
}
async function typeDraft(content: string) {
  await act(async () => { renderer!.root.findByProps({ id: 'exploration-draft' }).props.onChange({ target: { value: content } }) })
  await settle()
}
async function current() { return (await listExplorations(userId))[0] }

test('用户原话保留换行；旧记录原文、创建时间和分析快照都保留', async () => {
  const session = newExploration(userId)
  session.draft = '  我还没想明白\n也许要慢一点。  '
  const next = appendThought(session)
  assert.equal(next.history[0].content, session.draft)
  assert.equal(next.draft, '')
  assert.equal(session.history.length, 0)
  const old = { ...session, description: '旧原话', history: [], lastResult: { insight: '旧分析' } }
  const recovered = normalizeExploration(old)
  assert.equal(recovered.history[0].content, '旧原话')
  assert.deepEqual(recovered.lastResult, old.lastResult)
  await saveExploration(recovered)
  await saveExploration({ ...recovered, createdAt: new Date('2099-01-01') })
  assert.equal((await current()).createdAt.getTime(), session.createdAt.getTime())
})

test('只接收简短的单个问题；候选不能伪造引用或把 AI 话当用户证据', () => {
  assert.equal(parseExplorationQuestion({ question: '为什么？然后呢？' }), null)
  assert.equal(parseExplorationQuestion({ question: '长'.repeat(181) }), null)
  assert.equal(parseExplorationQuestion({ question: '当时你怎么想的？' }), '当时你怎么想的？')
  const history = [{ id: 'u', role: 'user' as const, content: '我担心说错话' }, { id: 'a', role: 'assistant' as const, content: '我不够好' }]
  const item = { content: '我担心说错话', type: 'unknown', reason: '暂不确定', quote: '说错话', sourceMessageId: 'u' }
  const summary = parseExplorationSummary({ text: '还不必下结论', candidates: [item, { ...item, quote: '虚构经历' }, { ...item, quote: '我不够好', sourceMessageId: 'a' }] }, history)!
  assert.equal(summary.candidates.length, 1)
  assert.equal(summary.candidates[0].type, 'seed')
})

test('账号隔离，立即刷新能从草稿快照恢复且恢复日期类型', async () => {
  const session = { ...newExploration(userId), draft: '还没有按保存的原话' }
  storeExplorationRecovery(session)
  const recovered = readExplorationRecovery(userId)!
  assert.equal(recovered.draft, session.draft)
  assert.ok(recovered.createdAt instanceof Date)
  assert.equal(readExplorationRecovery('other'), null)
  await saveExploration(session)
  assert.equal((await listExplorations('other')).length, 0)
  await assert.rejects(saveExploration({ ...session, userId: 'other' }))
})

test('旧深度思考笔记在探索里保留原文，并且重复继续不会产生副本', async () => {
  await db.thoughtJournals.add({
    id: 'old-journal', userId, title: '关于工作的笔记', content: '我今天想到一件事。\n还想继续写。',
    createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-01'),
  })
  await mount()
  await click('从这篇继续探索')
  const session = await current()
  assert.equal(session.title, '关于工作的笔记')
  assert.equal(session.sourceJournalId, 'old-journal')
  assert.equal(session.history[0].content, '我今天想到一件事。\n还想继续写。')
  assert.equal(await db.thoughtJournals.count(), 1)
  await click('继续这篇的探索')
  assert.equal(await db.conversationSessions.count(), 1)
  await assert.rejects(continueFromJournal('other-user', 'old-journal'))
})

test('手动书写不调用 AI，关闭重开恢复原话和未提交草稿', async () => {
  await mount()
  await typeDraft('我想先自己写。\n这一句也要保留。')
  await click('记下这段')
  await typeDraft('写到一半还没有答案')
  assert.equal(calls.length, 0)
  await act(async () => { renderer!.unmount() })
  await mount()
  const session = await current()
  assert.equal(session.history[0].content, '我想先自己写。\n这一句也要保留。')
  assert.equal(renderer!.root.findByProps({ id: 'exploration-draft' }).props.value, '写到一半还没有答案')
})

test('多轮问询保存所有原话；请求失败也不会丢掉刚提交的回答', async () => {
  await mount()
  await typeDraft('别人没有回复，我很在意。')
  await click('问我一个问题')
  assert.equal((await current()).history.length, 2)
  await typeDraft('我担心自己说错了话。')
  reply = async () => { throw new Error('offline') }
  await click('问我一个问题')
  const session = await current()
  assert.equal(session.history.length, 3)
  assert.equal(session.history[2].content, '我担心自己说错了话。')
  assert.ok(renderer!.root.findAllByProps({ role: 'alert' }).length)
  const sent = JSON.parse(calls[1].messages[1].content)
  assert.equal(sent.history[0].content, '别人没有回复，我很在意。')
})

test('停止问询后忽略晚到的响应，新草稿不被覆盖', async () => {
  let finish!: (value: unknown) => void
  reply = () => new Promise(resolve => { finish = resolve })
  await mount()
  await typeDraft('我想说一件事')
  await click('问我一个问题')
  assert.equal(calls.length, 1)
  await typeDraft('等的时候我又想到了一点')
  await click('停止，我先自己写')
  await act(async () => { finish({ question: '这个问题已经取消？' }); await pause() })
  await settle()
  const session = await current()
  assert.equal(session.history.length, 1)
  assert.equal(session.draft, '等的时候我又想到了一点')
})

test('没有激活码的新账号也能请求 AI，并保留原话', async () => {
  await mount()
  await typeDraft('我想慢慢理清这件事')
  await click('问我一个问题')
  assert.equal(calls.length, 1)
  assert.equal((await current()).history[0].content, '我想慢慢理清这件事')
})

test('旧账号过期的激活信息不会限制 AI', async () => {
  await db.userAccounts.update(userId, { activationExpiresAt: new Date('2000-01-01') } as any)
  await mount()
  await typeDraft('旧账号也可以继续探索')
  await click('问我一个问题')
  assert.equal(calls.length, 1)
})

test('模型账户余额不足时说明原因，原话仍已保存', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 402 }) as any
  await mount()
  await typeDraft('这段话不能因为接口失败而丢失')
  await click('问我一个问题')
  assert.equal((await current()).history[0].content, '这段话不能因为接口失败而丢失')
  const alerts = renderer!.root.findAllByProps({ role: 'alert' })
  assert.ok(alerts.some(node => node.children.join('').includes('余额不足')))
})

test('用户主动整理才产生候选，编辑自动保存，重复入图不产生重复节点或自动连线', async () => {
  reply = async body => {
    const { history } = JSON.parse(body.messages[1].content)
    return { text: '先保留这个还不确定的理解。', candidates: [{ content: '我希望被理解', type: 'seed', reason: '还不确定层次', quote: '被理解', sourceMessageId: history[0].id }] }
  }
  await mount()
  await typeDraft('我希望被理解')
  await click('整理到这里')
  assert.equal(await db.beliefNodes.count(), 0)
  const candidateInput = renderer!.root.findAllByType('textarea').find(node => node.props.value === '我希望被理解')!
  await act(async () => { candidateInput.props.onChange({ target: { value: '我正在练习表达自己' } }) })
  await settle()
  assert.equal((await current()).summaries![0].candidates[0].userContent, '我正在练习表达自己')
  await click('把这句话加入画布')
  const session = await current(), summary = session.summaries![0], candidate = summary.candidates[0]
  await retainExplorationCandidate(userId, session.id, summary.id, candidate.id, '不应创建第二个', 'seed', { x: 0, y: 0, z: 0 })
  assert.equal(await db.beliefNodes.count(), 1)
  assert.equal(await db.beliefEdges.count(), 0)
  const node = (await db.beliefNodes.toArray())[0]
  assert.equal(node.content, '我正在练习表达自己')
  assert.equal(node.sourceSessionId, session.id)
  await assert.rejects(retainExplorationCandidate('other', session.id, summary.id, candidate.id, 'wrong user', 'seed', node.position))
})

test('旧待办持续可见，仅用户勾选完成，可撤销；不会调用分类 AI', async () => {
  await db.dailyTasks.add({ id: 'old-task', userId, content: '表达一个小意见', date: '2020-01-01', status: 'pending', createdAt: new Date() })
  let count = 0
  await act(async () => { renderer = create(<DailyActionPanel open onClose={() => {}} onTaskCountChange={value => { count = value }} />) })
  await settle()
  assert.equal(count, 1)
  await click('我完成了')
  assert.equal((await db.dailyTasks.get('old-task'))!.status, 'done')
  await click('放回待办')
  assert.equal((await db.dailyTasks.get('old-task'))!.status, 'pending')
  assert.equal(calls.length, 0)
})

test('比数据库更新的恢复快照在重开时恢复，旧快照不会覆盖新记录', async () => {
  const session = newExploration(userId)
  session.draft = '数据库中的草稿'
  await saveExploration(session)
  storeExplorationRecovery({ ...session, draft: '刷新前最后写下的一句', updatedAt: new Date(session.updatedAt.getTime() + 100) })
  await mount()
  assert.equal(renderer!.root.findByProps({ id: 'exploration-draft' }).props.value, '刷新前最后写下的一句')
  await act(async () => { renderer!.unmount() })
  const saved = await current()
  await saveExploration({ ...saved, draft: '数据库中后来保存的版本', updatedAt: new Date(saved.updatedAt.getTime() + 100) })
  await mount()
  assert.equal(renderer!.root.findByProps({ id: 'exploration-draft' }).props.value, '数据库中后来保存的版本')
})

test('数据库保存失败显示重试，恢复后原话仍可保存', async () => {
  await mount()
  const fail = () => { throw new Error('simulated storage failure') }
  db.conversationSessions.hook('creating', fail)
  try {
    await typeDraft('写入失败也不能丢掉这句话')
    assert.equal(await db.conversationSessions.count(), 0)
    assert.equal(readExplorationRecovery(userId)!.draft, '写入失败也不能丢掉这句话')
    assert.ok(button('重试保存'))
  } finally {
    db.conversationSessions.hook('creating').unsubscribe(fail)
  }
  await click('重试保存')
  assert.equal((await current()).draft, '写入失败也不能丢掉这句话')
})

test('整理保留历史版本，退出重开后用户改写仍在，原候选不被覆盖', async () => {
  reply = async body => {
    const { history } = JSON.parse(body.messages[1].content)
    return { text: '暂时的理解', candidates: [{ content: '原始候选', type: 'seed', reason: '尚待确认', quote: '原话', sourceMessageId: history[0].id }] }
  }
  await mount()
  await typeDraft('这是我的原话')
  await click('整理到这里')
  const candidateInput = renderer!.root.findAllByType('textarea').find(node => node.props.value === '原始候选')!
  await act(async () => { candidateInput.props.onChange({ target: { value: '我的改写' } }) })
  await settle()
  await click('整理到这里')
  await act(async () => { renderer!.unmount() })
  await mount()
  const session = await current()
  assert.equal(session.summaries!.length, 2)
  assert.equal(session.summaries![0].candidates[0].content, '原始候选')
  assert.equal(session.summaries![0].candidates[0].userContent, '我的改写')
  assert.equal(session.history[0].content, '这是我的原话')
})

test('念念无需改写时保留原话，空白润色也不能变成空节点', async () => {
  reply = async () => ({ type: 'seed', polishedContent: '   ', category: '', relatedNodeIds: [], gentleInsight: '' })
  const unchanged = await classifyInput('你好', [])
  assert.equal(unchanged?.polishedContent, '你好')
  assert.equal(unchanged?.type, 'seed')

  reply = async () => ({ type: 'seed', polishedContent: '你好。', category: '', relatedNodeIds: [], gentleInsight: '' })
  const punctuationOnly = await classifyInput('你好', [])
  assert.equal(punctuationOnly?.polishedContent, '你好')

  reply = async () => ({ type: 'thought', polishedContent: '我担心自己做得不够好', category: 'self', relatedNodeIds: [], gentleInsight: '' })
  const revised = await classifyInput('我怕做不好', [])
  assert.equal(revised?.polishedContent, '我担心自己做得不够好')
})

test('建议卡片只在确有改写时展示表达建议，未分类短句按原样记录', () => {
  const renderSuggestion = (originalText: string, polishedContent: string, type: ClassifyResult['type'] = 'seed') => {
    const result: ClassifyResult = {
      type, polishedContent, category: type === 'seed' ? undefined : 'self', relatedNodeIds: [], gentleInsight: '',
    }
    return renderToStaticMarkup(
      <AISuggestionToast
        visible loading={false} error={false} originalText={originalText} result={result}
        onAcceptAll={() => {}} onAcceptTypeOnly={() => {}} onKeepOriginal={() => {}} onDismiss={() => {}}
      />,
    )
  }

  const unchanged = renderSuggestion('你好', '你好')
  assert.match(unchanged, /按原样记录/)
  assert.doesNotMatch(unchanged, /建议分类|>建议表达</)

  const classified = renderSuggestion('我害怕失败', '我害怕失败', 'thought')
  assert.match(classified, /建议分类/)
  assert.doesNotMatch(classified, />建议表达</)

  const revised = renderSuggestion('我怕做不好', '我担心自己做得不够好', 'thought')
  assert.match(revised, /我怕做不好/)
  assert.match(revised, /我担心自己做得不够好/)
  assert.match(revised, />建议表达</)
})
