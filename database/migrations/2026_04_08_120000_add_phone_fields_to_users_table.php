<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('country_code', 8)->nullable()->after('email');
            $table->string('phone', 32)->nullable()->after('country_code');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique(['country_code', 'phone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['country_code', 'phone']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['country_code', 'phone', 'phone_verified_at']);
        });
    }
};
