import { clsx, type ClassValue } from "clsx";
import { EggFried } from "lucide-react";
import { twMerge } from "tailwind-merge";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  return API_BASE_URL
}

export function getTokenKey() {
  return TOKEN_KEY
}

export function getAuthHeaders() {
  const token = localStorage.getItem("ergus_token");
  
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;

  if (!token) {
    throw new Error('Usuário não autenticado');
  }
  if (!tenantId) {
    throw new Error('Tenant não definido');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
  } as HeadersInit;
}
