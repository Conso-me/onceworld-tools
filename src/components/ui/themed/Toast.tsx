import { useCallback, useState } from "react";

/**
 * 画面上部中央のトースト (ink 背景ピル, 1.8s で自動消滅)。
 * `useToast` で表示をトリガーする。
 */
export function Toast({ token, message }: { token: number; message: string }) {
  if (!token) return null;
  return (
    <div
      key={token}
      className="ow-toast-anim fixed top-[74px] left-1/2 z-50 bg-ink text-card text-xs font-bold px-[18px] py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [state, setState] = useState<{ token: number; message: string }>({
    token: 0,
    message: "",
  });
  const show = useCallback((message: string) => {
    setState({ token: Date.now(), message });
  }, []);
  return { ...state, show };
}
