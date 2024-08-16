import { app, BrowserWindow, ipcMain, screen, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import * as logger from 'electron-log';
import * as unhandled from 'electron-unhandled';
import { exec } from 'child_process';

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {
  setupLogger();

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    fullscreen: true,
    webPreferences: {
      session: session.fromPartition("persist:name"),
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      contextIsolation: false,
      partition: "persist:name",
    },
  });

  win.webContents.session.cookies.set({ url: "http://localhost", name: "test", value: "tval" });

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
  } else {
    let pathIndex = './index.html';
    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      pathIndex = '../dist/index.html';
    }

    // Maneja el evento scan-wifi
    ipcMain.handle('scan-wifi', async () => {
      try {
        const networks = await scanNetworks();
        console.log("ELECTRON ", networks);
        return networks;
      } catch (error) {
        console.error('Error al escanear redes WiFi:', error);
        throw error;
      }
    });

    // Maneja el evento connect-wifi
    ipcMain.handle('connect-wifi', async (event, { ssid, password }) => {
      try {
        await connectToNetwork(ssid, password);
        return { success: true };
      } catch (error) {
        console.error(`Error al conectar a la red WiFi ${ssid}:`, error);
        return { success: false, error };
      }
    });

    win.loadURL(url.format({
      pathname: path.join(__dirname, pathIndex),
      protocol: 'file:',
      slashes: true,
    }));
  }

  win.on('closed', () => {
    win = null;
  });
  win.maximize();
  win.setFullScreen(true);

  return win;
}

function setupLogger() {
  logger.transports.file.level = 'info';
  logger.transports.file.format = '{h}:{i}:{s}:{ms} {text}';
  logger.transports.file.maxSize = 5 * 1024 * 1024;
  logger.transports.file.resolvePath = () => path.resolve("bd/log/", "log.log");

  unhandled({
    logger: (error) => {
      logger.error(error);
    },
    showDialog: false,
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function scanNetworks() {
  return new Promise((resolve, reject) => {
    exec('sudo wpa_cli -i wlan0 scan', async (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      // Esperar 3 segundos antes de obtener los resultados del escaneo
      await sleep(3000);

      exec('sudo wpa_cli -i wlan0 scan_results', (error, stdout, stderr) => {
        if (error) {
          return reject(error); 
        }
        const networks = parseScanResults(stdout);
        resolve(networks);
      });
    });
  });
}

function parseScanResults(scanResults) {
  const lines = scanResults.split('\n');
  const networks = [];

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line) {  // Verificar si la línea no está vacía
      const parts = line.split('\t');

      if (parts.length >= 5) {  // Asegurarse de que haya suficientes partes
        networks.push({
          bssid: parts[0],
          frequency: parts[1],
          signalLevel: parts[2],
          flags: parts[3],
          ssid: parts[4]
        });
      }
    }
  }

  return networks;
}



function connectToNetwork(ssid, password) {
  console.log("Entro a esta funcion");
  return new Promise((resolve, reject) => {
    const removeAllNetworksCmd = 'sudo wpa_cli -i wlan0 list_networks | tail -n +2 | awk \'{print $1}\' | xargs -I {} sudo wpa_cli -i wlan0 remove_net {}';
    const disableNetworkCmd = 'sudo wpa_cli -i wlan0 disable_network 0'; 
    const addNetworkCmd = 'sudo wpa_cli -i wlan0 add_network';
    const setSsidCmd = `sudo wpa_cli -i wlan0 set_network 0 ssid '"${ssid}"'`;
    const setPskCmd = `sudo wpa_cli -i wlan0 set_network 0 psk '"${password}"'`;
    const enableNetworkCmd = 'sudo wpa_cli -i wlan0 enable_network 0';
    const selectNetworkCmd = 'sudo wpa_cli -i wlan0 select_network 0';
    const saveConfigCmd = 'sudo wpa_cli -i wlan0 save_config';

    const commands = `${removeAllNetworksCmd} && ${disableNetworkCmd} && ${addNetworkCmd} && ${setSsidCmd} && ${setPskCmd} && ${enableNetworkCmd} && ${selectNetworkCmd} && ${saveConfigCmd}`;
    console.log("COMANDO", commands);

    exec(commands, (error, stdout, stderr) => {
      console.log("EXEC", error, stdout);
      if (error) {
        console.log("ERROR", error);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}


try {
  app.on('ready', () => setTimeout(createWindow, 400));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
}