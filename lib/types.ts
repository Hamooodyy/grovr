export type ItemSize = "S" | "M" | "L";

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  upc?: string;
  imageUrl?: string;
  brandPref?: string;
  size?: ItemSize; // S < 20 oz · M 20–79 oz · L ≥ 80 oz
}

export interface ProductSuggestion {
  productId: string;
  upc: string;
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
}

export interface ProductMatch {
  item: GroceryItem;
  matchedName: string;
  price: number;
  retailerId: string;
  upc?: string;
}

export interface Retailer {
  id: string;
  name: string;
  logoUrl: string;
  postalCode: string;
  lat?: number;
  lng?: number;
}

export interface PriceComparison {
  retailer: Retailer;
  subtotal: number;
  items: ProductMatch[];
}
