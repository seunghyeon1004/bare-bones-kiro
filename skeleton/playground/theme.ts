import type { ThemeVars } from './types.ts';

/** Sets the theme's custom properties on `element` through the CSS object model: light first, then dark over it. */
export function applyTheme(element: HTMLElement, theme: ThemeVars, dark: boolean): void {
  for (const [name, value] of Object.entries(theme.light)) element.style.setProperty(name, value);
  if (dark) for (const [name, value] of Object.entries(theme.dark)) element.style.setProperty(name, value);
}
