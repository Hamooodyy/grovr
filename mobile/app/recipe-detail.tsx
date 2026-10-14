import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Check, Plus, AlertTriangle } from "lucide-react-native";
import {
  RecipeResponse,
  PantryItemResponse,
  getPantryItems,
  addToShoppingList,
  deductPantryItems,
  saveRecipe,
  markRecipeCooked,
} from "../lib/api";
import { colors, fonts, type as typ, radii, layout } from "../lib/theme";
import { getIngredientStatus, type IngredientStatus } from "../lib/ingredients";
import { Tag } from "../components/Tag";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";

function parseRecipe(raw: string | undefined): RecipeResponse | null {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed.title || !Array.isArray(parsed.ingredients)) return null;
    return parsed as RecipeResponse;
  } catch {
    return null;
  }
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{ recipe: string }>();
  const recipe = parseRecipe(params.recipe);

  const [toast, setToast] = useState("");
  const [addingToList, setAddingToList] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [pantryItems, setPantryItems] = useState<PantryItemResponse[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!recipe) return;
    async function loadPantry() {
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const data = await getPantryItems(token);
        setPantryItems(data.items);
        setPantryLoaded(true);
      } catch { /* ignore */ }
    }
    loadPantry();
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ ...typ.h3, color: colors.text, textAlign: "center", marginBottom: 8 }}>
            Couldn't load recipe
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.neutral[600], textAlign: "center", marginBottom: 20 }}>
            The recipe data may be missing or corrupted.
          </Text>
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // Status from the live kitchen; until it loads, fall back to the LLM's guess
  const ingredients = (recipe.ingredients ?? []).map((ing) => {
    if (!pantryLoaded) {
      return { ...ing, status: (ing.inPantry ? "have" : "missing") as IngredientStatus, match: undefined };
    }
    return { ...ing, ...getIngredientStatus(ing, pantryItems) };
  });

  const inKitchen = ingredients.filter((i) => i.status === "have" || i.status === "unit_mismatch");
  const needToBuy = ingredients.filter((i) => i.status === "not_enough" || i.status === "missing");

  async function handleAddMissing() {
    setAddingToList(true);
    try {
      const token = await getToken();
      if (!token) return;
      if (needToBuy.length > 0) {
        const items = needToBuy.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          recipeTitle: recipe!.title,
        }));
        await Promise.all([
          addToShoppingList(token, items),
          saveRecipe(token, recipe!),
        ]);
        setToast("Recipe saved and ingredients added to list.");
      } else {
        await saveRecipe(token, recipe!);
        setToast("Recipe saved.");
      }
      setTimeout(() => router.back(), 1200);
    } catch {
      // ignore
    } finally {
      setAddingToList(false);
    }
  }

  async function handleCooked() {
    setCooking(true);
    try {
      const token = await getToken();
      if (!token) return;
      // Already in the cookbook → mark that copy cooked; otherwise save it straight into Cooked
      const savedId = (recipe as { id?: number }).id;
      await Promise.all([
        savedId ? markRecipeCooked(token, savedId) : saveRecipe(token, recipe!, { cooked: true }),
        deductPantryItems(token, recipe!.ingredients),
      ]);
      setToast("Kitchen updated. Enjoy!");
      setTimeout(() => router.back(), 1200);
    } catch {
      setCooking(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Title & description */}
        <Text style={styles.title}>{recipe.title}</Text>
        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}

        {/* Meta tags */}
        <View style={styles.metaTags}>
          <Tag label={recipe.cookTime} variant="neutral" />
          <Tag label={recipe.difficulty} variant="neutral" />
          <Tag label={`${recipe.servings} servings`} variant="neutral" />
        </View>

        {/* In your kitchen */}
        {inKitchen.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>In your kitchen</Text>
            {inKitchen.map((ing, i) => {
              const mismatch = ing.status === "unit_mismatch";
              return (
                <View key={i}>
                  <View style={styles.haveRow}>
                    <Check
                      size={17}
                      strokeWidth={2.75}
                      color={colors.accent2[700]}
                    />
                    <Text style={styles.haveLabel}>{ing.name}</Text>
                    <Text style={styles.haveQty}>
                      {ing.quantity} {ing.unit}
                    </Text>
                  </View>
                  {mismatch && (
                    <Pressable
                      style={styles.mismatchRow}
                      onPress={() => router.push("/(tabs)/pantry")}
                    >
                      <AlertTriangle
                        size={13}
                        strokeWidth={2.75}
                        color={colors.accent[700]}
                      />
                      <Text style={styles.mismatchText}>
                        Units don't match. Tap to fix.
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* You'll need to buy */}
        {needToBuy.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You'll need to buy</Text>
            {needToBuy.map((ing, i) => (
              <View key={i}>
                <View style={styles.needRow}>
                  <Plus
                    size={17}
                    strokeWidth={2.75}
                    color={colors.accent[800]}
                  />
                  <Text style={styles.needLabel}>{ing.name}</Text>
                  <Text style={styles.needQty}>
                    {ing.quantity} {ing.unit}
                  </Text>
                </View>
                {ing.status === "not_enough" && ing.match && (
                  <View style={styles.mismatchRow}>
                    <AlertTriangle
                      size={13}
                      strokeWidth={2.75}
                      color={colors.accent[700]}
                    />
                    <Text style={styles.mismatchText}>
                      Not enough · you have {ing.match.quantity} {ing.match.unit}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Method */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Method</Text>
            {recipe.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTAs */}
        <View style={styles.ctas}>
          <Button
            title={
              addingToList
                ? "Saving..."
                : needToBuy.length > 0
                ? `Add ${needToBuy.length} missing to list`
                : "Save recipe"
            }
            onPress={handleAddMissing}
            disabled={addingToList}
          />
          <Button
            title={cooking ? "Updating..." : "I cooked this"}
            variant="secondary"
            onPress={handleCooked}
            disabled={cooking}
          />
        </View>

        <Text style={styles.footnote}>
          This updates your kitchen inventory.
        </Text>
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
  scroll: {
    paddingTop: 60,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 40,
  },
  backButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.cta.DEFAULT,
  },
  title: {
    ...typ.h2,
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[700],
    marginBottom: 12,
  },
  metaTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typ.h4,
    color: colors.text,
    marginBottom: 12,
  },
  // In kitchen rows
  haveRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 6,
    gap: 10,
  },
  haveLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  haveQty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.neutral[600],
  },
  mismatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 42,
    paddingBottom: 6,
    marginTop: -2,
  },
  mismatchText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.accent[700],
  },
  // Need to buy rows
  needRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent[100],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent[300],
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 6,
    gap: 10,
  },
  needLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.accent[800],
    flex: 1,
  },
  needQty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.accent[700],
  },
  // Method
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cta[200],
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.cta[800],
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    flex: 1,
  },
  // CTAs
  ctas: {
    gap: 10,
    marginBottom: 12,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[600],
    textAlign: "center",
  },
});
