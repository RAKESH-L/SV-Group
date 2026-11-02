export const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
export const discountPercent = (original: number, discounted: number) => original > 0 ? Math.round((1 - discounted / original) * 100) : 0;
