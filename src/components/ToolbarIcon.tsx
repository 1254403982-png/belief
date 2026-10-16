type IconName = 'overview' | 'books' | 'explore' | 'arrange' | 'settings' | 'help'

export default function ToolbarIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  switch (name) {
    case 'overview': return <svg {...common}><circle cx="6" cy="7" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="M7.7 8.1 10.8 15M16.3 8.1 13.2 15" /></svg>
    case 'books': return <svg {...common}><path d="M12 5c-2.8-1.7-5.8-1.8-9-.8v14.4c3.2-1 6.2-.9 9 .8 2.8-1.7 5.8-1.8 9-.8V4.2c-3.2-1-6.2-.9-9 .8Z" /><path d="M12 5v14.4" /></svg>
    case 'explore': return <svg {...common}><path d="M9 18h6M10 21h4M8 14.4c-1.4-1.1-2.2-2.8-2.2-4.7a6.2 6.2 0 0 1 12.4 0c0 1.9-.8 3.6-2.2 4.7-.7.6-1.1 1.3-1.2 2.1H9.2c-.1-.8-.5-1.5-1.2-2.1Z" /></svg>
    case 'arrange': return <svg {...common}><circle cx="12" cy="12" r="2" /><path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6 9 9M15 15l3.4 3.4M18.4 5.6 15 9M9 15l-3.4 3.4" /></svg>
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4M18.5 18.5l-1.4-1.4M6.9 6.9 5.5 5.5" /></svg>
    case 'help': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.7 2.7 0 1 1 4.3 2.2c-1.2.8-1.8 1.3-1.8 2.6M12 17.4h.01" /></svg>
  }
}
