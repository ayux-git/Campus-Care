-- Campus Care — Dr Sahab's knowledge base: passages from The Merck Manual of
-- Diagnosis & Therapy (19th ed., 2011), searched by meaning with pgvector.
-- Run after schema.sql. Safe to re-run. The passages themselves are loaded by
-- a separate import (see README); this file only creates the structure.
--
-- The book's text is never readable from the browser: RLS is on with no
-- policies, and only the service role (used inside the pratiksha-chat edge
-- function) may query it. Students only ever see Dr Sahab's answers.

create extension if not exists vector with schema extensions;

create table if not exists public.merck_passages (
  id bigint generated always as identity primary key,
  page int not null,          -- PDF page number, used in citations
  chapter text not null,      -- e.g. 'Chapter 178. Headache'
  section text,               -- nearest heading, e.g. 'Treatment'
  content text not null,
  embedding extensions.vector(384) not null  -- gte-small, mean-pooled, normalized
);

create index if not exists merck_passages_embedding_idx
  on public.merck_passages using hnsw (embedding extensions.vector_cosine_ops);

alter table public.merck_passages enable row level security;
revoke all on public.merck_passages from anon, authenticated;

-- Nearest passages to a question embedding (cosine similarity). Runs with its
-- owner's rights so it can read past RLS; only service_role may execute it.
create or replace function public.match_merck_passages(query_embedding extensions.vector(384), match_count int default 6)
returns table (id bigint, page int, chapter text, section text, content text, similarity float)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.page, p.chapter, p.section, p.content, 1 - (p.embedding <=> query_embedding) as similarity
  from public.merck_passages p
  order by p.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$$;

revoke execute on function public.match_merck_passages(extensions.vector, int) from public, anon, authenticated;
grant execute on function public.match_merck_passages(extensions.vector, int) to service_role;
