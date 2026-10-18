export async function getNegotiations(req, res) {
  res.json({
    message: 'Negotiations fetched successfully',
    data: [
      { id: 1, sponsor: 'NorthStar Hospitality', status: 'in_progress' },
      { id: 2, sponsor: 'Horizon Ventures', status: 'pending_review' },
    ],
  });
}
