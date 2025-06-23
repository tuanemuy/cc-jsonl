"use client";

import { useCallback } from "react";

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const impact = useCallback(
    (style: "light" | "medium" | "heavy" = "light") => {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      vibrate(patterns[style]);
    },
    [vibrate],
  );

  const notification = useCallback(
    (type: "success" | "warning" | "error") => {
      const patterns = {
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [30, 100, 30, 100, 30],
      };
      vibrate(patterns[type]);
    },
    [vibrate],
  );

  const selection = useCallback(() => {
    vibrate(5);
  }, [vibrate]);

  return {
    vibrate,
    impact,
    notification,
    selection,
  };
}
