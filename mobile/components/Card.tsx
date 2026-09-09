import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../lib/theme";

type Elevation = "sm" | "md";

interface CardProps {
  children: React.ReactNode;
  elevation?: Elevation;
  style?: ViewStyle;
}

export function Card({ children, elevation = "sm", style }: CardProps) {
  return (
    <View style={[styles.card, shadows[elevation], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 13.2,
  },
});
