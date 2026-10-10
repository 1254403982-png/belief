import 'fake-indexeddb/auto'
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BeliefNode, BookChatMessage } from '../src/db'
import { db } from '../src/db'
import type { BookData } from '../src/data/books/types'
import BookAnswer from '../src/components/BookAnswer'
import { selectBookBeliefs } from '../src/utils/bookBeliefs'
import { searchBook, searchBookForConversation } from '../src/utils/bookSearch'
import { appendBookChatMessage, loadBookChats } from '../src/utils/bookChat'
import { askBook } from '../src/utils/deepseek'

const userId = 'book-test-user'
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => key === 'currentUserId' ? userId : null,
} })

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map(table => table.clear()))
  await db.userAccounts.add({ id: userId, username: 'reader', passwordHash: 'test', createdAt: new Date() })
})

test('普通书籍问答只发送书中段落；主动选择后才传入个人信念', async () => {
  const requests: any[] = []
  globalThis.fetch = async (_url: unknown, init: any) => {
    requests.push(JSON.parse(init.body))
    return { ok: true, json: async () => ({ choices: [{ message: { content: '**内我**是书中的概念。' } }] }) } as any
  }
  const passages = [{ chapter: '第6章', snippet: '书中讨论内我与感知的关系。' }]
  await askBook('测试书', '内我是什么？', passages)
  const plain = JSON.parse(requests[0].messages[1].content)
  assert.equal(plain.personalBeliefs, undefined)
  assert.deepEqual(plain.passages, [{ chapter: '第6章', text: passages[0].snippet }])
  assert.match(requests[0].messages[0].content, /不要提及用户个人信念/)

  await askBook('测试书', '内我是什么？', passages, { personalBeliefs: ['我必须做到完美'] })
  const personal = JSON.parse(requests[1].messages[1].content)
  assert.deepEqual(personal.personalBeliefs, ['我必须做到完美'])
  assert.match(requests[1].messages[0].content, /用户主动选择/)
})

test('书籍追问保留最近四轮上下文，纯书本模式排除个人讨论', async () => {
  const requests: any[] = []
  globalThis.fetch = async (_url: unknown, init: any) => {
    requests.push(JSON.parse(init.body))
    return { ok: true, json: async () => ({ choices: [{ message: { content: '依据本轮段落继续解释。' } }] }) } as any
  }
  const history = [
    ...Array.from({ length: 5 }, (_, index) => [
      { role: 'user' as const, content: `书本问题 ${index}`, mode: 'book' as const },
      { role: 'assistant' as const, content: `书本回答 ${index}`, mode: 'book' as const },
    ]).flat(),
    { role: 'user' as const, content: '我的私密信念', mode: 'personal' as const },
    { role: 'assistant' as const, content: '个人化分析', mode: 'personal' as const },
  ]
  const passages = [{ chapter: '第4章', snippet: '本轮检索到的段落。' }]

  await askBook('测试书', '它和前面提到的有什么不同？', passages, { history })
  const messages = requests[0].messages
  assert.equal(messages.length, 10) // system + 4 pairs + current question
  assert.equal(messages[1].content, '书本问题 1')
  assert.equal(messages[8].content, '书本回答 4')
  assert.doesNotMatch(JSON.stringify(messages), /我的私密信念|个人化分析|书本问题 0/)
  assert.match(messages[0].content, /之前的问答只用来理解追问中的指代/)
  assert.deepEqual(JSON.parse(messages.at(-1).content).passages, [{ chapter: '第4章', text: '本轮检索到的段落。' }])
})

test('用户本轮选择结合信念时可以接续同一本书的个人讨论', async () => {
  let request: any
  globalThis.fetch = async (_url: unknown, init: any) => {
    request = JSON.parse(init.body)
    return { ok: true, json: async () => ({ choices: [{ message: { content: '继续讨论。' } }] }) } as any
  }
  const history = [
    { role: 'user' as const, content: '书本概念是什么？', mode: 'book' as const },
    { role: 'assistant' as const, content: '书本解释。', mode: 'book' as const },
    { role: 'user' as const, content: '结合我的情况呢？', mode: 'personal' as const },
    { role: 'assistant' as const, content: '可以联系这条记录。', mode: 'personal' as const },
  ]

  await askBook('测试书', '继续说说这个关联', [{ chapter: '第4章', snippet: '本轮书中依据。' }], {
    personalBeliefs: ['我必须做到完美'], history,
  })
  assert.deepEqual(request.messages.slice(1, -1).map((item: { content: string }) => item.content), [
    '书本概念是什么？', '书本解释。', '结合我的情况呢？', '可以联系这条记录。',
  ])
  assert.deepEqual(JSON.parse(request.messages.at(-1).content).personalBeliefs, ['我必须做到完美'])
})

