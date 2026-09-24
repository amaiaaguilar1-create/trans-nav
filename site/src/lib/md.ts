const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  return out;
}

/** Minimal Markdown → HTML for content prose. Content is authored in-repo, but we still escape everything. */
export function renderMd(text: string): string {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks
    .map((b) => {
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('') + '</ul>';
      }
      if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
        return '<ol>' + lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('') + '</ol>';
      }
      return `<p>${inline(lines.join(' '))}</p>`;
    })
    .join('\n');
}
