import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../db'

type ScreenState = 'brand' | 'login' | 'register'

export default function BrandScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('brand')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement>(null)

  // 阻止首页缩放
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', preventZoom, { passive: false })
    return () => el.removeEventListener('wheel', preventZoom)
  }, [])

  const handleBrandClick = useCallback(() => {
    setScreenState('login')
  }, [])

  const resetForm = () => {
    setUsername('')
    setPassword('')
    setNickname('')
    setConfirmPassword('')
    setError('')
  }

  const switchTo = (s: ScreenState) => {
    resetForm()
    setScreenState(s)
  }

  // ====== 登录 ======
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('请填写账号名和密码')
      return
    }
    setLoading(true)
    try {
      const user = await db.login(username.trim(), password)
      localStorage.setItem('currentUserId', user.id)
      ;(window as any).__fromLogin = true
      navigate('/canvas')
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [username, password, navigate])

  // ====== 注册 ======
  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请填写账号名')
      return
    }
    if (username.trim().length < 2) {
      setError('账号名至少需要 2 个字符')
      return
    }
    if (!password) {
      setError('请填写密码')
      return
    }
    if (password.length < 8) {
      setError('密码至少需要 8 个字符')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const user = await db.register(username.trim(), password, nickname.trim() || undefined)
      localStorage.setItem('currentUserId', user.id)
      ;(window as any).__fromLogin = true
      navigate('/canvas')
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [username, password, confirmPassword, nickname, navigate])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#FAF7F2', touchAction: 'manipulation' }}
      onClick={screenState === 'brand' ? handleBrandClick : undefined}
    >
      <AnimatePresence mode="wait">
        {/* ====== 品牌页 ====== */}
        {screenState === 'brand' && (
          <motion.div
            key="brand"
            className="flex flex-col items-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <motion.h1
              className="font-serif text-4xl md:text-6xl tracking-widest"
              style={{ color: '#5C4A3A' }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            >
              信念
            </motion.h1>
            <motion.p
              className="mt-6 text-sm tracking-wider"
              style={{ color: '#9C9088' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1.2 }}
            >
              点击任意位置进入
            </motion.p>
          </motion.div>
        )}

        {/* ====== 登录 ====== */}
        {screenState === 'login' && (
          <motion.div
            key="login"
            className="flex flex-col items-center w-full max-w-sm px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
          >
            <motion.h1
              className="font-serif text-3xl md:text-4xl tracking-widest mb-10"
              style={{ color: '#5C4A3A' }}
            >
              信念
            </motion.h1>

            <motion.form
              className="w-full flex flex-col gap-5"
              onSubmit={handleLogin}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <input
                className="input-underline"
                type="text"
                placeholder="账号名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <input
                className="input-underline"
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && (
                <motion.p
                  className="text-sm text-center"
                  style={{ color: '#C8A080' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                className="btn-soft w-full mt-2"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '登录中...' : '登录'}
              </motion.button>

              <p className="text-center">
                <button
                  type="button"
                  className="text-xs transition-all hover:opacity-70"
                  style={{ color: '#9C9088' }}
                  onClick={() => switchTo('register')}
                >
                  没有账号？<span style={{ color: '#C8A96E' }}>注册</span>
                </button>
              </p>
            </motion.form>
          </motion.div>
        )}

        {/* ====== 注册 ====== */}
        {screenState === 'register' && (
          <motion.div
            key="register"
            className="flex flex-col items-center w-full max-w-sm px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4 }}
          >
            <motion.h1
              className="font-serif text-3xl md:text-4xl tracking-widest mb-10"
              style={{ color: '#5C4A3A' }}
            >
              信念
            </motion.h1>

            <motion.form
              className="w-full flex flex-col gap-5"
              onSubmit={handleRegister}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <input
                className="input-underline"
                type="text"
                placeholder="账号名（至少2个字符，用于登录）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <input
                className="input-underline"
                type="text"
                placeholder="昵称（选填，显示在应用中）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <input
                className="input-underline"
                type="password"
                placeholder="密码（至少8个字符）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                className="input-underline"
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {error && (
                <motion.p
                  className="text-sm text-center"
                  style={{ color: '#C8A080' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                className="btn-soft w-full mt-2"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '注册中...' : '注册'}
              </motion.button>

              <p className="text-center">
                <button
                  type="button"
                  className="text-xs transition-all hover:opacity-70"
                  style={{ color: '#9C9088' }}
                  onClick={() => switchTo('login')}
                >
                  已有账号？<span style={{ color: '#C8A96E' }}>登录</span>
                </button>
              </p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
