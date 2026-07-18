"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Ingredient } from "@/lib/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorBanner, Field, Label, Modal, inputClass, LoadingText } from "@/components/ui";

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Inventory</h1>
        <p className="mt-0.5 text-sm text-stone-500">Track stock levels and purchase costs per ingredient.</p>
      </div>
      {error && <ErrorBanner message={error} />}

      <form onSubmit={addIngredient} className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Ingredient">
          <input
            required
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            placeholder="e.g. Arabica beans"
            className="w-44"
          />
        </Field>
        <Field label="Unit">
          <select
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            className="w-24"
          >
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Initial stock">
          <input
            type="number"
            min={0}
            step="any"
            value={newIngredient.current_quantity}
            onChange={(e) =>
              setNewIngredient({ ...newIngredient, current_quantity: e.target.value })
            }
            className="w-28"
          />
        </Field>
        <Field label="Reorder at">
          <input
            type="number"
            min={0}
            step="any"
            value={newIngredient.reorder_level}
            onChange={(e) =>
              setNewIngredient({ ...newIngredient, reorder_level: e.target.value })
            }
            className="w-28"
          />
        </Field>
        <Button type="submit" disabled={busy || !newIngredient.name.trim()}>
          Add
        </Button>
      </form>

      {ingredients === null ? (
        <LoadingText>Loading inventory…</LoadingText>
      ) : ingredients.length === 0 ? (
        <EmptyState>No ingredients yet. Add what you stock, then link them to menu item recipes.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-5 py-3 font-medium">Ingredient</th>
                <th className="px-5 py-3 text-right font-medium">In stock</th>
                <th className="px-5 py-3 text-right font-medium">Reorder at</th>
                <th className="px-5 py-3 text-right font-medium">Last price</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="border-t border-stone-100">
                  <td className="px-5 py-2.5 font-medium text-stone-800">
                    <span className="flex items-center gap-2">
                      {ing.name}
                      {ing.low_stock && <Badge tone="red">Low stock</Badge>}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {ing.current_quantity} {ing.unit}
                  </td>
                  <td className="px-5 py-2.5 text-right text-stone-500">
                    {ing.reorder_level} {ing.unit}
                  </td>
                  <td className="px-5 py-2.5 text-right text-stone-500">
                    {ing.last_purchase_price !== null
                      ? `${money(ing.last_purchase_price)}/${ing.unit}`
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-stone-500">{ing.supplier_name ?? "—"}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setPurchase({ ingredient: ing, quantity: "", cost: "", supplier_name: "" })
                      }
                      className="cursor-pointer text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
                    >
                      Log purchase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {purchase && (
        <Modal onClose={() => setPurchase(null)} labelledBy="purchase-modal-title" maxWidth="max-w-sm">
          <h2 id="purchase-modal-title" className="mb-4 text-lg font-semibold text-stone-900">
            Log purchase — {purchase.ingredient.name}
          </h2>
          <Label htmlFor="qty">Quantity ({purchase.ingredient.unit})</Label>
          <input
            id="qty"
            required
            type="number"
            min={0.001}
            step="any"
            value={purchase.quantity}
            onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
            className={`${inputClass} mb-3 w-full`}
          />
          <Label htmlFor="cost">Total cost</Label>
          <input
            id="cost"
            required
            type="number"
            min={0}
            step="any"
            value={purchase.cost}
            onChange={(e) => setPurchase({ ...purchase, cost: e.target.value })}
            className={`${inputClass} mb-3 w-full`}
          />
          <Label htmlFor="supplier">Supplier</Label>
          <input
            id="supplier"
            value={purchase.supplier_name}
            onChange={(e) => setPurchase({ ...purchase, supplier_name: e.target.value })}
            className={`${inputClass} mb-5 w-full`}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPurchase(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} onClick={submitPurchase}>
              {busy ? "Saving…" : "Save purchase"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
