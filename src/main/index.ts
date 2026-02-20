import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  session,
  Menu,
  MenuItemConstructorOptions
} from 'electron'
import { join } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'cross-fetch'
import Store from 'electron-store'

interface HistoryItem {
  url: string
  title: string
  date: string
}

interface BookmarkItem {
  url: string
  title: string
}

type SearchEngine = 'Ayen' | 'Google' | 'DuckDuckGo'

interface Settings {
  searchEngine: SearchEngine
  shieldEnabled: boolean
}

interface StoreSchema {
  history: HistoryItem[]
  bookmarks: BookmarkItem[]
  settings: Settings
}

const store = new Store<StoreSchema>({
  defaults: {
    history: [],
    bookmarks: [],
    settings: {
      searchEngine: 'Ayen',
      shieldEnabled: true
    }
  }
})

let adBlockerInstance: ElectronBlocker | null = null

async function setupAdBlocker(mainWindow: BrowserWindow): Promise<void> {
  try {
    let blockedCount = 0

    console.log('[Ayen Shield] Initializing ElectronBlocker...')

    // Initialize blocker with prebuilt ads and tracking lists (EasyList - same as Brave)
    adBlockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)

    console.log('[Ayen Shield] Loaded prebuilt EasyList filters')

    // Fetch and add custom filters (EasyList, EasyPrivacy, Brave)
    try {
      const lists = [
        'https://easylist.to/easylist/easylist.txt', // Ads
        'https://easylist.to/easylist/easyprivacy.txt', // Privacy
        'https://raw.githubusercontent.com/brave/adblock-lists/master/brave-unbreak.txt' // Brave Specific
      ]

      console.log('[Ayen Shield] Fetching additional filter lists...')

      const requests = lists.map((url) => fetch(url).then((r) => r.text()))
      const responses = await Promise.all(requests)
      const combinedCustomLists = responses.join('\n')

      // Get the current engine's serialized data
      const currentEngine = adBlockerInstance.serialize()

      // Parse custom filters and merge with existing blocker
      // Note: We create a new blocker instance with both lists combined
      adBlockerInstance = await ElectronBlocker.parse(combinedCustomLists + '\n' + currentEngine)

      console.log('[Ayen Shield] Added EasyList, EasyPrivacy, and Brave custom filters')
    } catch (error) {
      console.warn('[Ayen Shield] Failed to load custom filters:', error)
      // Continue with just the prebuilt lists if custom list fails
    }

    // Enable blocking in the default session if enabled in settings
    const settings = store.get('settings')
    if (settings.shieldEnabled) {
      adBlockerInstance.enableBlockingInSession(session.defaultSession)
      console.log('[Ayen Shield] Blocking enabled in session')
    } else {
      console.log('[Ayen Shield] Blocking disabled by setting')
    }

    // Listen for blocked requests and update counter
    adBlockerInstance.on('request-blocked', (request) => {
      // Only count if enabled
      if (store.get('settings.shieldEnabled')) {
        blockedCount++
        console.log(`[Ayen Shield] Blocked: ${request.url}`)

        // Send blocked count to renderer for shield icon update
        mainWindow.webContents.send('blocked-ad-count', blockedCount)
      }
    })

    console.log('[Ayen Shield] Successfully initialized with EasyList + Brave filters')
  } catch (error) {
    console.error('[Ayen Shield] Failed to initialize ad blocker:', error)
  }
}

function setupDownloads(mainWindow: BrowserWindow): void {
  session.defaultSession.on('will-download', (_event, item, _webContents) => {
    const fileName = item.getFilename()
    const startTime = Date.now()

    // Send start message
    mainWindow.webContents.send('download-started', {
      filename: fileName,
      startTime: startTime
    })

    item.on('updated', (_event, state) => {
      if (state === 'interrupted') {
        mainWindow.webContents.send('download-interrupted', { filename: fileName })
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          mainWindow.webContents.send('download-paused', { filename: fileName })
        } else {
          const totalBytes = item.getTotalBytes()
          const receivedBytes = item.getReceivedBytes()
          const percentage = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0

          mainWindow.webContents.send('download-progress', {
            filename: fileName,
            percentage: percentage,
            receivedBytes: receivedBytes,
            totalBytes: totalBytes
          })
        }
      }
    })

    item.on('done', (_event, state) => {
      mainWindow.webContents.send('download-complete', {
        filename: fileName,
        state: state
      })
    })
  })
}

