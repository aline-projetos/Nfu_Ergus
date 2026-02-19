// src/lib/api/accessControl.ts

import { getAuthHeaders } from "../utils";

const API_URL = import.meta.env.VITE_API_URL;

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AccessPermission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  is_active: boolean;
}

export type CreateAccessPermissionInput = Omit<AccessPermission, 'id'>;
export type UpdateAccessPermissionInput = Omit<AccessPermission, 'id'>;

export interface AccessProfile {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  permissionIds: string[];
}

export type CreateAccessProfileInput = {
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  permissionIds: string[];
};

export type UpdateAccessProfileInput = CreateAccessProfileInput;

export interface ListPermissionsParams {
  search?: string;
  module?: string;
  only_active?: boolean;
}

export interface ListProfilesParams {
  search?: string;
}

// ─────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────

export async function listAccessPermissions(
  params: ListPermissionsParams = {}
): Promise<AccessPermission[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.module) qs.set('module', params.module);
  if (params.only_active !== undefined) qs.set('only_active', String(params.only_active));

  const res = await fetch(`${API_URL}/access-permissions?${qs.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createAccessPermission(
  payload: CreateAccessPermissionInput
): Promise<AccessPermission> {
  const res = await fetch(`${API_URL}/access-permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateAccessPermission(
  id: string,
  payload: UpdateAccessPermissionInput
): Promise<AccessPermission> {
  const res = await fetch(`${API_URL}/access-permissions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAccessPermission(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/access-permissions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

export async function listAccessProfiles(
  params: ListProfilesParams = {}
): Promise<AccessProfile[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);

  const res = await fetch(
    `${API_URL}/access-profiles${qs.toString() ? `?${qs.toString()}` : ''}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function createAccessProfile(
  payload: CreateAccessProfileInput
): Promise<AccessProfile> {
  const res = await fetch(`${API_URL}/access-profiles`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function updateAccessProfile(
  id: string,
  payload: UpdateAccessProfileInput
): Promise<AccessProfile> {
  const res = await fetch(`${API_URL}/access-profiles/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function deleteAccessProfile(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/access-profiles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}