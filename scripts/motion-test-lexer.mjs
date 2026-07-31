import { spawnSync } from 'node:child_process';

const regexEntryKeywords = new Set([
  'await', 'case', 'default', 'delete', 'do', 'else', 'extends', 'in',
  'instanceof', 'new', 'of', 'return', 'throw', 'typeof', 'void', 'yield',
]);

export function assertValidModuleFixture(source) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--check'],
    { encoding: 'utf8', input: source },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new SyntaxError(`invalid JavaScript module fixture:\n${result.stderr}`);
  }
}

function cookEscape(source, index) {
  const character = source[index];
  if (character === undefined) throw new SyntaxError('invalid JavaScript string escape');
  if (character === '\r') {
    return { value: '', next: source[index + 1] === '\n' ? index + 2 : index + 1 };
  }
  if (character === '\n') return { value: '', next: index + 1 };
  if (character === 'x') {
    const hex = source.slice(index + 1, index + 3);
    if (!/^[\da-f]{2}$/i.test(hex)) throw new SyntaxError('invalid JavaScript string escape');
    return { value: String.fromCodePoint(Number.parseInt(hex, 16)), next: index + 3 };
  }
  if (character === 'u') {
    if (source[index + 1] === '{') {
      const end = source.indexOf('}', index + 2);
      const hex = end === -1 ? '' : source.slice(index + 2, end);
      if (/^[\da-f]+$/i.test(hex)) {
        const codePoint = Number.parseInt(hex, 16);
        if (codePoint <= 0x10ffff) {
          return { value: String.fromCodePoint(codePoint), next: end + 1 };
        }
      }
    } else {
      const hex = source.slice(index + 1, index + 5);
      if (/^[\da-f]{4}$/i.test(hex)) {
        const codePoint = Number.parseInt(hex, 16);
        return { value: String.fromCodePoint(codePoint), next: index + 5 };
      }
    }
    throw new SyntaxError('invalid JavaScript string escape');
  }
  const escapes = { 0: '\0', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };
  return { value: escapes[character] ?? character, next: index + 1 };
}

function readString(source, index) {
  const quote = source[index];
  let value = '';
  index += 1;
  while (index < source.length) {
    const character = source[index];
    if (character === quote) return { value, next: index + 1 };
    if (character === '\\') {
      const escape = cookEscape(source, index + 1);
      value += escape.value;
      index = escape.next;
    } else {
      value += character;
      index += 1;
    }
  }
  return { value, next: index };
}

function canStartRegex(tokens, expressionStart) {
  const previous = tokens.at(-1);
  return expressionStart || !previous || (
    previous.type === 'word' &&
    regexEntryKeywords.has(previous.value) &&
    (!['default', 'extends'].includes(previous.value) || tokens.at(-2)?.value !== '.')
  ) || (
    previous.type === 'punctuation' &&
    '([{:;,=!?&|+-*%^~<>'.includes(previous.value)
  );
}

function skipRegex(source, index) {
  let inClass = false;
  index += 1;
  while (index < source.length) {
    const character = source[index];
    if (character === '\\') index += 2;
    else if (character === '[') {
      inClass = true;
      index += 1;
    } else if (character === ']') {
      inClass = false;
      index += 1;
    } else if (character === '/' && !inClass) {
      index += 1;
      while (/[A-Za-z]/.test(source[index] ?? '')) index += 1;
      return index;
    } else index += 1;
  }
  return index;
}

function lex(source, start, tokens, stopsAtTemplateBrace = false, startsExpression = false) {
  let index = start;
  let braceDepth = 0;
  let expressionStart = startsExpression;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
    } else if (source.startsWith('//', index)) {
      index = source.indexOf('\n', index + 2);
      if (index === -1) return index;
    } else if (source.startsWith('/*', index)) {
      index = source.indexOf('*/', index + 2);
      if (index === -1) return index;
      index += 2;
    } else if (character === '"' || character === "'") {
      const string = readString(source, index);
      tokens.push({ type: 'string', value: string.value });
      index = string.next;
      expressionStart = false;
    } else if (character === '`') {
      index = lexTemplate(source, index + 1, tokens);
      expressionStart = false;
    } else if (character === '/' && canStartRegex(tokens, expressionStart)) {
      index = skipRegex(source, index);
      expressionStart = false;
    } else if (/[A-Za-z_$]/.test(character)) {
      const wordStart = index;
      while (/[\w$]/.test(source[index] ?? '')) index += 1;
      tokens.push({ type: 'word', value: source.slice(wordStart, index) });
      expressionStart = false;
    } else if (character === '}' && stopsAtTemplateBrace && braceDepth === 0) {
      return index + 1;
    } else {
      tokens.push({ type: 'punctuation', value: character });
      if (stopsAtTemplateBrace && character === '{') braceDepth += 1;
      if (stopsAtTemplateBrace && character === '}') braceDepth -= 1;
      index += 1;
      expressionStart = false;
    }
  }
  return index;
}

function lexTemplate(source, index, tokens) {
  while (index < source.length) {
    if (source[index] === '\\') index += 2;
    else if (source[index] === '`') return index + 1;
    else if (source[index] === '$' && source[index + 1] === '{') {
      index = lex(source, index + 2, tokens, true, true);
    } else index += 1;
  }
  return index;
}

export function tokenizeJavaScript(source) {
  const tokens = [];
  lex(source, 0, tokens);
  return tokens;
}
