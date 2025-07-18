<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use phpDocumentor\Reflection\Types\Nullable;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('document_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            // could be the sent through user or the final recipient
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            //  final recipient if the document is for info
            $table->foreignId('final_recipient_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('forwarded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['pending', 'received', 'approved', 'rejected', 'returned', 'forwarded'])->default('pending');
            $table->text('comments')->nullable();
            $table->integer('sequence');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_final_approver')->default(false);
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_recipients');
    }
};
