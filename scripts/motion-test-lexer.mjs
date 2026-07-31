function cookEscape(source, index) {
  const character = source[index];
  if (character === 'u') {
    if (source[index + 1] === '{') {
      const end = source.indexOf('}', index + 2);
      if (end !== -1) {
        const codePoint = Number.parseInt(source.slice(index + 2, end), 16);
        if (Number.isFinite(codePoint)) {
          return { value: String.fromCodePoint(codePoint), next: end + 1 };
        }
      }
    } else {
      const codePoint = Number.parseInt(source.slice(index + 1, index + 5), 16);
      if (Number.isFinite(codePoint)) {
        return { value: String.fromCodePoint(codePoint), next: index + 5 };
      }
    }
  }
  const escapes = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };
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

function canStartRegex(tokens) {
  const previous = tokens.at(-1);
  return !previous || (
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

function lex(source, start, tokens, stopsAtTemplateBrace = false) {
  let index = start;
  let braceDepth = 0;
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
    } else if (character === '`') {
      index = lexTemplate(source, index + 1, tokens);
    } else if (character === '/' && canStartRegex(tokens)) {
      index = skipRegex(source, index);
    } else if (/[A-Za-z_$]/.test(character)) {
      const wordStart = index;
      while (/[\w$]/.test(source[index] ?? '')) index += 1;
      tokens.push({ type: 'word', value: source.slice(wordStart, index) });
    } else if (character === '}' && stopsAtTemplateBrace && braceDepth === 0) {
      return index + 1;
    } else {
      tokens.push({ type: 'punctuation', value: character });
      if (stopsAtTemplateBrace && character === '{') braceDepth += 1;
      if (stopsAtTemplateBrace && character === '}') braceDepth -= 1;
      index += 1;
    }
  }
  return index;
}

function lexTemplate(source, index, tokens) {
  while (index < source.length) {
    if (source[index] === '\\') index += 2;
    else if (source[index] === '`') return index + 1;
    else if (source[index] === '$' && source[index + 1] === '{') {
      index = lex(source, index + 2, tokens, true);
    } else index += 1;
  }
  return index;
}

export function tokenizeJavaScript(source) {
  const tokens = [];
  lex(source, 0, tokens);
  return tokens;
}
