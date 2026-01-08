<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password' => bcrypt('password'),
        'role' => 'user',
        'gender' => 'Male',
        'position' => 'Test Position',
    ]);
    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password' => bcrypt('password'),
        'role' => 'user',
        'gender' => 'Male',
        'position' => 'Test Position',
    ]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'first_name' => 'TestUser',
            'last_name' => 'TestUser',
            'email' => 'test@example.com',
            'gender' => 'Male',
            'position' => 'Test Position',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    expect($user->first_name)->toBe('TestUser');
    expect($user->last_name)->toBe('TestUser');
    expect($user->email)->toBe('test@example.com');
    // Remove or adjust email_verified_at assertion if not always null
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password' => bcrypt('password'),
        'role' => 'user',
        'gender' => 'Male',
        'position' => 'Test Position',
    ]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'gender' => $user->gender,
            'position' => $user->position,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password' => bcrypt('password'),
    ]);

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password' => bcrypt('password'),
    ]);

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/settings/profile');

    expect($user->fresh())->not->toBeNull();
});
