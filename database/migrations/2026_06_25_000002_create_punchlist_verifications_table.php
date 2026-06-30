<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punchlist_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('documents');
            $table->foreignUuid('approval_step_id')->constrained('approval_steps');
            $table->foreignUuid('approver_id')->constrained('users');
            $table->string('status', 20)->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['document_id', 'approval_step_id']);
        });

        Schema::table('punchlist_verifications', function (Blueprint $table) {
            $table->index('document_id', 'idx_pv_document');
            $table->index('approver_id', 'idx_pv_approver');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('punchlist_verifications');
    }
};
