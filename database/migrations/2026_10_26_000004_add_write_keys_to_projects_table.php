<?php

use App\Support\WriteKey;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('write_key', 48)->nullable()->unique();
        });

        DB::table('projects')->whereNull('write_key')->orderBy('id')->pluck('id')->each(function (int|string $id): void {
            DB::table('projects')->where('id', $id)->update([
                'write_key' => WriteKey::generate(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropUnique(['write_key']);
            $table->dropColumn('write_key');
        });
    }
};
