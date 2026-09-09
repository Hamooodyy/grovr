import { useAuth } from "@clerk/expo";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  getPantryItems,
  addPantryItem,
  deletePantryItem,
  updatePantryItem,
  type PantryItemResponse,
} from "../../lib/api";

const CATEGORY_LABELS: Record<string, { label: string; emptyTitle: string; emptyText: string }> = {
  fridge: { label: "Fridge", emptyTitle: "Your fridge is empty!", emptyText: "Tap \"+ Add\" to stock your fridge." },
  spice: { label: "Spice Rack", emptyTitle: "Where's the flavor?", emptyText: "Tap \"+ Add\" to add some spices." },
  pantry: { label: "Pantry", emptyTitle: "You've been raided!", emptyText: "Tap \"+ Add\" to restock your pantry." },
};

const CATEGORY_ORDER = ["fridge", "spice", "pantry"];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  fresh: { label: "Fresh", color: "#16a34a", bg: "#f0fdf4" },
  use_soon: { label: "Use soon", color: "#ca8a04", bg: "#fefce8" },
  urgent: { label: "Use today", color: "#ea580c", bg: "#fff7ed" },
  expired: { label: "Expired", color: "#dc2626", bg: "#fef2f2" },
};

const QUANTITIES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 32, 48, 64,
];

const UNITS = [
  "ct",
  "oz",
  "lbs",
  "g",
  "fl oz",
  "pint",
  "gallon",
  "mL",
  "dozen",
  "pack",
  "bunch",
];

