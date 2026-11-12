export interface JsonError {
  reason: 'end' | 'character' | 'string' | 'trailing';
  offset: number; // 0-based UTF-16 index of the first bad position
  line: number; // 1-based; a line break is "\n"
  column: number; // 1-based, in UTF-16 code units from the start of the line
  character?: string; // the offending character, for 'character'
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
const DIGIT = /[0-9]/;
const HEX = /[0-9a-fA-F]/;

type Frame = 'array' | 'object';
/** What the scanner expects next. */
type Expect = 'value' | 'value-or-close' | 'key' | 'key-or-close' | 'colon' | 'comma-or-close';

function position(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

/**
 * The first syntax error of `text` under the JSON grammar of RFC 8259, or undefined when the text is valid.
 * Iterative (an explicit stack), so deeply nested input cannot overflow the call stack.
 */
export function locateJsonError(text: string): JsonError | undefined {
  const n = text.length;
  let i = 0;
  const fail = (reason: JsonError['reason'], offset: number): JsonError => {
    const at = Math.min(offset, n);
    const error: JsonError = { reason, offset: at, ...position(text, at) };
    if (reason === 'character' && at < n) error.character = text.charAt(at);
    return error;
  };
  const skipSpace = (): void => {
    while (i < n && WHITESPACE.has(text.charAt(i))) i++;
  };

  /** Reads a string starting at the opening quote; returns an error or undefined. */
  const readString = (): JsonError | undefined => {
    i++;
    for (;;) {
      if (i >= n) return fail('end', n);
      const c = text.charAt(i);
      if (c === '"') {
        i++;
        return undefined;
      }
      if (c.charCodeAt(0) < 0x20) return fail('string', i);
      if (c === '\\') {
        const e = text.charAt(i + 1);
        if (i + 1 >= n) return fail('end', n);
        if (ESCAPES.has(e)) {
          i += 2;
        } else if (e === 'u') {
          for (let k = 2; k <= 5; k++) {
            if (i + k >= n) return fail('end', n);
            if (!HEX.test(text.charAt(i + k))) return fail('string', i + k);
          }
          i += 6;
        } else {
          return fail('string', i + 1);
        }
      } else {
        i++;
      }
    }
  };

  const readLiteral = (word: string): JsonError | undefined => {
    for (let k = 0; k < word.length; k++) {
      if (i + k >= n) return fail('end', n);
      if (text.charAt(i + k) !== word.charAt(k)) return fail('character', i + k);
    }
    i += word.length;
    return undefined;
  };

  const readNumber = (): JsonError | undefined => {
    const digits = (): JsonError | undefined => {
      if (i >= n) return fail('end', n);
      if (!DIGIT.test(text.charAt(i))) return fail('character', i);
      while (i < n && DIGIT.test(text.charAt(i))) i++;
      return undefined;
    };
    if (text.charAt(i) === '-') i++;
    if (i >= n) return fail('end', n);
    if (text.charAt(i) === '0') {
      i++;
    } else {
      const error = digits();
      if (error !== undefined) return error;
    }
    if (text.charAt(i) === '.') {
      i++;
      const error = digits();
      if (error !== undefined) return error;
    }
    if (text.charAt(i) === 'e' || text.charAt(i) === 'E') {
      i++;
      if (text.charAt(i) === '+' || text.charAt(i) === '-') i++;
      const error = digits();
      if (error !== undefined) return error;
    }
    return undefined;
  };

  const stack: Frame[] = [];
  let expect: Expect = 'value';
  let done = false;

  while (!done) {
    skipSpace();
    if (i >= n) return fail('end', n);
    const c = text.charAt(i);

    if (expect === 'key' || expect === 'key-or-close') {
      if (c === '}' && expect === 'key-or-close') {
        i++;
        stack.pop();
        expect = 'comma-or-close';
      } else if (c === '"') {
        const error = readString();
        if (error !== undefined) return error;
        expect = 'colon';
      } else {
        return fail('character', i);
      }
    } else if (expect === 'colon') {
      if (c !== ':') return fail('character', i);
      i++;
      expect = 'value';
    } else if (expect === 'comma-or-close') {
      const top = stack[stack.length - 1];
      if (top === undefined) {
        done = true;
      } else if (c === ',') {
        i++;
        expect = top === 'array' ? 'value' : 'key';
      } else if ((c === ']' && top === 'array') || (c === '}' && top === 'object')) {
        i++;
        stack.pop();
      } else {
        return fail('character', i);
      }
    } else {
      // 'value' or 'value-or-close'
      if (c === ']' && expect === 'value-or-close') {
        i++;
        stack.pop();
        expect = 'comma-or-close';
      } else if (c === '{') {
        i++;
        stack.push('object');
        expect = 'key-or-close';
      } else if (c === '[') {
        i++;
        stack.push('array');
        expect = 'value-or-close';
      } else {
        let error: JsonError | undefined;
        if (c === '"') error = readString();
        else if (c === 't') error = readLiteral('true');
        else if (c === 'f') error = readLiteral('false');
        else if (c === 'n') error = readLiteral('null');
        else if (c === '-' || DIGIT.test(c)) error = readNumber();
        else return fail('character', i);
        if (error !== undefined) return error;
        expect = 'comma-or-close';
      }
    }
    if (expect === 'comma-or-close' && stack.length === 0) done = true;
  }

  skipSpace();
  return i < n ? fail('trailing', i) : undefined;
}
