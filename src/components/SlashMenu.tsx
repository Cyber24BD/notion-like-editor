import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { createNotionPortal } from './NotionPortal'
import { slashMenu } from '../editor/slash/menuStore'
import type { SlashItem } from '../editor/slash/types'

const MENU_WIDTH = 320
const MENU_MAX_HEIGHT = 372

function groupItems(items: SlashItem[]) {
  const groups: { label: string; items: { item: SlashItem; index: number }[] }[] = []
  items.forEach((item, index) => {
    const existing = groups.find((group) => group.label === item.group)
    if (existing) existing.items.push({ item, index })
    else groups.push({ label: item.group, items: [{ item, index }] })
  })
  return groups
}

function computePosition(rect: DOMRect | null): { top: number; left: number } {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  const estimatedHeight = Math.min(MENU_MAX_HEIGHT, viewportH - 32)
  let left = rect ? rect.left : viewportW / 2 - MENU_WIDTH / 2
  let top = rect ? rect.bottom + 8 : viewportH / 2 - estimatedHeight / 2
  if (rect && top + estimatedHeight > viewportH - 12) {
    top = Math.max(12, rect.top - estimatedHeight - 8)
  }
  left = Math.min(Math.max(12, left), viewportW - MENU_WIDTH - 12)
  top = Math.max(12, top)
  return { top, left }
}

export function SlashMenu() {
  const state = useSyncExternalStore(
    slashMenu.subscribe,
    slashMenu.getSnapshot,
    slashMenu.getSnapshot,
  )
  const menuRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupItems(state.items), [state.items])

  // Re-anchor on scroll/resize without touching React state (avoids update loops).
  useEffect(() => {
    if (!state.open) return
    let frame = 0
    const reposition = () => {
      frame = 0
      const element = menuRef.current
      const getRect = slashMenu.getSnapshot().getRect
      if (!element || !getRect) return
      const rect = getRect()
      if (!rect) return
      const next = computePosition(rect)
      element.style.top = `${next.top}px`
      element.style.left = `${next.left}px`
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(reposition)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [state.open])

  // Dismiss on outside pointer interaction.
  useEffect(() => {
    if (!state.open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) slashMenu.close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [state.open])

  // Insert-mode has no editor-side key handler, so listen here.
  useEffect(() => {
    if (!state.open || state.mode !== 'insert') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        slashMenu.close()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        slashMenu.move(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        slashMenu.move(-1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        slashMenu.selectActive()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.open, state.mode])

  // Keep the highlighted row visible inside the menu's own scroll area only.
  useEffect(() => {
    if (!state.open) return
    const container = scrollRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>(
      `[data-slash-index="${state.index}"]`,
    )
    if (!active) return
    const top = active.offsetTop
    const bottom = top + active.offsetHeight
    if (top < container.scrollTop) {
      container.scrollTop = top
    } else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight
    }
  }, [state.index, state.items, state.open])

  if (!state.open) return null

  const { top, left } = computePosition(state.rect)

  return createNotionPortal(
    <div
      ref={menuRef}
      className="slash-menu notion-popover"
      style={{ top, left, width: MENU_WIDTH }}
      role="listbox"
      aria-label="Insert block"
      data-mode={state.mode}
    >
      <div ref={scrollRef} className="slash-menu__scroll notion-scroll">
        {state.items.length === 0 && (
          <div className="slash-menu__empty">
            <p>No blocks found</p>
            <span>Try “text”, “heading”, “list” or “code”.</span>
          </div>
        )}
        {groups.map((group) => (
          <div className="slash-menu__group" key={group.label} role="group" aria-label={group.label}>
            <div className="slash-menu__group-label">{group.label}</div>
            {group.items.map(({ item, index }) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === state.index}
                data-slash-index={index}
                className="slash-menu__item"
                data-active={index === state.index ? 'true' : 'false'}
                onPointerEnter={() => slashMenu.setIndex(index)}
                onClick={() => slashMenu.selectByIndex(index)}
              >
                <span className="slash-menu__icon">{item.icon}</span>
                <span className="slash-menu__text">
                  <span className="slash-menu__title">{item.title}</span>
                  <span className="slash-menu__subtitle">{item.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="slash-menu__footer">
        {state.mode === 'suggestion' ? (
          <>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> select
            </span>
            <span>
              <kbd>esc</kbd> close
            </span>
          </>
        ) : (
          <span>Click a block to insert it · esc to close</span>
        )}
      </div>
    </div>)
}
