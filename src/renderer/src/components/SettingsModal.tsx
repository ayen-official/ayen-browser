import { useState, useEffect } from 'react'
import { X, Trash2, Shield, Search, Settings, Info } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingChange: (key: string, value: any) => void
}

type SearchEngine = 'Ayen' | 'Google' | 'DuckDuckGo'

const SettingsModal = ({
  isOpen,
  onClose,
  onSettingChange
}: SettingsModalProps): React.JSX.Element | null => {
  const [activeSection, setActiveSection] = useState<'privacy' | 'search' | 'about'>('privacy')
  const [settings, setSettings] = useState<{ searchEngine: SearchEngine; shieldEnabled: boolean }>({
    searchEngine: 'Ayen',
    shieldEnabled: true
  })
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    if (!window.electron?.ipcRenderer) return
    // @ts-ignore
    const stored = await window.electron.ipcRenderer.invoke('get-settings')
    if (stored) setSettings(stored)
  }

  const handleUpdate = async (key: string, value: any) => {
    // @ts-ignore
    const newSettings = await window.electron.ipcRenderer.invoke('update-setting', { key, value })
    setSettings(newSettings)
    onSettingChange(key, value)
  }

  const handleClearData = async () => {
    setClearing(true)
    // @ts-ignore
    await window.electron.ipcRenderer.invoke('clear-data')
    setTimeout(() => setClearing(false), 1000)
  }

  const handleCheckUpdates = () => {
    // @ts-ignore
    window.electron?.ipcRenderer.send('open-external', 'https://ayen.in/apps')
  }

  if (!isOpen) return null

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-sidebar">
          <div className="settings-header">
            <Settings size={18} /> Settings
          </div>
          <button
            className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveSection('privacy')}
          >
            <Shield size={16} /> Privacy & Shield
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'search' ? 'active' : ''}`}
            onClick={() => setActiveSection('search')}
          >
            <Search size={16} /> Search Engine
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <Info size={16} /> About Ayen
          </button>
        </div>

        <div className="settings-content">
          <button className="settings-close" onClick={onClose}>
            <X size={18} />
          </button>

          {activeSection === 'privacy' && (
            <div className="settings-panel">
              <h2>Privacy & Shield</h2>

              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-label">
                    <span>Ayen Shield</span>
                    <p>Block ads and tracking scripts automatically.</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.shieldEnabled}
                      onChange={(e) => handleUpdate('shieldEnabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>Browsing Data</h3>
                <div className="settings-item">
                  <div className="settings-label">
                    <span>Clear Browsing Data</span>
                    <p>Clear history, cookies, cache, and other site data.</p>
                  </div>
                  <button className="btn-danger" onClick={handleClearData} disabled={clearing}>
                    <Trash2 size={14} /> {clearing ? 'Clearing...' : 'Clear Data'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'search' && (
            <div className="settings-panel">
              <h2>Search Engine</h2>
              <div className="settings-group">
                <div className="settings-item-col">
                  <label>Default Search Engine</label>
                  <select
                    value={settings.searchEngine}
                    onChange={(e) => handleUpdate('searchEngine', e.target.value)}
                    className="settings-select"
                  >
                    <option value="Ayen">Ayen (Default)</option>
                    <option value="Google">Google</option>
                    <option value="DuckDuckGo">DuckDuckGo</option>
                  </select>
                  <p className="hint">
                    This engine will be used when searching from the address bar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="settings-panel">
              <h2>About Ayen</h2>
              <div className="settings-group">
                <div
                  className="settings-item-col"
                  style={{
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '16px',
                    padding: '16px'
                  }}
                >
                  <h3 style={{ margin: 0, color: '#e0e0e0', fontSize: '18px' }}>
                    Ayen Browser
                  </h3>
                  <p style={{ color: '#888', fontSize: '13px' }}>v1.0.0</p>

                  <button
                    className="btn-primary"
                    onClick={handleCheckUpdates}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      marginTop: '16px'
                    }}
                  >
                    Check for Updates
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
