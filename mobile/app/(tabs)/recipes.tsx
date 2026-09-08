import { useAuth } from "@clerk/expo";
import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import {
  suggestRecipes,
  getSavedRecipes,
  saveRecipe,
  deleteSavedRecipe,
  type RecipeResponse,
  type SavedRecipeResponse,
} from "../../lib/api";

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#16a34a",
  Medium: "#ca8a04",
  Hard: "#dc2626",
};

type TabMode = "suggest" | "saved";

export default function RecipesScreen() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<TabMode>("suggest");

  // Suggest state
  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Saved state
  const [saved, setSaved] = useState<SavedRecipeResponse[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Expanded recipe
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchSaved = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getSavedRecipes(token);
      setSaved(data.recipes);
    } catch {
      // silently fail
    } finally {
      setSavedLoading(false);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      fetchSaved();
    }, [fetchSaved])
  );

  async function handleGenerate() {
    setLoading(true);
    setExpandedIndex(null);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await suggestRecipes(token);
      setRecipes(data.recipes);
      setHasGenerated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate recipes";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(recipe: RecipeResponse) {
    const key = recipe.title;
    if (savingIds.has(key)) return;
    setSavingIds((prev) => new Set(prev).add(key));
    try {
      const token = await getToken();
      if (!token) return;
      const data = await saveRecipe(token, recipe);
      setSaved((prev) => [...prev, data.recipe]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to save recipe");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleUnsave(id: number) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteSavedRecipe(token, id);
      setSaved((prev) => prev.filter((r) => r.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to remove recipe");
    }
  }

  function isSaved(title: string): number | null {
    const found = saved.find((r) => r.title === title);
    return found?.id ?? null;
  }

  function renderRecipeCard(recipe: RecipeResponse | SavedRecipeResponse, index: number, mode: TabMode) {
    const expanded = expandedIndex === index && tab === mode;
    const savedId = "id" in recipe ? (recipe as SavedRecipeResponse).id : isSaved(recipe.title);
    const diffColor = DIFFICULTY_COLOR[recipe.difficulty] ?? "#6a7c71";
    const missingCount = recipe.ingredients.filter((i) => !i.inPantry).length;

    return (
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeader}
          onPress={() => setExpandedIndex(expanded ? null : index)}
        >
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 1}>
              {recipe.title}
            </Text>
            <Text style={styles.expandArrow}>{expanded ? "−" : "+"}</Text>
          </View>
          <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 1}>
            {recipe.description}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaChip}>{recipe.cookTime}</Text>
            <Text style={[styles.metaChip, { color: diffColor }]}>{recipe.difficulty}</Text>
            <Text style={styles.metaChip}>{recipe.servings} servings</Text>
            {missingCount > 0 && (
              <Text style={[styles.metaChip, { color: "#ea580c" }]}>
                {missingCount} missing
              </Text>
            )}
          </View>
        </Pressable>

        {expanded && (
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <Text style={[styles.ingredientDot, !ing.inPantry && { color: "#ea580c" }]}>
                  {ing.inPantry ? "+" : "-"}
                </Text>
                <Text style={[styles.ingredientText, !ing.inPantry && { color: "#ea580c" }]}>
                  {ing.quantity} {ing.unit} {ing.name}
                  {!ing.inPantry ? " (need)" : ""}
                </Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Instructions</Text>
            {recipe.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            <View style={styles.cardActions}>
              {savedId ? (
                <Pressable
                  style={({ pressed }) => [styles.unsaveButton, pressed && { opacity: 0.7 }]}
                  onPress={() => handleUnsave(savedId)}
                >
                  <Text style={styles.unsaveButtonText}>Unsave</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.7 }]}
                  onPress={() => handleSave(recipe)}
                >
                  <Text style={styles.saveButtonText}>
                    {savingIds.has(recipe.title) ? "Saving..." : "Save Recipe"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === "suggest" && styles.tabActive]}
          onPress={() => { setTab("suggest"); setExpandedIndex(null); }}
        >
          <Text style={[styles.tabText, tab === "suggest" && styles.tabTextActive]}>
            Suggestions
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "saved" && styles.tabActive]}
          onPress={() => { setTab("saved"); setExpandedIndex(null); }}
        >
          <Text style={[styles.tabText, tab === "saved" && styles.tabTextActive]}>
            Saved{saved.length > 0 ? ` (${saved.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {tab === "suggest" && (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.generateButton,
              (loading) && { opacity: 0.6 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.generateRow}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.generateText}>Cooking up ideas...</Text>
              </View>
            ) : (
              <Text style={styles.generateText}>
                {hasGenerated ? "Regenerate Recipes" : "Suggest Recipes"}
              </Text>
            )}
          </Pressable>

          {!hasGenerated && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>What should you cook?</Text>
              <Text style={styles.emptyText}>
                Tap the button above to get personalized recipe ideas based on what's in your kitchen.
              </Text>
            </View>
          ) : (
            <FlatList
              data={recipes}
              keyExtractor={(_, i) => `suggest-${i}`}
              renderItem={({ item, index }) => renderRecipeCard(item, index, "suggest")}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}

      {tab === "saved" && (
        <>
          {savedLoading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ flex: 1 }} />
          ) : saved.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved recipes</Text>
              <Text style={styles.emptyText}>
                Generate some recipes and save the ones you like.
              </Text>
            </View>
          ) : (
            <FlatList
              data={saved}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item, index }) => renderRecipeCard(item, index, "saved")}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fdf8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0e1f14",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7c71",
  },
  tabTextActive: {
    color: "#16a34a",
    fontWeight: "700",
  },
  generateButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  generateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0e1f14",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6a7c71",
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8f0eb",
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0e1f14",
    flex: 1,
    marginRight: 8,
  },
  expandArrow: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6a7c71",
  },
  cardDesc: {
    fontSize: 14,
    color: "#6a7c71",
    marginBottom: 10,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaChip: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6a7c71",
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#e8f0eb",
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0e1f14",
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  ingredientDot: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
    width: 18,
    marginTop: 1,
  },
  ingredientText: {
    fontSize: 14,
    color: "#0e1f14",
    flex: 1,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
    width: 22,
    marginTop: 1,
  },
  stepText: {
    fontSize: 14,
    color: "#0e1f14",
    flex: 1,
    lineHeight: 20,
  },
  cardActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  unsaveButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#dc2626",
  },
  unsaveButtonText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
  },
});
