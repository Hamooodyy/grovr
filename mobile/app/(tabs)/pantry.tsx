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
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  getPantryItems,
  addPantryItem,
  deletePantryItem,
  updatePantryItem,
  type PantryItemResponse,
} from "../../lib/api";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Chip } from "../../components/Chip";
import { Tag } from "../../components/Tag";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";

const CATEGORY_ORDER = ["fridge", "spice", "pantry"] as const;

const CATEGORY_META: Record<string, {
  label: string;
  emptyTitle: string;
  emptyBody: string;
  addTitle: string;
}> = {
  fridge: {
    label: "Fridge",
    emptyTitle: "Your fridge is empty!",
    emptyBody: "Tap \"+ Add\" to stock the fridge — a few things is plenty.",
    addTitle: "Add to fridge",
  },
  spice: {
    label: "Spice rack",
    emptyTitle: "Where's the flavour?",
    emptyBody: "Tap \"+ Add\" to put your everyday spices on the shelf.",
    addTitle: "Add to spice rack",
  },
  pantry: {
    label: "Pantry",
    emptyTitle: "You've been raided!",
    emptyBody: "Tap \"+ Add\" to restock the dry goods.",
    addTitle: "Add to pantry",
  },
};

const STATUS_TAG: Record<string, { label: string; variant: "accent" | "accent2" | "neutral" }> = {
  fresh: { label: "Fresh", variant: "accent2" },
  use_soon: { label: "Use soon", variant: "accent" },
  urgent: { label: "Use today", variant: "accent" },
  expired: { label: "Expired", variant: "neutral" },
};

const QUANTITIES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 32, 48, 64,
];

const UNITS = ["ct", "oz", "lbs", "g", "fl oz", "pint", "gallon", "mL", "dozen", "pack", "bunch"];

