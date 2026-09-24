/**
 * AttackCast Centralized Backend API Configuration
 * Default: Deployed Cloud Backend on Render (https://attackcast.onrender.com)
 */

export const BACKEND_URL =
  (import.meta as any).env?.VITE_API_URL || 'https://attackcast.onrender.com';

export const WS_BACKEND_URL = BACKEND_URL.replace(/^http/, 'ws');

export async function fetchHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend health check error:', err);
    return null;
  }
}

export async function fetchMetrics() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/metrics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend metrics fetch error:', err);
    return null;
  }
}
