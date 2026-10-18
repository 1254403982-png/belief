import { useEffect, useRef } from 'react'
import NianNian from './NianNian'

interface Props {
  step: number
  hasFirstNode: boolean
  canConnect: boolean
  onStart: () => void
  onNext: () => void
  onShowAI: () => void
  onFocusInput: () => void
  onSkip: () => void
  onFinish: () => void
  onOpenManual: () => void
}

/** A short, optional first-use guide that leaves the canvas and input usable. */
export default function OnboardingGuide({ step, hasFirstNode, canConnect, onStart, onNext, onShowAI, onFocusInput, onSkip, onFinish, onOpenManual }: Props) {
  const startRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (step !== 1) return
    const frame = requestAnimationFrame(() => startRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [step])

  if (step === 0) return null

  return (
    <aside aria-label="新手引导" className="absolute bottom-28 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 pointer-events-none">
      <div className="pointer-events-auto max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-[#E0D8CC] bg-[#FFFBF5]/95 px-5 py-4 shadow-[0_8px_32px_rgba(74,64,54,0.10)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <NianNian size={34} className="mt-0.5 flex-none" />
          <div className="min-w-0 flex-1" aria-live="polite">
            <h2 className="font-serif text-base text-[#5C4A3A]">
              {step === 1 ? '先留下一句话' : step === 2 ? '写下你自己的原话' : step === 4 ? '需要时，再请念念帮忙' : hasFirstNode ? '第一句话已在画布上' : '接下来可以这样探索'}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#746A61]">
              {step === 1 && '想想最近哪句话反复出现在心里。先记下来，不用判断它是哪一种信念。'}
              {step === 2 && '在下方输入，按 Enter 或点纸飞机，直接把原话放上画布。这一步不会调用 AI。'}
              {step === 3 && (canConnect
                ? '点开圆点可以查看和修改。两个念头有关系时，可拖近松手建立「待厘清」连线；也可用节点的连接按钮选择关系。连线不会替你判断因果。'
                : '点开圆点可以查看和修改。等有了更多念头，再慢慢整理它们之间的关系。')}
              {step === 4 && <span id="onboarding-ai-tip">先在下方写一句，再点输入框左侧的念念头像。原话会留在建议卡中；你可采纳分类和表达建议、只用分类，或保留原话。按 Enter 则直接记录，不调用 AI。</span>}
            </p>
            {step === 1 && <p className="mt-2 text-xs leading-5 text-[#8C8075]">目前记录保存在此设备的浏览器中，可在设置里导出备份。</p>}
          </div>
          <button type="button" className="-mr-2 -mt-2 flex h-10 w-10 flex-none items-center justify-center rounded-full text-[#746A61] transition-colors hover:bg-[#F3E9DB]" aria-label="跳过新手引导" title="跳过引导" onClick={onSkip}>✕</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 pl-11">
          {step === 1 && <button ref={startRef} type="button" className="btn-soft min-h-10" onClick={onStart}>开始写一句</button>}
          {step === 2 && <button type="button" className="text-sm text-[#746A61] underline underline-offset-4 hover:text-[#5C4A3A]" onClick={onNext}>先看看下一步</button>}
          {step === 3 && <button type="button" className="btn-soft min-h-10" onClick={onShowAI}>认识念念</button>}
          {step === 4 && <>
            <button type="button" className="text-sm text-[#746A61] underline underline-offset-4 hover:text-[#5C4A3A]" onClick={onFocusInput}>写一句试试</button>
            <button type="button" className="text-sm text-[#746A61] underline underline-offset-4 hover:text-[#5C4A3A]" onClick={onOpenManual}>打开使用手册</button>
            <button type="button" className="btn-soft min-h-10" onClick={onFinish}>完成引导</button>
          </>}
        </div>
      </div>
    </aside>
  )
}
