export default function StatCard({ label, value, tone = 'violet', icon }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
