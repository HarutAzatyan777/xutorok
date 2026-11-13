import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { appConfig } from './app';

// Firebase Web SDK configuration is loaded from environment variables (.env.local)
// for maintainability across environments. Note: VITE_* values are embedded into the
// client bundle at build time and are publicly visible in the browser by design;
// security is enforced by Firestore/Storage Security Rules and GCP API key restrictions.
const isTestOrEmulator =
  import.meta.env.MODE === 'test' || appConfig.useFirebaseEmulator;

export interface FirebaseConfigValidationResult {
  isValid: boolean;
  missingVariables: string[];
}

/**
 * Validates that essential Firebase environment variables are provided and not placeholders.
 * Returns missing variable names for development-time diagnostics.
 */
export function validateFirebaseConfig(env: Record<string, unknown> = import.meta.env): FirebaseConfigValidationResult {
  const missingVariables: string[] = [];

  const rawApiKey = typeof env.VITE_FIREBASE_API_KEY === 'string' ? env.VITE_FIREBASE_API_KEY.trim() : '';
  const isApiKeyMissingOrPlaceholder =
    !rawApiKey ||
    rawApiKey === 'your_api_key_here' ||
    rawApiKey === 'your_firebase_api_key_here' ||
    rawApiKey.startsWith('your_');

  if (isApiKeyMissingOrPlaceholder) {
    missingVariables.push('VITE_FIREBASE_API_KEY');
  }

  const rawProjectId = typeof env.VITE_FIREBASE_PROJECT_ID === 'string' ? env.VITE_FIREBASE_PROJECT_ID.trim() : '';
  if (rawProjectId && (rawProjectId === 'your_project_id' || rawProjectId.startsWith('your_'))) {
    missingVariables.push('VITE_FIREBASE_PROJECT_ID');
  }

  const rawAppId = typeof env.VITE_FIREBASE_APP_ID === 'string' ? env.VITE_FIREBASE_APP_ID.trim() : '';
  if (rawAppId && (rawAppId === 'your_app_id' || rawAppId === 'your_web_app_id' || rawAppId.startsWith('your_'))) {
    missingVariables.push('VITE_FIREBASE_APP_ID');
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}

const validation = validateFirebaseConfig();

if (!isTestOrEmulator && !validation.isValid) {
  const missingList = validation.missingVariables.join(', ');
  const banner =
    `\n================================================================================\n` +
    `[Firebase Configuration Error]\n` +
    `Missing or unconfigured environment variable(s): ${missingList}\n\n` +
    `Firebase cannot be initialized without a valid API key and project credentials.\n` +
    `To resolve this issue:\n` +
    `  1. Copy the environment template file:\n` +
    `     cp .env.example .env.local\n` +
    `  2. Set your Firebase Web App credentials in .env.local:\n` +
    `     VITE_FIREBASE_API_KEY=AIzaSy...\n` +
    `     VITE_RESTAURANT_ID=xutorok\n` +
    `  3. Restart your Vite development server:\n` +
    `     npm run dev\n\n` +
    `Refer to README.md for complete setup instructions.\n` +
    `Note: Never commit .env.local or service account keys to Git.\n` +
    `================================================================================\n`;

  console.error(banner);

  if (typeof document !== 'undefined') {
    const renderMissingEnvUI = () => {
      const container = document.getElementById('root') || document.body;
      if (!container) return;
      container.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; box-sizing: border-box;">
          <div style="max-width: 580px; width: 100%; background: #1e293b; border: 1px solid #ef4444; border-radius: 12px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="background: rgba(239, 68, 68, 0.2); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 22px; font-weight: bold;">✕</div>
              <div>
                <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #f8fafc;">Firebase Configuration Required</h2>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Environment variables missing in .env.local</div>
              </div>
            </div>
            <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
              The application cannot connect to Firebase because the required configuration variables are not set in your local environment.
            </p>
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
              <div style="color: #ef4444; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Missing / Invalid Variables</div>
              <ul style="margin: 0; padding-left: 20px; color: #fca5a5; font-family: monospace; font-size: 13px;">
                ${validation.missingVariables.map((v) => `<li>${v}</li>`).join('')}
              </ul>
            </div>
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
              <div style="color: #38bdf8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">How to Fix (Quick Setup)</div>
              <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.7;">
                <li>Create local config: <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #34d399; font-family: monospace;">cp .env.example .env.local</code></li>
                <li>Add your Firebase Web App credentials to <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #34d399; font-family: monospace;">.env.local</code></li>
                <li>Restart development server: <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #34d399; font-family: monospace;">npm run dev</code></li>
              </ol>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4;">
              See <code>README.md</code> for details. Credentials in <code>.env.local</code> are gitignored and will never be committed.
            </p>
          </div>
        </div>
      `;
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', renderMissingEnvUI);
    } else {
      renderMissingEnvUI();
    }
  }

  throw new Error(
    `[Firebase Configuration Error] Missing required Firebase configuration: ${missingList}. ` +
    `Please copy .env.example to .env.local and configure your credentials. See README.md for instructions.`
  );
}

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (isTestOrEmulator ? 'demo-test-api-key' : ''),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-twin-conflicts.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ai-twin-conflicts',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-twin-conflicts.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '562120240186',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:562120240186:web:3204dac37761415337d903',
};

const isNewApp = getApps().length === 0;
const app: FirebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

if (appConfig.useFirebaseEmulator && isNewApp) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export { app, auth, db, storage, firebaseConfig };
