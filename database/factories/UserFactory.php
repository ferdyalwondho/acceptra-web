<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name'               => $this->faker->name(),
            'email'              => $this->faker->unique()->safeEmail(),
            'email_verified_at'  => now(),
            'password'           => static::$password ??= Hash::make('password'),
            'role'               => 'admin',
            'region'             => null,
            'partner_id'         => null,
            'status'             => 'active',
            'preferred_language' => 'id',
            'remember_token'     => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    public function withInvitation(): static
    {
        return $this->state(fn (array $attributes) => [
            'invitation_token'      => Str::random(64),
            'invitation_expires_at' => now()->addHours(72),
            'email_verified_at'     => null,
            'status'                => 'inactive',
        ]);
    }
}