export default function PantryScreen() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<PantryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Add item state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerUnit, setPickerUnit] = useState("ct");

  // Edit quantity state
  const [editingItem, setEditingItem] = useState<PantryItemResponse | null>(
    null
  );
  const [editQty, setEditQty] = useState(1);
  const [editUnit, setEditUnit] = useState("ct");
  const [editCategory, setEditCategory] = useState("fridge");
  const [activeTab, setActiveTab] = useState("fridge");

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const fetchItems = useCallback(async () => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await getPantryItems(token);
      setItems(data.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await addPantryItem(token, {
        name: trimmed,
        quantity: pickerQty,
        unit: pickerUnit,
      });
      setItems((prev) => {
        const exists = prev.find((i) => i.id === data.item.id);
        if (exists) {
          return prev.map((i) => (i.id === data.item.id ? data.item : i));
        }
        return [...prev, data.item];
      });
      setNewName("");
      setPickerQty(1);
      setPickerUnit("ct");
      setShowAdd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add item";
      Alert.alert("Error", msg);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(item: PantryItemResponse) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const token = await getToken();
      if (!token) return;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      await deletePantryItem(token, item.id, "used");
    } catch {
      Alert.alert("Error", "Failed to remove item");
      fetchItems();
    }
  }

  function renderLeftActions(
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) {
    const opacity = dragX.interpolate({
      inputRange: [0, 60, 80],
      outputRange: [0, 0.8, 1],
      extrapolate: "clamp",
    });
    return (
      <Animated.View style={[styles.swipeAction, { opacity }]}>
        <Text style={styles.swipeActionText}>Remove</Text>
      </Animated.View>
    );
  }

  function openEditQuantity(item: PantryItemResponse) {
    setEditingItem(item);
    setEditQty(item.quantity ?? 1);
    setEditUnit(item.unit ?? "ct");
    setEditCategory(getItemCategory(item));
  }

  async function saveEditQuantity() {
    if (!editingItem) return;
    try {
      const token = await getToken();
      if (!token) return;
      await updatePantryItem(token, {
        id: editingItem.id,
        quantity: editQty,
        unit: editUnit,
        category: editCategory,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, quantity: editQty, unit: editUnit, category: editCategory as PantryItemResponse["category"] }
            : i
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update");
    } finally {
      setEditingItem(null);
    }
  }

  function getItemCategory(item: PantryItemResponse): string {
    return CATEGORY_ORDER.includes(item.category as string) ? item.category! : "pantry";
  }

  const filteredItems = items
    .filter((i) => getItemCategory(i) === activeTab)
    .sort((a, b) => {
      const expiryA = a.estimatedExpiry ? new Date(a.estimatedExpiry).getTime() : Infinity;
      const expiryB = b.estimatedExpiry ? new Date(b.estimatedExpiry).getTime() : Infinity;
      return expiryA - expiryB;
    });

  const tabCounts = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => getItemCategory(i) === cat).length;
    return acc;
  }, {} as Record<string, number>);

  // Items from onboarding with no quantity
  const needsQuantity = items.filter((i) => i.quantity == null);

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
        <Text style={styles.title}>My Kitchen</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addHeaderButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            setNewName("");
            setPickerQty(1);
            setPickerUnit("ct");
            setShowAdd(true);
          }}
        >
          <Text style={styles.addHeaderText}>+ Add</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {CATEGORY_ORDER.map((cat) => {
          const info = CATEGORY_LABELS[cat];
          const active = activeTab === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(cat)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {info?.label}
                {tabCounts[cat] > 0 ? ` (${tabCounts[cat]})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
            <View style={styles.addSection}>
              <TextInput
                style={styles.addInput}
                placeholder="Item name (e.g. chicken breast)"
                placeholderTextColor="#6a7c71"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Qty</Text>
                  <Picker
                    selectedValue={pickerQty}
                    onValueChange={setPickerQty}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {QUANTITIES.map((q) => (
                      <Picker.Item key={q} label={String(q)} value={q} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Unit</Text>
                  <Picker
                    selectedValue={pickerUnit}
                    onValueChange={setPickerUnit}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {UNITS.map((u) => (
                      <Picker.Item key={u} label={u} value={u} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {needsQuantity.length > 0 && !showAdd && (
        <Pressable
          style={styles.quantityBanner}
          onPress={() => openEditQuantity(needsQuantity[0])}
        >
          <Text style={styles.bannerText}>
            {needsQuantity.length} item{needsQuantity.length > 1 ? "s" : ""}{" "}
            need quantities — tap to set
          </Text>
        </Pressable>
      )}

      {filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {CATEGORY_LABELS[activeTab]?.emptyTitle ?? "Nothing here yet"}
          </Text>
          <Text style={styles.emptyText}>
            {CATEGORY_LABELS[activeTab]?.emptyText ?? "Tap \"+ Add\" to get started."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.fresh;
            const hasQty = item.quantity != null && item.unit;
            const qtyLabel = hasQty
              ? `${item.quantity} ${item.unit}`
              : "Set qty";

            return (
              <Swipeable
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={(direction) => {
                  if (direction === "left") handleRemove(item);
                }}
                leftThreshold={80}
                overshootLeft={false}
              >
                <Pressable
                  style={styles.itemRow}
                  onPress={() => openEditQuantity(item)}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text
                      style={[
                        styles.itemQty,
                        !hasQty && { color: "#ea580c", fontStyle: "italic" },
                      ]}
                    >
                      {qtyLabel}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.bg },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </Pressable>
              </Swipeable>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit quantity bottom sheet */}
      <Modal visible={editingItem !== null} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setEditingItem(null)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditingItem(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editingItem?.name ?? "Edit"}
              </Text>
              <Pressable onPress={saveEditQuantity}>
                <Text style={styles.modalSave}>Save</Text>
              </Pressable>
            </View>
            <View style={styles.categoryRow}>
              {CATEGORY_ORDER.map((cat) => {
                const active = editCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {CATEGORY_LABELS[cat]?.label ?? cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Qty</Text>
                <Picker
                  selectedValue={editQty}
                  onValueChange={setEditQty}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {QUANTITIES.map((q) => (
                    <Picker.Item key={q} label={String(q)} value={q} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Unit</Text>
                <Picker
                  selectedValue={editUnit}
                  onValueChange={setEditUnit}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {UNITS.map((u) => (
                    <Picker.Item key={u} label={u} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addHeaderText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
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
    fontSize: 13,
    fontWeight: "500",
    color: "#6a7c71",
  },
  tabTextActive: {
    color: "#16a34a",
    fontWeight: "700",
  },
  addSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  addInput: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0e1f14",
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerCol: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6a7c71",
    marginBottom: 4,
  },
  picker: {
    width: "100%",
    height: 150,
  },
  pickerItem: {
    fontSize: 18,
    color: "#0e1f14",
  },
  quantityBanner: {
    backgroundColor: "#fff7ed",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
  },
  bannerText: {
    fontSize: 14,
    color: "#ea580c",
    fontWeight: "500",
    textAlign: "center",
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
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8f0eb",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  swipeAction: {
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 20,
    borderRadius: 12,
    marginBottom: 8,
    width: 100,
  },
  swipeActionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0e1f14",
  },
  itemQty: {
    fontSize: 13,
    color: "#6a7c71",
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c4d4cb",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddeee4",
  },
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6a7c71",
  },
  categoryChipTextActive: {
    color: "#16a34a",
    fontWeight: "700",
  },
  modalCancel: {
    fontSize: 16,
    color: "#6a7c71",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0e1f14",
  },
  modalSave: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "600",
  },
});
