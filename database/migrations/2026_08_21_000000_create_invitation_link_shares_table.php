<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitation_link_shares', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('shared_by')->constrained('users');
            $table->string('token', 255);
            $table->timestamp('terms_accepted_at');
            $table->string('evidence_path', 255);
            $table->string('evidence_original_filename', 255)->nullable();
            $table->text('note')->nullable();
            // Append-only: no updated_at
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id', 'idx_invitation_link_shares_user');
            $table->index('shared_by', 'idx_invitation_link_shares_shared_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitation_link_shares');
    }
};
