# Xutorok Digital Menu Platform (`xutorok`)

A multi-restaurant, mobile-first digital menu and content management system built with **React 19**, **Vite 8**, **TypeScript (strict mode)**, **Tailwind CSS v4**, **React Router**, **React Hook Form + Zod**, **i18next (HY / RU / EN)**, and **Firebase (Auth, Firestore, Storage, Hosting)**.

---

## 1. Multi-Restaurant Tenant Architecture

This application is architected as a reusable multi-restaurant platform sharing the `ai-twin-conflicts` Firebase project without mixing data between restaurants or unrelated applications.

- Active restaurant identifier is configured via `VITE_RESTAURANT_ID=xutorok` in [`src/config/app.ts`](src/config/app.ts).
- All Firestore queries and writes are strictly scoped through [`src/lib/firebase/paths.ts`](src/lib/firebase/paths.ts):
  - `restaurants/{restaurantId}`
  - `restaurants/{restaurantId}/categories/{categoryId}`
  - `restaurants/{restaurantId}/products/{productId}`
  - `restaurants/{restaurantId}/members/{uid}`
  - `restaurants/{restaurantId}/settings/{settingId}` (`general`, `menu`, `branding`)
- All Firebase Storage uploads are scoped under:
  - `restaurants/{restaurantId}/products/{fileName}`
  - `restaurants/{restaurantId}/categories/{fileName}`
  - `restaurants/{restaurantId}/branding/{fileName}`

To onboard a new restaurant application in the future, set `VITE_RESTAURANT_ID=<new-restaurant-slug>` and configure a dedicated Firebase Hosting target.

---

## 2. Local Setup & Development

When cloning or pulling the project on a new computer, follow these setup steps:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy `.env.example` to `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure Firebase environment variables:**
   Open `.env.local` and set the required Firebase Web App credentials for the `ai-twin-conflicts` project:
   ```env
   # Restaurant Tenant Configuration
   VITE_RESTAURANT_ID=xutorok

   # Firebase Client Configuration (Web App: ai-twin-conflicts)
   VITE_FIREBASE_API_KEY=AIzaSyCurKxOt2Vyc6PMRxvsOXBhxi6Z23NQ990
   VITE_FIREBASE_AUTH_DOMAIN=ai-twin-conflicts.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ai-twin-conflicts
   VITE_FIREBASE_STORAGE_BUCKET=ai-twin-conflicts.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=562120240186
   VITE_FIREBASE_APP_ID=1:562120240186:web:3204dac37761415337d903

   # Optional Emulator Flag (set to "true" when using local Firebase Emulators)
   VITE_USE_FIREBASE_EMULATOR=false
   ```
   > [!IMPORTANT]
   > Never commit `.env.local`, `.env`, or `*service-account*.json` files to Git. They are strictly excluded by `.gitignore`. Missing `.env.local` will trigger validation warnings or prevent Firebase initialization.

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Quality & Verification Commands:**
   ```bash
   npm run lint          # ESLint check
   npm run build         # TypeScript strict check + Vite production bundle
   npm run test          # Run unit & data transformation tests
   npm run test:rules    # Run Firestore Emulator security rules tests (when emulator is running on :8080)
   ```

### Troubleshooting

- **`FirebaseError: Firebase: Error (auth/invalid-api-key)`**:
  Indicates that `VITE_FIREBASE_API_KEY` is missing or contains an unconfigured placeholder in `.env.local`. Create `.env.local` from `.env.example` and provide the valid API key.
- **`VITE_RESTAURANT_ID is not set in environment variables, falling back to "xutorok"`**:
  Ensure `VITE_RESTAURANT_ID=xutorok` is specified in `.env.local`.

---

## 3. Multilingual Menu Data Audit (`Xutorok`)

The trilingual Xutorok menu dataset (`29 categories`, `297 products`, including `39 multi-price variant items`) is stored in `menu/Xutorok_menu_HY_RU_EN.json` and `menu/Xutorok_menu_HY_RU_EN.csv` and has been migrated to Cloud Firestore (`restaurants/xutorok`). All menu categories and products are managed live through the Admin Panel (`/admin`).

- **Dry-run audit validation (no database writes):**
  ```bash
  npm run menu:migrate:dry-run
  ```

---

## 4. Administrator Authentication & Authorization Setup

Public visitors can browse `/` and `/menu` without signing in. Only authorized administrators can access `/admin/*`.

To provision an administrator for `xutorok`:
1. In **Firebase Console → Authentication**, enable the **Email/Password** provider and create an administrator user (copy their `uid`).
2. In **Firebase Console → Firestore Database**, create the membership document at:
   `restaurants/xutorok/members/{uid}`
   ```json
   {
     "uid": "<FIREBASE_AUTH_UID>",
     "restaurantId": "xutorok",
     "role": "restaurantOwner",
     "status": "active",
     "email": "admin@xutorok.am"
   }
   ```

---

## 5. Deploying Security Rules & Multi-Site Hosting Safely

The `firestore.rules` file preserves existing rules on `ai-twin-conflicts` (`/arena_matches/{matchId}` and `/users/{userId}`) alongside the `/restaurants/{restaurantId}` and `/platformAdmins/{uid}` rules.

1. **Deploy merged Firestore & Storage rules and indexes (after review):**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage --project ai-twin-conflicts
   ```

2. **Create and deploy to a dedicated Hosting site for Xutorok (never overwrite default site):**
   ```bash
   firebase hosting:sites:create xutorok-menu --project ai-twin-conflicts
   firebase target:apply hosting xutorok xutorok-menu --project ai-twin-conflicts
   npm run build
   firebase deploy --only hosting:xutorok --project ai-twin-conflicts
   ```
