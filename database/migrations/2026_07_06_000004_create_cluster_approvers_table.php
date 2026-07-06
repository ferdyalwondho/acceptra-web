<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cluster_approvers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cluster_id')->constrained('clusters')->cascadeOnDelete();
            $table->string('role', 30);
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['cluster_id', 'role', 'user_id'], 'uniq_cluster_role_user');
            $table->index(['cluster_id', 'role'], 'idx_cluster_approvers_lookup');
            $table->index('user_id', 'idx_cluster_approvers_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cluster_approvers');
    }
};
