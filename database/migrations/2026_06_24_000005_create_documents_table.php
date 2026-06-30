<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('unique_id', 20)->unique();
            $table->string('pt_index', 100);
            $table->string('link_id', 100)->nullable();
            $table->string('link_name', 200)->nullable();
            $table->string('project_code', 100)->nullable();
            $table->string('vendor_contractor', 200)->default('PT Aviat Solusi Komunikasi Indonesia');
            $table->foreignUuid('partner_id')->constrained('partners');
            $table->foreignUuid('submitted_by')->constrained('users');
            $table->foreignUuid('template_id')->constrained('templates');
            $table->jsonb('template_snapshot');
            $table->string('sow_name', 200);
            $table->string('tower_id_ne', 100)->nullable();
            $table->string('site_name_ne', 200)->nullable();
            $table->string('tower_id_fe', 100)->nullable();
            $table->string('site_name_fe', 200)->nullable();
            $table->string('original_pdf_path', 500)->nullable();
            $table->string('final_pdf_path', 500)->nullable();
            $table->string('status_code', 10)->default('draft');
            $table->date('date_atp_submission')->nullable();
            $table->date('date_atp_approved')->nullable();
            $table->text('atp_punchlist')->nullable();
            $table->string('acceptance_status', 50)->nullable();
            $table->boolean('is_imported')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('status_code', 'idx_docs_status');
            $table->index('partner_id', 'idx_docs_partner');
            $table->index('submitted_by', 'idx_docs_submitted_by');
            $table->index('template_id', 'idx_docs_template');
            $table->index('created_at', 'idx_docs_created_at');
            $table->index('project_code', 'idx_docs_project_code');
            $table->index('unique_id', 'idx_docs_unique_id');
        });

        DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_code_check CHECK (status_code IN ('draft','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
