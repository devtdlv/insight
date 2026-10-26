<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('anonymous_id', 64);
            $table->string('identified_user_id', 64)->nullable();
            $table->json('properties')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('received_at');
            $table->string('client_event_id', 64)->nullable();

            $table->index(['project_id', 'received_at']);
            $table->index(['project_id', 'occurred_at']);
            $table->unique(['project_id', 'client_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
