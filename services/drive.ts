import { BookData } from "../types";

// Global types for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// SCOPES updated for App Data Folder access
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILENAME = 'folio_backup.json';

let tokenClient: any;
let gapiInited = false;
let gapiInitPromise: Promise<boolean> | null = null;

// Helper to wait for scripts to load
const waitForGoogleScripts = async () => {
    let attempts = 0;
    while ((!window.gapi || !window.google) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    if (!window.gapi || !window.google) throw new Error("Google scripts failed to load. Please refresh.");
};

// Initialize the Google API Client (for Drive calls) - Singleton Pattern
export const initGapiClient = () => {
  if (gapiInited) return Promise.resolve(true);
  
  if (gapiInitPromise) return gapiInitPromise;

  gapiInitPromise = (async () => {
      try {
          await waitForGoogleScripts();
          await new Promise<void>((resolve, reject) => {
            window.gapi.load('client', {
              callback: resolve,
              onerror: reject,
            });
          });

          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });

          gapiInited = true;
          return true;
      } catch (e) {
          gapiInitPromise = null; // Reset on failure so we can try again
          throw e;
      }
  })();
  
  return gapiInitPromise;
};

// Initialize the Google Identity Services Client (for Auth)
export const initTokenClient = async (clientId: string, callback: (response: any) => void) => {
  await waitForGoogleScripts();

  if (!clientId || !clientId.trim()) {
      throw new Error("Client ID is missing");
  }

  // Create client with callback
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId.trim(),
    scope: SCOPES,
    callback: async (resp: any) => {
      if (resp.error !== undefined) {
        throw resp;
      }
      callback(resp);
    },
  });
  
  return true;
};

// Trigger the login flow
export const requestAccessToken = () => {
  if (!tokenClient) throw new Error("Token client not initialized. Check Client ID.");
  tokenClient.requestAccessToken({ prompt: 'consent' });
};

// Sign out (revoke token)
export const signOut = () => {
  if (window.gapi && window.gapi.client) {
      const token = window.gapi.client.getToken();
      if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          window.gapi.client.setToken('');
        });
      }
  }
};

export const getUserProfile = async () => {
  // Ensure GAPI is ready before making requests
  if (!gapiInited) await initGapiClient();
  
  try {
      const token = window.gapi.client.getToken();
      if (!token) return null;
      
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
             'Authorization': `Bearer ${token.access_token}`
          }
      });
      if (response.ok) return await response.json();
  } catch (e) {
      console.warn("Error fetching profile", e);
  }
  return null;
};

// Check if backup exists without downloading content
export const checkForBackup = async (): Promise<boolean> => {
    if (!gapiInited) await initGapiClient();
    
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'appDataFolder',
        });
        return response.result.files && response.result.files.length > 0;
    } catch (e) {
        console.error("Check backup failed", e);
        return false;
    }
}

// Backup: Find existing file in App Data Folder, update it, or create new one
export const backupToDrive = async (data: BookData[]) => {
  if (!gapiInited) await initGapiClient();

  const fileContent = JSON.stringify(data);
  const fileMetadata = {
    name: BACKUP_FILENAME,
    mimeType: 'application/json',
    parents: ['appDataFolder'] // Save to App Data Folder
  };

  // 1. Search for existing file in App Data Folder
  const response = await window.gapi.client.drive.files.list({
    q: `name = '${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'appDataFolder', // Search in App Data Folder
  });

  const files = response.result.files;

  if (files && files.length > 0) {
    // 2. Update existing file
    const fileId = files[0].id;
    // For update, we use the upload endpoint pattern
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    const metadata = new Blob([JSON.stringify({ mimeType: 'application/json' })], { type: 'application/json' });
    const content = new Blob([fileContent], { type: 'application/json' });
    
    const formData = new FormData();
    formData.append('metadata', metadata);
    formData.append('file', content);

    await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
      },
      body: formData,
    });
    
  } else {
    // 3. Create new file
    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const metadata = new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' });
    const content = new Blob([fileContent], { type: 'application/json' });
    
    const formData = new FormData();
    formData.append('metadata', metadata);
    formData.append('file', content);

    await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
      },
      body: formData,
    });
  }
};

// Restore: Find file in App Data Folder, download content
export const restoreFromDrive = async (): Promise<BookData[]> => {
  if (!gapiInited) await initGapiClient();

  // 1. Search for file in App Data Folder
  const response = await window.gapi.client.drive.files.list({
    q: `name = '${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'appDataFolder',
  });

  const files = response.result.files;
  if (!files || files.length === 0) {
    throw new Error("No backup found in Folio App Data");
  }

  const fileId = files[0].id;

  // 2. Get file content
  const result = await window.gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });

  const rawData = result.body || result.result;
  return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
};