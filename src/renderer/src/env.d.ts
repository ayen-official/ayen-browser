/// <reference types="vite/client" />

// Extend HTMLElementTagNameMap to include webview
declare global {
  interface HTMLWebViewElement extends HTMLElement {
    src: string
    goBack: () => void
    goForward: () => void
    reload: () => void
    canGoBack: () => boolean
    canGoForward: () => boolean
    loadURL: (url: string) => void
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLWebViewElement> & {
          src?: string
          style?: React.CSSProperties
          allowpopups?: string
          useragent?: string
        },
        HTMLWebViewElement
      >
    }
  }
}

export {}
