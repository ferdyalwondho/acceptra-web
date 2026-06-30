<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('documents');
            $table->smallInteger('level_order');
            $table->string('role', 30);
            $table->boolean('requires_signature');
            $table->foreignUuid('approver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('pending');
            $table->timestamp('action_at')->nullable();
            $table->foreignUuid('signature_id')->nullable()->constrained('signatures')->nullOnDelete();
            $table->text('punchlist_notes')->nullable();
            $table->text('reject_reason')->nullable();
            $table->boolean('is_offline')->default(false);
            $table->date('offline_date')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->unique(['document_id', 'level_order']);
            $table->index(['document_id', 'is_active'], 'idx_steps_active');
            $table->index('approver_id', 'idx_steps_approver');
            $table->index('status', 'idx_steps_status');
        });

        DB::statement("ALTER TABLE approval_steps ADD CONSTRAINT approval_steps_status_check CHECK (status IN ('pending','approved','approved_with_punchlist','rejected','offline_approved','skipped'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_steps');
    }
};
