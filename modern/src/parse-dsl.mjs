/**
 * Read-only structural parser for the Standard Street DSL.
 * DOES NOT compile/evaluate Perl, macros, conditions, item effects, or event callbacks.
 */
const headers = new Set([
  'DEFINE', 'ITEM', 'USE', 'EVENT', 'FUNCITEM', 'FUNCEVENT', 'FUNCBASE',
  'FUNCUPDATE', 'FUNCINIT', 'FUNCTURN', 'FUNCCUSTOM', 'FUNCNEW',
  'FUNCSHOPIN', 'FUNCSHOPOUT', 'FUNCSALE', 'FUNCBUY',
]);
const callbackFields = new Set(['func', 'funcb', 'funci', 'funct', 'funcs', 'startfunc', 'endfunc']);

export function parseDsl(text, file) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const blocks = [];
  const issues = [];
  let active = null;
  let owner = null;
  let inPerl = false;
  let terminated = false;

  function finish(lastLine) {
    if (!active) return;
    active.endLine = lastLine;
    active.raw = lines.slice(active.startLine - 1, lastLine).join('\n');
    active = null;
    inPerl = false;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const directive = line.match(/^\s*@@([A-Za-z]+)(?=\s|$)/);
    const kind = directive?.[1].toUpperCase();
    if (kind === 'END') {
      finish(i);
      terminated = true;
      break;
    }
    if (kind && headers.has(kind)) {
      finish(i);
      const entry = { kind, file, startLine: i + 1, endLine: i + 1,
        raw: '', fields: {}, ownerItemLine: null };
      if (kind === 'USE') {
        entry.ownerItemLine = owner?.startLine ?? null;
        if (!owner) issues.push({ file, line: i + 1, code: 'ORPHAN_USE' });
      } else if (kind === 'ITEM') {
        owner = entry;
      } else {
        owner = null;
      }
      blocks.push(entry);
      active = entry;
      continue;
    }
    if (kind?.startsWith('FUNC') && !headers.has(kind)) {
      issues.push({ file, line: i + 1, code: 'UNKNOWN_FUNC_DIRECTIVE', directive: kind });
    }
    if (!active || active.kind.startsWith('FUNC')) continue;
    if (inPerl) {
      if (line.trim() === '_local_') inPerl = false;
      continue;
    }
    const field = line.match(/^\s*([A-Za-z][A-Za-z0-9_-]*)[ \t]+(.+?)\s*$/);
    if (!field) continue;
    const name = field[1].toLowerCase();
    const value = field[2].replace(/\s+#.*$/, '').trim();
    if (!value) continue;
    (active.fields[name] ??= []).push({ value, line: i + 1 });
    if (callbackFields.has(name) && value === '_local_') inPerl = true;
  }
  if (!terminated) finish(lines.length);
  return {
    file, lines: lines.length, blocks, issues,
    counts: {
      items: blocks.filter(b => b.kind === 'ITEM').length,
      uses: blocks.filter(b => b.kind === 'USE').length,
      events: blocks.filter(b => b.kind === 'EVENT').length,
      functions: blocks.filter(b => b.kind.startsWith('FUNC')).length,
    },
  };
}

export function validateStandardStreet(parsedFiles) {
  const all = parsedFiles.flatMap(p => p.blocks);
  const items = all.filter(b => b.kind === 'ITEM');
  const uses = all.filter(b => b.kind === 'USE');
  const events = all.filter(b => b.kind === 'EVENT');
  const functions = all.filter(b => b.kind.startsWith('FUNC'));
  const actual = { items: items.length, uses: uses.length, events: events.length, functions: functions.length };
  const expected = { items: 79, uses: 116, events: 25, functions: 7 };
  const issues = parsedFiles.flatMap(p => p.issues);
  for (const [name, count] of Object.entries(expected)) {
    if (actual[name] !== count) issues.push({ code: 'COUNT_MISMATCH', kind: name, expected: count, actual: actual[name] });
  }
  function unique(entries, key) {
    const seen = new Set();
    for (const block of entries) {
      const value = block.fields[key]?.[0]?.value;
      if (!value) issues.push({ code: 'MISSING_FIELD', kind: block.kind, key, file: block.file, line: block.startLine });
      else if (seen.has(value)) issues.push({ code: 'DUPLICATE_FIELD', key, value, file: block.file, line: block.startLine });
      else seen.add(value);
    }
  }
  unique(items, 'no');
  unique(items, 'code');
  unique(items, 'name');
  unique(events, 'code');
  for (const u of uses) if (u.ownerItemLine === null) issues.push({ code: 'ORPHAN_USE', file: u.file, line: u.startLine });
  return { ok: issues.length === 0, actual, expected, issues };
}
