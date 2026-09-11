import { Sparkles } from 'lucide-react';

function EmptyState({ children }) {
  return (
    <div className="empty">
      <Sparkles size={28} />
      <p>{children}</p>
    </div>
  );
}

export default EmptyState;
