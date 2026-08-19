const PREFERENCES_KEY = "soundscape:preferences:v1";
const DATABASE_NAME = "soundscape-local-audio";
const DATABASE_VERSION = 1;
const LAYER_STORE = "layers";

export function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePreferences(preferences) {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export async function listStoredAudioLayers() {
  const database = await openDatabase();
  return runRequest(database, "readonly", (store) => store.getAll());
}

export async function putStoredAudioLayer(record) {
  const database = await openDatabase();
  await runRequest(database, "readwrite", (store) => store.put(record));
}

export async function deleteStoredAudioLayer(id) {
  const database = await openDatabase();
  await runRequest(database, "readwrite", (store) => store.delete(id));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LAYER_STORE)) {
        const store = database.createObjectStore(LAYER_STORE, { keyPath: "id" });
        store.createIndex("sceneId", "sceneId", { unique: false });
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function runRequest(database, mode, makeRequest) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LAYER_STORE, mode);
    const request = makeRequest(transaction.objectStore(LAYER_STORE));
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
  });
}
