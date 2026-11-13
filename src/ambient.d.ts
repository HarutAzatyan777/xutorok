declare module '*/scripts/grant-admin-by-email.mjs' {
  export const REQUIRED_PROJECT_ID: string;
  export const REQUIRED_TENANT_ID: string;
  export const DEFAULT_TARGET_EMAIL: string;
  export const TARGET_ROLE: string;

  export interface GrantAdminResult {
    authUser: {
      uid: string;
      email?: string;
      displayName?: string;
      customClaims?: Record<string, unknown>;
      disabled: boolean;
    };
    memberDocPath: string;
    proposedPayload: {
      uid: string;
      restaurantId: string;
      role: string;
      status: string;
      email?: string;
      displayName?: string;
    };
    applied: boolean;
    verifiedData?: Record<string, unknown>;
  }

  export function grantAdminByEmail(cliArgs?: string[]): Promise<GrantAdminResult>;
}

