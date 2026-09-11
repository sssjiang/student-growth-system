const COLORS = ['peach', 'mint', 'lavender', 'blue'];

function Avatar({ name = '', size = 'md' }) {
  const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return <span className={`avatar ${size} ${color}`}>{name.slice(-2)}</span>;
}

export default Avatar;
