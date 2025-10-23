<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate received_at for existing document recipients that have status 'received'
        // but no received_at timestamp. Use responded_at as fallback, or created_at if responded_at is null
        DB::statement("
            UPDATE document_recipients
            SET received_at = COALESCE(responded_at, created_at)
            WHERE status = 'received'
            AND received_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this data migration
    }
};
