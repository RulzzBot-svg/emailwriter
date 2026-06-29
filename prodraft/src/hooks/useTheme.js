import { useEffect, useState } from 'react';
import {
  applyDocumentTheme,
  getNextTheme,
  persistTheme,
  readStoredTheme,
} from '../lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => persistTheme(getNextTheme(current)));
  };

  return { theme, toggleTheme };
}
