import { useEffect } from "react";

const useDocumentEvent = <K extends keyof WindowEventMap>(
  type: K,
  ...handlers: Array<(e: WindowEventMap[K], type: K) => void>
) => {
  const handler = (e: WindowEventMap[K]) => handlers.forEach((h) => h(e, type));
  useEffect(() => {
    window.addEventListener(type, handler);
    return () => {
      window.removeEventListener(type, handler);
    };
  }, []);
};

export default useDocumentEvent;