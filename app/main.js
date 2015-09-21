var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var clipboard = require('clipboard');
var fs = require('fs');
var Menu = require('menu');
var MenuItem = require('menu-item');
var Tray = require('tray');
var path = require('path');
var shell = require('shell');
var asana = require('asana');
var ipc = require("ipc");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;
var appIcon = null;

function getSavedOrDefaultStateData() {
  // Read in the saved state
  var savedStatePath = app.getPath("userData") + "/saved_state";
  if (fs.existsSync(savedStatePath)) {
      var savedStateData = JSON.parse(fs.readFileSync(savedStatePath));
      validSavedStateData = ('bounds','url' in savedStateData)
                      && (savedStateData.url.startsWith("https://app.asana.com"))
                      && ('x','y','width','height' in savedStateData.bounds);
      if (validSavedStateData) {
          return savedStateData;
      }
  }
  return {bounds: {x: 0, y: 0, width: 1280, height: 800},
             url: "https://app.asana.com"};
}

app.on('before-quit', function() {
  mainWindow.forceClose = true;
});

app.on('activate-with-no-open-windows', function() {
  mainWindow.show();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OSX it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
// This should be abstracted into a showAsana() function
// which could be called on 'ready' and 'activate-with-no-open-windows' events
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      "min-width": 750,
      "min-height": 300,
      "preload": path.resolve(__dirname, "inject.js"),
      'title-bar-style': 'hidden-inset',
      "title": "threedots"
    });

  var stateData = getSavedOrDefaultStateData();
  var userAgent = "FluidApp-mac " + mainWindow.webContents.getUserAgent();

  // Restore the last window size and position
  mainWindow.setBounds(stateData.bounds);

  mainWindow.loadUrl("https://app.asana.com/", {
      userAgent: userAgent
  });

  // Make certain parts of the window draggable
  mainWindow.webContents.on('did-finish-load', function() {
    var cssPath = path.resolve(__dirname, "frameless.css");
    var css = fs.readFileSync(cssPath, {encoding: 'utf8'});
    mainWindow.webContents.insertCSS(css);
  });

  // Make links open in the default system browser
  mainWindow.webContents.on('new-window', function (event, url, frameName, disposition) {
      event.preventDefault();
      shell.openExternal(url);
  });

  // Emitted before the window is closed.
  mainWindow.on('close', function(event) {
    // Save the window position, size, and URL to disk
    var savedStatePath = app.getPath("userData") + "/saved_state";
    var savedStateData = {
        bounds: mainWindow.getBounds(),
        url: mainWindow.webContents.getUrl()
    };
    fs.writeFileSync(savedStatePath, JSON.stringify(savedStateData));

    // If we're actually being quit then allow the window to close,
    // otherwise just hide it
    if (mainWindow.forceClose) return;
    event.preventDefault();
    mainWindow.hide();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  ipc.on('show-window', function() {
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("browser-window-blur", function(event, window) {
      window.send("blur");
  });

  app.on("browser-window-focus", function(event, window) {
      window.send("focus");
  });

  // Create the Application's main menu
  var template = [{
    label: 'threedots',
    submenu: [
      {
        label: 'About threedots',
        selector: 'orderFrontStandardAboutPanel:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide threedots',
        accelerator: 'Command+H',
        selector: 'hide:'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        selector: 'hideOtherApplications:'
      },
      {
        label: 'Show All',
        selector: 'unhideAllApplications:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() { app.quit(); }
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'Command+Z',
        selector: 'undo:'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+Command+Z',
        selector: 'redo:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'Command+X',
        selector: 'cut:'
      },
      {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      },
      {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      },
      {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Copy link to task',
        accelerator: 'Command+Shift+C',
        click: function() {
          var url = BrowserWindow.getFocusedWindow().webContents.getUrl();
          clipboard.writeText(url);
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Reload',
        accelerator: 'Command+R',
        click: function() { BrowserWindow.getFocusedWindow().reloadIgnoringCache(); }
      },
      {
        label: 'Back',
        accelerator: 'Command+[',
        click: function() {
            var content = BrowserWindow.getFocusedWindow().webContents;
            if (content.canGoBack()) {
                content.goBack();
            }
        }
      },
      {
        label: 'Forward',
        accelerator: 'Command+]',
        click: function() {
            var content = BrowserWindow.getFocusedWindow().webContents;
            if (content.canGoForward()) {
                content.goForward();
            }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Toggle DevTools',
        accelerator: 'Alt+Command+J',
        click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
      }
    ]
  },
  {
    label: 'Window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'Command+M',
        selector: 'performMiniaturize:'
      },
      {
        label: 'Close',
        accelerator: 'Command+W',
        selector: 'performClose:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        selector: 'arrangeInFront:'
      },
    ]
  },
  {
    label: 'Help',
    submenu: []
  }];

  menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});
