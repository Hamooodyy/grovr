import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors, radii, fonts } from "../lib/theme";

type TagVariant = "accent" | "accent2" | "neutral";

interface TagProps {
  label: string;
  variant?: TagVariant;
  onRemove?: () => void;
}

export function Tag({ label, variant = "accent", onRemove }: TagProps) {
  return (
    <View style={[styles.base, bgStyles[variant]]}>
      <Text style={[styles.label, textStyles[variant]]}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={[styles.remove, textStyles[variant]]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    gap: 6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  remove: {
    fontSize: 12,
    lineHeight: 14,
  },
});

const bgStyles: Record<TagVariant, ViewStyle> = {
  accent: { backgroundColor: colors.accent[100] },
  accent2: { backgroundColor: colors.accent2[100] },
  neutral: { backgroundColor: colors.neutral[200] },
};

const textStyles: Record<TagVariant, TextStyle> = {
  accent: { color: colors.accent[800] },
  accent2: { color: colors.accent2[800] },
  neutral: { color: colors.neutral[700] },
};
