/**
 * Inline SVG icons (stroke = currentColor). Dots are drawn as paths, never
 * as adjacent <circle>s (another plugin looks for two adjacent circles).
 * @module dsh-sider-task-reviewer/client/icons
 */
import type { ReactElement } from 'react'

function svg(size: number, children: ReactElement | ReactElement[], strokeWidth = 1.8): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** A shield with a check: the reviewer. */
export const ShieldIcon = ({ size = 16 }: { size?: number }) =>
  svg(size, [<path key="a" d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Z" />, <path key="b" d="m9 12 2.2 2.2L15.5 10" />])

export const PlayIcon = ({ size = 14 }: { size?: number }) => svg(size, <path d="M7 5v14l11-7L7 5Z" />)
export const StopIcon = ({ size = 14 }: { size?: number }) => svg(size, <path d="M7 7h10v10H7z" />)
export const GearIcon = ({ size = 16 }: { size?: number }) =>
  svg(size, [
    <path key="a" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    <path key="b" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />,
  ], 1.6)
export const SendIcon = ({ size = 13 }: { size?: number }) => svg(size, <path d="M4 12 20 4l-6 16-3-7-7-1Z" />)
export const InsertIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M4 17h12" />, <path key="b" d="M4 12h16" />, <path key="c" d="M4 7h16" />, <path key="d" d="m17 15 3 2-3 2" />])
export const CopyIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M9 9h10v10H9z" />, <path key="b" d="M5 15V5h10" />])
export const EyeOffIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M3 3l18 18" />, <path key="b" d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9 6-.3.8-1.1 2.2-2.4 3.4M6.2 7.6C4.4 8.9 3.3 10.9 3 12c.5 1.5 4 6 9 6 1.6 0 3-.4 4.2-1.1" />])
export const DownloadIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M12 4v11" />, <path key="b" d="m7 10 5 5 5-5" />, <path key="c" d="M5 20h14" />])
export const TrashIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M4 7h16" />, <path key="b" d="M9 7V4h6v3" />, <path key="c" d="M6 7l1 13h10l1-13" />])
export const PanelIcon = ({ size = 14 }: { size?: number }) => svg(size, [<path key="a" d="M4 5h16v14H4z" />, <path key="b" d="M14 5v14" />])
/** Two arrows in a circle: a continuous review. */
export const LoopIcon = ({ size = 14 }: { size?: number }) => svg(size, [<path key="a" d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />, <path key="b" d="M4 4v4h4" />, <path key="c" d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />, <path key="d" d="M20 20v-4h-4" />])
export const ChatIcon = ({ size = 14 }: { size?: number }) => svg(size, <path d="M5 5h14v10H10l-4 4v-4H5z" />)
export const ResetIcon = ({ size = 13 }: { size?: number }) => svg(size, [<path key="a" d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7" />, <path key="b" d="M4 4v4.7h4.7" />])
