import * as acorn from 'acorn';
import { KNOWN } from './sdk.js';

/**
 * Análisis estático mientras escribes: sintaxis real (acorn, ES2022) y reglas propias del entorno de funciones.
 * Devuelve diagnósticos de CodeMirror: { from, to, severity, message, source }.
 */
export function analyze(code) {
  const out = []; const lineStart = (line) => { let pos = 0; for (let i = 1; i < line; i++) pos = code.indexOf('\n', pos) + 1; return pos; };
  try { acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: false }); }
  catch (e) {
    const pos = Math.min(e.pos ?? lineStart(e.loc?.line || 1), code.length);
    out.push({ from: pos, to: Math.min(pos + 1, code.length), severity: 'error', message: `Sintaxis: ${e.message.replace(/\s*\(\d+:\d+\)$/, '')}`, source: 'sintaxis' });
    return out;
  }
  const at = (re, sev, msg) => { let m; const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`); while ((m = r.exec(code))) out.push({ from: m.index, to: m.index + m[0].length, severity: sev, message: typeof msg === 'function' ? msg(m) : msg, source: 'juntial' }); };
  if (!/function\s+main\s*\(/.test(code)) out.push({ from: 0, to: Math.min(8, code.length), severity: 'error', message: 'Falta la función main(record, ctx): es la que se ejecuta.', source: 'juntial' });
  at(/\basync\s+function\s+main\b/, 'error', 'main no debe ser async: las llamadas jx.* ya son síncronas.');
  at(/\bawait\s+jx\./, 'warning', 'No hace falta await: jx.* es síncrono (como Deluge).');
  at(/\b(fetch|require|XMLHttpRequest|setTimeout|setInterval)\s*\(/, 'error', (m) => `${m[1]} no está disponible en el entorno aislado. ${m[1] === 'fetch' || m[1] === 'XMLHttpRequest' ? 'Usa jx.http.get/post o jx.connections.request.' : ''}`);
  at(/\bprocess\.\w+/, 'error', 'process no existe en el entorno aislado. Usa jx.env para tus variables.');
  at(/\bjx\.([a-zA-Z]+(?:\.[a-zA-Z]+)?)(?=\s*\()/, 'error', (m) => (KNOWN.has(`jx.${m[1]}`) ? null : `jx.${m[1]} no existe. Mira el panel de documentación.`));
  at(/(['"])(sk-[A-Za-z0-9-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[bap]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\1/, 'warning', 'Parece una clave secreta escrita en el código: guárdala en Variables (jx.env) o usa una conexión.');
  at(/\bconsole\.(table|dir|time|timeEnd)\b/, 'info', 'Se mostrará como un log normal.');
  return out.filter((d) => d.message);
}
