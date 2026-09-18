import { useAuth } from "@clerk/expo";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { ShoppingCart, Check } from "lucide-react-native";
import {
  getShoppingList,
  addToShoppingList,
  addPantryItem,
  deductPantryItems,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  type ShoppingListItem,
  type RecipeIngredient,
} from "../../lib/api";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";

const QUANTITIES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 32, 48, 64,
];
const UNITS = [
  "ct",
  "oz", "lbs", "g",
  "tsp", "tbsp", "cup", "fl oz", "pint", "quart", "gallon", "mL",
  "clove", "slice", "can", "stick", "head", "sprig",
  "dozen", "bunch",
];

export default function ShopScreen() {
  const router = useRouter();
  const { getToken, sessionId } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerUnit, setPickerUnit] = useState("ct");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  // "All done" modal state
  const [doneSection, setDoneSection] = useState<{ items: ShoppingListItem[]; isRecipe: boolean } | null>(null);

  // "Bought extra?" modal state
  const [extraItem, setExtraItem] = useState<ShoppingListItem | null>(null);
  const [boughtQty, setBoughtQty] = useState(1);
  const [boughtUnit, setBoughtUnit] = useState("ct");

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
      if (sessionId) fetchItems();
    }, [fetchItems, sessionId])
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
    setAdding(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const data = await addToShoppingList(token, [
        { name: trimmed, quantity: String(pickerQty), unit: pickerUnit },
      ]);
      setItems((prev) => [...prev, ...data.items]);
      setNewName("");
      setPickerQty(1);
      setPickerUnit("ct");
      setShowAdd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* ignore */ } finally {
      setAdding(false);
    }
  }

  // All items checked in a section — prompt for intent
  function handleSectionComplete(sectionTitle: string, isRecipe: boolean) {
    const sectionItems = isRecipe
      ? items.filter((i) => i.recipeTitle === sectionTitle)
      : items.filter((i) => !i.recipeTitle);

    setDoneSection({ items: sectionItems, isRecipe });
  }

  // "Just bought" — add items to kitchen, clear section
  async function addItemsToKitchenAndClear(sectionItems: ShoppingListItem[]) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ids = new Set(sectionItems.map((i) => i.id));
    setItems((prev) => prev.filter((i) => !ids.has(i.id)));
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      // Add all to kitchen in parallel
      const results = await Promise.all(
        sectionItems.map((i) => {
          const qty = i.quantity ? parseFloat(i.quantity) : 1;
          return addPantryItem(token, {
            name: i.name,
            quantity: isNaN(qty) ? 1 : qty,
            unit: i.unit || "ct",
          });
        })
      );
      // Delete from shopping list
      await Promise.all(sectionItems.map((i) => deleteShoppingItem(token, i.id)));

      const duplicates = results.filter((r) => r.duplicate);
      if (duplicates.length > 0) {
        const names = duplicates.map((_, idx) => sectionItems[results.indexOf(_)].name).join(", ");
        setToast(`Added to kitchen. ${names} stored in different units.`);
      } else {
        setToast("Added to kitchen");
      }
    } catch {
      fetchItems();
    }
  }

  // "Bought & cooked" — skip kitchen add (net zero), deduct existing pantry items, clear section
  async function handleBoughtAndCooked(sectionItems: ShoppingListItem[]) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ids = new Set(sectionItems.map((i) => i.id));
    setItems((prev) => prev.filter((i) => !ids.has(i.id)));
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      // Build ingredient list for deduction (items already in pantry that were used)
      const ingredients: RecipeIngredient[] = sectionItems.map((i) => ({
        name: i.name,
        quantity: i.quantity ?? "1",
        unit: i.unit ?? "ct",
        inPantry: false, // these were bought, not from pantry — deduct handles "inPantry" items only
      }));
      // Deduct will only touch items marked inPantry, so this is safe
      await deductPantryItems(token, ingredients);
      // Delete from shopping list
      await Promise.all(sectionItems.map((i) => deleteShoppingItem(token, i.id)));
      setToast("Done. Enjoy your meal.");
    } catch {
      fetchItems();
    }
  }

  // "Bought extra?" — open modal to log total quantity bought
  function openBoughtExtra(item: ShoppingListItem) {
    const qty = item.quantity ? parseFloat(item.quantity) : 1;
    setBoughtQty(isNaN(qty) ? 1 : qty);
    setBoughtUnit(item.unit || "ct");
    setExtraItem(item);
  }

  async function handleBoughtExtra() {
    if (!extraItem) return;
    const recipeQty = extraItem.quantity ? parseFloat(extraItem.quantity) : 0;
    const extra = boughtQty - (isNaN(recipeQty) ? 0 : recipeQty);
    if (extra <= 0) {
      setExtraItem(null);
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const result = await addPantryItem(token, {
        name: extraItem.name,
        quantity: extra,
        unit: boughtUnit,
      });
      const cat = result.item.category;
      const label = CATEGORY_LABELS[cat] ?? "Kitchen";
      setToast(`${extra} ${boughtUnit} extra added to ${label}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setToast("Failed to save extra");
    } finally {
      setExtraItem(null);
    }
  }

  // Group by recipe title — preserve original order
  const sections = (() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    const ungrouped: ShoppingListItem[] = [];
    for (const item of items) {
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

  function renderLeftActions(item: ShoppingListItem) {
    return (
      <Pressable style={styles.swipeAction} onPress={() => handleDelete(item)}>
        <Text style={styles.swipeActionText}>Remove</Text>
      </Pressable>
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
        renderLeftActions={() => renderLeftActions(item)}
        overshootLeft={false}
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
          {item.checked && (
            <Pressable
              onPress={() => openBoughtExtra(item)}
              hitSlop={8}
              style={styles.addMoreBtn}
            >
              <Text style={styles.addMoreText}>add more</Text>
            </Pressable>
          )}
        </Pressable>
      </Swipeable>
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
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shopping list</Text>
          <Text style={styles.summary}>
            {totalCount === 0
              ? "Nothing here yet."
              : `${checkedCount} of ${totalCount} checked`}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          onPress={() => { setNewName(""); setPickerQty(1); setPickerUnit("ct"); setShowAdd(true); }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Add item modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add to list</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Item name (e.g. milk)"
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
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCircle}>
            <ShoppingCart size={32} strokeWidth={2.75} color={colors.neutral[600]} />
          </View>
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptyBody}>
            Add items or pull missing ingredients from a recipe.
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
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => {
              const allChecked =
                section.data.length > 0 &&
                section.data.every((i) => i.checked);
              const isRecipe = section.title !== "Items";
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { flex: 1 }]}>{section.title.toUpperCase()}</Text>
                  {allChecked && (
                    <Pressable
                      style={styles.cookedBtn}
                      onPress={() => handleSectionComplete(section.title, isRecipe)}
                    >
                      <Check size={14} strokeWidth={2.75} color={colors.bg} />
                      <Text style={styles.cookedBtnText}>
                        {isRecipe ? "All done" : "Add to kitchen"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
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

      {/* Bought extra modal */}
      <Modal visible={extraItem !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setExtraItem(null)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              How much {extraItem?.name} do you need?
            </Text>
            {extraItem?.recipeTitle ? (
              <Text style={styles.sheetNote}>
                Recipe calls for {extraItem?.quantity ?? "?"} {extraItem?.unit ?? ""}. Any extra will be added to your kitchen.
              </Text>
            ) : null}
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Qty</Text>
                <Picker
                  selectedValue={boughtQty}
                  onValueChange={setBoughtQty}
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
                  selectedValue={boughtUnit}
                  onValueChange={setBoughtUnit}
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
              <Button title="Save" onPress={handleBoughtExtra} />
              <Button title="Cancel" variant="secondary" onPress={() => setExtraItem(null)} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* All done modal */}
      <Modal visible={doneSection !== null} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setDoneSection(null)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>All done!</Text>
            <Text style={styles.sheetNote}>
              {doneSection?.isRecipe
                ? "Did you already cook this, or just stocking up?"
                : "Add these to your kitchen?"}
            </Text>
            <View style={styles.sheetActions}>
              {doneSection?.isRecipe ? (
                <>
                  <Button
                    title="Just bought"
                    onPress={() => {
                      if (doneSection) addItemsToKitchenAndClear(doneSection.items);
                      setDoneSection(null);
                    }}
                  />
                  <Button
                    title="Bought and cooked"
                    variant="secondary"
                    onPress={() => {
                      if (doneSection) handleBoughtAndCooked(doneSection.items);
                      setDoneSection(null);
                    }}
                  />
                </>
              ) : (
                <Button
                  title="Add to kitchen"
                  onPress={() => {
                    if (doneSection) addItemsToKitchenAndClear(doneSection.items);
                    setDoneSection(null);
                  }}
                />
              )}
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
    backgroundColor: colors.cta.DEFAULT,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.bg,
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
  // Swipe
  swipeAction: {
    backgroundColor: colors.cta.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 6,
    marginLeft: layout.screenGutter,
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
  // Cooked it button
  cookedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accent2[600],
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cookedBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.bg,
  },
  // Add more
  addMoreBtn: {
    padding: 6,
    marginLeft: 8,
  },
  addMoreText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.neutral[500],
  },
  // Sheet
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
  sheetNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.neutral[600],
    marginBottom: 8,
  },
  sheetActions: {
    gap: 8,
    marginTop: 8,
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
