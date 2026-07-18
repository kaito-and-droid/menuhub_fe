/**
 * Mock data for frontend-only development.
 * Served automatically when the shop slug is "demo" (no backend needed).
 *
 * Visit:  http://localhost:3000/order/demo
 */

import { PublicMenu } from "./types";

export const MOCK_MENU: PublicMenu = {
  shop_name: "The Brew House ☕",
  facebook_page_id: null,
  estimated_wait_minutes: 10,
  currency: "SGD",
  payment_methods: ["cash", "paynow", "bank_transfer"],
  order_page: {
    banner_image_url: null,
    banner_headline: null,
    banner_subtitle: null,
    announcement: null,
    announcement_style: "promo",
    show_address: true,
    show_phone: true,
    opening_hours: null,
    instagram_handle: "thebrewhouse",
    tiktok_username: null,
    facebook_page_url: null,
  },
  seo: null,
  campaigns: [
    {
      id: "c1",
      title: "Happy Hour Deal",
      description: "Get 15% off any order above $20. Valid today only!",
      image_url: null,
      discount_type: "percent",
      discount_value: 15,
      min_order_amount: 2000,
      ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      discount_label: "15% OFF",
    },
    {
      id: "c2",
      title: "Free Delivery Promo",
      description: "Free delivery on orders above $30.",
      image_url: null,
      discount_type: "fixed",
      discount_value: 300,
      min_order_amount: 3000,
      ends_at: null,
      discount_label: "$3 OFF",
    },
  ],
  categories: [
    {
      name: "Coffee & Espresso",
      items: [
        {
          id: "item-1",
          name: "Flat White",
          description: "Smooth double ristretto with silky steamed milk. A Melbourne classic.",
          price: 550,
          image_url: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-2",
          name: "Iced Latte",
          description: "Chilled espresso over fresh milk and ice. Perfect for the heat.",
          price: 650,
          image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-3",
          name: "Cold Brew",
          description: "12-hour slow-steeped, full-bodied and naturally sweet.",
          price: 700,
          image_url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-4",
          name: "Matcha Latte",
          description: "Ceremonial-grade matcha whisked with oat milk.",
          price: 700,
          image_url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [
            { name: "Regular (12oz)", price: 700 },
            { name: "Large (16oz)", price: 850 },
          ],
        },
      ],
    },
    {
      name: "Pastries & Snacks",
      items: [
        {
          id: "item-5",
          name: "Butter Croissant",
          description: "Flaky, buttery layers baked fresh every morning.",
          price: 450,
          image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [
            { name: "Single", price: 450 },
            { name: "Box of 4", price: 1600 },
          ],
        },
        {
          id: "item-6",
          name: "Banana Walnut Muffin",
          description: "Moist muffin with ripe bananas and toasted walnuts.",
          price: 400,
          image_url: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-7",
          name: "Avocado Toast",
          description: "Sourdough, smashed avo, chilli flakes, poached egg.",
          price: 1400,
          image_url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
      ],
    },
    {
      name: "Light Meals",
      items: [
        {
          id: "item-8",
          name: "Smoked Salmon Bagel",
          description: "Cream cheese, capers, red onion, dill on a toasted sesame bagel.",
          price: 1600,
          image_url: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-9",
          name: "Caesar Salad",
          description: "Romaine, parmesan, croutons, house Caesar dressing.",
          price: 1300,
          image_url: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
        {
          id: "item-10",
          name: "Grilled Chicken Wrap",
          description: "Herb-grilled chicken, mixed greens, tomato, garlic aioli in a flour tortilla.",
          price: 1500,
          image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=400&fit=crop&auto=format",
          is_available: true,
          variants: [],
        },
      ],
    },
  ],
};

/** Simulated placed-order response returned when submitting the mock checkout. */
export function makeMockOrder(total: number, subtotal: number, discountAmount: number) {
  return {
    id: "mock-order-id",
    order_number: `#DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "pending",
    total_amount: total,
    subtotal,
    discount_amount: discountAmount,
    campaign_title: discountAmount > 0 ? "Happy Hour Deal" : null,
    estimated_ready_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    currency: "SGD",
    paynow_qr: null,
  };
}
