// Shared RFC 6901 JSON Pointer primitives for the deterministic JSON tools
// (json-pointer-api, json-patch-api). Pure functions — no LLM, no I/O.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Unescape a single reference token: ~1 → "/", ~0 → "~" (order matters). */
export function unescapeToken(t: string): string {
  return t.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Escape a single reference token: "~" → ~0, "/" → ~1. */
export function escapeToken(t: string): string {
  return t.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Parse a JSON Pointer into decoded reference tokens. "" → []. Must be "" or start with "/". */
export function parsePointer(pointer: string): { error: string } | { tokens: string[] } {
  if (typeof pointer !== 'string') return { error: 'pointer must be a string.' };
  if (pointer === '') return { tokens: [] };
  if (pointer[0] !== '/') return { error: `pointer "${pointer}" must be empty or start with "/".` };
  return { tokens: pointer.slice(1).split('/').map(unescapeToken) };
}

function isArrayIndexToken(t: string): boolean {
  return t === '0' || /^[1-9][0-9]*$/.test(t); // RFC 6901: no leading zeros
}

export interface ResolveResult { found: boolean; value?: Json; reason?: string; }

/** Resolve decoded tokens against a document (RFC 6901). "-" is not resolvable (end-of-array marker). */
export function resolveTokens(doc: Json, tokens: string[]): ResolveResult {
  let cur: Json = doc;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (Array.isArray(cur)) {
      if (tok === '-') return { found: false, reason: `token "-" at index ${i} refers to the (nonexistent) element after the last array item.` };
      if (!isArrayIndexToken(tok)) return { found: false, reason: `token "${tok}" at index ${i} is not a valid array index.` };
      const idx = Number(tok);
      if (idx >= cur.length) return { found: false, reason: `array index ${idx} at index ${i} is out of bounds (length ${cur.length}).` };
      cur = cur[idx];
    } else if (cur !== null && typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, tok)) return { found: false, reason: `key "${tok}" at index ${i} does not exist.` };
      cur = (cur as { [k: string]: Json })[tok];
    } else {
      return { found: false, reason: `cannot descend into a ${cur === null ? 'null' : typeof cur} value at token index ${i}.` };
    }
  }
  return { found: true, value: cur };
}

export interface PointerEntry { pointer: string; value: Json; type: string; }

/** JSON type label for a value. */
export function jsonType(v: Json): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'object' | 'string' | 'number' | 'boolean'
}

/**
 * Enumerate leaf pointers of a document: every scalar (and every empty
 * array/object) addressed by its RFC 6901 pointer, in document order.
 * The whole-document pointer "" is included only when the document itself is a leaf.
 */
export function enumerateLeaves(doc: Json, max = 5000): PointerEntry[] {
  const out: PointerEntry[] = [];
  const walk = (node: Json, ptr: string): void => {
    if (out.length >= max) return;
    if (Array.isArray(node)) {
      if (node.length === 0) { out.push({ pointer: ptr, value: node, type: 'array' }); return; }
      for (let i = 0; i < node.length; i++) walk(node[i], `${ptr}/${i}`);
    } else if (node !== null && typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 0) { out.push({ pointer: ptr, value: node, type: 'object' }); return; }
      for (const k of keys) walk((node as { [k: string]: Json })[k], `${ptr}/${escapeToken(k)}`);
    } else {
      out.push({ pointer: ptr, value: node, type: jsonType(node) });
    }
  };
  walk(doc, '');
  return out;
}
