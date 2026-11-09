import { useRef } from 'react'
import { createNotionPortal } from '../NotionPortal'
import { useFocusTrap } from '../useFocusTrap'
import { Warning } from '../Icons'

interface CustomHtmlDownloadWarningProps {
  onCancel: () => void
  onConfirm: () => void
}

export function CustomHtmlDownloadWarning({
  onCancel,
  onConfirm,
}: CustomHtmlDownloadWarningProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef)

  return createNotionPortal(
    <div
      className="custom-html-warning-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        className="custom-html-warning-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-html-download-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="custom-html-warning-dialog__icon" aria-hidden="true">
          <Warning size={20} />
        </div>
        <h2 id="custom-html-download-title">Download standalone HTML?</h2>
        <p>
          The downloaded file is <strong>not sandboxed</strong>. When opened,
          its scripts run with the browser’s normal file-page permissions and
          can access the network.
        </p>
        <p className="custom-html-warning-dialog__hint">
          Only download and open code you trust.
        </p>
        <div className="custom-html-warning-dialog__actions">
          <button type="button" className="notion-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="notion-btn notion-btn--primary"
            onClick={onConfirm}
          >
            Download anyway
          </button>
        </div>
      </section>
    </div>,
  )
}
