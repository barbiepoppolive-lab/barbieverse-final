// Tiny safe Markdown renderer for policy pages. Supports: ## headings,
// ### subheadings, paragraphs, **bold**, *italic*, [links](url), bullet
// lists, ordered lists and blockquotes. No raw HTML is rendered, so user
// input stays safe.

import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string };

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("> ")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) { parts.push(lines[i].slice(2)); i++; }
      blocks.push({ type: "quote", text: parts.join(" ") });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    // paragraph (consume until blank line)
    const parts: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(##|###|>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      parts.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: parts.join(" ") });
  }
  return blocks;
}

// inline: **bold**, *italic*, [text](url)
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={key++} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={key++} className="italic">{tok.slice(1, -1)}</em>);
    } else {
      const linkM = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkM) {
        const [, label, url] = linkM;
        if (url.startsWith("/")) {
          out.push(<a key={key++} href={url} className="text-gold underline-offset-4 hover:underline">{label}</a>);
        } else {
          out.push(<a key={key++} href={url} target="_blank" rel="noreferrer" className="text-gold underline-offset-4 hover:underline">{label}</a>);
        }
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return out;
}

export function MarkdownContent({ source }: { source: string }) {
  const blocks = parse(source || "");
  return (
    <div className="space-y-7">
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h2
              key={i}
              id={slug(b.text)}
              className="scroll-mt-24 font-display text-2xl font-medium text-foreground sm:text-3xl"
            >
              <span className="text-gradient-pink">{b.text}</span>
            </h2>
          );
        }
        if (b.type === "h3") {
          return (
            <h3 key={i} className="font-display text-lg font-semibold text-foreground sm:text-xl">
              {b.text}
            </h3>
          );
        }
        if (b.type === "p") {
          return (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {renderInline(b.text)}
            </p>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-pink" />
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="space-y-2.5 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gradient-pink/15 text-[11px] font-semibold text-gold">{j + 1}</span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <blockquote
            key={i}
            className="rounded-2xl border border-gold/30 bg-gradient-to-br from-primary/10 via-card/40 to-card/10 p-5 text-sm font-medium italic text-foreground/90 backdrop-blur-md sm:text-base"
          >
            {renderInline(b.text)}
          </blockquote>
        );
      })}
    </div>
  );
}

export function extractH2s(md: string): string[] {
  return (md || "")
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).trim());
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
