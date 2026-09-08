import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const GREEN = "#16a34a";
const MUTED = "#6a7c71";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          borderTopColor: "#ddeee4",
        },
        headerStyle: {
          backgroundColor: "#f6fdf8",
        },
        headerTintColor: "#0e1f14",
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
