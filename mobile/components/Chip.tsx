import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, fonts, layout } from "../lib/theme";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, style]}
    >
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.minTapTarget,
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipSelected: {
    backgroundColor: colors.cta[100],
    borderWidth: 2,
    borderColor: colors.cta.DEFAULT,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  labelSelected: {
    color: colors.cta[800],
  },
});
