export function calculateContribution(revenue, fulfilmentCost) {
  return Number(revenue) - Number(fulfilmentCost);
}

export function calculateContributionMargin(revenue, fulfilmentCost) {
  const contribution = calculateContribution(revenue, fulfilmentCost);
  if (Number(revenue) <= 0) return 0;
  return (contribution / Number(revenue)) * 100;
}

export function calculatePackageTotals({ revenue, fulfilmentCost, discount = 0, additionalCosts = 0 }) {
  const netRevenue = Number(revenue) - Number(discount);
  const contribution = calculateContribution(netRevenue, Number(fulfilmentCost) + Number(additionalCosts));
  return {
    revenue: netRevenue,
    fulfilmentCost: Number(fulfilmentCost) + Number(additionalCosts),
    contribution,
    contributionMargin: calculateContributionMargin(netRevenue, Number(fulfilmentCost) + Number(additionalCosts)),
  };
}
