import { useAuth } from "@clerk/expo";
import { useCallback, useState } from "react";
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
  SectionList,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Modal,
} from "react-native";
import {
  getPantryItems,
  addPantryItem,
  deletePantryItem,
  updatePantryItem,
  type PantryItemResponse,
} from "../../lib/api";

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  fridge: { label: "Fridge", icon: "🧊" },
  spice: { label: "Spices", icon: "🌿" },
  pantry: { label: "Pantry", icon: "🏠" },
};

const CATEGORY_ORDER = ["fridge", "spice", "pantry"];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  fresh: { label: "Fresh", color: "#16a34a", bg: "#f0fdf4" },
  use_soon: { label: "Use soon", color: "#ca8a04", bg: "#fefce8" },
  urgent: { label: "Today!", color: "#ea580c", bg: "#fff7ed" },
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

  const fetchItems = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getPantryItems(token);
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
      setItems((prev) => [...prev, data.item]);
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

  function handleRemove(item: PantryItemResponse) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Used up", "Mark expired"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        title: item.name,
        message: item.quantity && item.unit
          ? `${item.quantity} ${item.unit}`
          : undefined,
      },
      async (buttonIndex) => {
        if (buttonIndex === 0) return;
        const reason = buttonIndex === 1 ? "used" : "expired";
        try {
          const token = await getToken();
          if (!token) return;
          await deletePantryItem(token, item.id, reason as "used" | "expired");
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          Alert.alert("Error", "Failed to remove item");
        }
      }
    );
  }

  function openEditQuantity(item: PantryItemResponse) {
    setEditingItem(item);
    setEditQty(item.quantity ?? 1);
    setEditUnit(item.unit ?? "ct");
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
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, quantity: editQty, unit: editUnit }
            : i
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update quantity");
    } finally {
      setEditingItem(null);
    }
  }

  const sections = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    title:
      `${CATEGORY_LABELS[cat]?.icon ?? ""} ${CATEGORY_LABELS[cat]?.label ?? cat}`,
    data: items
      .filter((i) => (i.category ?? "pantry") === cat)
      .sort((a, b) => {
        const order = { expired: 0, urgent: 1, use_soon: 2, fresh: 3 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }),
  })).filter((s) => s.data.length > 0);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pantry</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addHeaderButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setShowAdd(!showAdd)}
        >
          <Text style={styles.addHeaderText}>
            {showAdd ? "Cancel" : "+ Add"}
          </Text>
        </Pressable>
      </View>

      {showAdd && (
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
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              (adding || !newName.trim()) && { opacity: 0.4 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleAdd}
            disabled={adding || !newName.trim()}
          >
            <Text style={styles.addButtonText}>
              {adding ? "Adding..." : "Add to pantry"}
            </Text>
          </Pressable>
        </View>
      )}

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

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧑‍🍳</Text>
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptyText}>
            Tap "+ Add" to start tracking what you have on hand.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.fresh;
            const hasQty = item.quantity != null && item.unit;
            const qtyLabel = hasQty
              ? `${item.quantity} ${item.unit}`
              : "Set qty";

            return (
              <View style={styles.itemRow}>
                <Pressable
                  style={styles.checkButton}
                  onPress={() => handleRemove(item)}
                >
                  <View style={styles.checkbox} />
                </Pressable>
                <Pressable
                  style={styles.itemContent}
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
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Edit quantity modal */}
      <Modal
        visible={editingItem !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  addSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddeee4",
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
  addButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0e1f14",
    marginTop: 20,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8f0eb",
    overflow: "hidden",
  },
  checkButton: {
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#c4d4cb",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
    paddingVertical: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#f6fdf8",
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
