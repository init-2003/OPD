<?php

use App\Models\User;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'PB_user' => $user->PB_user,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $today = now()->timezone('Asia/Bangkok')->format('Y-m-d');
    $response->assertRedirect(route('dashboard', ['date' => $today]));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'PB_user' => $user->PB_user,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can authenticate with remember me', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'PB_user' => $user->PB_user,
        'password' => 'password',
        'remember' => true,
    ]);

    $this->assertAuthenticated();
    $today = now()->timezone('Asia/Bangkok')->format('Y-m-d');
    $response->assertRedirect(route('dashboard', ['date' => $today]));
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});


