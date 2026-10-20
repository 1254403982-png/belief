import { useSyncExternalStore } from 'react'
import { enCopy } from './i18n.en'

export type Language = 'zh-CN' | 'en'

const STORAGE_KEY = 'belief-language'
const listeners = new Set<() => void>()

function readLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

let currentLanguage: Language = readLanguage()

function notify() {
  for (const listener of listeners) listener()
}

function updateDocumentLanguage(language: Language) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.title = language === 'en' ? 'Belief' : '信念'
}

export function getLanguage(): Language {
  return currentLanguage
}

export function setLanguage(language: Language) {
  if (currentLanguage === language) return
  currentLanguage = language
  try { localStorage.setItem(STORAGE_KEY, language) } catch { /* Keep this session's choice. */ }
  updateDocumentLanguage(language)
  notify()
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener) },
    getLanguage,
    getLanguage,
  )
}

if (typeof window !== 'undefined') {
  updateDocumentLanguage(currentLanguage)
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return
    const next = readLanguage()
    if (next !== currentLanguage) {
      currentLanguage = next
      updateDocumentLanguage(next)
      notify()
    }
  })
}

/** Display-only copy. User notes and saved belief content are never translated. */
export function text(zh: string, en: string): string {
  return currentLanguage === 'en' ? en : zh
}

export function tr(zh: string): string {
  return currentLanguage === 'en' ? (enCopy[zh] ?? zh) : zh
}
