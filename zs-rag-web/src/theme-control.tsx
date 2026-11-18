import { SunMoon } from 'lucide-react';
import { useTheme } from './theme';

export function ThemeControl() {
  const { preference, changeTheme } = useTheme();
  return (
    <label className="theme-control">
      <SunMoon size={15} />
      <select aria-label="外观主题" value={preference} onChange={(event) => changeTheme(event.target.value)}>
        <option value="system">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  );
}
