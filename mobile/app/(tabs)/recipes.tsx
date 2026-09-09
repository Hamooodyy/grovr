import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  suggestRecipes,
  getSavedRecipes,
  saveRecipe,
  deleteSavedRecipe,
  getRecipeFeedback,
  submitRecipeFeedback,
  deductPantryItems,
  addToShoppingList,
  type RecipeResponse,
  type SavedRecipeResponse,
  type FeedbackItem,
} from "../../lib/api";

const LOADING_STAGES = [
  "Analysing your kitchen...",
  "Cooking up recipes...",
  "Finishing touches...",
];

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
  const [loadingStage, setLoadingStage] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Saved state
  const [saved, setSaved] = useState<SavedRecipeResponse[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Feedback state
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "like" | "dislike">>({});

  // Expanded recipe
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedTab, setExpandedTab] = useState<TabMode>("suggest");

  // Clean up timers on unmount
  useEffect(() => {
    return () => { stageTimers.current.forEach(clearTimeout); };
  }, []);

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

  const fetchFeedback = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getRecipeFeedback(token);
      const map: Record<string, "like" | "dislike"> = {};
      data.feedback.forEach((f: FeedbackItem) => { map[f.recipeTitle] = f.feedback; });
      setFeedbackMap(map);
    } catch {
      // silently fail
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      fetchSaved();
      fetchFeedback();
    }, [fetchSaved, fetchFeedback])
  );

  function startLoadingAnimation() {
    // Clear any existing timers
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    setLoadingStage(0);
    progressAnim.setValue(0);

    // Stage 0 → 35% over 1.5s
    Animated.timing(progressAnim, {
      toValue: 0.35,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Stage 1 at 1.5s → 70% over 3s
    stageTimers.current.push(
      setTimeout(() => {
        setLoadingStage(1);
        Animated.timing(progressAnim, {
          toValue: 0.7,
          duration: 3000,
          useNativeDriver: false,
        }).start();
      }, 1500)
    );

    // Stage 2 at 5s → 90% over 4s (slow crawl)
    stageTimers.current.push(
      setTimeout(() => {
        setLoadingStage(2);
        Animated.timing(progressAnim, {
          toValue: 0.9,
          duration: 4000,
          useNativeDriver: false,
        }).start();
      }, 5000)
    );
  }

  function finishLoadingAnimation() {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }

  async function handleGenerate() {
    setLoading(true);
    setExpandedIndex(null);
    startLoadingAnimation();
    try {
      const token = await getToken();
      if (!token) return;
      const data = await suggestRecipes(token);
      finishLoadingAnimation();
      // Brief pause to show 100% before revealing results
      await new Promise((r) => setTimeout(r, 400));
      setRecipes(data.recipes);
      setHasGenerated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate recipes";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setLoadingStage(0);
      progressAnim.setValue(0);
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

  async function handleFeedback(title: string, type: "like" | "dislike") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previous = feedbackMap[title];

    // Optimistic update — change UI immediately
    setFeedbackMap((prev) => {
      const next = { ...prev };
      if (previous === type) {
        delete next[title];
      } else {
        next[title] = type;
      }
      return next;
    });

    try {
      const token = await getToken();
      if (!token) return;
      await submitRecipeFeedback(token, title, type);
    } catch {
      // Revert on failure
      setFeedbackMap((prev) => {
        const next = { ...prev };
        if (previous) {
          next[title] = previous;
        } else {
          delete next[title];
        }
        return next;
      });
    }
  }

  async function handleCookThis(recipe: RecipeResponse | SavedRecipeResponse) {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await deductPantryItems(token, recipe.ingredients);
      const total = result.deducted.length + result.removed.length;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Bon appetit!",
        total > 0
          ? `Updated ${total} item${total > 1 ? "s" : ""} in your kitchen.`
          : "Your kitchen inventory is unchanged (used staples only)."
      );
    } catch {
      Alert.alert("Error", "Failed to update pantry");
    }
  }

  async function handleAddMissing(recipe: RecipeResponse | SavedRecipeResponse) {
    const missing = recipe.ingredients.filter((i) => !i.inPantry);
    if (missing.length === 0) {
      Alert.alert("All set", "You have everything you need for this recipe!");
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      await addToShoppingList(
        token,
        missing.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          recipeTitle: recipe.title,
        }))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Added", `${missing.length} item${missing.length > 1 ? "s" : ""} added to your shopping list.`);
    } catch {
      Alert.alert("Error", "Failed to add items to shopping list");
    }
  }

  function isSaved(title: string): number | null {
    const found = saved.find((r) => r.title === title);
    return found?.id ?? null;
  }

  function renderRecipeCard(recipe: RecipeResponse | SavedRecipeResponse, index: number, mode: TabMode) {
    const expanded = expandedIndex === index && expandedTab === mode;
    const savedId = "id" in recipe && mode === "saved" ? (recipe as SavedRecipeResponse).id : isSaved(recipe.title);
    const diffColor = DIFFICULTY_COLOR[recipe.difficulty] ?? "#6a7c71";
    const missingCount = recipe.ingredients.filter((i) => !i.inPantry).length;
    const fb = feedbackMap[recipe.title];

    return (
      <View style={styles.card}>
        {/* Title row with feedback — NOT inside a Pressable so thumbs are tappable */}
        <View style={styles.cardTitleRow}>
          <Text
            style={styles.cardTitle}
            numberOfLines={expanded ? undefined : 1}
            onPress={() => {
              if (expanded) { setExpandedIndex(null); }
              else { setExpandedIndex(index); setExpandedTab(mode); }
            }}
          >
            {recipe.title}
          </Text>
          <View style={styles.feedbackRow}>
            <Pressable
              style={[styles.feedbackBtn, fb === "like" && styles.feedbackActive]}
              onPress={() => handleFeedback(recipe.title, "like")}
              hitSlop={6}
            >
              <Ionicons
                name={fb === "like" ? "thumbs-up" : "thumbs-up-outline"}
                size={18}
                color={fb === "like" ? "#16a34a" : "#6a7c71"}
              />
            </Pressable>
            <Pressable
              style={[styles.feedbackBtn, fb === "dislike" && styles.feedbackDislikeActive]}
              onPress={() => handleFeedback(recipe.title, "dislike")}
              hitSlop={6}
            >
              <Ionicons
                name={fb === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                size={18}
                color={fb === "dislike" ? "#dc2626" : "#6a7c71"}
              />
            </Pressable>
          </View>
        </View>

        {/* Rest of card header is tappable to expand/collapse */}
        <Pressable
          style={styles.cardHeaderBody}
          onPress={() => {
            if (expanded) { setExpandedIndex(null); }
            else { setExpandedIndex(index); setExpandedTab(mode); }
          }}
        >
          <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 1}>
            {recipe.description}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaChip}>{recipe.cookTime}</Text>
            <Text style={[styles.metaChip, { color: diffColor }]}>{recipe.difficulty}</Text>
            <Text style={styles.metaChip}>{recipe.servings} servings</Text>
            {missingCount > 0 && (
              <Text style={[styles.metaChip, { color: "#ea580c" }]}>
                {missingCount} to buy
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
              <Pressable
                style={({ pressed }) => [styles.cookButton, pressed && { opacity: 0.7 }]}
                onPress={() => handleCookThis(recipe)}
              >
                <Text style={styles.cookButtonText}>Cook This</Text>
              </Pressable>
              {missingCount > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.addListButton, pressed && { opacity: 0.7 }]}
                  onPress={() => handleAddMissing(recipe)}
                >
                  <Text style={styles.addListButtonText}>Add Missing to List</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.cardActions, { marginTop: 8 }]}>
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
          {!loading && (
            <Pressable
              style={({ pressed }) => [
                styles.generateButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleGenerate}
            >
              <Text style={styles.generateText}>
                {hasGenerated ? "Regenerate Recipes" : "Suggest Recipes"}
              </Text>
            </Pressable>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingStageText}>
                {LOADING_STAGES[loadingStage]}
              </Text>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          ) : !hasGenerated ? (
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
  generateText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingStageText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0e1f14",
    marginBottom: 20,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#ddeee4",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 3,
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
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  cardHeaderBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0e1f14",
    flex: 1,
  },
  feedbackRow: {
    flexDirection: "row",
    gap: 6,
  },
  feedbackBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddeee4",
  },
  feedbackActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
  },
  feedbackDislikeActive: {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626",
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
  cookButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  cookButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  addListButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ea580c",
  },
  addListButtonText: {
    color: "#ea580c",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#16a34a",
  },
  saveButtonText: {
    color: "#16a34a",
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
