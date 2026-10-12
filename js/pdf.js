// Small PDF writer for KAFEO reports — no outside library, works offline.
// Makes A4 reports (portrait or landscape) with a header band, key figures,
// tables that flow across pages (header row repeats), and page numbers.

const W_HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Standard PDF fonts only cover plain characters — swap fancy ones for simple equivalents.
export function clean(s) {
  return String(s ?? '')
    .replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[·•]/g, '|').replace(/…/g, '...').replace(/×/g, 'x').replace(/→/g, '->')
    .replace(/[^\x20-\x7E]/g, '');
}
export function textWidth(s, size, bold = false) {
  const t = bold ? W_BOLD : W_HELV;
  let w = 0;
  for (const ch of clean(s)) w += t[ch.charCodeAt(0) - 32] ?? 556;
  return (w * size) / 1000;
}
function fit(s, size, bold, max) {
  s = clean(s);
  if (textWidth(s, size, bold) <= max) return s;
  while (s.length > 1 && textWidth(s + '...', size, bold) > max) s = s.slice(0, -1);
  return s + '...';
}
const esc = (s) => clean(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const f2 = (n) => (Math.round(n * 100) / 100).toString();

/*
  doc = {
    title, subtitle, meta: 'Oct 12 06:00 AM - Oct 13 06:00 AM', landscape: bool, brand: 'KAFEO', footer: 'text',
    blocks: [
      { type: 'heading', text },
      { type: 'kv', items: [[label, value], ...] },
      { type: 'table', columns: [{ label, align: 'left'|'right', min }], rows: [[...]], total: [...], note },
      { type: 'text', text },
    ]
  }
*/
export function buildPdf(doc) {
  const PW = doc.landscape ? 841.89 : 595.28, PH = doc.landscape ? 595.28 : 841.89;
  const M = 34, CW = PW - M * 2;
  const pages = [];
  let ops = null, y = 0;

  const color = (r, g, b) => `${f2(r)} ${f2(g)} ${f2(b)}`;
  const text = (x, yy, s, size, bold = false, rgb = [0, 0, 0]) => ops.push(`BT ${color(...rgb)} rg /F${bold ? 2 : 1} ${size} Tf ${f2(x)} ${f2(yy)} Td (${esc(s)}) Tj ET`);
  const rect = (x, yy, w, h, rgb) => ops.push(`${color(...rgb)} rg ${f2(x)} ${f2(yy)} ${f2(w)} ${f2(h)} re f`);
  const line = (x1, y1, x2, y2, rgb = [0.75, 0.72, 0.68], wdt = 0.6) => ops.push(`${color(...rgb)} RG ${wdt} w ${f2(x1)} ${f2(y1)} m ${f2(x2)} ${f2(y2)} l S`);

  function newPage() {
    ops = []; pages.push(ops);
    // header band
    rect(0, PH - 58, PW, 58, [0.118, 0.09, 0.078]);
    text(M, PH - 37, doc.brand || 'KAFEO', 22, true, [0.914, 0.827, 0.659]);
    text(M + textWidth(doc.brand || 'KAFEO', 22, true) + 10, PH - 36, 'Coffee | Food | Motivation', 8, false, [0.81, 0.76, 0.71]);
    const t = clean(doc.title);
    text(PW - M - textWidth(t, 14, true), PH - 30, t, 14, true, [1, 1, 1]);
    if (doc.meta) { const mm = clean(doc.meta); text(PW - M - textWidth(mm, 8.5), PH - 45, mm, 8.5, false, [0.81, 0.76, 0.71]); }
    y = PH - 58 - 22;
    if (pages.length === 1 && doc.subtitle) { text(M, y, doc.subtitle, 9, false, [0.35, 0.3, 0.27]); y -= 16; }
  }
  const need = (h) => { if (y - h < M + 24) newPage(); };

  newPage();
  for (const b of doc.blocks || []) {
    if (b.type === 'heading') {
      need(34);
      y -= 6;
      text(M, y - 10, b.text, 11.5, true, [0.369, 0.227, 0.063]);
      line(M, y - 15, M + CW, y - 15, [0.55, 0.33, 0.09], 1);
      y -= 26;
    } else if (b.type === 'text') {
      need(16);
      text(M, y - 9, b.text, 8.5, false, [0.35, 0.3, 0.27]);
      y -= 15;
    } else if (b.type === 'kv') {
      const cols = doc.landscape ? 4 : 3;
      const bw = (CW - (cols - 1) * 8) / cols, bh = 36;
      for (let i = 0; i < b.items.length; i += cols) {
        need(bh + 8);
        b.items.slice(i, i + cols).forEach(([k, v], j) => {
          const x = M + j * (bw + 8);
          rect(x, y - bh, bw, bh, [0.98, 0.957, 0.918]);
          text(x + 8, y - 13, fit(k, 7.5, false, bw - 16), 7.5, false, [0.42, 0.37, 0.34]);
          text(x + 8, y - 28, fit(v, 12, true, bw - 16), 12, true);
        });
        y -= bh + 8;
      }
      y -= 4;
    } else if (b.type === 'table') {
      const cols = b.columns;
      let size = 8;
      const pad = 5;
      const sample = b.rows.slice(0, 400).concat(b.total ? [b.total] : []);
      const natural = cols.map((c, i) => Math.max(textWidth(c.label, size, true), c.min || 0, ...sample.map((r) => textWidth(r[i], size, false))) + pad * 2);
      let total = natural.reduce((a, w) => a + w, 0);
      let widths = natural.slice();
      if (total > CW) {
        // shrink the widest text columns first, keep numbers whole
        const flexible = cols.map((c) => c.align !== 'right');
        const fixedW = widths.filter((_, i) => !flexible[i]).reduce((a, w) => a + w, 0);
        const flexW = total - fixedW;
        const room = Math.max(CW - fixedW, CW * 0.3);
        widths = widths.map((w, i) => (flexible[i] ? (w / flexW) * room : w));
        total = widths.reduce((a, w) => a + w, 0);
        if (total > CW) { widths = widths.map((w) => (w * CW) / total); size = 7; }
      } else {
        const extra = (CW - total) / cols.length;
        widths = widths.map((w) => w + extra);
      }
      const rh = size + 7.5;
      const drawHeader = () => {
        rect(M, y - rh, CW, rh, [0.118, 0.09, 0.078]);
        let x = M;
        cols.forEach((c, i) => {
          const s = fit(c.label.toUpperCase(), size - 0.5, true, widths[i] - pad * 2);
          const tx = c.align === 'right' ? x + widths[i] - pad - textWidth(s, size - 0.5, true) : x + pad;
          text(tx, y - rh + 5.2, s, size - 0.5, true, [1, 1, 1]);
          x += widths[i];
        });
        y -= rh;
      };
      need(rh * 3); drawHeader();
      b.rows.forEach((r, ri) => {
        if (y - rh < M + 24) { newPage(); drawHeader(); }
        if (ri % 2 === 1) rect(M, y - rh, CW, rh, [0.973, 0.957, 0.937]);
        let x = M;
        cols.forEach((c, i) => {
          const s = fit(r[i], size, !!r.bold, widths[i] - pad * 2);
          const tx = c.align === 'right' ? x + widths[i] - pad - textWidth(s, size, !!r.bold) : x + pad + (r.indent && i === 0 ? 8 : 0);
          text(tx, y - rh + 5.2, s, size, !!r.bold);
          x += widths[i];
        });
        y -= rh;
      });
      if (!b.rows.length) { need(rh); text(M + pad, y - rh + 5, 'No records in this period', size, false, [0.45, 0.4, 0.37]); y -= rh; }
      if (b.total) {
        need(rh + 2);
        line(M, y, M + CW, y, [0, 0, 0], 1);
        rect(M, y - rh, CW, rh, [0.965, 0.914, 0.839]);
        let x = M;
        cols.forEach((c, i) => {
          const s = fit(b.total[i], size, true, widths[i] - pad * 2);
          const tx = c.align === 'right' ? x + widths[i] - pad - textWidth(s, size, true) : x + pad;
          text(tx, y - rh + 5.2, s, size, true);
          x += widths[i];
        });
        y -= rh;
      }
      if (b.note) { need(14); text(M, y - 10, b.note, 7.5, false, [0.42, 0.37, 0.34]); y -= 14; }
      y -= 12;
    }
  }

  // footers with page numbers
  const n = pages.length;
  pages.forEach((p, i) => {
    ops = p;
    line(M, M + 10, PW - M, M + 10);
    text(M, M, clean(doc.footer || 'KAFEO POS'), 7.5, false, [0.42, 0.37, 0.34]);
    const pn = `Page ${i + 1} of ${n}`;
    text(PW - M - textWidth(pn, 7.5), M, pn, 7.5, false, [0.42, 0.37, 0.34]);
  });

  // assemble the file
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  const catalog = add(null), pagesObj = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fb = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  pages.forEach((p) => {
    const content = p.join('\n');
    const c = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${f2(PW)} ${f2(PH)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${fb} 0 R >> >> /Contents ${c} 0 R >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title (${esc(doc.title)}) /Producer (KAFEO POS) /Creator (KAFEO POS) >>`);
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;   // plain ASCII
}

export function pdfBlob(doc) {
  const s = buildPdf(doc);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}
