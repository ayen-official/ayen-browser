import { useState, useEffect } from 'react'
import { MoreVertical, Star, History, X, Trash2 } from 'lucide-react'
import { useTabStore } from '../store/tabStore'

interface HistoryItem {
  url: string
  title: string
  date: string
}

interface BookmarkItem {
  url: string
  title: string
}

const Hub = (): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const { updateTab, activeTabId } = useTabStore()

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, activeTab])

  const loadData = async () => {
    // @ts-ignore
    if (window.electron?.ipcRenderer) {
      if (activeTab === 'history') {
        // @ts-ignore
        const h = await window.electron.ipcRenderer.invoke('get-history')
        setHistory(h || [])
      } else {
        // @ts-ignore
        const b = await window.electron.ipcRenderer.invoke('get-bookmarks')
        setBookmarks(b || [])
      }
    }
  }

  const handleNavigate = (url: string) => {
    updateTab(activeTabId, { url })
    setIsOpen(false)
  }

  const handleClearHistory = () => {
    // @ts-ignore
    window.electron.ipcRenderer.send('clear-history')
    setHistory([])
  }

  return (
    <div className="hub-container">
      <button
        className={`nav-button hub-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Menu"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="hub-popover">
          <div className="hub-tabs">
            <button
              className={`hub-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={14} /> History
            </button>
            <button
              className={`hub-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              <Star size={14} /> Bookmarks
            </button>
            <button className="hub-close" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="hub-content">
            {activeTab === 'history' && (
              <>
                <div className="hub-actions">
                  <button className="clear-history-btn" onClick={handleClearHistory}>
                    <Trash2 size={12} /> Clear History
                  </button>
                </div>
                <div className="hub-list">
                  {history.length === 0 ? (
                    <div className="no-data">No history yet</div>
                  ) : (
                    history.map((item, i) => (
                      <div key={i} className="hub-item" onClick={() => handleNavigate(item.url)}>
                        <div className="hub-item-title" title={item.title}>
                          {item.title || item.url}
                        </div>
                        <div className="hub-item-url" title={item.url}>
                          {item.url}
                        </div>
                        <div className="hub-item-date">
                          {new Date(item.date).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'bookmarks' && (
              <div className="hub-list">
                {bookmarks.length === 0 ? (
                  <div className="no-data">No bookmarks yet</div>
                ) : (
                  bookmarks.map((item, i) => (
                    <div key={i} className="hub-item" onClick={() => handleNavigate(item.url)}>
                      <div className="hub-item-icon">
                        <Star size={12} fill="#fbbf24" stroke="none" />
                      </div>
                      <div className="hub-item-content">
                        <div className="hub-item-title" title={item.title}>
                          {item.title || item.url}
                        </div>
                        <div className="hub-item-url" title={item.url}>
                          {item.url}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Hub
