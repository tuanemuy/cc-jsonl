import { useEffect, useState } from "react";

export function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      setValue(storedValue);
    } else {
      localStorage.setItem(key, initialValue);
    }
  }, [initialValue, key]);

  return {
    value,
    setValue: (newValue: string) => {
      setValue(newValue);
      localStorage.setItem(key, newValue);
    },
  };
}
