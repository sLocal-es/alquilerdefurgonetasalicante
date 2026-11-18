// Fleet PSI audit 2026-11-17 (sLocal/docs/auditoria-psi-fleet-2026-11-17.md):
// "/blog/ marca heading-order en los tres dominios (SEV 98 / GTF 98 / ALC 93)".
// On the blog index the card title rendered as <h3> right after the page <h1>
// — Lighthouse heading-order. The card is shared with the landing section
// (BlogSection renders a section <h2>, where h3 is the correct order), so the
// tag is now a prop: headingLevel ("h2" | "h3", default "h3"). Only the blog
// index passes "h2"; every other usage must keep rendering exactly as before.
// These tests are structural (source-level regex) because the suite has no
// .astro renderer — same convention as the layout-*.test.ts suite.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const card = readFileSync(join(here, 'BlogCard.astro'), 'utf8');
const blogIndex = readFileSync(join(here, '..', '..', 'pages', 'blog', 'index.astro'), 'utf8');
const landingSection = readFileSync(join(here, '..', 'niche', 'BlogSection.astro'), 'utf8');

describe('fleet audit — blog card heading order', () => {
  it('renders the title as h2 only when headingLevel="h2", h3 otherwise', () => {
    expect(card).toMatch(
      /headingLevel === 'h2' \? <h2>\{article\.title\}<\/h2> : <h3>\{article\.title\}<\/h3>/,
    );
  });

  it('defaults headingLevel to h3 (landing usage must stay identical)', () => {
    expect(card).toMatch(/headingLevel = 'h3'/);
  });

  it('accepts only h2 or h3 as headingLevel', () => {
    const match = card.match(/headingLevel\?:\s*'([^']+)'\s*\|\s*'([^']+)'/);
    expect(match).not.toBeNull();
    expect([match?.[1], match?.[2]].sort()).toEqual(['h2', 'h3']);
  });

  it('keeps the card-title style applying to both h2 and h3', () => {
    expect(card).toMatch(/\.blog-card :is\(h2, h3\)/);
  });

  it('blog index renders its cards as h2 (fixes the h1 → h3 skip)', () => {
    expect(blogIndex).toMatch(/<BlogCard\s+article=\{article\}\s+headingLevel="h2"\s*\/>/);
  });

  it('landing BlogSection keeps the default (no headingLevel passed)', () => {
    expect(landingSection).not.toMatch(/headingLevel/);
  });
});
