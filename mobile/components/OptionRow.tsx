import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radii, fonts, layout } from "../lib/theme";

interface OptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionRow({ label, selected, onPress }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.optionRowHeight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    justifyContent: "center",
  },
  rowSelected: {
    backgroundColor: colors.cta[100],
    borderWidth: 2,
    borderColor: colors.cta.DEFAULT,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  labelSelected: {
    color: colors.cta[800],
  },
});
