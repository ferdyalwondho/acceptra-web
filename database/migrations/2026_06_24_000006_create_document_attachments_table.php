<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('documents');
            $table->string('type', 30);
            $table->string('file_path', 500);
            $table->string('original_filename', 255);
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->foreignUuid('uploaded_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE document_attachments ADD CONSTRAINT document_attachments_type_check CHECK (type IN ('excel','offline_evidence','reassign_evidence','punchlist_revision'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('document_attachments');
    }
};
