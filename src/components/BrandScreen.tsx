import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../db'

type ScreenState = 'brand' | 'login'

export default function BrandScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('brand')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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

  const handleEnter = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('请填写账号名和密码')
      return
    }

    try {
      const user = await db.loginOrRegister(username.trim(), password)
      if (user) {
        localStorage.setItem('currentUserId', user.id)
        ;(window as any).__fromLogin = true
        navigate('/canvas')
      }
    } catch (err: any) {
      setError(err.message || '进入失败，请重试')
    }
  }, [username, password, navigate])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#FAF7F2', touchAction: 'manipulation' }}
      onClick={screenState === 'brand' ? handleBrandClick : undefined}
    >
      <AnimatePresence mode="wait">
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
              className="font-serif text-6xl tracking-widest"
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

        {screenState === 'login' && (
          <motion.div
            key="login"
            className="flex flex-col items-center w-full max-w-sm px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* 品牌字上移 */}
            <motion.h1
              className="font-serif text-4xl tracking-widest mb-12"
              style={{ color: '#5C4A3A' }}
              initial={{ y: 0 }}
              animate={{ y: 0 }}
            >
              信念
            </motion.h1>

            {/* 登录表单 */}
            <motion.form
              className="w-full flex flex-col gap-6"
              onSubmit={handleEnter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
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
                className="btn-soft w-full mt-4"
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                进入
              </motion.button>
            </motion.form>

          {/* 登录底部留白 */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
