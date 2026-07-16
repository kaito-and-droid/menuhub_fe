const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const sgd = new Intl.NumberFormat("en-SG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number, currency: string | undefined): string {
  if (currency === "SGD") return `S$${sgd.format(amount)}`;
  return `${vnd.format(amount)} ₫`;
}

export function currencySymbol(currency: string | undefined): string {
  return currency === "SGD" ? "S$" : "₫";
}
