import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Firestore & Storage Security Rules Static & Policy Verification', () => {
  const firestoreRules = fs.readFileSync(
    path.resolve(process.cwd(), 'firestore.rules'),
    'utf-8'
  );
  const storageRules = fs.readFileSync(
    path.resolve(process.cwd(), 'storage.rules'),
    'utf-8'
  );

  it('scopes all restaurant collections under /restaurants/{restaurantId}', () => {
    expect(firestoreRules).toContain('match /restaurants/{restaurantId}');
    expect(firestoreRules).toContain('match /categories/{categoryId}');
    expect(firestoreRules).toContain('match /products/{productId}');
    expect(firestoreRules).toContain('match /settings/{settingId}');
    expect(firestoreRules).toContain('match /members/{memberUid}');
  });

  it('enforces public read only on visible categories and products, and blocks public writes', () => {
    expect(firestoreRules).toContain('resource.data.isVisible == true');
    expect(firestoreRules).toContain('allow create: if isRestaurantAdmin(restaurantId)');
    expect(firestoreRules).toContain('allow update: if isRestaurantAdmin(restaurantId)');
    expect(firestoreRules).toContain('allow delete: if isRestaurantAdmin(restaurantId)');
  });

  it('protects private administrative memberships and prevents self-escalation', () => {
    expect(firestoreRules).toContain('isRestaurantOwner(restaurantId) && request.auth.uid != memberUid');
    expect(firestoreRules).toContain("data.role in ['restaurantOwner', 'restaurantManager']");
    expect(firestoreRules).toContain("data.status in ['active', 'disabled']");
  });

  it('preserves existing shared project collections (/arena_matches and /users)', () => {
    expect(firestoreRules).toContain('match /arena_matches/{matchId}');
    expect(firestoreRules).toContain('match /messages/{messageId}');
    expect(firestoreRules).toContain('match /users/{userId}');
  });

  it('enforces Storage tenant isolation, 5MB limit, and image MIME type checks', () => {
    expect(storageRules).toContain('match /restaurants/{restaurantId}/{folder}/{allPaths=**}');
    expect(storageRules).toContain("folder in ['products', 'categories', 'branding']");
    expect(storageRules).toContain('request.resource.size <= 5 * 1024 * 1024');
    expect(storageRules).toContain("request.resource.contentType.matches('image/(jpeg|png|webp|avif|svg\\\\+xml)')");
  });
});

