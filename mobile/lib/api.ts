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

// ── Pantry ──

export interface PantryItemResponse {
  id: number;
  name: string;
  canonicalName: string;
  category: "fridge" | "spice" | "pantry";
  quantity: number | null;
  unit: string | null;
  addedAt: string;
  estimatedExpiry: string | null;
  status: "fresh" | "use_soon" | "urgent" | "expired";
}

export async function getPantryItems(
  token: string
): Promise<{ items: PantryItemResponse[] }> {
  return apiFetch("/api/pantry", token);
}

export async function addPantryItem(
  token: string,
  data: { name: string; category?: string; quantity: number; unit: string }
): Promise<{ item: PantryItemResponse }> {
  return apiFetch("/api/pantry", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePantryItem(
  token: string,
  data: { id: number; quantity?: number; unit?: string; category?: string }
): Promise<{ success: boolean }> {
  return apiFetch("/api/pantry", token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePantryItem(
  token: string,
  id: number,
  reason?: "used" | "expired"
): Promise<{ success: boolean }> {
  return apiFetch("/api/pantry", token, {
    method: "DELETE",
    body: JSON.stringify({ id, reason }),
  });
}

// ── Recipes ──

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
  inPantry: boolean;
}

export interface RecipeResponse {
  title: string;
  description: string;
  cookTime: string;
  difficulty: string;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface SavedRecipeResponse extends RecipeResponse {
  id: number;
  createdAt: string;
}

export async function suggestRecipes(
  token: string
): Promise<{ recipes: RecipeResponse[] }> {
  return apiFetch("/api/recipes/suggest", token, { method: "POST" });
}

export async function getSavedRecipes(
  token: string
): Promise<{ recipes: SavedRecipeResponse[] }> {
  return apiFetch("/api/recipes/save", token);
}

export async function saveRecipe(
  token: string,
  recipe: RecipeResponse
): Promise<{ recipe: SavedRecipeResponse }> {
  return apiFetch("/api/recipes/save", token, {
    method: "POST",
    body: JSON.stringify(recipe),
  });
}

export async function deleteSavedRecipe(
  token: string,
  id: number
): Promise<{ success: boolean }> {
  return apiFetch("/api/recipes/save", token, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// ── Recipe feedback ──

export interface FeedbackItem {
  id: number;
  recipeTitle: string;
  feedback: "like" | "dislike";
}

export async function getRecipeFeedback(
  token: string
): Promise<{ feedback: FeedbackItem[] }> {
  return apiFetch("/api/recipes/feedback", token);
}

export async function submitRecipeFeedback(
  token: string,
  recipeTitle: string,
  feedback: "like" | "dislike"
): Promise<{ created?: boolean; updated?: boolean; removed?: boolean; feedback?: string }> {
  return apiFetch("/api/recipes/feedback", token, {
    method: "POST",
    body: JSON.stringify({ recipeTitle, feedback }),
  });
}

// ── Pantry deduct ──

export async function deductPantryItems(
  token: string,
  ingredients: RecipeIngredient[]
): Promise<{ deducted: string[]; removed: string[] }> {
  return apiFetch("/api/pantry/deduct", token, {
    method: "POST",
    body: JSON.stringify({ ingredients }),
  });
}

// ── Shopping list ──

export interface ShoppingListItem {
  id: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  checked: boolean;
  recipeTitle: string | null;
  createdAt: string;
}

export async function getShoppingList(
  token: string
): Promise<{ items: ShoppingListItem[] }> {
  return apiFetch("/api/shopping-list", token);
}

export async function addToShoppingList(
  token: string,
  items: Array<{ name: string; quantity?: string; unit?: string; recipeTitle?: string }>
): Promise<{ items: ShoppingListItem[] }> {
  return apiFetch("/api/shopping-list", token, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function toggleShoppingItem(
  token: string,
  id: number,
  checked: boolean
): Promise<{ success: boolean }> {
  return apiFetch("/api/shopping-list", token, {
    method: "PATCH",
    body: JSON.stringify({ id, checked }),
  });
}

export async function deleteShoppingItem(
  token: string,
  id: number
): Promise<{ success: boolean }> {
  return apiFetch("/api/shopping-list", token, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

export async function clearCheckedItems(
  token: string
): Promise<{ success: boolean }> {
  return apiFetch("/api/shopping-list", token, {
    method: "DELETE",
    body: JSON.stringify({ clearChecked: true }),
  });
}
