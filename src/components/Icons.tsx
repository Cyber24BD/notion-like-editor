import type { ReactNode, SVGProps } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number
}

function Svg({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Minus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const ZoomIn = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.4 16.4 4.6 4.6M11 8v6M8 11h6" />
  </Svg>
)

export const ZoomOut = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.4 16.4 4.6 4.6M8 11h6" />
  </Svg>
)

export const Maximize = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
  </Svg>
)

export const Minimize = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />
  </Svg>
)

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Grip = ({ size = 16, ...rest }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
)

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
)

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
)

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const ChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m18 15-6-6-6 6" />
  </Svg>
)

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.4 16.4 4.6 4.6" />
  </Svg>
)

export const PanelLeft = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Svg>
)

export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
)

export const X = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
)

export const MoreHorizontal = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    <path d="M10 11v4M14 11v4" />
  </Svg>
)

export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
)

export const ArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)

export const ArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)

export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
)

export const Mermaid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="8.5" y="16" width="7" height="5" rx="1" />
    <path d="M6.5 8v4h11V8M12 12v4" />
  </Svg>
)

export const Sigma = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 4H6l6 8-6 8h12" />
  </Svg>
)

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
)

export const TableOfContents = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h10M4 18h13" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Svg>
)

export const Bookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </Svg>
)

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
)

export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14 21 3" />
  </Svg>
)

export const Bold = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.1}>
    <path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7.5a3.5 3.5 0 0 1 0 7H7z" />
  </Svg>
)

export const Italic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 4h-9M14 20H5M15 4 9 20" />
  </Svg>
)

export const Underline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16" />
  </Svg>
)

export const Strike = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 4H9a3 3 0 0 0-2.8 4M14 12a4 4 0 0 1 0 8H6M4 12h16" />
  </Svg>
)

export const Code = (p: IconProps) => (
  <Svg {...p}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </Svg>
)

export const Highlighter = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 11-6 6v3h9l3-3" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </Svg>
)

export const Palette = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)

export const FileText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
)

export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Svg>
)

export const Monitor = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Svg>
)

export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)

export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 21v-7h6v7" />
  </Svg>
)

export const Type = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6V4h16v2M9 20h6M12 4v16" />
  </Svg>
)

export const Heading1 = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest} strokeWidth={1.6}>
    <path d="M4 5v14M12 5v14M4 12h8" />
    <path d="M16 10.5 18.5 9v10" />
  </Svg>
)

export const Heading2 = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest} strokeWidth={1.6}>
    <path d="M4 5v14M12 5v14M4 12h8" />
    <path d="M16 9.5a2.5 2.5 0 0 1 5 0c0 3-5 5-5 9.5h5" />
  </Svg>
)

export const Heading3 = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest} strokeWidth={1.6}>
    <path d="M4 5v14M12 5v14M4 12h8" />
    <path d="M16.5 9a2.5 2.5 0 0 1 4 2c0 1.5-1.5 2.4-2.5 2.4 1.5 0 3 1 3 2.7a3 3 0 0 1-5 1.9" />
  </Svg>
)

export const ListBulleted = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
)

export const ListOrdered = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M10 6h11M10 12h11M10 18h11" />
    <path d="M4 6h1v4M4 10h2" strokeWidth={1.4} />
    <path d="M4 15h2l-2 3h2" strokeWidth={1.4} />
  </Svg>
)

export const Todo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="m8 12 3 3 5-6" />
  </Svg>
)

export const ToggleIcon = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M9 6.5 16 12l-7 5.5z" fill="currentColor" stroke="none" />
    <path d="M3 21h18" />
  </Svg>
)

export const Quote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6h6v7H5zM5 13c0 3 1 5 4 5M13 6h6v7h-6zM13 13c0 3 1 5 4 5" />
  </Svg>
)

export const DividerIcon = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M3 12h18" />
    <path d="M6 6h12M6 18h12" opacity="0.35" />
  </Svg>
)

export const CalloutIcon = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.8V18h8v-3.2A7 7 0 0 0 12 2z" />
  </Svg>
)

export const Table = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 10v10M15 10v10" />
  </Svg>
)

export const ImageIcon = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m3 17 5-5 4 4 3-3 6 6" />
  </Svg>
)

export const PageIcon = ({ size = 24, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Svg>
)

export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />
  </Svg>
)

export const Share = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <path d="m16 6-4-4-4 4M12 2v13" />
  </Svg>
)

export const AlignLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18M3 10h12M3 15h18M3 20h9" />
  </Svg>
)

export const AlignCenter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18M6 10h12M3 15h18M7.5 20h9" />
  </Svg>
)

export const AlignRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18M9 10h12M3 15h18M12 20h9" />
  </Svg>
)

export const Crop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </Svg>
)

export const Frame = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1" />
  </Svg>
)

export const WrapText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h13a3 3 0 0 1 0 6h-3" />
    <path d="m15 15-3 3 3 3" />
    <path d="M3 18h6" />
  </Svg>
)

export const Download = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 21h16" />
  </Svg>
)

export const Refresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Svg>
)

export const Replace = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="12" height="10" rx="2" />
    <path d="M6 11.5 8 9l2.5 2.5M18 8v9a3 3 0 0 1-3 3h-5" />
    <path d="m20.5 14.5-2.5 2.5-2.5-2.5" />
  </Svg>
)

export const Merge = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h7M14 12h7M10 9l-3 3 3 3M14 9l3 3-3 3" />
    <path d="M5 6v12M19 6v12" opacity="0.3" />
  </Svg>
)

export const Split = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 12H3M21 12h-7M7 9l-3 3 3 3M17 9l3 3-3 3" />
    <path d="M5 6v12M19 6v12" opacity="0.3" />
  </Svg>
)

export const TextColor = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 17 10.5 6h3L18.5 17M7.8 13h8.4" />
  </Svg>
)

export const Audio = ({ size = 22, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </Svg>
)

export const Video = ({ size = 22, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m10 9 6 3.5-6 3.5z" fill="currentColor" stroke="none" />
  </Svg>
)

export const Play = ({ size = 22, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <path d="M8 5.2v13.6L19.5 12z" fill="currentColor" stroke="none" />
  </Svg>
)

export const AspectRatio = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 10v4h4" />
  </Svg>
)

export const ChartBar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18M4 20v-8M9 20V6M14 20v-5M19 20V9" />
  </Svg>
)

export const ChartLine = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="m4 16 4-5 4 3 5-8 4 4" />
  </Svg>
)

export const ChartArea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M4 17 8 12l4 3 5-8 4 4v9H4z" fill="currentColor" opacity="0.14" />
    <path d="m4 17 4-5 4 3 5-8 4 4" />
  </Svg>
)

export const ChartPie = ({ size = 22, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v9h9" />
  </Svg>
)

export const ChartDonut = ({ size = 22, ...rest }: IconProps) => (
  <Svg size={size} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 3v5.4M21 12h-5.4" opacity="0.4" />
  </Svg>
)

export const Eraser = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 14.5 5-5 7 7-3.2 3.2H6.8z" />
    <path d="m9.5 9.5 5.5-5.5 6 6-5.5 5.5" />
    <path d="M13 20h8" />
  </Svg>
)

export const Warning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2.5 20.5h19L12 3z" />
    <path d="M12 9.5v5M12 17.5v.6" />
  </Svg>
)

export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
)
