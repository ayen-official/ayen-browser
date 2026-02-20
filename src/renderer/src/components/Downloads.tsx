import { useState, useEffect } from 'react'
import { Download as DownloadIcon, X, File } from 'lucide-react'

interface DownloadItem {
  filename: string
  percentage: number
  state: 'progressing' | 'completed' | 'cancelled' | 'paused' | 'interrupted'
  receivedBytes?: number
  totalBytes?: number
}

const Downloads = (): React.JSX.Element => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeDownloadCount, setActiveDownloadCount] = useState(0)

  useEffect(() => {
    // @ts-ignore (window.electron is available in preload)
    if (!window.electron?.ipcRenderer) return

    const handleStart = (_e: any, data: { filename: string }) => {
      setDownloads((prev) => [
        { filename: data.filename, percentage: 0, state: 'progressing' },
        ...prev
      ])
      setActiveDownloadCount((c) => c + 1)
      setIsOpen(true)
    }

    const handleProgress = (_e: any, data: { filename: string; percentage: number }) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.filename === data.filename
            ? { ...d, percentage: data.percentage, state: 'progressing' }
            : d
        )
      )
    }

    const handleComplete = (_e: any, data: { filename: string; state: any }) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.filename === data.filename ? { ...d, percentage: 100, state: 'completed' } : d
        )
      )
      setActiveDownloadCount((c) => Math.max(0, c - 1))
    }

    // @ts-ignore
    window.electron.ipcRenderer.on('download-started', handleStart)
    // @ts-ignore
    window.electron.ipcRenderer.on('download-progress', handleProgress)
    // @ts-ignore
    window.electron.ipcRenderer.on('download-complete', handleComplete)

    return () => {
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('download-started')
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('download-progress')
      // @ts-ignore
      window.electron.ipcRenderer.removeAllListeners('download-complete')
    }
  }, [])

  return (
    <div className="downloads-container">
      <button
        className={`nav-button downloads-button ${activeDownloadCount > 0 ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Downloads"
      >
        <DownloadIcon size={20} />
        {activeDownloadCount > 0 && <div className="download-badge"></div>}
      </button>

      {isOpen && (
        <div className="downloads-popover">
          <div className="downloads-header">
            <span>Downloads</span>
            <button className="close-downloads" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="downloads-list">
            {downloads.length === 0 ? (
              <div className="no-downloads">No recent downloads</div>
            ) : (
              downloads.map((d, i) => (
                <div key={i} className="download-item">
                  <File size={24} className="file-icon" />
                  <div className="download-info">
                    <div className="filename" title={d.filename}>
                      {d.filename}
                    </div>
                    {d.state === 'progressing' ? (
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${d.percentage}%` }} />
                      </div>
                    ) : (
                      <div className="download-status">{d.state}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Downloads
