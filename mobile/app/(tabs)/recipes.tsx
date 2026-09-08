import { View, Text, StyleSheet } from "react-native";

export default function RecipesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recipes</Text>
      <Text style={styles.subtitle}>Personalized recipes based on your pantry</Text>
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
