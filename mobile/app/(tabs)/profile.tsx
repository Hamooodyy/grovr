import { useAuth } from "@clerk/expo";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import {
  getOnboarding,
  updateOnboarding,
  deleteAccount,
  type OnboardingData,
} from "../../lib/api";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Chip } from "../../components/Chip";
import { OptionRow } from "../../components/OptionRow";
import { PillInput } from "../../components/PillInput";
import { Tag } from "../../components/Tag";
import { Toast } from "../../components/Toast";

const HOUSEHOLD_OPTIONS = [
  { value: "just_me", label: "Just me" },
  { value: "plus_one", label: "Me + one" },
  { value: "family", label: "Family" },
  { value: "roommates", label: "Roommates" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Almost every day" },
  { value: "few_times", label: "A few times a week" },
  { value: "once_twice", label: "1–2 times a week" },
  { value: "not_often", label: "Not often" },
] as const;

const TIME_OPTIONS = [
  { value: "15_20", label: "15–20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45_60", label: "45–60 minutes" },
  { value: "depends", label: "Depends on the day" },
] as const;

const SERVING_OPTIONS = [
  { value: "1", label: "1 serving" },
  { value: "2", label: "2 servings" },
  { value: "3_4", label: "3–4 servings" },
  { value: "5_plus", label: "5+ servings" },
] as const;

const FOOD_LIKES = [
  "Chicken",
  "Beef",
  "Seafood",
  "Vegetables",
  "Pasta",
  "Rice",
  "Mexican",
  "Asian",
  "Mediterranean",
  "Italian",
  "Healthy & light",
  "Comfort food",
] as const;

const RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Keto",
  "Halal",
  "Kosher",
  "Nut-free",
] as const;