test('书籍对话按账号和书籍隔离，重载后保留消息且重复追加不产生副本', async () => {
  const makeMessage = (id: string, content: string): BookChatMessage => ({
    id, role: 'user', content, mode: 'book', createdAt: new Date('2026-10-10T00:00:00Z'),
  })
  const first = makeMessage('message-1', '第一本书的提问')
  await appendBookChatMessage(userId, 'book-a', first)
  await appendBookChatMessage(userId, 'book-a', makeMessage('message-2', '后续提问'))
  await appendBookChatMessage(userId, 'book-a', first)
  await appendBookChatMessage(userId, 'book-b', makeMessage('message-3', '第二本书的提问'))
  await appendBookChatMessage('other-reader', 'book-a', makeMessage('message-4', '其他账号的提问'))

  const ownChats = await loadBookChats(userId)
  assert.equal(ownChats.length, 2)
  assert.deepEqual(ownChats.find(chat => chat.bookId === 'book-a')?.messages.map(message => message.id), ['message-1', 'message-2'])
  assert.deepEqual(ownChats.find(chat => chat.bookId === 'book-b')?.messages.map(message => message.id), ['message-3'])
  assert.deepEqual((await loadBookChats('other-reader')).map(chat => chat.messages[0].content), ['其他账号的提问'])

  await db.close()
  await db.open()
  const reopened = await loadBookChats(userId)
  assert.equal(reopened.find(chat => chat.bookId === 'book-a')?.messages[0].content, '第一本书的提问')
  assert.ok(reopened.find(chat => chat.bookId === 'book-a')?.messages[0].createdAt instanceof Date)
})

test('个人模式只选择当前账号尚在使用的信念', () => {
  const node = (id: string, user: string, type: BeliefNode['type'], status: BeliefNode['status']): BeliefNode => ({
    id, userId: user, type, status, content: id,
    position: { x: 0, y: 0, z: 0 }, createdAt: new Date(), updatedAt: new Date(),
  })
  const nodes = [
    node('普通记录', userId, 'thought', 'active'),
    node('核心信念', userId, 'core_belief', 'observed'),
    node('其他账号私有记录', 'another-user', 'core_belief', 'active'),
    node('已释怀的记录', userId, 'core_belief', 'released'),
    { ...node('垃圾箱记录', userId, 'core_belief', 'active'), deletedAt: new Date() },
  ]
  assert.deepEqual(selectBookBeliefs(nodes, userId), ['核心信念', '普通记录'])
})

test('长段落检索摘录包含实际命中的概念', () => {
  const book: BookData = { meta: { id: 'x', title: '测试', author: '', description: '', emoji: '' },
    chunks: [{ chapter: '第3章', text: '前文'.repeat(900) + '多次元人格是本段关键概念。' }] }
  const results = searchBook(book, '多次元人格')
  assert.equal(results.length, 1)
  assert.match(results[0].snippet, /多次元人格/)
})

test('书籍代词追问沿用前一书本概念检索，不借用个人模式的问题', () => {
  const book: BookData = {
    meta: { id: 'x', title: '测试', author: '', description: '', emoji: '' },
    chunks: [
      { chapter: '内我章', text: '内我与感知有关。'.repeat(40) },
      { chapter: '外在自我章', text: '外在自我与表达有关。'.repeat(40) },
    ],
  }
  const history = [
    { role: 'user' as const, content: '内我是什么？', mode: 'book' as const },
    { role: 'assistant' as const, content: '上一轮解释了内我。', mode: 'book' as const },
    { role: 'user' as const, content: '外在自我是什么？', mode: 'personal' as const },
    { role: 'assistant' as const, content: '个人讨论。', mode: 'personal' as const },
  ]
  const results = searchBookForConversation(book, '它呢？', history)
  assert.equal(results[0]?.chapter, '内我章')
  assert.ok(results.every(result => result.chapter !== '外在自我章'))
})

test('代词追问不把尚未得到回答的上一条问题当作检索依据', () => {
  const book: BookData = {
    meta: { id: 'x', title: '测试', author: '', description: '', emoji: '' },
    chunks: [
      { chapter: '内我章', text: '内我与感知有关。'.repeat(40) },
      { chapter: '外在自我章', text: '外在自我与表达有关。'.repeat(40) },
    ],
  }
  const history = [
    { role: 'user' as const, content: '内我是什么？', mode: 'book' as const },
    { role: 'assistant' as const, content: '这里解释了内我。', mode: 'book' as const },
    { role: 'user' as const, content: '外在自我是什么？', mode: 'book' as const },
  ]
  const results = searchBookForConversation(book, '它呢？', history)
  assert.equal(results[0]?.chapter, '内我章')
  assert.ok(results.every(result => result.chapter !== '外在自我章'))
})

test('书籍回答把 Markdown 加粗渲染为文字样式，不执行 HTML', () => {
  const html = renderToStaticMarkup(<BookAnswer content={'**重点**\n\n- 第一条\n\n<script>alert(1)</script>'} />)
  assert.match(html, /<strong[^>]*>重点<\/strong>/)
  assert.match(html, /<li>第一条<\/li>/)
  assert.doesNotMatch(html, /<script/)
  assert.doesNotMatch(html, /\*\*重点\*\*/)
})
