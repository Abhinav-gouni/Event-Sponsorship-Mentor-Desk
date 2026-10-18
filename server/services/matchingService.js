export function scoreSponsorMatch(event, sponsor) {
  const eventScore = (event?.category || '').length + (event?.budget || 0) / 1000;
  const sponsorScore = (sponsor?.industry || '').length + (sponsor?.budget || 0) / 500;
  return Math.min(100, Math.round((eventScore + sponsorScore) / 8));
}

export function buildMatchSuggestions(event, sponsors = []) {
  return sponsors.map((sponsor) => ({
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    score: scoreSponsorMatch(event, sponsor),
    reason: `Good alignment with ${event?.category || 'event'} audience and sponsorship goals.`,
  }));
}
