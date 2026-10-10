import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** 将模型回答作为受限 Markdown 渲染；原始 HTML 不进入页面。 */
export default function BookAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      h1: ({ children }) => <h4 className="font-semibold mt-3 mb-1">{children}</h4>,
      h2: ({ children }) => <h4 className="font-semibold mt-3 mb-1">{children}</h4>,
      h3: ({ children }) => <h4 className="font-semibold mt-3 mb-1">{children}</h4>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
      blockquote: ({ children }) => <blockquote className="border-l-2 border-[#C8A96E] pl-3 my-2">{children}</blockquote>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>,
    }}>{content}</ReactMarkdown>
  )
}
