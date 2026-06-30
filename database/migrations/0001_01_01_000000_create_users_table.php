<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('email', 255)->unique();
            $table->string('password');
            $table->string('role', 30);
            $table->string('region', 100)->nullable();
            $table->uuid('partner_id')->nullable(); // FK ke partners akan ditambah saat tabel partners dibuat
            $table->string('status', 20)->default('active');
            $table->string('preferred_language', 5)->default('id');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('invitation_token', 255)->nullable()->unique();
            $table->timestamp('invitation_expires_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','admin','viewer','partner','approver_ms_bo','approver_ms_rts','approver_xls_rth_team','approver_xls_rth'))");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','inactive'))");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_lang_check CHECK (preferred_language IN ('id','en'))");

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id', 36)->nullable()->index(); // UUID-compatible
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
