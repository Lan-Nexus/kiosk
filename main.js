const { app, BrowserWindow, BrowserView } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let overlayWindow;
let browserViews = [];
let currentIndex = 0;
let config;
let cycleInterval;

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
}

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 500,
    height: 500,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  overlayWindow.loadFile('overlay.html');
  overlayWindow.setIgnoreMouseEvents(true);

  // Position in top right corner
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  overlayWindow.setPosition(0, 0);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Create a BrowserView for each page
  config.pages.forEach((page, index) => {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    const bounds = mainWindow.getBounds();
    view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    view.setAutoResize({ width: true, height: true });

    // Load the URL
    view.webContents.loadURL(page.url);

    browserViews.push(view);
  });

  // Add the first view to start
  if (browserViews.length > 0) {
    mainWindow.setBrowserView(browserViews[0]);
    startCycling();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cycleInterval) {
      clearInterval(cycleInterval);
    }
  });
}

function startCycling() {
  function switchToNextView() {
    // Get the current page's duration or use default
    const duration = config.pages[currentIndex].duration || config.defaultDuration;

    // Move to next index
    currentIndex = (currentIndex + 1) % browserViews.length;

    // Switch to the next view
    mainWindow.setBrowserView(browserViews[currentIndex]);

    // Schedule next switch based on the new current page's duration
    const nextDuration = config.pages[currentIndex].duration || config.defaultDuration;
    setTimeout(switchToNextView, nextDuration);
  }

  // Start the first cycle after the initial page's duration
  const firstDuration = config.pages[0].duration || config.defaultDuration;
  setTimeout(switchToNextView, firstDuration);
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  createOverlay();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createOverlay();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
