<?php

use App\Models\User;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    if (!Schema::hasTable('PHM_XRAY')) {
        Schema::create('PHM_XRAY', function ($table) {
            $table->increments('PH_Xray_ID');
            $table->string('PH_Xray_Name')->nullable();
            $table->text('PH_Xray_Result')->nullable();
        });
    }
});

test('unauthenticated users are redirected to login', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect('/login');
});

test('authenticated doctors can access settings page', function () {
    $doctor = User::factory()->create();

    $response = $this->actingAs($doctor)->get('/settings');

    $response->assertStatus(200);
});

test('authenticated doctors can access profile page', function () {
    $doctor = User::factory()->create();

    $response = $this->actingAs($doctor)->get('/profile');

    $response->assertStatus(200);
});

test('authenticated doctors can get presets list', function () {
    $doctor = User::factory()->create();

    $response = $this->actingAs($doctor)->get('/api/presets');

    $response->assertStatus(200);
    $response->assertJsonStructure(['presets']);
});

test('authenticated doctors can store, update and delete a preset in PHM_XRAY', function () {
    $doctor = User::factory()->create();

    $storeResponse = $this->actingAs($doctor)->postJson('/api/presets', [
        'name' => 'Test Pneumonia Preset',
        'result' => 'Lungs: Consolidation at RLL',
    ]);

    $storeResponse->assertStatus(200);
    $storeResponse->assertJson([
        'success' => true,
    ]);

    $presetId = $storeResponse->json('preset.id');
    expect($presetId)->not->toBeEmpty();

    // Test Update Preset
    $updateResponse = $this->actingAs($doctor)->putJson("/api/presets/{$presetId}", [
        'name' => 'Test Pneumonia Preset Updated',
        'result' => 'Lungs: Clear',
    ]);

    $updateResponse->assertStatus(200);
    $updateResponse->assertJson([
        'success' => true,
        'preset' => [
            'label' => 'Test Pneumonia Preset Updated',
            'text' => 'Lungs: Clear',
        ],
    ]);

    // Test Delete Preset
    $deleteResponse = $this->actingAs($doctor)->deleteJson("/api/presets/{$presetId}");
    $deleteResponse->assertStatus(200);
    $deleteResponse->assertJson([
        'success' => true,
    ]);
});

test('syncVisitXrayStatus updates OP_Xray_Sts properly in opt_visit', function () {
    if (!Schema::hasTable('opt_visit')) {
        Schema::create('opt_visit', function ($table) {
            $table->increments('vt_id');
            $table->string('VT_NO')->nullable();
            $table->string('op_hn')->nullable();
            $table->string('OP_Xray_Sts', 1)->nullable();
        });
    }

    $vtId = \Illuminate\Support\Facades\DB::table('opt_visit')->insertGetId([
        'VT_NO' => '1',
        'op_hn' => 'TESTHN001',
        'OP_Xray_Sts' => '0',
    ]);

    $controller = new class {
        use \App\Http\Controllers\Traits\DoctorScopeTrait;
    };

    // When no images exist on disk
    $controller->syncVisitXrayStatus('TESTHN001', $vtId);
    $row = \Illuminate\Support\Facades\DB::table('opt_visit')->where('vt_id', $vtId)->first();
    expect($row->OP_Xray_Sts)->toBe('0');

    // Create a temporary mock image in public/uploads/xray/TESTHN001/vtId/
    $mockDir = public_path("uploads/xray/TESTHN001/{$vtId}");
    if (!file_exists($mockDir)) {
        mkdir($mockDir, 0777, true);
    }
    file_put_contents($mockDir . '/sample.jpg', 'fake-image-bytes');

    // Sync should update OP_Xray_Sts to 1
    $controller->syncVisitXrayStatus('TESTHN001', $vtId);
    $row = \Illuminate\Support\Facades\DB::table('opt_visit')->where('vt_id', $vtId)->first();
    expect($row->OP_Xray_Sts)->toBe('1');

    // Delete temporary mock image
    unlink($mockDir . '/sample.jpg');
    @rmdir($mockDir);
    @rmdir(public_path('uploads/xray/TESTHN001'));

    // Sync again should revert OP_Xray_Sts to 0
    $controller->syncVisitXrayStatus('TESTHN001', $vtId);
    $row = \Illuminate\Support\Facades\DB::table('opt_visit')->where('vt_id', $vtId)->first();
    expect($row->OP_Xray_Sts)->toBe('0');
});

