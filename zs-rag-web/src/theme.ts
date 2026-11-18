import { useLayoutEffect, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
const storageKey = 'zs-rag.theme';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Theme still works for the current page when storage is unavailable.
    }
    return 'system';
  });

  useLayoutEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    };
    apply();
    if (preference !== 'system') return;
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [preference]);

  function changeTheme(value: string) {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return;
    setPreference(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Theme still works for the current page when storage is unavailable.
    }
  }

  return { preference, changeTheme };
}
