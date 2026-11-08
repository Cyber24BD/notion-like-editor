import { useCallback, useEffect, useRef, useState } from 'react'
import { LazyCommandPalette } from './components/lazy/LazyWidgets'
import { NotionEditor } from './components/PageEditor'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useTheme } from './hooks/useTheme'
import type { PageReference } from './editor/nodes/PageLink'
import { countWords, useWorkspace } from './store/usePages'

export default function App() {
  const workspace = useWorkspace()
  const theme = useTheme()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)

  const { activePage, setActive, createPage } = workspace

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  const pagesRef = useRef(workspace.pages)
  pagesRef.current = workspace.pages

  // React to manual hash navigation (back/forward). Initial binding happens in
  // the store initializer so it cannot race with the URL sync effect below.
  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace(/^#\/?/, '')
      if (id && pagesRef.current[id]) setActive(id)
    }
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [setActive])

  useEffect(() => {
    const nextHash = `#${workspace.activeId}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }, [workspace.activeId])

  useEffect(() => {
    document.title = activePage?.title
      ? `${activePage.title} — Notion-like`
      : 'Notion-like'
  }, [activePage?.title])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        theme.cycle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [theme.cycle])

  const handleCreateSubPage = useCallback(
    (title: string): PageReference | null => {
      if (!workspace.activeId) return null
      const id = createPage(workspace.activeId, title, null, false)
      return { id, title: title || 'Untitled', icon: '📄' }
    },
    [createPage, workspace.activeId],
  )

  const handleNavigate = useCallback(
    (pageId: string) => {
      setActive(pageId)
      if (isMobile) setSidebarOpen(false)
    },
    [setActive, isMobile],
  )

  const handleDeleteActive = useCallback(() => {
    if (!activePage) return
    const hasChildren = Object.values(workspace.pages).some(
      (page) => page.parentId === activePage.id,
    )
    const message = hasChildren
      ? `Delete “${activePage.title || 'Untitled'}” and all of its sub-pages?`
      : `Delete “${activePage.title || 'Untitled'}”?`
    if (window.confirm(message)) workspace.deletePage(activePage.id)
  }, [activePage, workspace])

  const handleExport = useCallback(() => {
    if (!activePage) return
    const payload = {
      title: activePage.title,
      icon: activePage.icon,
      content: activePage.content,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const slug = (activePage.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    anchor.href = url
    anchor.download = `${slug || 'page'}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [activePage])

  const handleReset = useCallback(() => {
    if (window.confirm('Reset the demo workspace? This replaces every page and cannot be undone.')) {
      workspace.resetWorkspace()
      setResetNonce((value) => value + 1)
    }
  }, [workspace])

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activePage) return
      workspace.updatePage(activePage.id, { title })
    },
    [activePage, workspace],
  )

  const handleIconChange = useCallback(
    (icon: string) => {
      if (!activePage) return
      workspace.updatePage(activePage.id, { icon })
    },
    [activePage, workspace],
  )

  const handleCoverChange = useCallback(
    (cover: string) => {
      if (!activePage) return
      workspace.updatePage(activePage.id, { cover })
    },
    [activePage, workspace],
  )

  const handleCoverPositionChange = useCallback(
    (coverPosition: number) => {
      if (!activePage) return
      workspace.updatePage(activePage.id, { coverPosition })
    },
    [activePage, workspace],
  )

  const handleContentChange = useCallback(
    (content: Parameters<typeof workspace.setContent>[1]) => {
      if (!activePage) return
      workspace.setContent(activePage.id, content)
    },
    [activePage, workspace],
  )

  const handleDuplicate = useCallback(() => {
    if (!activePage) return
    workspace.duplicatePage(activePage.id)
  }, [activePage, workspace])

  return (
    <div
      className="app"
      data-sidebar={sidebarOpen ? 'open' : 'closed'}
      data-mobile={isMobile ? 'true' : 'false'}
    >
      <Sidebar
        workspace={workspace}
        open={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
        onOpenSearch={() => setPaletteOpen(true)}
        onReset={handleReset}
        theme={theme}
      />

      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="notion-page-shell">
        {activePage ? (
          <>
            <TopBar
              page={activePage}
              breadcrumbs={workspace.breadcrumbs}
              wordCount={countWords(activePage.content)}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
              onNavigate={handleNavigate}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              onDelete={handleDeleteActive}
              onShowShortcuts={() =>
                window.dispatchEvent(new Event('notion:shortcuts'))
              }
              theme={theme}
            />
            <NotionEditor
              key={`${activePage.id}:${resetNonce}`}
              documentId={activePage.id}
              title={activePage.title}
              icon={activePage.icon}
              cover={activePage.cover}
              coverPosition={activePage.coverPosition}
              content={activePage.content}
              onTitleChange={handleTitleChange}
              onIconChange={handleIconChange}
              onCoverChange={handleCoverChange}
              onCoverPositionChange={handleCoverPositionChange}
              onContentChange={handleContentChange}
              onNavigatePage={handleNavigate}
              onCreateSubPage={handleCreateSubPage}
            />
          </>
        ) : (
          <div className="empty-state">
            <p>This workspace is empty.</p>
            <button
              type="button"
              className="notion-btn notion-btn--primary"
              onClick={() => createPage(null)}
            >
              Create a page
            </button>
          </div>
        )}
      </main>

      {paletteOpen && (
        <LazyCommandPalette
          open
          tree={workspace.tree}
          onClose={() => setPaletteOpen(false)}
          onSelect={handleNavigate}
          onCreate={(title) => {
            createPage(null, title)
            if (isMobile) setSidebarOpen(false)
          }}
        />
      )}
    </div>
  )
}
