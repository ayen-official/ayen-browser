import { Minus, Square, X } from 'lucide-react'

export default function WindowControls() {
  const handleMinimize = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-minimize')
    }
  }

  const handleMaximize = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-maximize')
    }
  }

  const handleClose = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-close')
    }
  }

  return (
    <div className="window-controls">
      <button className="window-control-button minimize" onClick={handleMinimize} title="Minimize">
        <Minus size={16} />
      </button>
      <button className="window-control-button maximize" onClick={handleMaximize} title="Maximize">
        <Square size={14} />
      </button>
      <button className="window-control-button close" onClick={handleClose} title="Close">
        <X size={16} />
      </button>
    </div>
  )
}
