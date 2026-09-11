import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { colors, radii, fonts } from "../lib/theme";

interface PillInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonLabel?: string;
}

export function PillInput({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Add item...",
  buttonLabel = "Add",
}: PillInputProps) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[500]}
        style={styles.input}
        returnKeyType="done"
      />
      <Pressable
        onPress={onSubmit}
        disabled={!value.trim()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          !value.trim() && styles.buttonDisabled,
        ]}
      >
        <Text style={[styles.buttonLabel, !value.trim() && styles.buttonLabelDisabled]}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.cta.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: colors.cta.pressed,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.bg,
  },
  buttonLabelDisabled: {
    color: colors.bg,
  },
});