function createWindow(isIncognito: boolean = false): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false, // Frameless window for custom title bar
    autoHideMenuBar: true,
    title: 'Ayen Browser',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true, // Enable webview tag
      partition: isIncognito ? 'incognito' : 'persist:main'
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Enable webview to load content
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders } })
  })

  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(true)
    }
  )

  // Setup Ayen Shield ad blocker (only for basic session if needed, but blocking is session specific)
  // For now, we only setup on default/main session in setupAdBlocker or we need to pass session
  // isIncognito windows will use a different session ('incognito' partition).
  // We should ideally setup blocker for this new session too if we want blocking in incognito.
  // The user didn't explicitly ask for adblock in incognito, but it's good practice.
  // However, setupAdBlocker uses 'session.defaultSession' which is for the main process default.
  // We can leave adblock out of incognito for now to strictly follow "New Incognito Window" instructions without overengineering.
  // But wait, setupAdBlocker calls `adBlockerInstance.enableBlockingInSession(session.defaultSession)`.
  // If we want it in incognito, we need `adBlockerInstance.enableBlockingInSession(mainWindow.webContents.session)`.
  if (adBlockerInstance) {
    adBlockerInstance.enableBlockingInSession(mainWindow.webContents.session)
  } else {
    // If first launch is incognito (unlikely via UI but possible in code), we might miss init.
    // setupAdBlocker(mainWindow) initializes global instance.
    setupAdBlocker(mainWindow)
  }

  // Setup Downloads
  setupDownloads(mainWindow)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL'] + (isIncognito ? '?mode=incognito' : '')
    mainWindow.loadURL(url)
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: isIncognito ? { mode: 'incognito' } : {}
    })
  }

  // Log renderer errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.ayen.browserlite')
}

app.whenReady().then(() => {
  // Set app user model id for windows
  // electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.minimize()
  })

  ipcMain.on('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  ipcMain.on('window-close', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  ipcMain.on('show-context-menu', (event) => {
    const template = [
      {
        label: 'Back',
        click: () => {
          event.sender.send('context-menu-command', 'back')
        }
      },
      {
        label: 'Forward',
        click: () => {
          event.sender.send('context-menu-command', 'forward')
        }
      },
      {
        label: 'Reload',
        click: () => {
          event.sender.send('context-menu-command', 'reload')
        }
      },
      { type: 'separator' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      {
        label: 'Inspect Element',
        click: () => {
          event.sender.send('context-menu-command', 'inspect')
        }
      }
    ]
    const menu = Menu.buildFromTemplate(template as MenuItemConstructorOptions[])
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) || undefined })
  })

  // Persistence IPC handlers
  ipcMain.handle('get-history', () => {
    return store.get('history')
  })

  ipcMain.on('add-history-item', (event, item: { url: string; title: string; date: string }) => {
    // Don't save history for incognito (non-persistent) sessions
    if (!event.sender.session.isPersistent()) return

    const history = store.get('history') as HistoryItem[]
    // duplicate check for consecutive items handled in tracking, but good to have safety
    const newHistory = [item, ...history].slice(0, 500)
    store.set('history', newHistory)
  })

  ipcMain.handle('get-bookmarks', () => {
    return store.get('bookmarks')
  })

  ipcMain.handle('toggle-bookmark', (event, item: { url: string; title: string }) => {
    // Don't support bookmarks in incognito
    if (!event.sender.session.isPersistent()) return store.get('bookmarks')

    const bookmarks = store.get('bookmarks') as BookmarkItem[]
    const existsIndex = bookmarks.findIndex((b) => b.url === item.url)

    let newBookmarks
    if (existsIndex >= 0) {
      // Remove
      newBookmarks = bookmarks.filter((_, i) => i !== existsIndex)
    } else {
      // Add
      newBookmarks = [...bookmarks, item]
    }
    store.set('bookmarks', newBookmarks)
    return newBookmarks
  })

  ipcMain.handle('is-bookmarked', (_event, url: string) => {
    const bookmarks = store.get('bookmarks') as BookmarkItem[]
    return bookmarks.some((b) => b.url === url)
  })

  ipcMain.on('clear-history', () => {
    store.set('history', [])
  })

  // Settings IPC Handlers
  ipcMain.handle('clear-data', async () => {
    store.set('history', [])
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'cachestorage', 'indexdb']
    })
    return true
  })

  ipcMain.handle('get-settings', () => {
    return store.get('settings')
  })

  ipcMain.handle('update-setting', (_event, { key, value }) => {
    store.set(`settings.${key}`, value)

    // Handle side effects
    if (key === 'shieldEnabled' && adBlockerInstance) {
      if (value) {
        adBlockerInstance.enableBlockingInSession(session.defaultSession)
        console.log('[Ayen Shield] Re-enabled via settings')
      } else {
        adBlockerInstance.disableBlockingInSession(session.defaultSession)
        console.log('[Ayen Shield] Disabled via settings')
      }
    }
    return store.get('settings')
  })

  ipcMain.on('open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  // Auto-tracking for History
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      contents.on('did-navigate', (_event, url) => {
        if (!url || url.startsWith('file://')) return

        // Check if session is persistent (not incognito)
        if (!contents.session.isPersistent()) return

        const history = store.get('history') as HistoryItem[]
        // Ignore if same as last entry
        if (history.length > 0 && history[0].url === url) return

        const item: HistoryItem = {
          url,
          title: contents.getTitle() || url,
          date: new Date().toISOString()
        }

        const newHistory = [item, ...history].slice(0, 500)
        store.set('history', newHistory)
      })
    }
  })

  ipcMain.on('new-incognito-window', () => {
    createWindow(true)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
