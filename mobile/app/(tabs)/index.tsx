import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import {
  getPantryItems,
  suggestRecipes,
  addToShoppingList,
  PantryItemResponse,
  RecipeResponse,
} from "../../lib/api";
import { colors, fonts, type as typ, radii, shadows, layout } from "../../lib/theme";
import { Tag } from "../../components/Tag";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

function daysUntilExpiry(item: PantryItemResponse): number | null {
  if (!item.estimatedExpiry) return null;
  const diff = new Date(item.estimatedExpiry).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function expiryLabel(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "today";
  return `~${days} day${days === 1 ? "" : "s"}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { getToken, sessionId } = useAuth();
  const { user } = useUser();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pantry, setPantry] = useState<PantryItemResponse[]>([]);
  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [toast, setToast] = useState("");

  const hasPantry = pantry.length > 0;

  const useSoon = pantry
    .filter((i) => i.status === "use_soon" || i.status === "urgent")
    .sort((a, b) => {
      const da = daysUntilExpiry(a) ?? 999;
      const db = daysUntilExpiry(b) ?? 999;
      return da - db;
    })
    .slice(0, 4);

  // "Running low" — staples from spice/pantry that are expired or urgent
  const runningLow = pantry
    .filter(
      (i) =>
        (i.category === "spice" || i.category === "pantry") &&
        (i.status === "expired" || i.status === "urgent")
    )
    .slice(0, 4);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const token = await getTokenRef.current();
      if (!token) return;

      const [pantryData, recipeData] = await Promise.all([
        getPantryItems(token),
        suggestRecipes(token, { count: 2 }),
      ]);

      setPantry(pantryData.items);
      setRecipes(recipeData.recipes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) fetchData();
  }, [fetchData, sessionId]);

  async function handleBuildList() {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const items = runningLow.map((i) => ({
        name: i.name,
        recipeTitle: "Running low",
      }));
      await addToShoppingList(token, items);
      setToast(`${items.length} staple${items.length === 1 ? "" : "s"} added.`);
      setTimeout(() => router.push("/(tabs)/shop"), 600);
    } catch {
      // ignore
    }
  }

  const firstName = user?.firstName ?? "";

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.cta.DEFAULT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ ...typ.h3, color: colors.text, textAlign: "center", marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.neutral[600], textAlign: "center", marginBottom: 20 }}>
          Couldn't load your kitchen data. Check your connection and try again.
        </Text>
        <Button title="Try again" onPress={fetchData} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={styles.dateLabel}>{formatDate()}</Text>
        <Text style={styles.greeting}>
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.lead}>
          {hasPantry
            ? "Here's what looks good tonight."
            : "Add a few items to your kitchen and we'll pick better recipes. For now, these match your tastes."}
        </Text>

        {/* Use Soon */}
        {hasPantry && useSoon.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Use soon</Text>
              <Pressable onPress={() => router.push("/(tabs)/pantry")}>
                <Text style={styles.link}>See all</Text>
              </Pressable>
            </View>
            <Text style={styles.disclaimer}>
              Estimated freshness, not a safety date.
            </Text>
            {useSoon.map((item) => {
              const days = daysUntilExpiry(item);
              return (
                <Pressable
                  key={item.id}
                  style={styles.useSoonRow}
                  onPress={() => router.push("/(tabs)/pantry")}
                >
                  <Text style={styles.useSoonName}>{item.name}</Text>
                  <Tag
                    label={expiryLabel(days)}
                    variant={item.status === "urgent" ? "accent" : "accent"}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Tonight's Picks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {hasPantry ? "Tonight's picks" : "Based on your tastes"}
          </Text>
          <Text style={styles.sectionNote}>
            {hasPantry
              ? "Based on what's in your kitchen."
              : "Add items to your kitchen for better picks."}
          </Text>
          {recipes.map((recipe) => {
            const inKitchen = recipe.ingredients.filter((i) => i.inPantry).length;
            const needMore = recipe.ingredients.filter((i) => !i.inPantry).length;
            return (
              <Pressable
                key={recipe.title}
                onPress={() =>
                  router.push({
                    pathname: "/recipe-detail",
                    params: { recipe: JSON.stringify(recipe) },
                  })
                }
              >
                <Card elevation="sm" style={styles.recipeCard}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeMeta}>
                    {recipe.cookTime} · {recipe.difficulty} · {recipe.servings} servings
                  </Text>
                  <View style={styles.recipeTags}>
                    <Tag
                      label={`${inKitchen} in your kitchen`}
                      variant="accent2"
                    />
                    <Tag
                      label={needMore > 0 ? `Need ${needMore} more` : "You have everything"}
                      variant={needMore > 0 ? "accent" : "accent2"}
                    />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Running Low */}
        {hasPantry && runningLow.length > 0 && (
          <View style={styles.runningLowBlock}>
            <Text style={styles.sectionTitle}>Running low</Text>
            <Text style={styles.sectionNote}>
              Stuff you probably need to restock.
            </Text>
            <View style={styles.runningLowChips}>
              {runningLow.map((item) => (
                <Tag key={item.id} label={item.name} variant="neutral" />
              ))}
            </View>
            <Button
              title="Build shopping list"
              onPress={handleBuildList}
              style={{ marginTop: 14 }}
            />
          </View>
        )}
      </ScrollView>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast("")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingTop: 66,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 24,
  },
  dateLabel: {
    ...typ.label,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  greeting: {
    ...typ.h2,
    color: colors.text,
    marginBottom: 8,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.neutral[700],
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    ...typ.h4,
    color: colors.text,
    marginBottom: 4,
  },
  sectionNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.neutral[600],
    marginBottom: 12,
  },
  link: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cta.DEFAULT,
  },
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[600],
    marginBottom: 10,
  },
  useSoonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  useSoonName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  recipeCard: {
    padding: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 6,
  },
  recipeTitle: {
    ...typ.cardTitleMd,
    color: colors.text,
  },
  recipeMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(32, 30, 29, 0.5)",
  },
  recipeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  runningLowBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 16,
  },
  runningLowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
});
