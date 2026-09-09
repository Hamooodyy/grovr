import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { colors, radii, shadows, fonts } from "../lib/theme";

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, visible, onDismiss, duration = 2600 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, shadows.lg, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    backgroundColor: colors.neutral[900],
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    zIndex: 999,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.neutral[100],
  },
});
