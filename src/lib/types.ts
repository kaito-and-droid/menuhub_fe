export interface ItemVariant {
  name: string;
  price: number;
  cost?: number | null;
}

export interface AdminItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  margin: string | null;
  image_url: string | null;
  is_available: boolean;
  ingredients: unknown[];
  variants: ItemVariant[];
}

export interface AdminCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  items: AdminItem[];
}

export interface AdminMenu {
  categories: AdminCategory[];
  uncategorized: AdminItem[];
}

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderItemLine {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  variant_name: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  campaign_title: string | null;
  payment_method: string;
  payment_status: string;
  delivery_type: string;
  delivery_address: string | null;
  postal_code: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  completed_at: string | null;
  estimated_ready_at: string | null;
  customer: { id: string; name: string; phone: string } | null;
  items: OrderItemLine[];
}

export interface CustomerDetail extends Customer {
  orders: Order[];
}

export interface OrdersAnalytics {
  total_orders: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  by_hour: { hour: number; orders: number }[];
  cancellation_rate: string;
}

export interface RecipeLine {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
  reorder_level: number;
  last_purchase_price: number | null;
  supplier_name: string | null;
  low_stock: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  variants: { name: string; price: number }[];
}

export type DiscountType = "none" | "percent" | "fixed";

export interface PublicCampaign {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  min_order_amount: number;
  ends_at: string | null;
  discount_label: string | null;
}

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  min_order_amount: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  status: "running" | "scheduled" | "expired" | "disabled";
  discount_label: string | null;
}

export interface SeoConfig {
  title_template: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
}

export interface OrderPageConfig {
  banner_image_url: string | null;
  banner_headline: string | null;
  banner_subtitle: string | null;
  announcement: string | null;
  announcement_style: "info" | "warning" | "promo";
  show_address: boolean;
  show_phone: boolean;
  opening_hours: string | null;
  instagram_handle: string | null;
  tiktok_username: string | null;
  facebook_page_url: string | null;
}

export interface PublicMenu {
  shop_name: string;
  facebook_page_id: string | null;
  estimated_wait_minutes: number;
  currency: string;
  payment_methods: string[];
  campaigns: PublicCampaign[];
  categories: { name: string; items: PublicMenuItem[] }[];
  order_page: OrderPageConfig | null;
  seo: SeoConfig | null;
}

export interface RevenueAnalytics {
  summary: {
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    profit_margin: string | null;
    order_count: number;
    avg_order_value: number;
  };
  by_date: { date: string; revenue: number; cogs: number; profit: number; orders: number }[];
  by_category: { category: string; revenue: number; cogs: number; profit_margin: string | null }[];
  payment_breakdown: Record<string, number>;
}

export interface CustomersAnalytics {
  top_spenders: {
    customer_id: string;
    name: string;
    lifetime_value: number;
    order_count: number;
    avg_order_value: number;
  }[];
  new_customers: number;
  repeat_rate: string;
}

export interface IngredientsAnalytics {
  low_stock_alerts: { id: string; name: string; current: number; reorder_level: number; unit: string }[];
  cogs_summary: {
    total_spent: number;
    start_date: string;
    end_date: string;
    by_ingredient: { name: string; total_spent: number }[];
  };
}
