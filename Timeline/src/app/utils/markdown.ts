const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatInline = (input: string): string => {
  let text = escapeHtml(input);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(
    /\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return text;
};

const formatBlock = (block: string): string => {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const lines = trimmed.split("\n");
  if (lines.every((line) => /^[-*+]\s+/.test(line.trim()))) {
    const items = lines
      .map((line) => line.trim().replace(/^[-*+]\s+/, ""))
      .map((item) => `<li>${formatInline(item)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  return `<p>${formatInline(lines.join(" "))}</p>`;
};

export const renderMarkdown = (markdown: string): string => {
  if (!markdown.trim()) return "";
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map(formatBlock)
    .join("");
};

const stripMarkdown = (text: string): string =>
  text
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/[*_~`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getDescriptionPreview = (
  text: string,
  maxLength = 180,
): string => {
  const plain = stripMarkdown(text);
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
};
