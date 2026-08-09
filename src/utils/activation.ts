/**
 * 激活码系统
 *
 * 验证激活码并追踪 30 天订阅周期。
 * 激活码预设列表从环境变量 VITE_VALID_CODES 读取，用逗号分隔。
 * 所有逻辑客户端完成，无需后端。
 */

// 预设有效激活码列表
const VALID_CODES: string[] = (import.meta.env.VITE_VALID_CODES || '')
  .split(',')
  .map((c: string) => c.trim())
  .filter(Boolean)

// 激活有效期（天）
export const ACTIVATION_DAYS = 30

/**
 * 验证激活码格式和有效性
 */
export function validateCode(code: string): boolean {
  if (!code || code.trim().length < 4) return false
  return VALID_CODES.includes(code.trim())
}

/**
 * 检查激活是否在有效期内
 */
export function isActivationValid(activatedAt?: Date): boolean {
  if (!activatedAt) return false
  const expiresAt = new Date(activatedAt.getTime() + ACTIVATION_DAYS * 24 * 60 * 60 * 1000)
  return new Date() < expiresAt
}

/**
 * 获取剩余有效天数
 */
export function getRemainingDays(activatedAt?: Date): number {
  if (!activatedAt) return 0
  const expiresAt = new Date(activatedAt.getTime() + ACTIVATION_DAYS * 24 * 60 * 60 * 1000)
  const remaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(0, remaining)
}

/**
 * 获取到期日期
 */
export function getExpiryDate(activatedAt?: Date): Date | null {
  if (!activatedAt) return null
  return new Date(activatedAt.getTime() + ACTIVATION_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * 生成一批激活码（仅开发/管理用途）
 * 使用这个函数在部署前生成激活码，然后写入 .env 的 VITE_VALID_CODES
 */
export function generateCodes(count: number, prefix: string = 'BELIEF'): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part3 = Math.random().toString(36).substring(2, 6).toUpperCase()
    codes.push(`${prefix}-${part1}-${part2}-${part3}`)
  }
  return codes
}
