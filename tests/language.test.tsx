import React from 'react'
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import BrandScreen from '../src/components/BrandScreen'
import SettingsPanel from '../src/components/SettingsPanel'
import { getLanguage, setLanguage, tr } from '../src/i18n'
import { getCategoryLabel, getTypeLabel } from '../src/components/utils'
import { linkTypeLabel } from '../src/utils/beliefLinks'
import { describeAIRequestFailure } from '../src/utils/deepseek'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
} })

after(() => setLanguage('zh-CN'))

test('language choice persists and translates navigation, account, node labels, and AI errors', () => {
  setLanguage('en')
  assert.equal(getLanguage(), 'en')
  assert.equal(memory.get('belief-language'), 'en')
  assert.equal(getTypeLabel('core_belief'), 'Core belief')
  assert.equal(getCategoryLabel('work'), 'Work')
  assert.equal(linkTypeLabel('manual'), 'Relationship to clarify')
  assert.match(describeAIRequestFailure('billing'), /credit is insufficient/)
  assert.equal(tr('My own belief'), 'My own belief')
  assert.equal(tr('念念'), 'Bel')

  const brand = renderToStaticMarkup(<MemoryRouter><BrandScreen /></MemoryRouter>)
  assert.match(brand, /Click anywhere to enter/)
  assert.match(brand, /Website language/)
  assert.doesNotMatch(brand, /点击任意位置进入/)

  const settings = renderToStaticMarkup(<SettingsPanel open onClose={() => {}} />)
  assert.match(settings, /Website language/)
  assert.match(settings, /Export data/)
  assert.doesNotMatch(settings, /数据导出/)

  setLanguage('zh-CN')
  assert.equal(getTypeLabel('core_belief'), '核心信念')
  assert.equal(memory.get('belief-language'), 'zh-CN')
})
