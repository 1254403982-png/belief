import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { db } from '../db'
import NianNian from './NianNian'

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
  const reduceMotion = useReducedMotion()

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
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#FAF7F2' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {/* ====== 品牌页 ====== */}
        {screenState === 'brand' && (
          <motion.div
            key="brand"
            className="flex flex-col items-center max-w-md px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
          >
            <NianNian size={46} className="mb-7" />
            <motion.h1
              className="font-serif text-4xl md:text-6xl tracking-widest"
              style={{ color: '#5C4A3A' }}
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
            >
              信念
            </motion.h1>
            <motion.p
              className="mt-5 text-sm leading-7"
              style={{ color: '#746A61' }}
            >
              写下念头，慢慢看见它们之间的联系。
            </motion.p>
            <button type="button" className="btn-soft mt-8 min-h-11 min-w-36" onClick={handleBrandClick}>
              登录或注册
            </button>
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
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
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
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
            >
              <label className="block text-sm text-[#746A61]">
                账号名
                <input className="input-underline" type="text" name="username" autoComplete="username"
                  placeholder="输入账号名" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              </label>
              <label className="block text-sm text-[#746A61]">
                密码
                <input className="input-underline" type="password" name="password" autoComplete="current-password"
                  placeholder="输入密码" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>

              {error && (
                <motion.p
                  className="text-sm text-center"
                  role="alert"
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
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
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
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
            >
              <label className="block text-sm text-[#746A61]">
                账号名
                <input className="input-underline" type="text" name="username" autoComplete="username"
                  placeholder="至少 2 个字符" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              </label>
              <label className="block text-sm text-[#746A61]">
                昵称 <span className="text-[#9C9088]">（选填）</span>
                <input className="input-underline" type="text" name="nickname" autoComplete="nickname"
                  placeholder="显示在应用中" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </label>
              <label className="block text-sm text-[#746A61]">
                密码
                <input className="input-underline" type="password" name="new-password" autoComplete="new-password"
                  placeholder="至少 8 个字符" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label className="block text-sm text-[#746A61]">
                确认密码
                <input className="input-underline" type="password" name="confirm-password" autoComplete="new-password"
                  placeholder="再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </label>

              {error && (
                <motion.p
                  className="text-sm text-center"
                  role="alert"
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
