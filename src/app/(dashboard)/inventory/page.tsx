"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Ingredient } from "@/lib/types";

const UNITS = ["g", "kg", "ml", "l", "piece", "box"];

export default function InventoryPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const base = `/api/shops/${shopId}/ingredients`;

  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    unit: "g",
    current_quantity: "",
    reorder_level: "",
  });
  const [purchase, setPurchase] = useState<{
    ingredient: Ingredient;
    quantity: string;
    cost: string;
    supplier_name: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setIngredients(await api<Ingredient[]>(base));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    }
  }, [base]);

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

  function addIngredient(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      await api(base, {
        method: "POST",
        body: {
          name: newIngredient.name.trim(),
          unit: newIngredient.unit,
          current_quantity: Number(newIngredient.current_quantity || 0),
          reorder_level: Number(newIngredient.reorder_level || 0),
        },
      });
      setNewIngredient({ name: "", unit: "g", current_quantity: "", reorder_level: "" });
    });
  }

  function submitPurchase(e: FormEvent) {
    e.preventDefault();
    if (!purchase) return;
    void run(async () => {
      await api(`${base}/logs`, {
        method: "POST",
        body: {
          ingredient_id: purchase.ingredient.id,
          quantity: Number(purchase.quantity),
          cost: Number(purchase.cost),
          supplier_name: purchase.supplier_name.trim() || null,
        },
      });
      setPurchase(null);
    });
  }

  const inputClass =
    "rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Inventory</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={addIngredient} className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Ingredient</label>
          <input
            required
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            placeholder="e.g. Arabica beans"
            className={`${inputClass} w-44`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Unit</label>
          <select
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            className={inputClass}
          >
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Initial stock</label>
          <input
            type="number"
            min={0}
            step="any"
            value={newIngredient.current_quantity}
            onChange={(e) =>
              setNewIngredient({ ...newIngredient, current_quantity: e.target.value })
            }
            className={`${inputClass} w-28`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Reorder at</label>
          <input
            type="number"
            min={0}
            step="any"
            value={newIngredient.reorder_level}
            onChange={(e) =>
              setNewIngredient({ ...newIngredient, reorder_level: e.target.value })
            }
            className={`${inputClass} w-28`}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !newIngredient.name.trim()}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {ingredients === null ? (
        <p className="text-sm text-stone-500">Loading inventory…</p>
      ) : ingredients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          No ingredients yet. Add what you stock, then link them to menu item recipes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Ingredient</th>
                <th className="px-4 py-3 text-right font-medium">In stock</th>
                <th className="px-4 py-3 text-right font-medium">Reorder at</th>
                <th className="px-4 py-3 text-right font-medium">Last price</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-medium text-stone-800">
                    {ing.name}
                    {ing.low_stock && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Low stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {ing.current_quantity} {ing.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-stone-500">
                    {ing.reorder_level} {ing.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-stone-500">
                    {ing.last_purchase_price !== null
                      ? `${money(ing.last_purchase_price)}/${ing.unit}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-stone-500">{ing.supplier_name ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() =>
                        setPurchase({ ingredient: ing, quantity: "", cost: "", supplier_name: "" })
                      }
                      className="text-xs font-medium text-amber-700 hover:underline"
                    >
                      Log purchase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {purchase && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitPurchase} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              Log purchase — {purchase.ingredient.name}
            </h2>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Quantity ({purchase.ingredient.unit})
            </label>
            <input
              required
              type="number"
              min={0.001}
              step="any"
              value={purchase.quantity}
              onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
              className={`${inputClass} mb-3 w-full`}
            />
            <label className="mb-1 block text-sm font-medium text-stone-700">Total cost</label>
            <input
              required
              type="number"
              min={0}
              value={purchase.cost}
              onChange={(e) => setPurchase({ ...purchase, cost: e.target.value })}
              className={`${inputClass} mb-3 w-full`}
            />
            <label className="mb-1 block text-sm font-medium text-stone-700">Supplier</label>
            <input
              value={purchase.supplier_name}
              onChange={(e) => setPurchase({ ...purchase, supplier_name: e.target.value })}
              className={`${inputClass} mb-5 w-full`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurchase(null)}
                className="rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save purchase"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
