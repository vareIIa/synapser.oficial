import { neon } from "@neondatabase/serverless";

let ready;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function hasDatabase() {
  return Boolean(databaseUrl());
}

async function migrate(sql) {
  await sql`create table if not exists users (
    id text primary key,
    name text not null,
    email text not null unique,
    password_hash text not null,
    role text not null default 'user',
    cpf text,
    phone text,
    created_at timestamptz not null default now()
  )`;
  await sql`alter table users add column if not exists role text not null default 'user'`;
  await sql`create table if not exists sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists orders (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    plan text not null,
    method text not null,
    status text not null,
    usd_cents integer not null,
    brl_cents integer not null,
    fx_rate numeric(12, 6) not null,
    provider_order_id text,
    pix_text text,
    pix_png text,
    checkout_url text,
    created_at timestamptz not null default now(),
    paid_at timestamptz
  )`;
  await sql`create table if not exists entitlements (
    user_id text primary key references users(id) on delete cascade,
    plan text not null,
    order_id text references orders(id),
    updated_at timestamptz not null default now()
  )`;
}

export async function db() {
  const url = databaseUrl();
  if (!url) {
    const error = new Error("O banco ainda não está conectado na Vercel.");
    error.status = 503;
    throw error;
  }
  const sql = neon(url);
  if (!ready) ready = migrate(sql);
  await ready;
  return sql;
}
