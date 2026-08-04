<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Login/forgot-password/reset-password all compared email case-sensitively (Postgres
    // varchar '=' is byte-exact), so a user whose real address has mixed case (e.g.
    // "Ferdy.Alwondho@Aviatnet.com") couldn't log in unless they typed that exact casing.
    // App-layer normalization (User::email() mutator + controller input lowercasing) now
    // handles new writes/lookups; this migration backfills existing rows and moves the
    // uniqueness guarantee to a case-insensitive functional index so the DB itself can't
    // accumulate case-variant duplicate accounts again.
    public function up(): void
    {
        DB::statement('UPDATE users SET email = lower(email)');
        DB::statement('UPDATE password_reset_tokens SET email = lower(email)');

        DB::statement('ALTER TABLE users DROP CONSTRAINT users_email_unique');
        DB::statement('CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX users_email_lower_unique');
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)');
    }
};
