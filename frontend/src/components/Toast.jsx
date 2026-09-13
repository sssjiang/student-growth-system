import { Check } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function Toast() {
  const message = useSelector((state) => state.toast.message);
  return message ? (
    <div className="toast" role="status">
      <Check />
      {message}
    </div>
  ) : null;
}
