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
var options = require('./options');
var ipc = require("ipc");

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;
var appIcon = null;

// oauth
var client = asana.Client.create({
    clientId: options.client_id,
    clientSecret: options.client_secret,
    redirectUri: options.redirect_uri
});
var access_token_set = false;

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

// helper to show tasks due today and marked today in tray
function updateTrayContents(list) {
  contextMenu = new Menu();
  var markedToday = [];
  var dueToday = [];
  list.forEach(function(item) {
    if (item.due_on === new Date().toJSON().slice(0,10)) {
      dueToday.push(new MenuItem({
          label: item.name,
          click: function() {
              mainWindow.send("load-task", item.id);
              mainWindow.show();
              mainWindow.focus();
          }
      }));
    } else {
      markedToday.push(new MenuItem({
          label: item.name,
          click: function() {
              mainWindow.send("load-task", item.id);
              mainWindow.show();
              mainWindow.focus();
          }
      }));
    }
  });
  contextMenu.append(new MenuItem({ label: 'DUE TODAY', enabled: false }));
  dueToday.forEach(function(task) {
    contextMenu.append(task);
  });
  contextMenu.append(new MenuItem({ type: 'separator' }));
  contextMenu.append(new MenuItem({ label: 'MARKED TODAY', enabled: false }));
  markedToday.forEach(function(task) {
    contextMenu.append(task);
  });

  appIcon.setContextMenu(contextMenu);
}

// helper to get all tasks filtered by due today or marked today
function queryTasks() {
  client.users.me().then(function(user) {
    var userId = user.id;
    var workspaceId = user.workspaces[0].id;
    return client.tasks.findAll({
      assignee: userId,
      completed_since: 'now',
      workspace: workspaceId,
      opt_fields: 'id,name,assignee_status,completed,due_on'
    });
  }).then(function(response) {
    console.log("response data", response.data);
    return response.data;
  }).filter(function(task) {
    return task.due_on === new Date().toJSON().slice(0,10) ||
      task.assignee_status === 'today';
  }).then(function(list) {
    updateTrayContents(list);
  });
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
      frame: false,  // https://github.com/atom/electron/blob/master/docs/api/frameless-window.md
      "title": "threedots"
    });

  var stateData = getSavedOrDefaultStateData();
  var userAgent = "FluidApp-mac " + mainWindow.webContents.getUserAgent();

  // Restore the last window size and position
  mainWindow.setBounds(stateData.bounds);

  // Create the tray
  var iconImage = path.join(__dirname, 'icon/','asanaicon.png');
  appIcon = new Tray(iconImage);
  appIcon.setToolTip('Asana');

  // Oauth authentication
  var oauthUrl = 'https://app.asana.com/-/oauth_authorize?'
    + 'client_id=' + options.client_id
    + '&redirect_uri=' + options.redirect_uri
    + '&access_type=offline'
    + '&response_type=' + 'code';
  mainWindow.loadUrl(oauthUrl, {
      userAgent: userAgent
  });
  var code;
  mainWindow.webContents.on('did-get-redirect-request', function(event, oldUrl, newUrl) {
    var raw_code = /code=([^&]*)/.exec(newUrl) || null;
      code = (raw_code && raw_code.length > 1) ? decodeURIComponent(raw_code[1]) : null;

    //   code = code.split("-")[0];
    //   if (code[code.length - 1] === "#") {
    //       code = code.substr(0, code.length - 1);
    //   }
     console.log("hey", code);

    // authenticate with access token
    if (code && !access_token_set && newUrl.indexOf("https://app.asana.com/?code=") === 0) {
      client.app.accessTokenFromCode(code).then(function(credentials) {
        client.useOauth({
          credentials: credentials
        });
        access_token_set = true;
      });

      mainWindow.webContents.loadUrl(stateData.url, {
          userAgent: userAgent
      });
    }

    // set tray values initially
    if (access_token_set) {
      queryTasks();
    }
  });

  // Make certain parts of the window draggable
  // update tray contents every 1 minute
  mainWindow.webContents.on('did-finish-load', function() {
    var cssPath = path.resolve(__dirname, "frameless.css");
    var css = fs.readFileSync(cssPath, {encoding: 'utf8'});
    mainWindow.webContents.insertCSS(css);
    setInterval(function() {
      if (access_token_set) {
        queryTasks();
      }
    }, 60000);
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
      console.log("showing window");
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
