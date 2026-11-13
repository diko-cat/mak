import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../store';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <button type="button" aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={toggle} className="grid size-11 place-items-center rounded-full border border-forest/10 bg-white/80 text-ink transition hover:bg-mint dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/10">
    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}
