const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  return out;
}

const UL = /^\s*[-*]\s+/;
const OL = /^\s*\d+\.\s+/;

/** Minimal Markdown to HTML for content prose: paragraphs, lists (also directly after a paragraph line), bold, italic, links, code. Everything is escaped. */
export function renderMd(text: string): string {
  const out: string[] = [];
  for (const block of text.trim().split(/\n\s*\n/)) {
    let para: string[] = [];
    let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
    const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
    const flushList = () => { if (list) out.push(`<${list.kind}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.kind}>`); list = null; };
    for (const line of block.split('\n')) {
      const kind = UL.test(line) ? 'ul' : OL.test(line) ? 'ol' : null;
      if (kind) {
        flushPara();
        if (list && list.kind !== kind) flushList();
        list ??= { kind, items: [] };
        list.items.push(line.replace(kind === 'ul' ? UL : OL, ''));
      } else if (list && /^\s{2,}\S/.test(line)) {
        list.items[list.items.length - 1] += ' ' + line.trim(); // continuation of a list item
      } else {
        flushList();
        if (line.trim()) para.push(line.trim());
      }
    }
    flushPara(); flushList();
  }
  return out.join('\n');
}
