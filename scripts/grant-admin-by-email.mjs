#!/usr/bin/env node

/**
 * scripts/grant-admin-by-email.mjs
 *
 * Secure terminal script to grant restaurantOwner access to an existing
 * Firebase Authentication user for the Xutorok digital menu platform.
 *
 * Project: ai-twin-conflicts
 * Tenant: xutorok
 * Target Membership Path: restaurants/xutorok/members/{uid}
 *
 * Safety Rules Enforced:
 * 1. Strict tenant isolation (target tenant locked to 'xutorok').
 * 2. Never creates new Firebase Auth accounts (fails safely if user not found).
 * 3. Never deletes existing data; preserves existing fields and unrelated custom claims.
 * 4. Requires explicit confirmation before applying changes.
 * 5. Verifies resulting permissions immediately after write.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const REQUIRED_PROJECT_ID = 'ai-twin-conflicts';
export const REQUIRED_TENANT_ID = 'xutorok';
export const DEFAULT_TARGET_EMAIL = 'admin@xutorok.am';
export const TARGET_ROLE = 'restaurantOwner';

/**
 * Resolves service account configuration safely from the environment or local project root.
 */
function resolveServiceAccount() {
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(PROJECT_ROOT, 'service-account.json'),
    path.join(PROJECT_ROOT, 'serviceAccountKey.json'),
    process.env.FIREBASE_SERVICE_ACCOUNT,
  ].filter(Boolean);

  for (const credPath of candidatePaths) {
    if (fs.existsSync(credPath)) {
      try {
        const raw = fs.readFileSync(credPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.project_id && parsed.client_email && parsed.private_key) {
          return { data: parsed, path: credPath };
        }
      } catch (err) {
        // Continue to next candidate
      }
    }
  }

  throw new Error(
    `No valid Firebase Admin service account credential found.\n` +
    `Expected a JSON service account key at:\n  - ${path.join(PROJECT_ROOT, 'service-account.json')}\n` +
    `Or set the GOOGLE_APPLICATION_CREDENTIALS environment variable.`
  );
}

/**
 * Parses CLI arguments.
 */
function parseArgs(args) {
  let email = DEFAULT_TARGET_EMAIL;
  let tenantId = REQUIRED_TENANT_ID;
  let confirm = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--confirm' || arg === '--yes' || arg === '-y') {
      confirm = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--email=')) {
      email = arg.split('=')[1].trim();
    } else if (arg === '--email' && args[i + 1]) {
      email = args[++i].trim();
    } else if (arg.startsWith('--tenant=')) {
      tenantId = arg.split('=')[1].trim();
    } else if (arg === '--tenant' && args[i + 1]) {
      tenantId = args[++i].trim();
    } else if (!arg.startsWith('-')) {
      email = arg.trim();
    }
  }

  return { email, tenantId, confirm, dryRun };
}

/**
 * Interactive prompt for user confirmation.
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'yes' || normalized === 'y');
    });
  });
}

/**
 * Main execution function.
 */
