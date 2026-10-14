import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, fonts, type as typ, radii, layout } from "../lib/theme";
import { Chip } from "./Chip";
import { Button } from "./Button";

const REASONS = [
  "Didn't like an ingredient",
  "Too complicated",
  "Takes too long",
  "Not a cuisine I like",
  "Too heavy",
  "Not in the mood for this",
];

interface DislikeReasonSheetProps {
  recipeTitle: string | null;
  /** Called with the combined reason, or undefined when skipped */
  onDone: (reason?: string) => void;
}

export function DislikeReasonSheet({ recipeTitle, onDone }: DislikeReasonSheetProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState("");

  // Reset each time the sheet opens for a new recipe
  useEffect(() => {
    if (recipeTitle) {
      setSelected([]);
      setDetails("");
    }
  }, [recipeTitle]);

  function toggle(reason: string) {
    setSelected((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }

  function submit() {
    const parts = [...selected];
    if (details.trim()) parts.push(`"${details.trim()}"`);
    onDone(parts.length > 0 ? parts.join("; ") : undefined);
  }

  const hasInput = selected.length > 0 || details.trim().length > 0;

  return (
    <Modal visible={recipeTitle !== null} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={() => onDone()} />
        <View style={styles.content}>
          <View style={styles.handle} />
          <Text style={styles.title}>What didn't work?</Text>
          <View style={styles.chips}>
            {REASONS.map((reason) => (
              <Chip
                key={reason}
                label={reason}
                selected={selected.includes(reason)}
                onPress={() => toggle(reason)}
              />
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tell us more (e.g. 'no mushrooms')"
            placeholderTextColor={colors.neutral[500]}
            value={details}
            onChangeText={setDetails}
            maxLength={200}
            returnKeyType="done"
          />
          <View style={styles.actions}>
            <Button title="Submit" onPress={submit} disabled={!hasInput} />
            <Button title="Skip" variant="secondary" onPress={() => onDone()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  content: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: 40,
    paddingHorizontal: layout.screenGutter,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.neutral[400],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    ...typ.h4,
    color: colors.text,
    marginBottom: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
  },
  actions: {
    gap: 10,
  },
});
