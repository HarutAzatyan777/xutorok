import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

function checkEmulatorPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

const emulatorAvailable = await checkEmulatorPort('127.0.0.1', 8080);

describe.skipIf(!emulatorAvailable)(
  'Firestore Security Rules — Multi-Restaurant Tenant Isolation (Emulator)',
  () => {
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
      const rules = fs.readFileSync(
        path.resolve(process.cwd(), 'firestore.rules'),
        'utf-8'
      );
      testEnv = await initializeTestEnvironment({
        projectId: 'demo-xutorok-test',
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules,
        },
      });
    });

    beforeEach(async () => {
      await testEnv.clearFirestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        // Seed active membership for xutorokAdmin on restaurant "xutorok"
        await setDoc(doc(adminDb, 'restaurants/xutorok/members/xutorokAdmin'), {
          uid: 'xutorokAdmin',
          restaurantId: 'xutorok',
          role: 'restaurantOwner',
          status: 'active',
          email: 'owner@xutorok.am',
        });

        // Seed visible and hidden products in xutorok
        await setDoc(doc(adminDb, 'restaurants/xutorok/products/visible-item'), {
          id: 'visible-item',
          restaurantId: 'xutorok',
          categoryId: 'cat-01',
          name: { hy: 'Բորշչ', ru: 'Борщ', en: 'Borsch' },
          price: 2600,
          currency: 'AMD',
          isAvailable: true,
          isVisible: true,
          isFeatured: true,
          sortOrder: 10,
        });

        await setDoc(doc(adminDb, 'restaurants/xutorok/products/hidden-item'), {
          id: 'hidden-item',
          restaurantId: 'xutorok',
          categoryId: 'cat-01',
          name: { hy: 'Թաքնված', ru: 'Скрытое', en: 'Hidden' },
          price: 1500,
          currency: 'AMD',
          isAvailable: true,
          isVisible: false,
          isFeatured: false,
          sortOrder: 20,
        });
      });
    });

    afterAll(async () => {
      if (testEnv) {
        await testEnv.cleanup();
      }
    });

    it('allows public unauthenticated users to read visible products but blocks hidden products and writes', async () => {
      const publicDb = testEnv.unauthenticatedContext().firestore();

      await assertSucceeds(
        getDoc(doc(publicDb, 'restaurants/xutorok/products/visible-item'))
      );
      await assertFails(
        getDoc(doc(publicDb, 'restaurants/xutorok/products/hidden-item'))
      );
      await assertFails(
        deleteDoc(doc(publicDb, 'restaurants/xutorok/products/visible-item'))
      );
    });

    it('blocks public users from reading private restaurant memberships', async () => {
      const publicDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        getDoc(doc(publicDb, 'restaurants/xutorok/members/xutorokAdmin'))
      );
    });

    it('allows xutorok admin to modify xutorok products but blocks modifying another restaurant tenant', async () => {
      const xutorokAdminDb = testEnv
        .authenticatedContext('xutorokAdmin')
        .firestore();

      await assertSucceeds(
        setDoc(doc(xutorokAdminDb, 'restaurants/xutorok/products/new-dish'), {
          id: 'new-dish',
          restaurantId: 'xutorok',
          categoryId: 'cat-01',
          name: { hy: 'Նոր', ru: 'Новое', en: 'New Dish' },
          price: 3000,
          currency: 'AMD',
          isAvailable: true,
          isVisible: true,
          isFeatured: false,
          sortOrder: 30,
        })
      );

      // Cross-tenant write attempt to "other-bistro" MUST fail
      await assertFails(
        setDoc(
          doc(xutorokAdminDb, 'restaurants/other-bistro/products/hacked-dish'),
          {
            id: 'hacked-dish',
            restaurantId: 'other-bistro',
            categoryId: 'cat-01',
            name: { hy: 'Հաք', ru: 'Хак', en: 'Hack' },
            price: 100,
            currency: 'AMD',
            isAvailable: true,
            isVisible: true,
            isFeatured: false,
            sortOrder: 1,
          }
        )
      );
    });

    it('prevents arbitrary authenticated users from self-assigning restaurant admin memberships', async () => {
      const randomUserDb = testEnv.authenticatedContext('randomUser99').firestore();
      await assertFails(
        setDoc(doc(randomUserDb, 'restaurants/xutorok/members/randomUser99'), {
          uid: 'randomUser99',
          restaurantId: 'xutorok',
          role: 'restaurantOwner',
          status: 'active',
        })
      );
    });
  }
);

