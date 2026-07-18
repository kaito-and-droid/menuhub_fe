"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { AdminCategory, AdminItem, AdminMenu, Ingredient, RecipeLine } from "@/lib/types";
import { Button, Card, CloseIcon, EmptyState, ErrorBanner, Field, Label, Modal, inputClass, LoadingText } from "@/components/ui";


interface RecipeRow {
  ingredient_id: string;
  quantity: string;
}

interface VariantRow {
  name: string;
  price: string;
  cost: string;
}

interface ItemForm {
  id: string | null;
  name: string;
  description: string;
  price: string;
  cost: string;
  image_url: string;
  image_urls: string;
  category_id: string;
  is_available: boolean;
  recipe: RecipeRow[];
  variants: VariantRow[];
}

const emptyForm: ItemForm = {
  id: null,
  name: "",
  description: "",
  price: "",
  cost: "",
  image_url: "",
  image_urls: "",
  category_id: "",
  is_available: true,
  recipe: [],
  variants: [],
};

export default function MenuPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const base = `/api/shops/${shopId}/menu`;

  const [menu, setMenu] = useState<AdminMenu | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState<ItemForm | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [menuData, ingredientData] = await Promise.all([
        api<AdminMenu>(base),
        api<Ingredient[]>(`/api/shops/${shopId}/ingredients`),
      ]);
      setMenu(menuData);
      setIngredients(ingredientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    }
  }, [base, shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function addCategory(e: FormEvent) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    void run(async () => {
      await api(`${base}/categories`, { method: "POST", body: { name } });
      setNewCategory("");
    });
  }

  function deleteCategory(category: AdminCategory) {
    if (!confirm(`Delete category "${category.name}"? Its items become uncategorized.`)) return;
    void run(() => api(`${base}/categories/${category.id}`, { method: "DELETE" }));
  }

  function toggleAvailability(item: AdminItem) {
    void run(() =>
      api(`${base}/items/${item.id}`, {
        method: "PATCH",
        body: { is_available: !item.is_available },
      }),
    );
  }

  function deleteItem(item: AdminItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    void run(() => api(`${base}/items/${item.id}`, { method: "DELETE" }));
  }

  function openEdit(item: AdminItem) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      cost: item.cost !== null ? String(item.cost) : "",
      image_url: item.image_url ?? "",
      // image_urls from the API includes the primary image_url first; show only the extras.
      image_urls: (item.image_urls ?? [])
        .filter((u) => u && u !== item.image_url)
        .join("\n"),
      category_id: item.category_id ?? "",
      is_available: item.is_available,
      recipe: (item.ingredients as RecipeLine[]).map((line) => ({
        ingredient_id: line.ingredient_id,
        quantity: String(line.quantity),
      })),
      variants: item.variants.map((v) => ({
        name: v.name,
        price: String(v.price),
        cost: v.cost != null ? String(v.cost) : "",
      })),
    });
  }

  function submitItem(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const unitOf = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "g";
    const variants = form.variants
      .filter((v) => v.name.trim() && Number(v.price) > 0)
      .map((v) => ({
        name: v.name.trim(),
        price: Number(v.price),
        cost: v.cost === "" ? null : Number(v.cost),
      }));
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      cost: form.cost === "" ? null : Number(form.cost),
      image_url: form.image_url.trim() || null,
      image_urls: form.image_urls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean),
      category_id: form.category_id || null,
      is_available: form.is_available,
      ingredients: form.recipe
        .filter((row) => row.ingredient_id && Number(row.quantity) > 0)
        .map((row) => ({
          ingredient_id: row.ingredient_id,
          quantity: Number(row.quantity),
          unit: unitOf(row.ingredient_id),
        })),
      variants: variants.length > 0 ? variants : [],
    };
    void run(async () => {
      if (form.id) {
        await api(`${base}/items/${form.id}`, { method: "PATCH", body });
      } else {
        await api(`${base}/items`, { method: "POST", body });
      }
      setForm(null);
    });
  }

  if (!menu) {
    return <p className="text-sm text-stone-500">{error ?? "Loading menu…"}</p>;
  }

  const categoryOptions = menu.categories.map((c) => ({ id: c.id, name: c.name }));
  const sections: { key: string; title: string; category: AdminCategory | null; items: AdminItem[] }[] = [
    ...menu.categories.map((c) => ({ key: c.id, title: c.name, category: c, items: c.items })),
    ...(menu.uncategorized.length
      ? [{ key: "uncategorized", title: "Uncategorized", category: null, items: menu.uncategorized }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Menu</h1>
          <p className="mt-0.5 text-sm text-stone-500">Items, prices, and recipes that deduct stock.</p>
        </div>
        <Button onClick={() => setForm({ ...emptyForm })}>
          + Add item
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      <form onSubmit={addCategory} className="mb-6 flex flex-wrap items-end gap-2">
        <Field label="New category name (e.g. Coffee)">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Coffee"
            className="w-64"
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy || !newCategory.trim()}>
          Add category
        </Button>
      </form>

      {sections.length === 0 && (
        <EmptyState>No menu items yet. Create a category, then add your first item.</EmptyState>
      )}

      {sections.map((section) => (
        <Card key={section.key} className="mb-6">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
            <h2 className="font-semibold text-stone-900">{section.title}</h2>
            {section.category && (
              <button
                type="button"
                onClick={() => deleteCategory(section.category!)}
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
              >
                Delete category
              </button>
            )}
          </div>
          {section.items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-stone-500">No items in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-5 py-2.5 font-medium">Item</th>
                    <th className="px-5 py-2.5 text-right font-medium">Price</th>
                    <th className="px-5 py-2.5 text-right font-medium">Cost</th>
                    <th className="px-5 py-2.5 text-right font-medium">Margin</th>
                    <th className="px-5 py-2.5 text-center font-medium">Available</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-stone-800">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-stone-500">{item.description}</p>
                        )}
                        {item.ingredients.length > 0 && (
                          <p className="text-xs text-stone-500">
                            recipe: {item.ingredients.length} ingredient
                            {item.ingredients.length > 1 ? "s" : ""}
                          </p>
                        )}
                        {item.variants.length > 0 && (
                          <p className="text-xs text-amber-700">
                            variants: {item.variants.map((v) => `${v.name} (${money(v.price)})`).join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right">{money(item.price)}</td>
                      <td className="px-5 py-2.5 text-right text-stone-500">
                        {item.cost !== null ? money(item.cost) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-stone-500">{item.margin ?? "—"}</td>
                      <td className="px-5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item)}
                          disabled={busy}
                          className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 ${
                            item.is_available
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-stone-200 text-stone-500 hover:bg-stone-300"
                          }`}
                        >
                          {item.is_available ? "Available" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="mr-3 cursor-pointer text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          className="cursor-pointer text-xs font-medium text-stone-500 transition-colors duration-200 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}

      {form && (
        <Modal onClose={() => setForm(null)} labelledBy="item-modal-title" maxWidth="max-w-md">
          <h2 id="item-modal-title" className="mb-4 text-lg font-semibold text-stone-900">
            {form.id ? "Edit item" : "New item"}
          </h2>
          <form onSubmit={submitItem}>
            <Label htmlFor="item-name">Name</Label>
            <input
              id="item-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mb-3 w-full"
            />
            <Label htmlFor="item-cat">Category</Label>
            <select
              id="item-cat"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="mb-3 w-full"
            >
              <option value="">Uncategorized</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Label htmlFor="item-desc">Description</Label>
            <input
              id="item-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mb-3 w-full"
            />
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <Label htmlFor="item-price">Price</Label>
                <input
                  id="item-price"
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="item-cost">Cost</Label>
                <input
                  id="item-cost"
                  type="number"
                  min={0}
                  step="any"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            {/* Variants */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <Label>
                  Variants <span className="font-normal text-stone-500">(optional — for multi-price items)</span>
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [...form.variants, { name: "", price: "", cost: "" }],
                    })
                  }
                  className="cursor-pointer text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
                >
                  + Add variant
                </button>
              </div>
              {form.variants.map((row, index) => (
                <div key={index} className="mb-2 flex items-center gap-2">
                  <input
                    placeholder="Name (e.g. Packet 5pcs)"
                    value={row.name}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[index] = { ...row, name: e.target.value };
                      setForm({ ...form, variants });
                    }}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    placeholder="Price"
                    value={row.price}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[index] = { ...row, price: e.target.value };
                      setForm({ ...form, variants });
                    }}
                    className="w-24"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Cost"
                    value={row.cost}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[index] = { ...row, cost: e.target.value };
                      setForm({ ...form, variants });
                    }}
                    className="w-24"
                  />
                  <button
                    type="button"
                    aria-label="Remove variant"
                    onClick={() =>
                      setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) })
                    }
                    className="cursor-pointer rounded-md p-1.5 text-stone-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {form.variants.length === 0 && (
                <p className="rounded-lg bg-stone-50 p-2 text-xs text-stone-500">
                  No variants — item has a single price. Add variants for packet sizes, portion options, etc.
                </p>
              )}
            </div>

            <Label htmlFor="item-img">Image URL</Label>
            <input
              id="item-img"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="mb-3 w-full"
            />

            <Label htmlFor="item-imgs">
              Additional images{" "}
              <span className="font-normal text-stone-500">(one URL per line — shown as a carousel)</span>
            </Label>
            <textarea
              id="item-imgs"
              value={form.image_urls}
              onChange={(e) => setForm({ ...form, image_urls: e.target.value })}
              rows={3}
              placeholder={"https://…/photo-2.jpg\nhttps://…/photo-3.jpg"}
              className="mb-3 w-full"
            />

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <Label>
                  Recipe <span className="font-normal text-stone-500">(auto-deducts stock)</span>
                </Label>
                <button
                  type="button"
                  disabled={ingredients.length === 0}
                  onClick={() =>
                    setForm({
                      ...form,
                      recipe: [...form.recipe, { ingredient_id: ingredients[0]?.id ?? "", quantity: "" }],
                    })
                  }
                  className="cursor-pointer text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800 disabled:opacity-40"
                >
                  + Add ingredient
                </button>
              </div>
              {ingredients.length === 0 ? (
                <p className="rounded-lg bg-stone-50 p-2 text-xs text-stone-500">
                  No ingredients in stock yet —{" "}
                  <Link href="/inventory" className="text-amber-700 hover:underline">
                    add some in Inventory
                  </Link>{" "}
                  to enable recipes.
                </p>
              ) : (
                form.recipe.map((row, index) => {
                  const unit = ingredients.find((i) => i.id === row.ingredient_id)?.unit ?? "";
                  return (
                    <div key={index} className="mb-2 flex items-center gap-2">
                      <select
                        value={row.ingredient_id}
                        onChange={(e) => {
                          const recipe = [...form.recipe];
                          recipe[index] = { ...row, ingredient_id: e.target.value };
                          setForm({ ...form, recipe });
                        }}
                        className="flex-1"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0.001}
                        step="any"
                        required
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const recipe = [...form.recipe];
                          recipe[index] = { ...row, quantity: e.target.value };
                          setForm({ ...form, recipe });
                        }}
                        className="w-20"
                      />
                      <span className="w-10 text-xs text-stone-500">{unit}</span>
                      <button
                        type="button"
                        aria-label="Remove ingredient"
                        onClick={() =>
                          setForm({ ...form, recipe: form.recipe.filter((_, i) => i !== index) })
                        }
                        className="cursor-pointer rounded-md p-1.5 text-stone-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-amber-600"
              />
              Available for ordering
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
