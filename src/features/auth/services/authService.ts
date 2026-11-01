import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getRestaurantId } from '../../../config/app';
import { auth, db } from '../../../config/firebase';
import { memberConverter } from '../../../lib/firebase/converters';
import { tenantPaths } from '../../../lib/firebase/paths';
import type { AdminRole, RestaurantMember } from '../../../types';

export interface ResolvedAdminAccess {
  isAuthorized: boolean;
  role: AdminRole | null;
  membership: RestaurantMember | null;
  restaurantId: string;
  denialReason?: string;
}

/**
 * Resolves whether a signed-in Firebase user is authorized to administer the target restaurant.
 * Never trusts localStorage or client-editable state; verifies custom claims, /platformAdmins/{uid},
 * and /restaurants/{restaurantId}/members/{uid} directly from Firestore.
 */
export async function resolveRestaurantAdminAccess(
  user: User,
  restaurantId = getRestaurantId()
): Promise<ResolvedAdminAccess> {
  try {
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.platformAdmin === true) {
      return {
        isAuthorized: true,
        role: 'platformAdmin',
        membership: null,
        restaurantId,
      };
    }
  } catch (err) {
    console.warn('[AuthService] Could not inspect ID token claims:', err);
  }

  // Check /platformAdmins/{uid} document
  try {
    const platformAdminRef = doc(db, tenantPaths.platformAdminDoc(user.uid));
    const platformAdminSnap = await getDoc(platformAdminRef);
    if (platformAdminSnap.exists() && platformAdminSnap.data()?.active === true) {
      return {
        isAuthorized: true,
        role: 'platformAdmin',
        membership: null,
        restaurantId,
      };
    }
  } catch {
    // Ignore permission errors if /platformAdmins rule denies or does not exist
  }

  // Check /restaurants/{restaurantId}/members/{uid}
  try {
    const memberRef = doc(
      db,
      tenantPaths.memberDoc(user.uid, restaurantId)
    ).withConverter(memberConverter);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      return {
        isAuthorized: false,
        role: null,
        membership: null,
        restaurantId,
        denialReason: `Account (${user.email ?? user.uid}) does not have an administrator membership in restaurants/${restaurantId}/members/${user.uid}.`,
      };
    }

    const member = memberSnap.data();

    if (member.restaurantId !== restaurantId) {
      return {
        isAuthorized: false,
        role: null,
        membership: member,
        restaurantId,
        denialReason: 'Tenant mismatch on membership document.',
      };
    }

    if (member.status !== 'active') {
      return {
        isAuthorized: false,
        role: null,
        membership: member,
        restaurantId,
        denialReason: 'Administrator membership is currently disabled.',
      };
    }

    if (member.role !== 'restaurantOwner' && member.role !== 'restaurantManager') {
      return {
        isAuthorized: false,
        role: null,
        membership: member,
        restaurantId,
        denialReason: 'Membership role is not authorized for restaurant administration.',
      };
    }

    return {
      isAuthorized: true,
      role: member.role,
      membership: member,
      restaurantId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isAuthorized: false,
      role: null,
      membership: null,
      restaurantId,
      denialReason: `Unable to verify membership in Firestore (${message}). Ensure Firestore security rules are deployed and your membership document exists at restaurants/${restaurantId}/members/${user.uid}.`,
    };
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logoutAdmin(): Promise<void> {
  await firebaseSignOut(auth);
}

