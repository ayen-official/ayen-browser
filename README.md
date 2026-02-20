<p align="center">
  <img src="https://ayen.in/ayen%20logo.png" alt="Ayen Logo" width="120" />
</p>

# Ayen Browser

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.3-green.svg)](https://github.com/ayen-official/ayen-browser/releases)

Ayen Browser is a fast, privacy-focused, and modern web browser natively built using Electron, React, and TypeScript. Designed for speed and minimal resource usage, it features a fluid tab management system, built-in telemetry blocking, and a premium aesthetic that prioritizes productivity.

---

## 🌟 Key Features

- **Fluid Tab Management:** Hardware-accelerated tabs powered by Framer Motion drag-and-drop physics.
- **Ayen Shield:** Built-in ad and tracker blocking initialized at the network level using `@cliqz/adblocker-electron`.
- **Smart Search:** Unified URL/Search bar combining protocol resolution and direct query routing via duckduckgo, Google, and Ayen's native search platform.
- **Incognito Mode:** Isolated partition instances to ensure your browsing history, cookies, and tokens are instantly destroyed on close.
- **Minimalist UI:** Modern, distraction-free "glassmorphism" aesthetic built with native Frameless Window APIs.

## 🚀 Getting Started

To build and run Ayen Browser locally, ensure you have [Node.js](https://nodejs.org/) (v16 or higher) installed.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ayen-official/ayen-browser.git
   cd ayen-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the application in development mode with hot-module-reloading (HMR):

```bash
npm run dev
```

### Building for Production

To compile the application into a distribution package for your operating system:

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

The compiled executables will be generated in the `dist` directory.

## 🏗️ Architecture Stack

Ayen Browser utilizes the [Electron Vite](https://electron-vite.org/) tooling system, establishing a modern bridging pattern:

- **Main Process:** Bootstraps the application, handles lifecycle events, initializes the Ayen Shield core, and enforces strict Context Isolation.
- **Renderer Process:** Handled purely by **React 18** and **TypeScript**, managing the primary UI orchestration via `Zustand` state management.
- **Webviews:** The renderer spawns isolated `<webview>` nodes within its scope to handle third-party browsing securely.

## 🤝 Contributing

We welcome community contributions, particularly in expanding privacy lists, refining UX physics, and improving extension support. Please feel free to open an issue or submit a pull request!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

_Built with ❤️ by the Ayen Team._
