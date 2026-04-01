"use client"

import { createContext, useContext, useCallback, useRef, useSyncExternalStore } from "react"

type Listener = () => void;

// A lightweight store for sharing live field values across sections
class FormValuesStore {
  private values: Record<string, string> = {};
  private listeners = new Set<Listener>();

  initialize(defaultValues: Record<string, unknown>) {
    // Seed with default values — only set values that haven't been updated locally yet
    let changed = false;
    for (const [key, val] of Object.entries(defaultValues)) {
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (!(key in this.values)) {
          this.values = { ...this.values, [key]: strVal };
          changed = true;
        }
      }
    }
    if (changed) {
      this.listeners.forEach((l) => l());
    }
  }

  reinitialize(defaultValues: Record<string, unknown>) {
    // Full re-seed from API data (used when defaultValues reference changes)
    const newValues: Record<string, string> = {};
    for (const [key, val] of Object.entries(defaultValues)) {
      if (val !== undefined && val !== null) {
        newValues[key] = String(val);
      }
    }
    this.values = newValues;
    this.listeners.forEach((l) => l());
  }

  get(fieldName: string): string {
    return this.values[fieldName] || "";
  }

  getSnapshot(): Record<string, string> {
    return this.values;
  }

  set(fieldName: string, value: string) {
    if (this.values[fieldName] === value) return;
    this.values = { ...this.values, [fieldName]: value };
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const FormValuesContext = createContext<FormValuesStore | null>(null);

export function FormValuesProvider({ children, defaultValues }: { children: React.ReactNode; defaultValues?: Record<string, unknown> }) {
  const storeRef = useRef<FormValuesStore | null>(null);
  const prevDefaultValuesRef = useRef<Record<string, unknown> | undefined>(undefined);

  if (!storeRef.current) {
    storeRef.current = new FormValuesStore();
  }

  // Full re-seed when defaultValues reference changes (e.g., after API reload)
  // Soft initialize on first mount only
  if (defaultValues) {
    if (prevDefaultValuesRef.current !== defaultValues) {
      if (prevDefaultValuesRef.current === undefined) {
        storeRef.current.initialize(defaultValues);
      } else {
        storeRef.current.reinitialize(defaultValues);
      }
      prevDefaultValuesRef.current = defaultValues;
    }
  }

  return (
    <FormValuesContext.Provider value={storeRef.current}>
      {children}
    </FormValuesContext.Provider>
  );
}

export function useFormValues() {
  const store = useContext(FormValuesContext);
  if (!store) throw new Error("useFormValues must be used within FormValuesProvider");

  const subscribe = useCallback((listener: Listener) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  const values = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { values, set: store.set.bind(store) };
}

export function useFormValuesStore() {
  const store = useContext(FormValuesContext);
  return store;
}
