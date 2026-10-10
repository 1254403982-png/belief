import 'fake-indexeddb/auto'
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BeliefNode } from '../src/db'
import { db } from '../src/db'
import type { BookData } from '../src/data/books/types'
import BookAnswer from '../src/components/BookAnswer'
import { selectBookBeliefs } from '../src/utils/bookBeliefs'
import { searchBook } from '../src/utils/bookSearch'
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

test('书籍回答把 Markdown 加粗渲染为文字样式，不执行 HTML', () => {
  const html = renderToStaticMarkup(<BookAnswer content={'**重点**\n\n- 第一条\n\n<script>alert(1)</script>'} />)
  assert.match(html, /<strong[^>]*>重点<\/strong>/)
  assert.match(html, /<li>第一条<\/li>/)
  assert.doesNotMatch(html, /<script/)
  assert.doesNotMatch(html, /\*\*重点\*\*/)
})
