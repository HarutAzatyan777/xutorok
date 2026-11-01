import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User, IdTokenResult } from 'firebase/auth';

const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, path: string) => ({
  path,
  withConverter: () => ({ path }),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (dbArg: unknown, pathArg: string) => mockDoc(dbArg, pathArg),
    getDoc: (refArg: { path: string }) => mockGetDoc(refArg),
  };
});

import { resolveRestaurantAdminAccess } from '../authService';

describe('resolveRestaurantAdminAccess — Owner & Tenant Isolation Verification', () => {
  const targetUid = 'vIBspb1BNSVeboQ2tCTUuhvqoqB3';

  const mockUser: User = {
    uid: targetUid,
    email: 'admin@xutarok.am',
    getIdTokenResult: vi.fn(async () => ({
      claims: {},
    } as unknown as IdTokenResult)),
  } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authorizes vIBspb1BNSVeboQ2tCTUuhvqoqB3 as restaurantOwner for xutorok when active membership exists', async () => {
    mockGetDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === `platformAdmins/${targetUid}`) {
        return { exists: () => false };
      }
      if (ref.path === `restaurants/xutorok/members/${targetUid}`) {
        return {
          exists: () => true,
          data: () => ({
            uid: targetUid,
            restaurantId: 'xutorok',
            role: 'restaurantOwner',
            status: 'active',
          }),
        };
      }
      return { exists: () => false };
    });

    const access = await resolveRestaurantAdminAccess(mockUser, 'xutorok');
    expect(access.isAuthorized).toBe(true);
    expect(access.role).toBe('restaurantOwner');
    expect(access.restaurantId).toBe('xutorok');
    expect(access.membership?.uid).toBe(targetUid);
    expect(access.membership?.status).toBe('active');
  });

  it('denies vIBspb1BNSVeboQ2tCTUuhvqoqB3 from administering any other restaurant tenant', async () => {
    mockGetDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === `restaurants/other-restaurant/members/${targetUid}`) {
        return { exists: () => false };
      }
      return { exists: () => false };
    });

    const access = await resolveRestaurantAdminAccess(mockUser, 'other-restaurant');
    expect(access.isAuthorized).toBe(false);
    expect(access.role).toBeNull();
    expect(access.denialReason).toContain(
      `restaurants/other-restaurant/members/${targetUid}`
    );
  });

  it('denies access if membership status is disabled or restaurantId mismatches', async () => {
    mockGetDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === `restaurants/xutorok/members/${targetUid}`) {
        return {
          exists: () => true,
          data: () => ({
            uid: targetUid,
            restaurantId: 'xutorok',
            role: 'restaurantOwner',
            status: 'disabled',
          }),
        };
      }
      return { exists: () => false };
    });

    const access = await resolveRestaurantAdminAccess(mockUser, 'xutorok');
    expect(access.isAuthorized).toBe(false);
    expect(access.denialReason).toContain('disabled');
  });
});
