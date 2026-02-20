import { X, Globe } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { useTabStore, Tab as TabType } from '../store/tabStore'

interface TabProps {
  tab: TabType
  isActive: boolean
}

export default function Tab({ tab, isActive }: TabProps) {
  const { setActiveTab, removeTab, tabs } = useTabStore()

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't close if it's the last tab
    if (tabs.length > 1) {
      removeTab(tab.id)
    }
  }

  return (
    <Reorder.Item
      value={tab}
      id={tab.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`tab ${isActive ? 'active' : ''}`}
      onPointerDown={(e) => {
        if (e.button === 1) {
          // Middle click closes tab
          handleClose(e as any)
        } else {
          setActiveTab(tab.id)
        }
      }}
    >
      {tab.favicon ? (
        <img src={tab.favicon} alt="" className="tab-favicon" />
      ) : (
        <Globe size={14} className="tab-favicon-placeholder" />
      )}
      <span className="tab-title">{tab.title}</span>
      {tabs.length > 1 && (
        <button className="tab-close" onPointerDown={handleClose}>
          <X size={14} />
        </button>
      )}
    </Reorder.Item>
  )
}
