import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors, radii, type as typ, fonts, layout } from "../lib/theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled && pressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.labelBase, labelStyles[variant]]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.ctaHeight,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.45,
  },
  labelBase: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    lineHeight: 20,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent.DEFAULT,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  ghost: {
    backgroundColor: "transparent",
  },
};

const pressedStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent[700],
  },
  secondary: {
    backgroundColor: colors.neutral[200],
  },
  ghost: {
    opacity: 0.7,
  },
};

const labelStyles: Record<Variant, TextStyle> = {
  primary: {
    color: colors.bg,
  },
  secondary: {
    color: colors.accent.DEFAULT,
  },
  ghost: {
    color: colors.accent.DEFAULT,
  },
};
