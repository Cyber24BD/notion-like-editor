import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCustomHtmlDocument,
  CUSTOM_HTML_CHANNEL,
  DEFAULT_CUSTOM_HTML_OPTIONS,
  type CustomHtmlSandboxOptions,
  type CustomHtmlSource,
} from '../../editor/customHtml/document'

export interface CustomHtmlFrameProps extends CustomHtmlSource {
  options?: CustomHtmlSandboxOptions
  title?: string
  autoHeight?: boolean
  minHeight?: number
  maxHeight?: number
  height?: number | string
  className?: string
  reloadKey?: number
  onError?: (message: string) => void
  onHeightChange?: (height: number) => void
}

interface FrameMessage {
  channel?: string
  type?: string
  height?: number
  message?: string
}

export function CustomHtmlFrame({
  html,
  css,
  javascript,
  options = DEFAULT_CUSTOM_HTML_OPTIONS,
  title = 'Custom HTML',
  autoHeight = true,
  minHeight = 160,
  maxHeight = 1600,
  height,
  className = '',
  reloadKey = 0,
  onError,
  onHeightChange,
}: CustomHtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState(minHeight)

  const srcDoc = useMemo(
    () => buildCustomHtmlDocument({ html, css, javascript }, options),
    [html, css, javascript, options],
  )
  const sandbox = [
    options.allowScripts ? 'allow-scripts' : '',
    options.allowForms ? 'allow-forms' : '',
    options.allowPopups ? 'allow-popups' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    setMeasuredHeight(minHeight)
  }, [srcDoc, minHeight])

  useEffect(() => {
    const onMessage = (event: MessageEvent<FrameMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.channel !== CUSTOM_HTML_CHANNEL) return
      if (data.type === 'height' && typeof data.height === 'number') {
        const next = Math.max(
          minHeight,
          Math.min(maxHeight, Math.round(data.height)),
        )
        setMeasuredHeight((previous) =>
          Math.abs(previous - next) < 1 ? previous : next,
        )
        onHeightChange?.(next)
      } else if (data.type === 'error' && data.message) {
        onError?.(String(data.message))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [maxHeight, minHeight, onError, onHeightChange])

  const frameHeight = autoHeight
    ? `${Math.max(minHeight, measuredHeight)}px`
    : (height ?? '100%')

  return (
    <iframe
      key={reloadKey}
      ref={iframeRef}
      className={`custom-html-frame ${className}`.trim()}
      sandbox={sandbox}
      referrerPolicy="no-referrer"
      title={title}
      srcDoc={srcDoc}
      style={{ height: frameHeight }}
    />
  )
}
