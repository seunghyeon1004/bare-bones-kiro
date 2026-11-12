export const COLOUR_PROPS = [
  '--bg',
  '--surface',
  '--text',
  '--muted',
  '--accent',
  '--accent-text',
  '--border',
  '--focus',
] as const;

export const THEME_PROPS = [...COLOUR_PROPS, '--font-body', '--font-heading', '--font-size', '--radius', '--space'] as const;

const PRELUDE = /^(:root|@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\))$/;
const DARK = /^@media/;

interface Block {
  prelude: string;
  hasChild: boolean;
  decls: string;
  parent: Block | undefined;
}

/** Problems with a theme.css text as `theme.css: <message>`; an empty list means valid. */
export function validateTheme(css: string): string[] {
  const problems: string[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/url\(/i.test(text)) problems.push('theme.css: url( is not allowed');
  if (/@import/i.test(text)) problems.push('theme.css: @import is not allowed');

  const light = new Set<string>();
  const dark = new Set<string>();
  const known = new Set<string>(THEME_PROPS);

  const readDeclarations = (body: string, into: Set<string>): void => {
    for (const raw of body.split(';')) {
      const declaration = raw.trim();
      if (declaration === '') continue;
      const colon = declaration.indexOf(':');
      const name = colon < 0 ? '' : declaration.slice(0, colon).trim();
      const value = colon < 0 ? '' : declaration.slice(colon + 1).trim();
      if (colon < 0 || value === '') {
        problems.push(`theme.css: declaration "${declaration}" is not "name: value"`);
      } else if (!known.has(name)) {
        problems.push(`theme.css: ${name}: not a contract property`);
      } else {
        into.add(name);
      }
    }
  };

  let current: Block | undefined;
  let buffer = '';
  for (const ch of text) {
    if (ch === '{') {
      const prelude = buffer.trim().replace(/\s+/g, ' ');
      buffer = '';
      if (current !== undefined) current.hasChild = true;
      const block: Block = { prelude, hasChild: false, decls: '', parent: current };
      if (!PRELUDE.test(prelude)) problems.push(`theme.css: selector "${prelude}" is not allowed`);
      else if (current !== undefined && !(DARK.test(current.prelude) && prelude === ':root')) {
        problems.push(`theme.css: "${prelude}" is not allowed inside "${current.prelude}"`);
      }
      current = block;
    } else if (ch === '}') {
      if (current === undefined) {
        problems.push('theme.css: unbalanced braces');
        buffer = '';
        continue;
      }
      const block = current;
      if (block.hasChild) {
        if (buffer.trim() !== '') problems.push(`theme.css: unexpected text "${buffer.trim()}"`);
      } else if (PRELUDE.test(block.prelude)) {
        if (block.prelude === ':root') {
          readDeclarations(buffer, block.parent === undefined ? light : dark);
        } else if (buffer.trim() !== '') {
          problems.push(`theme.css: declarations are not allowed directly in "${block.prelude}"`);
        }
      }
      buffer = '';
      current = block.parent;
    } else {
      buffer += ch;
    }
  }
  if (current !== undefined) problems.push('theme.css: unbalanced braces');
  if (buffer.trim() !== '') problems.push(`theme.css: unexpected text "${buffer.trim()}"`);

  for (const name of THEME_PROPS) if (!light.has(name)) problems.push(`theme.css: :root: missing ${name}`);
  for (const name of COLOUR_PROPS) if (!dark.has(name)) problems.push(`theme.css: dark :root: missing ${name}`);
  return problems;
}

export interface ParsedTheme { light: Record<string, string>; dark: Record<string, string> }

/**
 * The custom properties of a theme.css as `{ light, dark }`: the declarations of the top-level `:root` and of the `:root`
 * inside the dark `@media` block. Call it on a theme that passed `validateTheme`.
 */
export function parseTheme(css: string): ParsedTheme {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const theme: ParsedTheme = { light: {}, dark: {} };
  const stack: string[] = [];
  let buffer = '';
  for (const ch of text) {
    if (ch === '{') {
      stack.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
    } else if (ch === '}') {
      const prelude = stack.pop();
      if (prelude === ':root') {
        const target = stack.length === 0 ? theme.light : theme.dark;
        for (const raw of buffer.split(';')) {
          const colon = raw.indexOf(':');
          if (colon > 0) target[raw.slice(0, colon).trim()] = raw.slice(colon + 1).trim();
        }
      }
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return theme;
}