export default function ProfileScreen() {
  const { getToken, signOut, sessionId } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Profile state
  const [household, setHousehold] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [servings, setServings] = useState<string | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikeText, setDislikeText] = useState("");

  const hasLoaded = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (hasLoaded.current) return;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await getOnboarding(token);
      setHousehold(data.profile.householdType);
      setFrequency(data.profile.cookingFrequency);
      setTimes(data.profile.cookingTimes ?? []);
      setServings(data.profile.servingSize);
      setLikes(
        data.preferences
          .filter((p) => p.type === "like")
          .map((p) => p.preference)
      );
      setDislikes(
        data.preferences
          .filter((p) => p.type === "dislike")
          .map((p) => p.preference)
      );
      setRestrictions(
        data.preferences
          .filter((p) => p.type === "restriction")
          .map((p) => p.preference)
      );
      hasLoaded.current = true;
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (sessionId) fetchProfile();
    }, [fetchProfile, sessionId])
  );

  async function save(updates: Record<string, unknown>) {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await updateOnboarding(token, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToast("Saved");
    } catch {
      setToast("Failed to save");
    }
  }

  function buildPreferences() {
    return [
      ...likes.map((p) => ({ preference: p, type: "like" })),
      ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ...restrictions.map((p) => ({ preference: p, type: "restriction" })),
    ];
  }

  // Handlers that update state + save
  function selectHousehold(value: string) {
    setHousehold(value);
    save({ householdType: value });
  }

  function selectFrequency(value: string) {
    setFrequency(value);
    save({ cookingFrequency: value });
  }

  function toggleTime(value: string) {
    const next = times.includes(value)
      ? times.filter((t) => t !== value)
      : [...times, value];
    setTimes(next);
    save({ cookingTimes: next });
  }

  function selectServings(value: string) {
    setServings(value);
    save({ servingSize: value });
  }

  function toggleLike(item: string) {
    const next = likes.includes(item)
      ? likes.filter((l) => l !== item)
      : [...likes, item];
    setLikes(next);
    const prefs = [
      ...next.map((p) => ({ preference: p, type: "like" })),
      ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ...restrictions.map((p) => ({ preference: p, type: "restriction" })),
    ];
    save({ preferences: prefs });
  }

  function addDislike() {
    const trimmed = dislikeText.trim();
    if (!trimmed || dislikes.includes(trimmed)) return;
    const next = [...dislikes, trimmed];
    setDislikes(next);
    setDislikeText("");
    const prefs = [
      ...likes.map((p) => ({ preference: p, type: "like" })),
      ...next.map((p) => ({ preference: p, type: "dislike" })),
      ...restrictions.map((p) => ({ preference: p, type: "restriction" })),
    ];
    save({ preferences: prefs });
  }

  function removeDislike(item: string) {
    const next = dislikes.filter((d) => d !== item);
    setDislikes(next);
    const prefs = [
      ...likes.map((p) => ({ preference: p, type: "like" })),
      ...next.map((p) => ({ preference: p, type: "dislike" })),
      ...restrictions.map((p) => ({ preference: p, type: "restriction" })),
    ];
    save({ preferences: prefs });
  }

  function toggleRestriction(item: string) {
    const next = restrictions.includes(item)
      ? restrictions.filter((r) => r !== item)
      : [...restrictions, item];
    setRestrictions(next);
    const prefs = [
      ...likes.map((p) => ({ preference: p, type: "like" })),
      ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ...next.map((p) => ({ preference: p, type: "restriction" })),
    ];
    save({ preferences: prefs });
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        onPress: () => signOut(),
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getTokenRef.current();
              if (!token) return;
              await deleteAccount(token);
              await signOut();
            } catch {
              setToast("Failed to delete account");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.cta.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>My profile</Text>

        {/* Household */}
        <Text style={styles.sectionTitle}>Who's cooking?</Text>
        <View style={styles.grid}>
          {HOUSEHOLD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => selectHousehold(opt.value)}
              style={[styles.card, household === opt.value && styles.cardSelected]}
            >
              <Text
                style={[
                  styles.cardLabel,
                  household === opt.value && styles.cardLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Cooking frequency */}
        <Text style={styles.sectionTitle}>How often do you cook?</Text>
        <View style={styles.list}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={frequency === opt.value}
              onPress={() => selectFrequency(opt.value)}
            />
          ))}
        </View>

        {/* Cook times */}
        <Text style={styles.sectionTitle}>Preferred cook time</Text>
        <View style={styles.list}>
          {TIME_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={times.includes(opt.value)}
              onPress={() => toggleTime(opt.value)}
            />
          ))}
        </View>

        {/* Serving size */}
        <Text style={styles.sectionTitle}>How much do you usually make?</Text>
        <View style={styles.grid}>
          {SERVING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => selectServings(opt.value)}
              style={[styles.card, servings === opt.value && styles.cardSelected]}
            >
              <Text
                style={[
                  styles.cardLabel,
                  servings === opt.value && styles.cardLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Favourite cuisines */}
        <Text style={styles.sectionTitle}>What do you like to eat?</Text>
        <View style={styles.chips}>
          {FOOD_LIKES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={likes.includes(item)}
              onPress={() => toggleLike(item)}
            />
          ))}
        </View>

        {/* Dislikes */}
        <Text style={styles.sectionTitle}>Anything you don't eat?</Text>
        <PillInput
          value={dislikeText}
          onChangeText={setDislikeText}
          onSubmit={addDislike}
          placeholder="e.g. shellfish, gluten, cilantro"
        />
        {dislikes.length > 0 && (
          <View style={styles.tags}>
            {dislikes.map((item) => (
              <Tag
                key={item}
                label={item}
                variant="accent"
                onRemove={() => removeDislike(item)}
              />
            ))}
          </View>
        )}

        {/* Dietary restrictions */}
        <Text style={styles.sectionTitle}>Dietary restrictions</Text>
        <View style={styles.chips}>
          {RESTRICTIONS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={restrictions.includes(item)}
              onPress={() => toggleRestriction(item)}
            />
          ))}
        </View>

        {/* Account actions */}
        <View style={styles.accountSection}>
          <Pressable
            style={styles.accountRow}
            onPress={() => Linking.openURL("https://grovr.app/privacy")}
          >
            <Text style={styles.accountRowText}>Privacy policy</Text>
            <Text style={styles.accountRowArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.accountRow} onPress={handleSignOut}>
            <Text style={styles.accountRowText}>Sign out</Text>
            <Text style={styles.accountRowArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.deleteRow} onPress={handleDeleteAccount}>
            <Text style={styles.deleteRowText}>Delete account</Text>
          </Pressable>
        </View>
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
    paddingBottom: 40,
  },
  title: {
    ...typ.h2,
    color: colors.text,
    marginBottom: 24,
  },
  sectionTitle: {
    ...typ.h4,
    color: colors.text,
    marginTop: 28,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "47%",
    minHeight: 76,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  cardSelected: {
    backgroundColor: colors.cta[100],
    borderWidth: 2,
    borderColor: colors.cta.DEFAULT,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  cardLabelSelected: {
    color: colors.cta[800],
  },
  list: {
    gap: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  accountSection: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 20,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  accountRowText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  accountRowArrow: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.neutral[500],
  },
  deleteRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  deleteRowText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#b91c1c",
  },
});
