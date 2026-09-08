import { View, Text, StyleSheet } from "react-native";

export default function ShopScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.subtitle}>Your shopping lists</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6fdf8",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0e1f14",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6a7c71",
  },
});
