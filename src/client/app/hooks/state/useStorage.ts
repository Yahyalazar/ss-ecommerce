import { useState, useEffect } from "react";

type StorageType = "local" | "session";

function useStorage<T>(
  key: string,
  initialValue: T,
  storageType: StorageType = "local"
) {
  const getStoredValue = (): T => {
    if (typeof window === "undefined") return initialValue;

    const storage =
      storageType === "local" ? window.localStorage : window.sessionStorage;

    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading storage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    setStoredValue(getStoredValue());
  }, [key, storageType]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storage =
      storageType === "local" ? window.localStorage : window.sessionStorage;

    try {
      storage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting storage key "${key}":`, error);
    }
  }, [key, storedValue, storageType]);

  return [storedValue, setStoredValue] as const;
}

export default useStorage;