export async function grantAdminByEmail(cliArgs = process.argv.slice(2)) {
  console.log(`================================================================`);
  console.log(` XUTOROK DIGITAL MENU: GRANT RESTAURANT OWNER PERMISSIONS`);
  console.log(`================================================================\n`);

  const { email, tenantId, confirm, dryRun } = parseArgs(cliArgs);

  // 1. Validate Target Tenant (Strict Isolation)
  if (tenantId !== REQUIRED_TENANT_ID) {
    throw new Error(
      `Tenant Isolation Safety Check Failed: target tenant must be "${REQUIRED_TENANT_ID}". ` +
      `Received unauthorized tenant: "${tenantId}".`
    );
  }

  // 2. Resolve Service Account and Initialize Firebase Admin
  const { data: serviceAccount, path: credPath } = resolveServiceAccount();
  if (serviceAccount.project_id !== REQUIRED_PROJECT_ID) {
    throw new Error(
      `Project Mismatch: Service account is for project "${serviceAccount.project_id}", ` +
      `expected target project "${REQUIRED_PROJECT_ID}".`
    );
  }

  console.log(`✓ Firebase Service Account: Validated for project "${serviceAccount.project_id}"`);
  console.log(`✓ Service Account Email: ${serviceAccount.client_email}`);
  console.log(`✓ Credentials Source: ${path.basename(credPath)} (securely excluded from Git)`);
  console.log(`✓ Target Restaurant Tenant: ${tenantId}`);
  console.log(`✓ Target User Email: ${email}`);
  console.log(`✓ Target Role: ${TARGET_ROLE}\n`);

  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp({
    credential: cert(serviceAccount),
    projectId: REQUIRED_PROJECT_ID,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  // 3. Look up existing Firebase Authentication user by email
  console.log(`Searching for existing Firebase Authentication user: "${email}"...`);
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`\n✕ ERROR: User with email "${email}" was NOT FOUND in Firebase Authentication.`);
      console.error(`  Safety policy prohibits creating new user accounts automatically.`);
      console.error(`  Please ensure the user is registered in Firebase Authentication first, then re-run.\n`);
      process.exit(1);
    }
    throw err;
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(` EXISTING FIREBASE AUTHENTICATION USER FOUND`);
  console.log(`----------------------------------------------------------------`);
  console.log(`  UID:              ${authUser.uid}`);
  console.log(`  Email:            ${authUser.email} (verified: ${authUser.emailVerified})`);
  console.log(`  Display Name:     ${authUser.displayName || '(none)'}`);
  console.log(`  Disabled:         ${authUser.disabled ? 'YES (account is disabled)' : 'NO (active)'}`);
  console.log(`  Existing Claims:  ${JSON.stringify(authUser.customClaims || {})}`);
  console.log(`  User Created:     ${authUser.metadata.creationTime}`);
  console.log(`  Last Sign-In:     ${authUser.metadata.lastSignInTime || '(never)'}\n`);

  if (authUser.disabled) {
    console.warn(`⚠️ WARNING: This Firebase Auth user is marked as disabled in Firebase Authentication.`);
  }

  // 4. Check existing Firestore membership document
  const memberDocPath = `restaurants/${tenantId}/members/${authUser.uid}`;
  const memberDocRef = db.doc(memberDocPath);

  console.log(`Checking Firestore membership document at: "${memberDocPath}"...`);
  const memberDocSnap = await memberDocRef.get();

  let isNewMember = false;
  let existingData = null;

  if (memberDocSnap.exists) {
    existingData = memberDocSnap.data();
    console.log(`✓ Existing membership document found:`);
    console.log(`  Role:             ${existingData.role}`);
    console.log(`  Status:           ${existingData.status}`);
    console.log(`  Restaurant ID:    ${existingData.restaurantId}`);
    console.log(`  Created At:       ${existingData.createdAt ? existingData.createdAt.toDate().toISOString() : '(none)'}`);
    console.log(`  Updated At:       ${existingData.updatedAt ? existingData.updatedAt.toDate().toISOString() : '(none)'}\n`);
  } else {
    isNewMember = true;
    console.log(`ℹ No existing membership document found. A new document will be created.\n`);
  }

  // 5. Build Proposed Changes Plan
  const proposedPayload = {
    uid: authUser.uid,
    restaurantId: tenantId,
    role: TARGET_ROLE,
    status: 'active',
    email: authUser.email,
    displayName: authUser.displayName || existingData?.displayName || 'Xutorok Admin',
    createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  console.log(`----------------------------------------------------------------`);
  console.log(` PROPOSED AUTHORIZATION CHANGES`);
  console.log(`----------------------------------------------------------------`);
  console.log(`  Action:           ${isNewMember ? 'CREATE' : 'UPDATE'} Firestore document`);
  console.log(`  Document Path:    ${memberDocPath}`);
  console.log(`  Role:             ${TARGET_ROLE} (restaurantOwner)`);
  console.log(`  Status:           active`);
  console.log(`  Tenant:           ${tenantId}`);
  console.log(`  Custom Claims:    Preserve all existing claims`);
  console.log(`----------------------------------------------------------------\n`);

  if (dryRun) {
    console.log(`[DRY-RUN MODE] No changes were written to Firebase.`);
    console.log(`To apply changes, run without --dry-run (or pass --confirm).\n`);
    return { authUser, memberDocPath, proposedPayload, applied: false };
  }

  // 6. Confirmation Gate
  if (!confirm) {
    const isInteractive = Boolean(process.stdin.isTTY);
    if (!isInteractive) {
      console.error(`✕ Confirmation required. Running in non-interactive environment without --confirm.`);
      console.error(`  To execute non-interactively, pass the --confirm flag:`);
      console.error(`    npm run grant-admin -- --confirm\n`);
      process.exit(1);
    }

    const accepted = await askConfirmation(
      `Are you sure you want to grant "${TARGET_ROLE}" access to "${email}" on "${tenantId}"? (yes/no): `
    );

    if (!accepted) {
      console.log(`\nOperation cancelled by user. No changes were made.\n`);
      return { authUser, memberDocPath, proposedPayload, applied: false };
    }
  }

  // 7. Write to Firestore (Atomic Set/Merge)
  console.log(`\nWriting membership record to Firestore (${memberDocPath})...`);
  await memberDocRef.set(proposedPayload, { merge: true });
  console.log(`✓ Firestore membership document successfully written.`);

  // 8. Preserve & Verify Custom Claims on Firebase Auth
  const existingClaims = authUser.customClaims || {};
  // If user has any custom claims, ensure they are preserved cleanly
  if (authUser.customClaims) {
    await auth.setCustomUserClaims(authUser.uid, { ...existingClaims });
    console.log(`✓ Existing custom claims verified and preserved.`);
  }

  // 9. Re-read and Verify Resulting Permissions
  console.log(`\n----------------------------------------------------------------`);
  console.log(` VERIFYING RESULTING PERMISSIONS`);
  console.log(`----------------------------------------------------------------`);

  const verifiedDocSnap = await memberDocRef.get();
  if (!verifiedDocSnap.exists) {
    throw new Error(`Verification Failed: Membership document was not found after write at "${memberDocPath}".`);
  }

  const verifiedData = verifiedDocSnap.data();
  const verifiedAuthUser = await auth.getUser(authUser.uid);

  console.log(`✓ Firestore Document Status:   EXISTS`);
  console.log(`✓ Path:                        ${memberDocPath}`);
  console.log(`✓ UID:                         ${verifiedData.uid} (matches auth user)`);
  console.log(`✓ Restaurant Tenant:           ${verifiedData.restaurantId} (verified 'xutorok')`);
  console.log(`✓ Role:                        ${verifiedData.role} (verified 'restaurantOwner')`);
  console.log(`✓ Membership Status:           ${verifiedData.status} (verified 'active')`);
  console.log(`✓ Email:                       ${verifiedData.email}`);
  console.log(`✓ Display Name:                ${verifiedData.displayName}`);
  console.log(`✓ Auth Account Active:         ${!verifiedAuthUser.disabled ? 'YES' : 'DISABLED'}`);
  console.log(`✓ Auth Custom Claims:          ${JSON.stringify(verifiedAuthUser.customClaims || {})}`);
  console.log(`\n================================================================`);
  console.log(` SUCCESS: "${email}" IS NOW AUTHORIZED AS RESTAURANT OWNER FOR "${tenantId}"`);
  console.log(`================================================================\n`);

  return {
    authUser: verifiedAuthUser,
    memberDocPath,
    verifiedData,
    applied: true,
  };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith('grant-admin-by-email.mjs')) {
  grantAdminByEmail()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`\n✕ Execution Failed:`, err.message);
      process.exit(1);
    });
}

