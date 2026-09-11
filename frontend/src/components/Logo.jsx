function Logo({ compact = false }) {
  return (
    <div className={`logo ${compact ? 'compact' : ''}`}>
      <span className="logo-mark">知</span>
      {!compact && (
        <span>
          <b>知行</b>
          <small>学生成长中心</small>
        </span>
      )}
    </div>
  );
}

export default Logo;
