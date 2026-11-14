import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/** Small hook + component pair for short-lived status messages. */
export function useToast(duration = 1800) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback(
    (text: string) => {
      window.clearTimeout(timer.current);
      setMessage(text);
      timer.current = window.setTimeout(() => setMessage(""), duration);
    },
    [duration],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, show };
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#3b2b20] px-4 py-3 text-sm font-bold text-white shadow-lg"
    >
      <Check size={17} />
      {message}
    </div>
  );
}
