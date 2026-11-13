import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TARGET_EMAIL,
  REQUIRED_PROJECT_ID,
  REQUIRED_TENANT_ID,
  TARGET_ROLE,
  grantAdminByEmail,
} from '../../../../../scripts/grant-admin-by-email.mjs';

describe('grant-admin-by-email script validation', () => {
  it('has strict safety constants configured for Xutorok', () => {
    expect(REQUIRED_PROJECT_ID).toBe('ai-twin-conflicts');
    expect(REQUIRED_TENANT_ID).toBe('xutorok');
    expect(DEFAULT_TARGET_EMAIL).toBe('admin@xutorok.am');
    expect(TARGET_ROLE).toBe('restaurantOwner');
  });

  it('rejects unauthorized tenants with an explicit tenant isolation error', async () => {
    await expect(
      grantAdminByEmail(['--tenant=imperia-sushi', '--dry-run'])
    ).rejects.toThrow(/Tenant Isolation Safety Check Failed/);
  });

  it('runs safely in dry-run mode for the authorized tenant and user', async () => {
    const result = await grantAdminByEmail(['--dry-run']);
    expect(result.applied).toBe(false);
    expect(result.authUser.email).toBe('admin@xutorok.am');
    expect(result.memberDocPath).toBe(
      `restaurants/xutorok/members/${result.authUser.uid}`
    );
    expect(result.proposedPayload.role).toBe('restaurantOwner');
    expect(result.proposedPayload.status).toBe('active');
    expect(result.proposedPayload.restaurantId).toBe('xutorok');
  });
});

