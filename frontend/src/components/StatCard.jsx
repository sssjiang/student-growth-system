function StatCard({ icon: Icon, label, note, tone, value }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <b>{label}</b>
        <small>{note}</small>
      </div>
    </div>
  );
}

export default StatCard;
