/**
 * Authoritative financial calculation utility for C34 Event Sponsorship Match Desk.
 * Mandatory formula:
 *   Revenue = Proposed Price (or Base Price - Discount + Additional Cost)
 *   Contribution = Revenue - Fulfilment Cost
 *   Contribution Margin = (Contribution / Revenue) * 100, if Revenue > 0
 * 
 * Example:
 *   Revenue = 30,000
 *   Fulfilment Cost = 18,000
 *   Contribution = 12,000
 *   Contribution Margin = 40%
 */

export function calculateFinancials({ basePrice = 0, discount = 0, additionalCost = 0, fulfilmentCost = 0, proposedPrice = null }) {
  const base = Number(basePrice) || 0;
  const disc = Number(discount) || 0;
  const add = Number(additionalCost) || 0;
  const cost = Number(fulfilmentCost) || 0;

  // If proposedPrice is explicitly provided, use it; otherwise compute from components
  let revenue = proposedPrice !== null && proposedPrice !== undefined 
    ? Number(proposedPrice) 
    : (base - disc + add);

  if (revenue < 0) revenue = 0;
  const contribution = revenue - cost;
  
  let contributionMargin = 0;
  if (revenue > 0) {
    contributionMargin = Number(((contribution / revenue) * 100).toFixed(2));
  }

  return {
    revenue: Number(revenue.toFixed(2)),
    basePrice: Number(base.toFixed(2)),
    discount: Number(disc.toFixed(2)),
    additionalCost: Number(add.toFixed(2)),
    fulfilmentCost: Number(cost.toFixed(2)),
    contribution: Number(contribution.toFixed(2)),
    contributionMargin: Number(contributionMargin.toFixed(2))
  };
}

export function validatePricing(revenue, fulfilmentCost) {
  const rev = Number(revenue) || 0;
  const cost = Number(fulfilmentCost) || 0;
  const contribution = rev - cost;
  const margin = rev > 0 ? Number(((contribution / rev) * 100).toFixed(2)) : 0;
  return {
    revenue: rev,
    fulfilmentCost: cost,
    contribution,
    contributionMargin: margin
  };
}
