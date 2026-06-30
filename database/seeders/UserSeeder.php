<?php

namespace Database\Seeders;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $partner = Partner::create([
            'name'   => 'PT Subcon Mitra Sejahtera',
            'email'  => 'info@subcon.id',
            'status' => 'active',
        ]);

        $users = [
            [
                'name'  => 'Budi Santoso',
                'email' => 'superadmin@acceptra.id',
                'role'  => 'super_admin',
            ],
            [
                'name'  => 'Siti Rahayu',
                'email' => 'admin@acceptra.id',
                'role'  => 'admin',
            ],
            [
                'name'  => 'Ahmad Fauzi',
                'email' => 'viewer@acceptra.id',
                'role'  => 'viewer',
            ],
            [
                'name'       => 'Dian Pratiwi',
                'email'      => 'partner@subcon.id',
                'role'       => 'partner',
                'partner_id' => $partner->id,
            ],
            // approver_ms_bo (2 user)
            [
                'name'  => 'Reza Firmansyah',
                'email' => 'msbo1@acceptra.id',
                'role'  => 'approver_ms_bo',
            ],
            [
                'name'  => 'Wahyu Nugroho',
                'email' => 'msbo2@acceptra.id',
                'role'  => 'approver_ms_bo',
            ],
            // approver_ms_rts (2 user)
            [
                'name'  => 'Agus Setiawan',
                'email' => 'msrts1@acceptra.id',
                'role'  => 'approver_ms_rts',
            ],
            [
                'name'  => 'Dewi Kusumawati',
                'email' => 'msrts2@acceptra.id',
                'role'  => 'approver_ms_rts',
            ],
            // approver_xls_rth_team (2 user)
            [
                'name'  => 'Eko Prasetyo',
                'email' => 'rtht1@acceptra.id',
                'role'  => 'approver_xls_rth_team',
            ],
            [
                'name'  => 'Fitri Handayani',
                'email' => 'rtht2@acceptra.id',
                'role'  => 'approver_xls_rth_team',
            ],
            // approver_xls_rth (2 user)
            [
                'name'  => 'Hendra Wijaya',
                'email' => 'rth1@acceptra.id',
                'role'  => 'approver_xls_rth',
            ],
            [
                'name'  => 'Ira Susanti',
                'email' => 'rth2@acceptra.id',
                'role'  => 'approver_xls_rth',
            ],
        ];

        foreach ($users as $data) {
            User::create(array_merge([
                'password'           => 'password123',
                'status'             => 'active',
                'preferred_language' => 'id',
                'email_verified_at'  => now(),
            ], $data));
        }
    }
}
