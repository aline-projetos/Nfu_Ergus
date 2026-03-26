import { clsx, type ClassValue } from "clsx";
import { EggFried } from "lucide-react";
import { twMerge } from "tailwind-merge";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  return API_BASE_URL
}

export function getAuthHeaders() {
  const token = localStorage.getItem("ergus_token");
  const isAdmin = JSON.parse(localStorage.getItem('ergus_user') || '{}').isSuperAdmin;
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;

  if (!token) {
    throw new Error('Usuário não autenticado');
  }
  if (!isAdmin) {
    if (!tenantId) {
      throw new Error('Tenant não definido');
    }
  }  

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
  } as HeadersInit;
}

export async function parseError(res: Response) {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}
