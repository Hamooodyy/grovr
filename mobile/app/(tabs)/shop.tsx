import { useAuth } from "@clerk/expo";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { ShoppingCart } from "lucide-react-native";
import {
  getShoppingList,
  addToShoppingList,
  addPantryItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  type ShoppingListItem,
} from "../../lib/api";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { PillInput } from "../../components/PillInput";
import { Toast } from "../../components/Toast";

export default function ShopScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState("");

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const fetchItems = useCallback(async () => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await getShoppingList(token);
      setItems(data.items);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const CATEGORY_LABELS: Record<string, string> = {
    fridge: "Fridge",
    spice: "Spice rack",
    pantry: "Pantry",
  };

  async function handleToggle(item: ShoppingListItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    );
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await toggleShoppingItem(token, item.id, newChecked);

      // Add to kitchen when checking off
      if (newChecked) {
        const qty = item.quantity ? parseFloat(item.quantity) : 1;
        const unit = item.unit || "ct";
        const result = await addPantryItem(token, {
          name: item.name,
          quantity: isNaN(qty) ? 1 : qty,
          unit,
        });
        const cat = result.item.category;
        const label = CATEGORY_LABELS[cat] ?? "Kitchen";
        setToast(`Added to ${label}`);
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, checked: !newChecked } : i))
      );
    }
  }

  async function handleDelete(item: ShoppingListItem) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await deleteShoppingItem(token, item.id);
    } catch {
      fetchItems();
    }
  }

  async function handleClearChecked() {
    const checkedCount = items.filter((i) => i.checked).length;
    if (checkedCount === 0) return;
    Alert.alert(
      "Clear checked items?",
      `Remove ${checkedCount} checked item${checkedCount > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setItems((prev) => prev.filter((i) => !i.checked));
            try {
              const token = await getTokenRef.current();
              if (!token) return;
              await clearCheckedItems(token);
            } catch { fetchItems(); }
          },
        },
      ]
    );
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Dedupe
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewName("");
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await addToShoppingList(token, [{ name: trimmed }]);
      setItems((prev) => [...prev, ...data.items]);
      setNewName("");
      setShowAdd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* ignore */ }
  }

  // Group by recipe title, unchecked before checked
  const sections = (() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    const ungrouped: ShoppingListItem[] = [];
    const sorted = [...items].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return 0;
    });
    for (const item of sorted) {
      if (item.recipeTitle) {
        if (!groups[item.recipeTitle]) groups[item.recipeTitle] = [];
        groups[item.recipeTitle].push(item);
      } else {
        ungrouped.push(item);
      }
    }
    const result: Array<{ title: string; data: ShoppingListItem[] }> = [];
    if (ungrouped.length > 0) result.push({ title: "Items", data: ungrouped });
    for (const [title, data] of Object.entries(groups)) {
      result.push({ title, data });
    }
    return result;
  })();

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  function renderRightActions(
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) {
    const opacity = dragX.interpolate({
      inputRange: [-80, -60, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: "clamp",
    });
    return (
      <Animated.View style={[styles.swipeAction, { opacity }]}>
        <Text style={styles.swipeActionText}>Remove</Text>
      </Animated.View>
    );
  }

  function renderItem({ item }: { item: ShoppingListItem }) {
    const qty =
      item.quantity && item.unit
        ? `${item.quantity} ${item.unit} `
        : item.quantity
        ? `${item.quantity} `
        : "";

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => handleDelete(item)}
        overshootRight={false}
      >
        <Pressable style={styles.itemRow} onPress={() => handleToggle(item)}>
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text
            style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}
            numberOfLines={1}
          >
            {qty}{item.name}
          </Text>
          <Pressable
            onPress={() => handleDelete(item)}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteX}>✕</Text>
          </Pressable>
        </Pressable>
      </Swipeable>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.DEFAULT} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shopping list</Text>
          <Text style={styles.summary}>
            {totalCount === 0
              ? "Nothing to buy yet."
              : `${checkedCount} of ${totalCount} checked`}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          onPress={() => { setNewName(""); setShowAdd(!showAdd); }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {showAdd && (
        <View style={styles.addRow}>
          <PillInput
            value={newName}
            onChangeText={setNewName}
            onSubmit={handleAdd}
            placeholder="Item name (e.g. milk)"
          />
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCircle}>
            <ShoppingCart size={32} strokeWidth={2.75} color={colors.neutral[600]} />
          </View>
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptyBody}>
            Add items yourself, or pull the missing ingredients straight out of a
            recipe.
          </Text>
          <Button
            title="Browse recipes"
            variant="secondary"
            onPress={() => router.push("/(tabs)/recipes")}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
          {checkedCount > 0 && (
            <View style={styles.footer}>
              <Button
                title={`Clear ${checkedCount} checked`}
                variant="secondary"
                onPress={handleClearChecked}
              />
            </View>
          )}
        </>
      )}

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast("")} />
    </GestureHandlerRootView>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 66,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 12,
  },
  title: {
    ...typ.h2,
    color: colors.text,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.neutral[600],
    marginTop: 2,
  },
  addBtn: {
    minHeight: 44,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.bg,
  },
  addRow: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 12,
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.screenGutter,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.96,
    color: colors.neutral[600],
    textTransform: "uppercase",
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.neutral[500],
  },
  // Item rows
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: layout.screenGutter,
    marginBottom: 6,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.neutral[400],
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.accent2[600],
    borderColor: colors.accent2[600],
  },
  checkmark: {
    fontFamily: fonts.body,
    color: colors.bg,
    fontSize: 14,
  },
  itemLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  itemLabelChecked: {
    color: colors.neutral[500],
    textDecorationLine: "line-through",
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  deleteX: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.neutral[500],
  },
  // Swipe
  swipeAction: {
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 6,
    marginRight: layout.screenGutter,
    borderRadius: radii.pill,
  },
  swipeActionText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.bg,
    fontSize: 13,
  },
  // List
  listContent: {
    paddingBottom: 20,
  },
  // Footer
  footer: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 16,
  },
  // Empty
  emptyCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    ...typ.h4,
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[600],
    textAlign: "center",
  },
});
