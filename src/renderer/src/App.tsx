import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plus,
  Shield,
  Star,
  Settings,
  Glasses
} from 'lucide-react'
import { Reorder } from 'framer-motion'
import { useTabStore } from './store/tabStore'
import Tab from './components/Tab'
import WindowControls from './components/WindowControls'
import Downloads from './components/Downloads'
import Hub from './components/Hub'
import SettingsModal from './components/SettingsModal'
import './App.css'

function App(): React.JSX.Element {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, getActiveTab } =
    useTabStore()
  const [urlInput, setUrlInput] = useState('https://ayen.in')
  const [blockedAdsCount, setBlockedAdsCount] = useState(0)
  const [showShieldPopover, setShowShieldPopover] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchEngine, setSearchEngine] = useState('Ayen')
  const webviewRefs = useRef<{ [key: string]: any }>({})

  const isIncognito = new URL(window.location.href).searchParams.get('mode') === 'incognito'

  const activeTab = getActiveTab()

  // Listen for blocked ad count from main process
  useEffect(() => {
    // Safety check for electron API
    if (!window.electron?.ipcRenderer) {
      console.warn('Electron IPC not available')
      return
    }

    const handleBlockedAd = (_event: any, count: number) => {
      setBlockedAdsCount(count)
    }

    window.electron.ipcRenderer.on('blocked-ad-count', handleBlockedAd)

    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener('blocked-ad-count', handleBlockedAd)
      }
    }
  }, [])

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electron?.ipcRenderer) return
      // @ts-ignore
      const settings = await window.electron.ipcRenderer.invoke('get-settings')
      if (settings && settings.searchEngine) {
        setSearchEngine(settings.searchEngine)
      }
    }
    loadSettings()
  }, [])

  // Update URL input when active tab changes
  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url)
      setIsLoading(activeTab.isLoading)
      checkBookmarkStatus(activeTab.url)
    }
  }, [activeTabId, activeTab?.url, activeTab?.isLoading])

  // Automatically focus the URL bar when opening a new tab
  useEffect(() => {
    if (activeTab && activeTab.url === 'https://ayen.in' && activeTab.title === 'New Tab') {
      const urlInputEl = document.querySelector('.url-input') as HTMLInputElement
      if (urlInputEl) {
        urlInputEl.focus()
        urlInputEl.select()
      }
    }
  }, [activeTabId])

  const checkBookmarkStatus = async (url: string) => {
    if (!window.electron?.ipcRenderer) return
    // @ts-ignore
    const status = await window.electron.ipcRenderer.invoke('is-bookmarked', url)
    setIsBookmarked(status)
  }

  // Setup webview event listeners
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = []

    tabs.forEach((tab) => {
      const webview = webviewRefs.current[tab.id]
      if (!webview) return

      const handleNavigation = (event: any) => {
        updateTab(tab.id, { url: event.url })
        if (tab.id === activeTabId) {
          setUrlInput(event.url)
        }
      }

      const handleLoadStart = () => {
        updateTab(tab.id, { isLoading: true })
        if (tab.id === activeTabId) {
          setIsLoading(true)
        }
      }

      const handleLoadStop = () => {
        updateTab(tab.id, { isLoading: false })
        if (tab.id === activeTabId) {
          setIsLoading(false)
        }
      }

      const handleTitleUpdate = (event: any) => {
        updateTab(tab.id, { title: event.title || 'New Tab' })
      }

      const handleFaviconUpdate = (event: any) => {
        if (event.favicons && event.favicons.length > 0) {
          updateTab(tab.id, { favicon: event.favicons[0] })
        }
      }

      // Add event listeners
      webview.addEventListener('did-navigate', handleNavigation)
      webview.addEventListener('did-navigate-in-page', handleNavigation)
      webview.addEventListener('did-start-loading', handleLoadStart)
      webview.addEventListener('did-stop-loading', handleLoadStop)
      webview.addEventListener('page-title-updated', handleTitleUpdate)
      webview.addEventListener('page-favicon-updated', handleFaviconUpdate)

      const handleContextMenu = (e: any) => {
        // e.params contains x, y, selectionText, etc.
        window.electron?.ipcRenderer.send('show-context-menu', e.params)
      }
      webview.addEventListener('context-menu', handleContextMenu)

      // Store cleanup function
      cleanupFunctions.push(() => {
        webview.removeEventListener('did-navigate', handleNavigation)
        webview.removeEventListener('did-navigate-in-page', handleNavigation)
        webview.removeEventListener('did-start-loading', handleLoadStart)
        webview.removeEventListener('did-stop-loading', handleLoadStop)
        webview.removeEventListener('page-title-updated', handleTitleUpdate)
        webview.removeEventListener('page-favicon-updated', handleFaviconUpdate)
        webview.removeEventListener('context-menu', handleContextMenu)
      })
    })

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [tabs, activeTabId, updateTab])

  // Context Menu Command Handler
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleMenuCommand = (_event: any, command: string) => {
      const webview = webviewRefs.current[activeTabId]
      if (!webview) return

      switch (command) {
        case 'back':
          if (webview.canGoBack()) webview.goBack()
          break
        case 'forward':
          if (webview.canGoForward()) webview.goForward()
          break
        case 'reload':
          webview.reload()
          break
        case 'inspect':
          webview.openDevTools()
          break
      }
    }

    window.electron.ipcRenderer.on('context-menu-command', handleMenuCommand)

    return () => {
      window.electron.ipcRenderer.removeListener('context-menu-command', handleMenuCommand)
    }
  }, [activeTabId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ctrl+L or Cmd+L: Focus URL Bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        const urlInputEl = document.querySelector('.url-input') as HTMLInputElement
        if (urlInputEl) {
          urlInputEl.focus()
          urlInputEl.select()
        }
        return
      }

      // Ctrl+Shift+N: New Incognito Window
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        window.electron?.ipcRenderer.send('new-incognito-window')
        return
      }

      // Ctrl+T: New Tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        addTab()
      }
      // Ctrl+W: Close Active Tab
      else if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        if (tabs.length > 1) {
          removeTab(activeTabId)
        }
      }
      // Ctrl+Tab: Next Tab
      else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTab(tabs[nextIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab])

  const handleNavigate = () => {
    const webview = webviewRefs.current[activeTabId]
    if (!webview) return

    let targetUrl = urlInput.trim()

    // Check if input is a valid URL
    if (
      targetUrl.includes('http://') ||
      targetUrl.includes('https://') ||
      targetUrl.includes('.com') ||
      targetUrl.includes('.in') ||
      targetUrl.includes('.org') ||
      targetUrl.includes('.net')
    ) {
      // It's a URL, ensure it has protocol
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl
      }
      webview.src = targetUrl
    } else {
      // It's a search query
      let searchUrl = `https://ayen.in/?q=${encodeURIComponent(targetUrl)}`

      if (searchEngine === 'Google') {
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`
      } else if (searchEngine === 'DuckDuckGo') {
        searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`
      }

      webview.src = searchUrl
      setUrlInput(searchUrl)
    }

    // Unfocus the input so keyboard works without typing into the URL bar again
    const urlInputEl = document.querySelector('.url-input') as HTMLInputElement
    if (urlInputEl) {
      urlInputEl.blur()
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate()
    }
  }

  const handleBack = () => {
    const webview = webviewRefs.current[activeTabId]
    if (webview && webview.goBack) {
      webview.goBack()
    }
  }

  const handleForward = () => {
    const webview = webviewRefs.current[activeTabId]
    if (webview && webview.goForward) {
      webview.goForward()
    }
  }

  const handleReload = () => {
    const webview = webviewRefs.current[activeTabId]
    if (webview && webview.reload) {
      webview.reload()
    }
  }

  const handleToggleBookmark = async () => {
    // Disable bookmarks in incognito
    if (isIncognito) return
    if (!window.electron?.ipcRenderer || !activeTab) return
    const item = {
      url: activeTab.url,
      title: activeTab.title || activeTab.url
    }
    // @ts-ignore
    await window.electron.ipcRenderer.invoke('toggle-bookmark', item)
    checkBookmarkStatus(activeTab.url)
  }

  const handleAddTab = () => {
    addTab(isIncognito ? 'https://duckduckgo.com' : 'https://ayen.in')
  }

  const handleSettingChange = (key: string, value: any) => {
    if (key === 'searchEngine') {
      setSearchEngine(value)
    }
    // Handle other settings updates if needed locally
  }

  return (
    <div className={`app-container ${isIncognito ? 'incognito-mode' : ''}`}>
      {/* Tab Bar */}
      <div className="tab-bar" style={isIncognito ? { backgroundColor: '#1a1a1a' } : {}}>
        <Reorder.Group
          axis="x"
          values={tabs}
          onReorder={useTabStore.getState().reorderTabs}
          className="tabs-container"
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
          ))}
          <button className="add-tab-button" onClick={handleAddTab} title="New Tab">
            <Plus size={16} />
          </button>
        </Reorder.Group>
        {/* Window Controls */}
        <WindowControls />
      </div>

      {/* Top Bar - Address Bar */}
      <div
        className="top-bar"
        style={isIncognito ? { backgroundColor: '#000000', color: '#fff' } : {}}
      >
        {isIncognito && (
          <div
            className="incognito-indicator"
            title="Incognito Mode"
            style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}
          >
            <Glasses size={24} color="#fff" />
          </div>
        )}
        <button className="nav-button" onClick={handleBack} title="Back">
          <ChevronLeft size={20} />
        </button>
        <button className="nav-button" onClick={handleForward} title="Forward">
          <ChevronRight size={20} />
        </button>
        <button className="nav-button" onClick={handleReload} title="Reload">
          <RotateCw size={20} />
        </button>

        {/* Ayen Shield Button */}
        <div className="shield-container">
          <button
            className={`nav-button shield-button ${blockedAdsCount > 0 ? 'active' : ''}`}
            onClick={() => setShowShieldPopover(!showShieldPopover)}
            title="Ayen Shield"
          >
            <Shield size={20} />
            {blockedAdsCount > 0 && <span className="shield-badge">{blockedAdsCount}</span>}
          </button>

          {showShieldPopover && (
            <div className="shield-popover">
              <div className="shield-popover-header">
                <Shield size={16} />
                <span>Ayen Shield</span>
              </div>
              <div className="shield-popover-content">
                <div className="shield-stat">
                  <span className="shield-stat-number">{blockedAdsCount}</span>
                  <span className="shield-stat-label">Ads & Trackers Blocked</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          type="text"
          className="url-input"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter URL or search..."
          style={isIncognito ? { backgroundColor: '#333', color: '#fff', borderColor: '#444' } : {}}
        />

        <button
          className={`nav-button bookmark-button ${isBookmarked ? 'active' : ''}`}
          onClick={handleToggleBookmark}
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this tab'}
          style={{
            color: isBookmarked ? '#fbbf24' : 'inherit',
            opacity: isIncognito ? 0.3 : 1,
            cursor: isIncognito ? 'not-allowed' : 'pointer'
          }}
          disabled={isIncognito}
        >
          <Star size={20} fill={isBookmarked ? '#fbbf24' : 'none'} />
        </button>

        {/* Downloads */}
        <Downloads />

        <Hub />

        <button
          className="nav-button"
          onClick={() => window.electron?.ipcRenderer.send('new-incognito-window')}
          title="New Incognito Window"
        >
          <Glasses size={20} />
        </button>

        <button
          className={`nav-button ${isSettingsOpen ? 'active' : ''}`}
          onClick={() => setIsSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Loading Bar */}
      {isLoading && <div className="loading-bar" />}

      {/* Main Content - Webviews */}
      <div className="main-content">
        {tabs.map((tab) => (
          <webview
            key={tab.id}
            ref={(el) => {
              webviewRefs.current[tab.id] = el
            }}
            src={tab.url}
            partition={isIncognito ? 'incognito' : 'persist:main'}
            style={{
              width: '100%',
              height: '100%',
              display: tab.id === activeTabId ? 'flex' : 'none'
            }}
          />
        ))}
      </div>
      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingChange={handleSettingChange}
      />
    </div>
  )
}

export default App
