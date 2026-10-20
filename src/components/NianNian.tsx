import { tr } from '../i18n'
/** 念念的界面形象保持为轻量 SVG，和画布上的圆形节点使用同一视觉语言。 */
export default function NianNian({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label={tr("念念")}>
      <circle cx="20" cy="20" r="18" fill="#F5EAD5" stroke="#D9C5A5" strokeWidth="1.2" />
      <circle cx="14.2" cy="17" r="1.55" fill="#6A5848" />
      <circle cx="25.8" cy="17" r="1.55" fill="#6A5848" />
      <path d="M15.2 23.2c2.4 3.1 7.2 3.1 9.6 0" stroke="#6A5848" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10.5" cy="22.3" r="2.1" fill="#E8C3A4" opacity=".58" />
      <circle cx="29.5" cy="22.3" r="2.1" fill="#E8C3A4" opacity=".58" />
    </svg>
  )
}
