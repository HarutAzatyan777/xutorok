import * as fs from 'node:fs';
import * as path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { transformXutorokMenuData } from '../src/features/menu/services/menuImportTransformer';

/**
 * Deterministic, idempotent CLI importer for the Xutorok Digital Menu.
 *
 * Usage:
 *   npm run import:menu                  # Dry-run mode (validates and prints summary without writing)
 *   npm run import:menu -- --execute     # Writes to Firestore (requires authorized admin credentials or emulator)
 *   npm run import:menu -- --execute --overwrite  # Explicitly overwrite existing xutorok items
 */
async function main() {
  const args = new Set(process.argv.slice(2));
  const isExecute = args.has('--execute');
  const overwrite = args.has('--overwrite');
  const useEmulator = args.has('--emulator') || process.env.VITE_USE_FIREBASE_EMULATOR === 'true';

  const dataPath = path.resolve(process.cwd(), 'data/Xutorok_menu_HY_RU_EN.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`[Import] Source menu JSON not found at: ${dataPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(dataPath, 'utf-8');
  const rawItems = JSON.parse(rawContent) as unknown[];

  console.log('==========================================================');
  console.log(' XUTOROK DIGITAL MENU — MULTILINGUAL DATA IMPORT TOOL');
  console.log('==========================================================');
  console.log(`Source file      : ${dataPath}`);
  console.log(`Target tenant    : restaurantId = "xutorok"`);
  console.log(`Execution mode   : ${isExecute ? 'LIVE WRITE (--execute)' : 'DRY-RUN (no database writes)'}`);
  console.log(`Overwrite policy : ${overwrite ? 'OVERWRITE ENABLED (--overwrite)' : 'SAFE SKIP EXISTING'}`);
  console.log('----------------------------------------------------------');

  const result = transformXutorokMenuData(rawItems, 'xutorok');

  console.log(`Raw rows inspected     : ${rawItems.length}`);
  console.log(`Categories extracted   : ${result.categories.length}`);
  console.log(`Valid products ready   : ${result.products.length}`);
  console.log(`Dual-price w/ variants : ${result.products.filter((p) => p.variants && p.variants.length > 0).length}`);
  console.log(`Duplicates skipped     : ${result.duplicatesSkipped.length}`);
  console.log(`Validation errors      : ${result.validationIssues.length}`);

  if (result.duplicatesSkipped.length > 0) {
    console.log('\nDuplicates detected & skipped:');
    for (const dup of result.duplicatesSkipped) {
      console.log(`  - Row #${dup.id}: [${dup.categoryHy}] ${dup.nameHy}`);
    }
  }

  if (result.validationIssues.length > 0) {
    console.error('\nValidation errors encountered:');
    for (const issue of result.validationIssues) {
      console.error(`  - Index ${issue.index} (id=${String(issue.rawId)}): ${issue.reason}`);
    }
    process.exit(1);
  }

  console.log('\nSample Categories (first 5):');
  for (const cat of result.categories.slice(0, 5)) {
    console.log(
      `  - ${cat.id.padEnd(22)} | HY: ${cat.name.hy} | RU: ${cat.name.ru} | EN: ${cat.name.en}`
    );
  }

  console.log('\nSample Products (first 5):');
  for (const prod of result.products.slice(0, 5)) {
    const variantSummary = prod.variants
      ? ` [Variants: ${prod.variants.map((v) => `${v.label.en}=${v.price}`).join(', ')}]`
      : '';
    console.log(
      `  - ${prod.id} (${prod.categoryId}): ${prod.name.hy} / ${prod.name.ru} / ${prod.name.en} — ${prod.price} AMD${variantSummary}`
    );
  }

  if (!isExecute) {
    console.log('\n[Dry-Run Complete] All 3 languages, prices, categories, and variants validated.');
    console.log('To write to Firestore, run: npm run import:menu -- --execute');
    process.exit(0);
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCurKxOt2Vyc6PMRxvsOXBhxi6Z23NQ990',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-twin-conflicts.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-twin-conflicts',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-twin-conflicts.firebasestorage.app',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '562120240186',
    appId: process.env.VITE_FIREBASE_APP_ID || '1:562120240186:web:3204dac37761415337d903',
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (useEmulator) {
    console.log('\nConnecting to local Firebase Emulators (Auth :9099, Firestore :8080)...');
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log(`Authenticating as ${adminEmail}...`);
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  }

  const existingCatIds = new Set<string>();
  const existingProdIds = new Set<string>();

  if (!overwrite) {
    const [catSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, 'restaurants/xutorok/categories')),
      getDocs(collection(db, 'restaurants/xutorok/products')),
    ]);
    catSnap.forEach((d) => existingCatIds.add(d.id));
    prodSnap.forEach((d) => existingProdIds.add(d.id));
  }

  const catsToWrite = result.categories.filter((c) => overwrite || !existingCatIds.has(c.id));
  const prodsToWrite = result.products.filter((p) => overwrite || !existingProdIds.has(p.id));

  console.log(`\nWriting ${catsToWrite.length} categories and ${prodsToWrite.length} products to restaurants/xutorok...`);

  let batch = writeBatch(db);
  let count = 0;

  const commitIfNeeded = async (force = false) => {
    if (count >= 400 || (force && count > 0)) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  batch.set(
    doc(db, 'restaurants/xutorok'),
    {
      id: 'xutorok',
      restaurantId: 'xutorok',
      slug: 'xutorok',
      status: 'active',
      name: { hy: 'Խուտոռոկ', ru: 'Хуторок', en: 'Xutorok' },
      defaultLanguage: 'hy',
      supportedLanguages: ['hy', 'ru', 'en'],
      currency: 'AMD',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  count++;

  for (const cat of catsToWrite) {
    batch.set(doc(db, `restaurants/xutorok/categories/${cat.id}`), {
      ...cat,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count++;
    await commitIfNeeded();
  }

  for (const prod of prodsToWrite) {
    batch.set(doc(db, `restaurants/xutorok/products/${prod.id}`), {
      ...prod,
      variants: prod.variants ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count++;
    await commitIfNeeded();
  }

  await commitIfNeeded(true);
  console.log('[Import Complete] Successfully imported Xutorok menu data.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Import Failed]', err);
  process.exit(1);
});

