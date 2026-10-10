import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../db'
import { exportAsJSON, exportAsMarkdown } from '../utils/export'
import { validateCode, getRemainingDays, getExpiryDate } from '../utils/activation'

interface Props {
  open: boolean
  onClose: () => void
  onManualReview?: (type: 'monthly' | 'weekly' | 'daily') => void
  onOpenManual?: () => void
}

export default function SettingsPanel({ open, onClose, onManualReview, onOpenManual }: Props) {
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [monthlyEnabled, setMonthlyEnabled] = useState(true)
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [dailyEnabled, setDailyEnabled] = useState(true)

  // 激活码
  const [activationCode, setActivationCode] = useState('')
  const [activationCodeInput, setActivationCodeInput] = useState('')
  const [activationStatus, setActivationStatus] = useState<{
    isActivated: boolean
    remainingDays: number
    expiresAt: Date | null
  }>({ isActivated: false, remainingDays: 0, expiresAt: null })
  const [activating, setActivating] = useState(false)
  const [actError, setActError] = useState('')
  const [actSuccess, setActSuccess] = useState('')

  // 修改密码
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // 登出
  const [showLogout, setShowLogout] = useState(false)

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
    setNickname(user.nickname || user.username)
    setMonthlyEnabled(user.reviewSettings?.monthlyEnabled ?? true)
    setWeeklyEnabled(user.reviewSettings?.weeklyEnabled ?? true)
    setDailyEnabled(user.reviewSettings?.dailyEnabled ?? true)
    // 加载激活状态
    const status = await db.getActivationStatus(userId)
    setActivationStatus(status)
    setActivationCode(user.activationCode || '')
    setActivationCodeInput('')
    setActError('')
    setActSuccess('')
    // 重置密码表单
    setShowChangePassword(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmNew('')
    setPwError('')
    setPwSuccess('')
    setShowLogout(false)
  }

  // ====== 昵称编辑 ======
  const startEditNickname = () => {
    setNicknameInput(nickname)
    setEditingNickname(true)
  }

  const saveNickname = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const trimmed = nicknameInput.trim()
    if (!trimmed) return
    await db.updateNickname(userId, trimmed)
    setNickname(trimmed)
    setEditingNickname(false)
  }

  // ====== 修改密码 ======
  const handleChangePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (!oldPassword || !newPassword || !confirmNew) {
      setPwError('请填写所有密码字段')
      return
    }
    if (newPassword.length < 8) {
      setPwError('新密码至少需要 8 个字符')
      return
    }
    if (newPassword !== confirmNew) {
      setPwError('两次输入的新密码不一致')
      return
    }
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    setPwLoading(true)
    try {
      await db.changePassword(userId, oldPassword, newPassword)
      setPwSuccess('密码已修改')
      setOldPassword('')
      setNewPassword('')
      setConfirmNew('')
    } catch (err: any) {
      setPwError(err.message || '修改失败')
    } finally {
      setPwLoading(false)
    }
  }

  // ====== 激活码 ======
  const handleActivate = async () => {
    setActError('')
    setActSuccess('')
    const code = activationCodeInput.trim()
    if (!code) {
      setActError('请输入激活码')
      return
    }
    if (!validateCode(code)) {
      setActError('激活码无效，请检查是否正确')
      return
    }
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    setActivating(true)
    try {
      await db.activate(userId, code)
      const status = await db.getActivationStatus(userId)
      setActivationStatus(status)
      setActivationCode(code)
      setActivationCodeInput('')
      setActSuccess('激活成功！有效期 30 天')
    } catch (err: any) {
      setActError(err.message || '激活失败')
    } finally {
      setActivating(false)
    }
  }

  // ====== 登出 ======
  const handleLogout = () => {
    localStorage.removeItem('currentUserId')
    window.location.href = '/'
  }

  // ====== 梳理开关 ======
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
            className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col"
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
              {/* ====== 账号信息 ====== */}
              <section className="space-y-3">
                <label className="text-xs tracking-wide block" style={{ color: '#9C9088' }}>
                  账号信息
                </label>
                <div className="rounded-lg p-3 space-y-3" style={{
                  backgroundColor: 'rgba(200, 169, 110, 0.04)',
                  border: '1px solid rgba(200, 169, 110, 0.08)',
                }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#9C9088' }}>账号名</span>
                    <span className="text-sm" style={{ color: '#4A4036' }}>{username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#9C9088' }}>昵称</span>
                    {editingNickname ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="text-sm text-right w-24 px-1 py-0.5 rounded"
                          style={{
                            color: '#4A4036',
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(200, 169, 110, 0.25)',
                          }}
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNickname()
                            if (e.key === 'Escape') setEditingNickname(false)
                          }}
                          autoFocus
                        />
                        <button
                          className="text-xs hover:opacity-70"
                          style={{ color: '#5A7A68' }}
                          onClick={saveNickname}
                        >
                          ✓
                        </button>
                        <button
                          className="text-xs hover:opacity-70"
                          style={{ color: '#9C9088' }}
                          onClick={() => setEditingNickname(false)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-sm hover:opacity-70 transition-opacity"
                        style={{ color: '#4A4036' }}
                        onClick={startEditNickname}
                      >
                        {nickname} ✏️
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* ====== 激活码 ====== */}
              <section className="space-y-3">
                <label className="text-xs tracking-wide block" style={{ color: '#9C9088' }}>
                  激活码
                </label>
                <div className="rounded-lg p-3 space-y-2.5" style={{
                  backgroundColor: 'rgba(200, 169, 110, 0.04)',
                  border: '1px solid rgba(200, 169, 110, 0.08)',
                }}>
                  {/* 激活状态 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#9C9088' }}>状态</span>
                    {activationStatus.isActivated ? (
                      <span className="text-sm" style={{ color: '#5A7A68' }}>
                        🌿 已激活 · 剩余 {activationStatus.remainingDays} 天
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: '#C8A080' }}>
                        未激活 · AI 功能受限
                      </span>
                    )}
                  </div>

                  {/* 激活码输入 */}
                  {!activationStatus.isActivated && (
                    <>
                      <div className="flex gap-2">
                        <input
                          className="text-sm flex-1 px-2 py-1.5 rounded"
                          style={{
                            color: '#4A4036',
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(200, 169, 110, 0.25)',
                          }}
                          type="text"
                          placeholder="输入激活码"
                          value={activationCodeInput}
                          onChange={(e) => setActivationCodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleActivate()
                          }}
                        />
                        <button
                          className="text-sm px-3 py-1.5 rounded-full transition-all hover:opacity-80 whitespace-nowrap"
                          style={{
                            backgroundColor: 'rgba(200, 169, 110, 0.12)',
                            color: '#5C4A3A',
                            border: '1px solid rgba(200, 169, 110, 0.2)',
                            opacity: activating ? 0.6 : 1,
                          }}
                          onClick={handleActivate}
                          disabled={activating}
                        >
                          {activating ? '激活中...' : '激活'}
                        </button>
                      </div>
                      {actError && (
                        <p className="text-xs" style={{ color: '#C8A080' }}>{actError}</p>
                      )}
                      {actSuccess && (
                        <p className="text-xs" style={{ color: '#5A7A68' }}>{actSuccess}</p>
                      )}
                    </>
                  )}

                  {/* 已激活时显示到期信息 */}
                  {activationStatus.isActivated && activationStatus.expiresAt && (
                    <p className="text-xs" style={{ color: '#9C9088' }}>
                      到期日：{activationStatus.expiresAt.toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </section>

              {/* ====== 修改密码 ====== */}
              <section className="space-y-3">
                <button
                  className="text-xs transition-all hover:opacity-70"
                  style={{ color: '#9C9088' }}
                  onClick={() => {
                    setShowChangePassword(!showChangePassword)
                    setPwError('')
                    setPwSuccess('')
                  }}
                >
                  {showChangePassword ? '收起' : '修改密码 ▸'}
                </button>

                {showChangePassword && (
                  <div className="space-y-2.5 rounded-lg p-3" style={{
                    backgroundColor: 'rgba(200, 169, 110, 0.04)',
                    border: '1px solid rgba(200, 169, 110, 0.08)',
                  }}>
                    <input
                      className="input-underline text-sm w-full"
                      type="password"
                      placeholder="原密码"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                    <input
                      className="input-underline text-sm w-full"
                      type="password"
                      placeholder="新密码（至少8个字符）"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      className="input-underline text-sm w-full"
                      type="password"
                      placeholder="确认新密码"
                      value={confirmNew}
                      onChange={(e) => setConfirmNew(e.target.value)}
                    />

                    {pwError && (
                      <p className="text-xs" style={{ color: '#C8A080' }}>{pwError}</p>
                    )}
                    {pwSuccess && (
                      <p className="text-xs" style={{ color: '#5A7A68' }}>{pwSuccess}</p>
                    )}

                    <button
                      className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80 w-full"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.12)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.2)',
                        opacity: pwLoading ? 0.6 : 1,
                      }}
                      onClick={handleChangePassword}
                      disabled={pwLoading}
                    >
                      {pwLoading ? '修改中...' : '确认修改密码'}
                    </button>
                  </div>
                )}
              </section>

              <Divider />

              {/* ====== 梳理开关 ====== */}
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

              <Divider />

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
                <p className="text-xs leading-relaxed" style={{ color: '#7A7670' }}>
                  当前账号与记录保存在此浏览器，尚未跨设备同步。JSON 备份包含画布、日记、待办和探索记录，请妥善保存。
                </p>
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

              <Divider />

              {/* 登出 */}
              <section>
                {!showLogout ? (
                  <button
                    className="text-sm px-4 py-2 rounded-full transition-all hover:opacity-80 w-full"
                    style={{
                      backgroundColor: 'rgba(200, 160, 128, 0.06)',
                      color: '#C8A080',
                      border: '1px solid rgba(200, 160, 128, 0.15)',
                    }}
                    onClick={() => setShowLogout(true)}
                  >
                    退出登录
                  </button>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-xs" style={{ color: '#9C9088' }}>
                      确定要退出登录吗？
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 text-sm px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                        style={{
                          backgroundColor: 'rgba(200, 160, 128, 0.12)',
                          color: '#C8A080',
                          border: '1px solid rgba(200, 160, 128, 0.25)',
                        }}
                        onClick={handleLogout}
                      >
                        确认退出
                      </button>
                      <button
                        className="flex-1 text-sm px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                        style={{
                          backgroundColor: 'rgba(200, 196, 180, 0.08)',
                          color: '#9C9088',
                          border: '1px solid rgba(200, 196, 180, 0.15)',
                        }}
                        onClick={() => setShowLogout(false)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
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

function Divider() {
  return <div className="border-t" style={{ borderColor: 'rgba(200, 196, 180, 0.2)' }} />
}
