export const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
export const discountPercent = (original: number, discounted: number) => original > 0 ? Math.round((1 - discounted / original) * 100) : 0;
