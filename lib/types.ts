export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
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
}

export interface PriceComparison {
  retailer: Retailer;
  subtotal: number;
  items: ProductMatch[];
}
