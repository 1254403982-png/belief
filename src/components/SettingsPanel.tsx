import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../db'
import { exportAsJSON, exportAsMarkdown } from '../utils/export'

interface Props {
  open: boolean
  onClose: () => void
  onManualReview?: (type: 'monthly' | 'weekly' | 'daily') => void
  onOpenManual?: () => void
}

export default function SettingsPanel({ open, onClose, onManualReview, onOpenManual }: Props) {
  const [username, setUsername] = useState('')
  const [monthlyEnabled, setMonthlyEnabled] = useState(true)
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [dailyEnabled, setDailyEnabled] = useState(true)

  useEffect(() => {
    if (!open) return
    loadSettings()
  }, [open])

  const loadSettings = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const user = await db.userAccounts.get(userId)
    if (!user) return
    setUsername(user.username)
    setMonthlyEnabled(user.reviewSettings?.monthlyEnabled ?? true)
    setWeeklyEnabled(user.reviewSettings?.weeklyEnabled ?? true)
    setDailyEnabled(user.reviewSettings?.dailyEnabled ?? true)
  }

  const handleToggleMonthly = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const newVal = !monthlyEnabled
    setMonthlyEnabled(newVal)
    const user = await db.userAccounts.get(userId)
    if (user) {
      const rs = user.reviewSettings
      await db.userAccounts.update(userId, {
        reviewSettings: {
          monthlyEnabled: newVal,
          weeklyEnabled,
          dailyEnabled,
          lastMonthlyReview: rs?.lastMonthlyReview,
          lastWeeklyReview: rs?.lastWeeklyReview,
          lastDailyReview: rs?.lastDailyReview,
        },
      })
    }
  }

  const handleToggleWeekly = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const newVal = !weeklyEnabled
    setWeeklyEnabled(newVal)
    const user = await db.userAccounts.get(userId)
    if (user) {
      const rs = user.reviewSettings
      await db.userAccounts.update(userId, {
        reviewSettings: {
          monthlyEnabled,
          weeklyEnabled: newVal,
          dailyEnabled,
          lastMonthlyReview: rs?.lastMonthlyReview,
          lastWeeklyReview: rs?.lastWeeklyReview,
          lastDailyReview: rs?.lastDailyReview,
        },
      })
    }
  }

  const handleToggleDaily = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const newVal = !dailyEnabled
    setDailyEnabled(newVal)
    const user = await db.userAccounts.get(userId)
    if (user) {
      const rs = user.reviewSettings
      await db.userAccounts.update(userId, {
        reviewSettings: {
          monthlyEnabled,
          weeklyEnabled,
          dailyEnabled: newVal,
          lastMonthlyReview: rs?.lastMonthlyReview,
          lastWeeklyReview: rs?.lastWeeklyReview,
          lastDailyReview: rs?.lastDailyReview,
        },
      })
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="drawer-panel fixed right-0 top-0 bottom-0 w-80 z-30 flex flex-col"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                设置
              </h3>
              <button
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#9C9088' }}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
              {/* 账号信息 */}
              <section>
                <label className="text-xs tracking-wide mb-1.5 block" style={{ color: '#9C9088' }}>
                  账号
                </label>
                <p className="text-sm" style={{ color: '#4A4036' }}>
                  {username}
                </p>
              </section>

              {/* 梳理开关 */}
              <section className="space-y-3">
                <label className="text-xs tracking-wide block" style={{ color: '#9C9088' }}>
                  定期梳理
                </label>
                <ToggleRow
                  label="每月长期信念盘点"
                  enabled={monthlyEnabled}
                  onToggle={handleToggleMonthly}
                />
                <ToggleRow
                  label="每周信念清理"
                  enabled={weeklyEnabled}
                  onToggle={handleToggleWeekly}
                />
                <ToggleRow
                  label="每日待办提醒"
                  enabled={dailyEnabled}
                  onToggle={handleToggleDaily}
                />
              </section>

              {/* 立即梳理 */}
              <section>
                <button
                  className="text-sm px-4 py-2 rounded-full transition-all hover:opacity-80 w-full"
                  style={{
                    backgroundColor: 'rgba(200, 169, 110, 0.1)',
                    color: '#5C4A3A',
                    border: '1px solid rgba(200, 169, 110, 0.2)',
                  }}
                  onClick={() => {
                    onClose()
                    if (onManualReview) onManualReview('monthly')
                  }}
                >
                  🌿 现在梳理
                </button>
              </section>

              {/* 使用手册 */}
              {onOpenManual && (
                <section>
                  <button
                    className="text-sm px-4 py-2 rounded-full transition-all hover:opacity-80 w-full"
                    style={{
                      backgroundColor: 'rgba(139, 164, 188, 0.08)',
                      color: '#5C4A3A',
                      border: '1px solid rgba(139, 164, 188, 0.2)',
                    }}
                    onClick={() => {
                      onClose()
                      onOpenManual()
                    }}
                  >
                    📖 使用手册
                  </button>
                </section>
              )}

              {/* 数据导出 */}
              <section className="space-y-2">
                <label className="text-xs tracking-wide block" style={{ color: '#9C9088' }}>
                  数据导出
                </label>
                <div className="flex gap-2">
                  <button
                    className="flex-1 text-sm px-3 py-2 rounded-full transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.08)',
                      color: '#5C4A3A',
                      border: '1px solid rgba(200, 169, 110, 0.2)',
                    }}
                    onClick={() => {
                      const userId = localStorage.getItem('currentUserId')
                      if (userId) exportAsJSON(userId)
                    }}
                  >
                    📋 JSON 备份
                  </button>
                  <button
                    className="flex-1 text-sm px-3 py-2 rounded-full transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.08)',
                      color: '#5C4A3A',
                      border: '1px solid rgba(200, 169, 110, 0.2)',
                    }}
                    onClick={() => {
                      const userId = localStorage.getItem('currentUserId')
                      if (userId) exportAsMarkdown(userId)
                    }}
                  >
                    📝 Markdown 报告
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: '#4A4036' }}>
        {label}
      </span>
      <button
        className="relative w-10 h-5 rounded-full transition-all duration-200"
        style={{
          backgroundColor: enabled ? 'rgba(200, 169, 110, 0.4)' : 'rgba(200, 196, 180, 0.3)',
        }}
        onClick={onToggle}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
          style={{
            left: enabled ? 22 : 2,
            backgroundColor: enabled ? '#C8A96E' : '#C4B8B0',
          }}
        />
      </button>
    </div>
  )
}
