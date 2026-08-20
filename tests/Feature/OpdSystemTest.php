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
    $doctor = User::factory()->create([
        'EMP_STS' => 'D',
        'Sts' => 'Doctor',
    ]);

    $response = $this->actingAs($doctor)->get('/settings');

    $response->assertStatus(200);
});

test('authenticated doctors can access profile page', function () {
    $doctor = User::factory()->create([
        'EMP_STS' => 'D',
        'Sts' => 'Doctor',
    ]);

    $response = $this->actingAs($doctor)->get('/profile');

    $response->assertStatus(200);
});

test('authenticated doctors can get presets list', function () {
    $doctor = User::factory()->create([
        'EMP_STS' => 'D',
        'Sts' => 'Doctor',
    ]);

    $response = $this->actingAs($doctor)->get('/api/presets');

    $response->assertStatus(200);
    $response->assertJsonStructure(['presets']);
});

test('authenticated doctors can store, update and delete a preset in PHM_XRAY', function () {
    $doctor = User::factory()->create([
        'EMP_STS' => 'D',
        'Sts' => 'Doctor',
    ]);

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
