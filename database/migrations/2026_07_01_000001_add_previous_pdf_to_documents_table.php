<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('previous_pdf_path', 500)->nullable()->after('final_pdf_path');
            $table->smallInteger('previous_pdf_rejected_level')->nullable()->after('previous_pdf_path');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['previous_pdf_path', 'previous_pdf_rejected_level']);
        });
    }
};
