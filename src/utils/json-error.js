/** Extracts a useful cursor position from Chromium/Firefox JSON.parse errors. */
export function jsonSyntaxLocation(message, source) {
  const position = /position\s+(\d+)/i.exec(message);
  if (position) return Math.min(source.length, Number(position[1]));
  const lineColumn = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (!lineColumn) return null;
  const line = Math.max(1, Number(lineColumn[1]));
  const column = Math.max(1, Number(lineColumn[2]));
  const lines = source.split('\n');
  if (line > lines.length) return null;
  return lines.slice(0, line - 1).reduce((n, row) => n + row.length + 1, 0) + Math.min(column - 1, lines[line - 1].length);
}
