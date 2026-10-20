import { setLanguage, useLanguage } from '../i18n'

export default function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const language = useLanguage()
  return (
    <div role="group" aria-label={language === 'en' ? 'Website language' : '网站语言'}
      className="inline-flex items-center rounded-full border border-[#E0D8CC] bg-[#FFFBF5]/90 p-1 text-xs text-[#5C4A3A]">
      {([['zh-CN', '中文'], ['en', 'EN']] as const).map(([value, label]) => (
        <button key={value} type="button" lang={value} aria-pressed={language === value}
          aria-label={value === 'en' ? 'English' : '简体中文'}
          className={`min-h-8 rounded-full px-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8A96E] ${language === value ? 'bg-[#EEDFC6]' : 'hover:bg-[#F3E9DB]'}`}
          onClick={event => { event.stopPropagation(); setLanguage(value) }}>
          {compact && value === 'zh-CN' ? '中' : label}
        </button>
      ))}
    </div>
  )
}
