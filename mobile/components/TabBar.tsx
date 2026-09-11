import { View, Pressable, Text, StyleSheet } from "react-native";
import { Home, UtensilsCrossed, ShoppingCart, Leaf } from "lucide-react-native";
import { colors, radii, fonts, layout } from "../lib/theme";

const TABS = [
  { key: "index", label: "Home", Icon: Home },
  { key: "recipes", label: "Recipes", Icon: UtensilsCrossed },
  { key: "shop", label: "Shopping list", Icon: ShoppingCart },
  { key: "pantry", label: "Pantry", Icon: Leaf },
] as const;

const ICON_SIZE = 23;
const ICON_STROKE = 2.75;

interface TabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        return (
          <Pressable
            key={key}
            onPress={() => onTabPress(key)}
            style={styles.tab}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon
                size={ICON_SIZE}
                strokeWidth={ICON_STROKE}
                color={active ? colors.cta[800] : colors.neutral[600]}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.cta[200],
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 13,
    marginTop: 2,
    color: colors.neutral[600],
  },
  labelActive: {
    color: colors.cta[800],
  },
});
