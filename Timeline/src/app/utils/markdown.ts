const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLink = (url: string, label: string): string =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

const INLINE_CODE_SENTINEL = "\u0007code\u0007";

const formatInline = (input: string): string => {
  let text = escapeHtml(input);
  const codeSegments: string[] = [];

  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    const placeholder = `${INLINE_CODE_SENTINEL}${codeSegments.length}${INLINE_CODE_SENTINEL}`;
    codeSegments.push(`<code>${code}</code>`);
    return placeholder;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  text = text.replace(
    /(^|[^*])\*([^*]+)\*(?!\*)/g,
    (_match, prefix, value) => `${prefix}<em>${value}</em>`,
  );
  text = text.replace(
    /(^|[^_])_([^_]+)_(?!_)/g,
    (_match, prefix, value) => `${prefix}<em>${value}</em>`,
  );
  text = text.replace(
    /\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label, url) => formatLink(url, label),
  );
  text = text.replace(
    /(^|[\s>])(https?:\/\/[^\s<]+)/g,
    (_match, prefix, url) => `${prefix}${formatLink(url, url)}`,
  );

  text = text.replace(
    new RegExp(`${INLINE_CODE_SENTINEL}(\\d+)${INLINE_CODE_SENTINEL}`, "g"),
    (_match, index) => codeSegments[Number(index)] ?? "",
  );

  return text;
};

const wrapList = (items: string[], type: "ul" | "ol"): string => {
  const inner = items
    .map((item) => `<li>${formatInline(item.trim())}</li>`)
    .join("");
  return `<${type}>${inner}</${type}>`;
};

export const renderMarkdown = (markdown?: string | null): string => {
  const source = (markdown ?? "").replace(/\r\n/g, "\n");
  if (!source.trim()) return "";

  const lines = source.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let inQuote = false;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushParagraph = (): void => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      html.push(`<p>${formatInline(text)}</p>`);
    }
    paragraph = [];
  };

  const flushList = (): void => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    html.push(wrapList(listItems, listType));
    listType = null;
    listItems = [];
  };

  const flushQuote = (): void => {
    if (!inQuote || quoteLines.length === 0) {
      inQuote = false;
      quoteLines = [];
      return;
    }
    html.push(
      `<blockquote>${formatInline(quoteLines.join(" ").trim())}</blockquote>`,
    );
    inQuote = false;
    quoteLines = [];
  };

  const flushCode = (): void => {
    if (!codeLines.length) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (inCodeBlock) {
      if (/^```/.test(trimmed)) {
        flushCode();
        inCodeBlock = false;
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = Math.min(6, headingMatch[1].length);
      html.push(
        `<h${level}>${formatInline(headingMatch[2].trim())}</h${level}>`,
      );
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      inQuote = true;
      continue;
    }
    flushQuote();

    const unorderedMatch = trimmed.match(/^([-*+])\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushQuote();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(unorderedMatch[2]);
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushQuote();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(orderedMatch[2]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  if (inCodeBlock) {
    flushCode();
  }
  flushParagraph();
  flushList();
  flushQuote();

  return html.join("");
};

const stripMarkdown = (text: string): string =>
  text
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/^\s{0,3}>\s?/gm, " ")
    .replace(/^\s{0,3}([-*+])\s+/gm, " ")
    .replace(/^\s{0,3}\d+\.\s+/gm, " ")
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
