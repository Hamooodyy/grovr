import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Home, UtensilsCrossed, ShoppingCart, Leaf } from "lucide-react-native";
import { colors, fonts, layout } from "../../lib/theme";

const ICON_SIZE = 23;
const STROKE = 2.75;
const ACTIVE = colors.accent[800];
const INACTIVE = colors.neutral[600];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemiBold,
          fontSize: 11,
          lineHeight: 13,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: 30,
          height: layout.tabBarHeight,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : undefined}>
              <Home size={ICON_SIZE} strokeWidth={STROKE} color={focused ? ACTIVE : INACTIVE} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : undefined}>
              <UtensilsCrossed size={ICON_SIZE} strokeWidth={STROKE} color={focused ? ACTIVE : INACTIVE} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shopping list",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : undefined}>
              <ShoppingCart size={ICON_SIZE} strokeWidth={STROKE} color={focused ? ACTIVE : INACTIVE} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "My kitchen",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : undefined}>
              <Leaf size={ICON_SIZE} strokeWidth={STROKE} color={focused ? ACTIVE : INACTIVE} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activePill: {
    backgroundColor: colors.accent[200],
    borderRadius: 20,
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
