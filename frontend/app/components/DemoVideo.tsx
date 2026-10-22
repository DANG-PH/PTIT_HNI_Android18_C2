'use client'

import { useRef } from 'react'
import { useI18n } from '../lib/i18n'

/** "Watch the demo" button that plays the narrated two-minute walkthrough in a modal, without leaving the page. */
export function DemoVideo() {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  const open = () => {
    dialog.current?.showModal()
    video.current?.play().catch(() => {})
  }
  const close = () => {
    video.current?.pause()
    dialog.current?.close()
  }

  return (
    <>
      <button className="btn btn-lg" onClick={open}>
        <span aria-hidden="true">▶</span> {t('landing.watchDemo')}
      </button>
      <dialog
        ref={dialog}
        className="video-dialog"
        onClick={(e) => e.target === dialog.current && close()}
        onClose={() => video.current?.pause()}
      >
        <div className="video-frame">
          <button className="btn btn-sm video-close" onClick={close} aria-label={t('landing.closeDemo')}>
            ✕
          </button>
          <video ref={video} src="/demo.mp4" controls playsInline preload="none" />
        </div>
      </dialog>
    </>
  )
}
