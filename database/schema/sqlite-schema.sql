CREATE TABLE IF NOT EXISTS "migrations"(
  "id" integer primary key autoincrement not null,
  "migration" varchar not null,
  "batch" integer not null
);
CREATE TABLE IF NOT EXISTS "users"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "email" varchar not null,
  "email_verified_at" datetime,
  "password" varchar,
  "is_admin" tinyint(1) not null default '0',
  "banned_at" datetime,
  "google_id" varchar,
  "avatar" varchar,
  "remember_token" varchar,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE UNIQUE INDEX "users_email_unique" on "users"("email");
CREATE TABLE IF NOT EXISTS "password_reset_tokens"(
  "email" varchar not null,
  "token" varchar not null,
  "created_at" datetime,
  primary key("email")
);
CREATE TABLE IF NOT EXISTS "sessions"(
  "id" varchar not null,
  "user_id" integer,
  "ip_address" varchar,
  "user_agent" text,
  "payload" text not null,
  "last_activity" integer not null,
  primary key("id")
);
CREATE INDEX "sessions_user_id_index" on "sessions"("user_id");
CREATE INDEX "sessions_last_activity_index" on "sessions"("last_activity");
CREATE TABLE IF NOT EXISTS "cache"(
  "key" varchar not null,
  "value" text not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_expiration_index" on "cache"("expiration");
CREATE TABLE IF NOT EXISTS "cache_locks"(
  "key" varchar not null,
  "owner" varchar not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_locks_expiration_index" on "cache_locks"("expiration");
CREATE TABLE IF NOT EXISTS "jobs"(
  "id" integer primary key autoincrement not null,
  "queue" varchar not null,
  "payload" text not null,
  "attempts" integer not null,
  "reserved_at" integer,
  "available_at" integer not null,
  "created_at" integer not null
);
CREATE INDEX "jobs_queue_index" on "jobs"("queue");
CREATE TABLE IF NOT EXISTS "job_batches"(
  "id" varchar not null,
  "name" varchar not null,
  "total_jobs" integer not null,
  "pending_jobs" integer not null,
  "failed_jobs" integer not null,
  "failed_job_ids" text not null,
  "options" text,
  "cancelled_at" integer,
  "created_at" integer not null,
  "finished_at" integer,
  primary key("id")
);
CREATE TABLE IF NOT EXISTS "failed_jobs"(
  "id" integer primary key autoincrement not null,
  "uuid" varchar not null,
  "connection" varchar not null,
  "queue" varchar not null,
  "payload" text not null,
  "exception" text not null,
  "failed_at" datetime not null default CURRENT_TIMESTAMP
);
CREATE INDEX "failed_jobs_connection_queue_failed_at_index" on "failed_jobs"(
  "connection",
  "queue",
  "failed_at"
);
CREATE UNIQUE INDEX "failed_jobs_uuid_unique" on "failed_jobs"("uuid");
CREATE TABLE IF NOT EXISTS "products"(
  "id" integer primary key autoincrement not null,
  "title" varchar not null,
  "description" text,
  "image" varchar,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE TABLE IF NOT EXISTS "product_variants"(
  "id" integer primary key autoincrement not null,
  "product_id" integer not null,
  "name" varchar not null,
  "price_npr" numeric not null,
  "price_usd" numeric not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("product_id") references "products"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "orders"(
  "id" integer primary key autoincrement not null,
  "order_number" varchar not null,
  "user_id" integer not null,
  "status" varchar not null default 'pending',
  "total_amount" numeric not null,
  "currency" varchar not null,
  "additional_data" text,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE UNIQUE INDEX "orders_order_number_unique" on "orders"("order_number");
CREATE TABLE IF NOT EXISTS "carts"(
  "id" integer primary key autoincrement not null,
  "user_id" integer not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "order_items"(
  "id" integer primary key autoincrement not null,
  "order_id" integer not null,
  "product_variant_id" integer not null,
  "price" numeric not null,
  "quantity" integer not null default '1',
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("order_id") references "orders"("id") on delete cascade,
  foreign key("product_variant_id") references "product_variants"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "payment_receipts"(
  "id" integer primary key autoincrement not null,
  "order_id" integer not null,
  "file_path" varchar not null,
  "status" varchar not null default 'pending',
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("order_id") references "orders"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "order_credentials"(
  "id" integer primary key autoincrement not null,
  "order_id" integer not null,
  "content" text not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("order_id") references "orders"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "order_messages"(
  "id" integer primary key autoincrement not null,
  "order_id" integer not null,
  "user_id" integer not null,
  "message" text not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("order_id") references "orders"("id") on delete cascade,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "cart_items"(
  "id" integer primary key autoincrement not null,
  "cart_id" integer not null,
  "product_variant_id" integer not null,
  "quantity" integer not null default '1',
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("cart_id") references "carts"("id") on delete cascade,
  foreign key("product_variant_id") references "product_variants"("id") on delete cascade
);

INSERT INTO migrations VALUES(1,'0001_01_01_000000_create_users_table',1);
INSERT INTO migrations VALUES(2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO migrations VALUES(3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO migrations VALUES(4,'2026_06_24_163642_create_products_table',1);
INSERT INTO migrations VALUES(5,'2026_06_24_163643_create_product_variants_table',1);
INSERT INTO migrations VALUES(6,'2026_06_24_163644_create_orders_table',1);
INSERT INTO migrations VALUES(7,'2026_06_24_163645_create_carts_table',1);
INSERT INTO migrations VALUES(8,'2026_06_24_163646_create_order_items_table',1);
INSERT INTO migrations VALUES(9,'2026_06_24_163647_create_payment_receipts_table',1);
INSERT INTO migrations VALUES(10,'2026_06_24_163648_create_order_credentials_table',1);
INSERT INTO migrations VALUES(11,'2026_06_24_163649_create_order_messages_table',1);
INSERT INTO migrations VALUES(12,'2026_06_24_163650_create_cart_items_table',1);