export default function PantryScreen() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<PantryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("fridge");
  const [toast, setToast] = useState("");

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerUnit, setPickerUnit] = useState("ct");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingItem, setEditingItem] = useState<PantryItemResponse | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editUnit, setEditUnit] = useState("ct");
  const [editCategory, setEditCategory] = useState("fridge");

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const fetchItems = useCallback(async () => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await getPantryItems(token);
      setItems(data.items);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchItems(); }, [fetchItems])
  );

  function getCategory(item: PantryItemResponse): string {
    return CATEGORY_ORDER.includes(item.category as typeof CATEGORY_ORDER[number])
      ? item.category
      : "pantry";
  }

  const filteredItems = items
    .filter((i) => getCategory(i) === activeTab)
    .sort((a, b) => {
      const ea = a.estimatedExpiry ? new Date(a.estimatedExpiry).getTime() : Infinity;
      const eb = b.estimatedExpiry ? new Date(b.estimatedExpiry).getTime() : Infinity;
      return ea - eb;
    });

  const totalItems = items.length;

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await addPantryItem(token, {
        name: trimmed,
        category: activeTab,
        quantity: pickerQty,
        unit: pickerUnit,
      });
      setItems((prev) => {
        const exists = prev.find((i) => i.id === data.item.id);
        if (exists) return prev.map((i) => (i.id === data.item.id ? data.item : i));
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
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await deletePantryItem(token, item.id, "used");
    } catch {
      fetchItems();
    }
  }

  function openEdit(item: PantryItemResponse) {
    setEditingItem(item);
    setEditQty(item.quantity ?? 1);
    setEditUnit(item.unit ?? "ct");
    setEditCategory(getCategory(item));
  }

  async function saveEdit() {
    if (!editingItem) return;
    try {
      const token = await getTokenRef.current();
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

  function renderLeftActions(item: PantryItemResponse) {
    return (
      <Pressable style={styles.swipeAction} onPress={() => handleRemove(item)}>
        <Text style={styles.swipeText}>Remove</Text>
      </Pressable>
    );
  }

  function daysAgo(dateStr: string): string {
    const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.DEFAULT} />
      </View>
    );
  }

  const meta = CATEGORY_META[activeTab];

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My kitchen</Text>
            <Text style={styles.lead}>
              {totalItems > 0
                ? `${totalItems} item${totalItems === 1 ? "" : "s"} · freshness is an estimate`
                : "Empty for now — add a few things and Grovr starts working."}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            onPress={() => { setNewName(""); setPickerQty(1); setPickerUnit("ct"); setShowAdd(true); }}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {/* Category tabs */}
        <View style={styles.categoryTabs}>
          {CATEGORY_ORDER.map((cat) => {
            const active = activeTab === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveTab(cat)}
                style={[styles.categoryTab, active && styles.categoryTabActive]}
              >
                <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                  {CATEGORY_META[cat].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Add sheet */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{meta?.addTitle ?? "Add item"}</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Item name (e.g. chicken breast)"
              placeholderTextColor={colors.neutral[500]}
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
            <View style={styles.sheetActions}>
              <Button title={adding ? "Adding..." : "Add item"} onPress={handleAdd} disabled={adding || !newName.trim()} />
              <Button title="Cancel" variant="secondary" onPress={() => setShowAdd(false)} />
            </View>
            <Text style={styles.sheetNote}>
              Quantity is optional — Grovr estimates from what you cook.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{meta?.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{meta?.emptyBody}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const st = STATUS_TAG[item.status] ?? STATUS_TAG.fresh;
            const hasQty = item.quantity != null && item.unit;
            const subLine = hasQty
              ? `${item.quantity} ${item.unit} · added ${daysAgo(item.addedAt)}`
              : item.category === "spice"
              ? "Staple"
              : `added ${daysAgo(item.addedAt)}`;

            return (
              <Swipeable
                renderLeftActions={() => renderLeftActions(item)}
                overshootLeft={false}
              >
                <Pressable style={styles.itemRow} onPress={() => openEdit(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSub}>{subLine}</Text>
                  </View>
                  <Tag label={st.label} variant={st.variant} />
                </Pressable>
              </Swipeable>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Disclaimer */}
      {filteredItems.length > 0 && (
        <Text style={styles.disclaimer}>
          Freshness is estimated from when an item arrived and how it's usually
          kept. Trust your eyes and nose first.
        </Text>
      )}

      {/* Edit sheet */}
      <Modal visible={editingItem !== null} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setEditingItem(null)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingItem?.name ?? "Edit"}</Text>
            <View style={styles.editCategoryRow}>
              {CATEGORY_ORDER.map((cat) => (
                <Chip
                  key={cat}
                  label={CATEGORY_META[cat].label}
                  selected={editCategory === cat}
                  onPress={() => setEditCategory(cat)}
                  style={{ flex: 1, alignItems: "center" }}
                />
              ))}
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
            <View style={styles.sheetActions}>
              <Button title="Save" onPress={saveEdit} />
              <Button title="Cancel" variant="secondary" onPress={() => setEditingItem(null)} />
            </View>
          </View>
        </View>
      </Modal>

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
    paddingTop: 66,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: {
    ...typ.h2,
    color: colors.text,
  },
  lead: {
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
  categoryTabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radii.pill,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  categoryTabActive: {
    backgroundColor: colors.accent.DEFAULT,
  },
  categoryTabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral[600],
  },
  categoryTabTextActive: {
    color: colors.bg,
  },
  // Items
  listContent: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  itemName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  itemSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[600],
    marginTop: 1,
  },
  // Swipe
  swipeAction: {
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 20,
    borderRadius: 26,
    marginBottom: 8,
    width: 100,
  },
  swipeText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.bg,
    fontSize: 14,
  },
  // Empty
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
  // Disclaimer
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[600],
    textAlign: "center",
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 12,
  },
  // Sheets
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
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: 40,
    paddingHorizontal: layout.screenGutter,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.neutral[400],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: {
    ...typ.h4,
    color: colors.text,
    marginBottom: 12,
  },
  sheetInput: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  sheetActions: {
    gap: 8,
    marginTop: 8,
  },
  sheetNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[600],
    textAlign: "center",
    marginTop: 10,
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
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  picker: {
    width: "100%",
    height: 150,
  },
  pickerItem: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.text,
  },
  editCategoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
});
