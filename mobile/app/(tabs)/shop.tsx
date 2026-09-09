import { useAuth } from "@clerk/expo";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  SectionList,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  getShoppingList,
  addToShoppingList,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  type ShoppingListItem,
} from "../../lib/api";

export default function ShopScreen() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add item state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getShoppingList(token);
      setItems(data.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  async function handleToggle(item: ShoppingListItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    );
    try {
      const token = await getToken();
      if (!token) return;
      await toggleShoppingItem(token, item.id, newChecked);
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
      const token = await getToken();
      if (!token) return;
      await deleteShoppingItem(token, item.id);
    } catch {
      Alert.alert("Error", "Failed to remove item");
      fetchItems();
    }
  }

  async function handleClearChecked() {
    const checkedCount = items.filter((i) => i.checked).length;
    if (checkedCount === 0) return;
    Alert.alert(
      "Clear checked items?",
      `Remove ${checkedCount} checked item${checkedCount > 1 ? "s" : ""} from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setItems((prev) => prev.filter((i) => !i.checked));
            try {
              const token = await getToken();
              if (!token) return;
              await clearCheckedItems(token);
            } catch {
              Alert.alert("Error", "Failed to clear items");
              fetchItems();
            }
          },
        },
      ]
    );
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await addToShoppingList(token, [{ name: trimmed }]);
      setItems((prev) => [...prev, ...data.items]);
      setNewName("");
      setShowAdd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to add item");
    } finally {
      setAdding(false);
    }
  }

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
    const qty = item.quantity && item.unit
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
            {item.checked && <Text style={styles.checkmark}>{'✓'}</Text>}
          </View>
          <Text
            style={[styles.itemName, item.checked && styles.itemNameChecked]}
            numberOfLines={1}
          >
            {qty}{item.name}
          </Text>
        </Pressable>
      </Swipeable>
    );
  }

  // Group items by recipe title
  const sections = (() => {
    const recipeGroups: Record<string, ShoppingListItem[]> = {};
    const ungrouped: ShoppingListItem[] = [];

    // Unchecked first, then checked
    const sorted = [...items].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return 0;
    });

    for (const item of sorted) {
      if (item.recipeTitle) {
        if (!recipeGroups[item.recipeTitle]) {
          recipeGroups[item.recipeTitle] = [];
        }
        recipeGroups[item.recipeTitle].push(item);
      } else {
        ungrouped.push(item);
      }
    }

    const result: Array<{ title: string; data: ShoppingListItem[] }> = [];
    if (ungrouped.length > 0) {
      result.push({ title: "Items", data: ungrouped });
    }
    for (const [title, data] of Object.entries(recipeGroups)) {
      result.push({ title, data });
    }
    return result;
  })();

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shopping List</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addHeaderButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              setNewName("");
              setShowAdd(true);
            }}
          >
            <Text style={styles.addHeaderText}>+ Add</Text>
          </Pressable>
        </View>

        {totalCount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {checkedCount} of {totalCount} item{totalCount > 1 ? "s" : ""} checked
            </Text>
            {checkedCount > 0 && (
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                onPress={handleClearChecked}
              >
                <Text style={styles.clearText}>Clear checked</Text>
              </Pressable>
            )}
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptyText}>
              Add items manually or tap "Add Missing to List" from a recipe.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Add item bottom sheet */}
        <Modal visible={showAdd} transparent animationType="slide">
          <KeyboardAvoidingView
            style={styles.sheetOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setShowAdd(false)} />
            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowAdd(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Add Item</Text>
                <Pressable
                  onPress={handleAdd}
                  disabled={adding || !newName.trim()}
                >
                  <Text
                    style={[
                      styles.modalSave,
                      (adding || !newName.trim()) && { opacity: 0.4 },
                    ]}
                  >
                    {adding ? "Adding..." : "Add"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.addInput}
                placeholder="Item name (e.g. milk)"
                placeholderTextColor="#a3b5aa"
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fdf8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0e1f14",
  },
  addHeaderButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addHeaderText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#6a7c71",
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
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
    paddingBottom: 40,
  },
  sectionHeader: {
    backgroundColor: "#f6fdf8",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0e1f14",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e8f0eb",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cdddd3",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  checkmark: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  itemName: {
    fontSize: 16,
    color: "#0e1f14",
    flex: 1,
  },
  itemNameChecked: {
    color: "#a3b5aa",
    textDecorationLine: "line-through",
  },
  swipeAction: {
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  swipeActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Bottom sheet styles
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetContent: {
    backgroundColor: "#f6fdf8",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cdddd3",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalCancel: {
    fontSize: 16,
    color: "#6a7c71",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0e1f14",
  },
  modalSave: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "600",
  },
  addInput: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddeee4",
    padding: 14,
    fontSize: 16,
    color: "#0e1f14",
    marginBottom: 16,
  },
});
