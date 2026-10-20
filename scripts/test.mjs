import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

await mkdir('.test-build', { recursive: true })
await build({
  entryPoints: ['tests/exploration.test.tsx', 'tests/book-learning.test.tsx', 'tests/belief-links.test.ts', 'tests/language.test.tsx'],
  outdir: '.test-build', outExtension: { '.js': '.mjs' },
  bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
  // 只用虚构测试凭据，fetch 由测试替换，不读取真实环境或请求外部 AI。
  define: { 'import.meta.env': JSON.stringify({ VITE_DEEPSEEK_API_KEY: 'test-only-no-network' }) },
})
const result = spawnSync(process.execPath, ['--test', '.test-build/exploration.test.mjs', '.test-build/book-learning.test.mjs', '.test-build/belief-links.test.mjs', '.test-build/language.test.mjs'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
