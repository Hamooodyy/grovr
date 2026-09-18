import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import {
  updateOnboarding,
  suggestRecipes,
  addToShoppingList,
  RecipeResponse,
} from "../../lib/api";
import { useOnboarding } from "../_layout";
import { colors, fonts, type as typ, radii, shadows, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Tag } from "../../components/Tag";

export default function ReadyScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { markOnboardingDone } = useOnboarding();
  const params = useLocalSearchParams<{
    household: string;
    frequency: string;
    likes: string;
    dislikes: string;
    cookingTimes: string;
    servingSize: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const likes: string[] = JSON.parse(params.likes || "[]");
      const dislikes: string[] = JSON.parse(params.dislikes || "[]");
      const cookingTimes: string[] = JSON.parse(params.cookingTimes || "[]");

      const preferences = [
        ...likes.map((p) => ({ preference: p, type: "like" })),
        ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ];

      await updateOnboarding(token, {
        householdType: params.household,
        cookingFrequency: params.frequency,
        cookingTimes,
        servingSize: params.servingSize,
        preferences,
        onboardingDone: true,
      });

      // Fetch first recipe (don't call markOnboardingDone yet — let user see this screen first)
      const data = await suggestRecipes(token, { count: 1 });
      if (data.recipes.length > 0) {
        setRecipe(data.recipes[0]);
      }

      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
      setLoading(false);
    }
  }

  async function handleAddMissing() {
    if (!recipe) return;
    setAdding(true);
    try {
      const token = await getToken();
      if (!token) return;
      const missing = recipe.ingredients
        .filter((i) => !i.inPantry)
        .map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          recipeTitle: recipe.title,
        }));
      if (missing.length > 0) {
        await addToShoppingList(token, missing);
      }
      markOnboardingDone();
      router.replace("/(tabs)/shop");
    } catch {
      markOnboardingDone();
      router.replace("/(tabs)");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cta.DEFAULT} />
          <Text style={styles.loadingText}>Setting up your kitchen...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button title="Try again" onPress={run} />
        </View>
      </View>
    );
  }

  const inKitchen = recipe?.ingredients.filter((i) => i.inPantry).length ?? 0;
  const needToBuy = recipe?.ingredients.filter((i) => !i.inPantry).length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Tag
          label="Based on your preferences"
          variant="accent2"
        />

        <Text style={styles.headline}>
          Here's something to start with.
        </Text>
        <Text style={styles.sub}>
          Based on what you like.
        </Text>

        {recipe && (
          <View style={[styles.card, shadows.md]}>
            <Text style={styles.cardTitle}>{recipe.title}</Text>
            <Text style={styles.cardMeta}>
              {recipe.cookTime} · {recipe.difficulty} · {recipe.servings} servings
            </Text>
            <View style={styles.cardTags}>
              <Tag
                label={`Uses ${inKitchen} you already have`}
                variant="accent2"
              />
              {needToBuy > 0 && (
                <Tag
                  label={`Need ${needToBuy} more`}
                  variant="accent"
                />
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {recipe && needToBuy > 0 && (
          <Button
            title={adding ? "Adding..." : "Add missing ingredients"}
            onPress={handleAddMissing}
            disabled={adding}
          />
        )}
        <Button
          title="Let's cook"
          variant="ghost"
          onPress={() => {
            markOnboardingDone();
            router.replace("/(tabs)");
          }}
          style={{ marginTop: needToBuy > 0 ? 10 : 0 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.neutral[700],
  },
  errorTitle: {
    ...typ.h3,
    color: colors.text,
    textAlign: "center",
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cta.DEFAULT,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingTop: 74,
    paddingHorizontal: layout.onboardingGutter,
  },
  headline: {
    ...typ.h2,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[700],
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 13.2,
    gap: 6,
  },
  cardTitle: {
    ...typ.cardTitleLg,
    color: colors.text,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(32, 30, 29, 0.5)",
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
