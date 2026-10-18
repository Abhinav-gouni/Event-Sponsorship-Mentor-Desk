export function getFulfilmentProgress(items = []) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const completed = items.reduce((sum, item) => sum + Number(item.completed || 0), 0);
  return total ? (completed / total) * 100 : 0;
}

export function verifyFulfilment(deliverables = []) {
  return deliverables.map((item) => ({
    ...item,
    verified: Boolean(item.proofUploaded) && Boolean(item.reviewedBy),
  }));
}
