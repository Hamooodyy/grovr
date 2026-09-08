/**
 * API client for communicating with the Grovr backend.
 *
 * All requests include the Clerk JWT for authentication.
 * The base URL points to the Next.js API routes.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  token: string | null,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Health check ──

export async function checkHealth(): Promise<{ status: string; timestamp: number }> {
  return apiFetch("/api/health", null);
}

// ── Onboarding ──

export interface OnboardingData {
  profile: {
    householdType: string | null;
    cookingFrequency: string | null;
    cookingTimes: string[] | null;
    servingSize: string | null;
    preferredStore: string | null;
    onboardingDone: boolean;
  };
  preferences: Array<{ preference: string; type: string }>;
}

export async function getOnboarding(token: string): Promise<OnboardingData> {
  return apiFetch("/api/user/onboarding", token);
}

export async function updateOnboarding(
  token: string,
  data: Record<string, unknown>
): Promise<{ success: boolean }> {
  return apiFetch("/api/user/onboarding", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
