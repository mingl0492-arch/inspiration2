const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');

let mainWindow;
const DATA_FILE_NAME = 'inspiration-data.json';
const DATA_DIR_NAME = 'data';

function appDirectory() {
  return app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
}

function portableDataDirectoryPath() {
  return path.join(appDirectory(), DATA_DIR_NAME);
}

function portableDataFilePath() {
  return path.join(portableDataDirectoryPath(), DATA_FILE_NAME);
}

function userDataBackupFilePath() {
  return path.join(app.getPath('userData'), DATA_FILE_NAME);
}

function candidateDataPaths() {
  return [...new Set([portableDataFilePath(), userDataBackupFilePath()])];
}

function isValidState(state) {
  return Boolean(
    state &&
    Array.isArray(state.dataItems) &&
    Array.isArray(state.ideas) &&
    Array.isArray(state.tags) &&
    Array.isArray(state.connections)
  );
}

function stateScore(state) {
  if (!isValidState(state)) return -1;
  return state.dataItems.length * 10 + state.ideas.length * 100 + state.tags.length * 20 + state.connections.length * 10;
}

async function readStateCandidate(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return null;
    const stat = await fsp.stat(filePath);
    return {
      path: filePath,
      state: parsed,
      savedAt: Number(parsed._savedAt || 0),
      score: stateScore(parsed),
      mtimeMs: stat.mtimeMs || 0
    };
  } catch {
    return null;
  }
}

function chooseBestCandidate(candidates) {
  const valid = candidates.filter(Boolean);
  if (!valid.length) return null;

  valid.sort((a, b) => {
    if (a.savedAt || b.savedAt) return b.savedAt - a.savedAt;
    if (a.score !== b.score) return b.score - a.score;
    return b.mtimeMs - a.mtimeMs;
  });

  return valid[0];
}

async function writeStateToPath(filePath, state) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  await fsp.rename(tempPath, filePath);
}

async function writeStateEverywhere(state) {
  const nextState = { ...state, _savedAt: Date.now() };
  const results = await Promise.allSettled(candidateDataPaths().map(filePath => writeStateToPath(filePath, nextState)));
  const success = results.some(result => result.status === 'fulfilled');

  if (!success) {
    const message = results.map(result => result.reason?.message || 'unknown error').join('; ');
    throw new Error(message || 'Unable to save data');
  }

  return nextState;
}

function writeStateToPathSync(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function writeStateEverywhereSync(state) {
  const nextState = { ...state, _savedAt: Date.now() };
  const errors = [];
  let success = false;

  for (const filePath of candidateDataPaths()) {
    try {
      writeStateToPathSync(filePath, nextState);
      success = true;
    } catch (error) {
      errors.push(error);
    }
  }

  if (!success) {
    throw new Error(errors.map(error => error.message).join('; ') || 'Unable to save data');
  }

  return nextState;
}

async function loadBestState() {
  const candidates = await Promise.all(candidateDataPaths().map(readStateCandidate));
  const best = chooseBestCandidate(candidates);
  if (!best) return null;

  try {
    await writeStateEverywhere(best.state);
  } catch (error) {
    console.error('Failed to self-heal data copies:', error);
  }

  return best.state;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#f6f4ef',
    title: '灵感管理',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('store:load', async () => {
  try {
    return await loadBestState();
  } catch (error) {
    console.error('Failed to load data:', error);
    return null;
  }
});

ipcMain.handle('store:save', async (_event, state) => {
  try {
    await writeStateEverywhere(state);
    return { ok: true, path: portableDataFilePath(), backupPath: userDataBackupFilePath() };
  } catch (error) {
    console.error('Failed to save data:', error);
    return { ok: false, message: error.message, path: portableDataFilePath(), backupPath: userDataBackupFilePath() };
  }
});

ipcMain.on('store:save-sync', (event, state) => {
  try {
    writeStateEverywhereSync(state);
    event.returnValue = { ok: true, path: portableDataFilePath(), backupPath: userDataBackupFilePath() };
  } catch (error) {
    console.error('Failed to save data synchronously:', error);
    event.returnValue = { ok: false, message: error.message, path: portableDataFilePath(), backupPath: userDataBackupFilePath() };
  }
});

ipcMain.handle('store:path', async () => ({
  primary: portableDataFilePath(),
  backup: userDataBackupFilePath()
}));
