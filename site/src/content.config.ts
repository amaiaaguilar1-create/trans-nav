import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Structural validation happens in CI against schema/*.json (npm run validate).
 * Here we only tell Astro where the YAML lives and keep the schema permissive
 * (z.any) so the JSON Schema stays the single source of truth. Components get
 * their types from src/types/content.d.ts, generated from the same schemas.
 */
const passthrough = z.record(z.string(), z.any());

// Keep the directory structure in the id (Astro's default only keeps the file name for nested patterns).
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.ya?ml$/i, '').toLowerCase();

// content/states/CA/meta.yaml -> id "ca/meta"
const stateFiles = defineCollection({
  loader: glob({ pattern: '*/*.yaml', base: '../content/states', generateId }),
  schema: passthrough,
});

// content/states/CA/local/los-angeles.yaml -> id "ca/local/los-angeles"
const localFiles = defineCollection({
  loader: glob({ pattern: '*/local/*.yaml', base: '../content/states', generateId }),
  schema: passthrough,
});

// content/federal/passport.yaml -> id "passport"
const federal = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../content/federal', generateId }),
  schema: passthrough,
});

const orgs = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../content/orgs', generateId }),
  schema: passthrough,
});

const glossary = defineCollection({
  loader: glob({ pattern: 'glossary.yaml', base: '../content' }),
  schema: passthrough,
});

export const collections = { stateFiles, localFiles, federal, orgs, glossary };
