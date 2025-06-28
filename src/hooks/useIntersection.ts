import { useEffect, useRef } from "react";

type Args = {
  onIntersect: () => void;
};

export function useIntersection<T extends Element>({ onIntersect }: Args) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerElementRef = useRef<T | null>(null);

  useEffect(() => {
    if (!observerElementRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      { threshold: 1 }, // Adjust threshold as needed
    );

    observer.observe(observerElementRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onIntersect]);

  return { observerElementRef };
}
