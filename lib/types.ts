// ── User & Onboarding ──

export type HouseholdType = "just_me" | "plus_one" | "family" | "roommates";

export type CookingFrequency = "daily" | "few_times" | "once_twice" | "not_often";

export type CookingTime = "15_20" | "30" | "enjoy" | "depends";

export type ServingSize = "1" | "2" | "3_4" | "5_plus";

export type PreferenceType = "like" | "dislike" | "restriction";

export interface UserProfile {
  id: number;
  clerkUserId: string;
  householdType: HouseholdType | null;
  cookingFrequency: CookingFrequency | null;
  cookingTimes: CookingTime[];
  servingSize: ServingSize | null;
  preferredStore: string | null;
  onboardingDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFoodPreference {
  id: number;
  userId: number;
  preference: string;
  type: PreferenceType;
}

// ── Pantry ──

export type PantryItemStatus = "fresh" | "use_soon" | "urgent" | "expired";

export type PantryCategory =
  | "produce"
  | "meat"
  | "dairy"
  | "grains"
  | "pantry_staple"
  | "other";

export interface PantryItem {
  id: number;
  userId: number;
  name: string;
  canonicalName: string;
  category: PantryCategory | null;
  addedAt: Date;
  estimatedExpiry: Date | null;
  status: PantryItemStatus;
}
