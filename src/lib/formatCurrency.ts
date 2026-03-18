export function formatCurrency(amount: number, code = "INR") {
  if (code === "INR") {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  }
  if (code === "USD") {
    return `$${Number(amount).toLocaleString("en-US")}`;
  }
  return `${code} ${Number(amount).toLocaleString()}`;
}