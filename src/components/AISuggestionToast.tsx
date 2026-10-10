import { motion, AnimatePresence } from 'framer-motion'
import type { ClassifyResult } from '../utils/deepseek'
import { getNodeColor, getTypeLabel, getCategoryLabel, getCategoryEmoji } from './utils'

interface Props {
  visible: boolean
  loading: boolean
  error: boolean
  errorMessage?: string
  originalText: string
  result: ClassifyResult | null
  duplicate?: { id: string; content: string } | null
  onAcceptAll: () => void
  onAcceptTypeOnly: () => void
  onKeepOriginal: () => void
  onDismiss: () => void
}

export default function AISuggestionToast({
  visible,
  loading,
  error,
  errorMessage,
  originalText,
  result,
  duplicate,
  onAcceptAll,
  onAcceptTypeOnly,
  onKeepOriginal,
  onDismiss,
}: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* 半透明遮罩（点击空白保留原样） */}
          <motion.div
            className="fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
          />

          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-30"
            style={{ bottom: 96 }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div
              className="rounded-xl p-5 space-y-3"
              style={{
                backgroundColor: 'rgba(255, 251, 245, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid #E0D8CC',
                boxShadow: '0 4px 28px rgba(74, 64, 54, 0.08)',
              }}
            >
              {/* 重复提示 */}
              {duplicate && !loading && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: '#4A4036' }}>
                    💭 这个想法已经存在了
                  </p>
                  <p
                    className="text-xs leading-relaxed px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.06)',
                      borderLeft: '2px solid #C8A96E',
                      color: '#9C9088',
                    }}
                  >
                    "{duplicate.content.length > 40 ? duplicate.content.slice(0, 40) + '...' : duplicate.content}"
                  </p>
                  <button
                    className="text-sm px-4 py-1.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.1)',
                      color: '#5C4A3A',
                      border: '1px solid rgba(200, 169, 110, 0.25)',
                    }}
                    onClick={onDismiss}
                  >
                    知道了
                  </button>
                </div>
              )}

              {/* 加载态 */}
              {!duplicate && loading && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: '#4A4036' }}>
                    {originalText.length > 30
                      ? originalText.slice(0, 30) + '...'
                      : originalText}
                  </p>
                  <div
                    className="h-5 rounded animate-pulse"
                    style={{
                      background: 'linear-gradient(90deg, rgba(200,169,110,0.06), rgba(200,169,110,0.15), rgba(200,169,110,0.06))',
                      backgroundSize: '200% 100%',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#C4B8B0' }}>
                    AI 正在理解...
                  </p>
                </div>
              )}

              {/* 错误态 */}
              {error && !loading && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#9C9088' }}>
                    {errorMessage || 'AI 暂时无法回应。你可以先保留原文。'}
                  </p>
                  <button
                    className="text-sm px-4 py-1.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.1)',
                      color: '#5C4A3A',
                      border: '1px solid rgba(200, 169, 110, 0.25)',
                    }}
                    onClick={onKeepOriginal}
                  >
                    保留原文
                  </button>
                </div>
              )}

              {/* 结果态 */}
              {result && !loading && (
                <div className="space-y-4">
                  {/* 原文 → 润色版 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(200, 169, 110, 0.08)', color: '#9C9088' }}>
                        原文
                      </span>
                      <p className="text-sm line-through" style={{ color: '#C4B8B0' }}>
                        {originalText.length > 40 ? originalText.slice(0, 40) + '...' : originalText}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(160, 200, 176, 0.15)', color: '#5A7A68' }}>
                        润色
                      </span>
                      <p className="text-sm font-medium" style={{ color: '#4A4036' }}>
                        {result.polishedContent}
                      </p>
                    </div>
                  </div>

                  {/* 类型建议 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: '#9C9088' }}>建议分类</span>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: hexToRgba(getNodeColor(result.type), 0.15),
                        color: '#5C4A3A',
                        border: `1px solid ${hexToRgba(getNodeColor(result.type), 0.3)}`,
                      }}
                    >
                      {getTypeLabel(result.type)}
                    </span>
                    {result.category && (
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(139, 164, 188, 0.08)',
                          color: '#5A6A7A',
                          border: '1px solid rgba(139, 164, 188, 0.2)',
                        }}
                      >
                        {getCategoryEmoji(result.category)} {getCategoryLabel(result.category)}
                      </span>
                    )}
                  </div>

                  {/* 温柔洞察 */}
                  {result.gentleInsight && (
                    <p
                      className="text-xs leading-relaxed italic px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.06)',
                        borderLeft: '2px solid #C8A96E',
                        color: '#7A7670',
                      }}
                    >
                      {result.gentleInsight}
                    </p>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-1">
                    <button
                      className="flex-1 text-sm px-3 py-2 rounded-full transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.18)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.3)',
                      }}
                      onClick={onAcceptAll}
                    >
                      采纳建议
                    </button>
                    <button
                      className="text-sm px-3 py-2 rounded-full transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.08)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.15)',
                      }}
                      onClick={onAcceptTypeOnly}
                    >
                      仅分类
                    </button>
                    <button
                      className="text-sm px-3 py-2 transition-all duration-200 hover:opacity-70"
                      style={{ color: '#9C9088' }}
                      onClick={onKeepOriginal}
                    >
                      保留原样
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
