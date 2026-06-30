<?php

namespace Database\Seeders;

use App\Models\Template;
use App\Models\TemplateLevel;
use Illuminate\Database\Seeder;

class TemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name'   => 'ATP Install',
                'levels' => [
                    ['role' => 'admin',                  'requires_signature' => false],
                    ['role' => 'approver_ms_rts',        'requires_signature' => true],
                    ['role' => 'approver_xls_rth_team',  'requires_signature' => true],
                    ['role' => 'approver_xls_rth',       'requires_signature' => true],
                ],
            ],
            [
                'name'   => 'ATP Dismantle',
                'levels' => [
                    ['role' => 'admin',                  'requires_signature' => false],
                    ['role' => 'approver_ms_rts',        'requires_signature' => true],
                    ['role' => 'approver_xls_rth_team',  'requires_signature' => true],
                ],
            ],
            [
                'name'   => 'ATP Upgrade License',
                'levels' => [
                    ['role' => 'admin',                  'requires_signature' => false],
                    ['role' => 'approver_ms_bo',         'requires_signature' => false],
                    ['role' => 'approver_ms_rts',        'requires_signature' => true],
                    ['role' => 'approver_xls_rth_team',  'requires_signature' => true],
                ],
            ],
        ];

        foreach ($templates as $data) {
            $template = Template::create([
                'name'   => $data['name'],
                'status' => 'active',
            ]);

            foreach ($data['levels'] as $order => $level) {
                TemplateLevel::create([
                    'template_id'        => $template->id,
                    'level_order'        => $order + 1,
                    'role'               => $level['role'],
                    'requires_signature' => $level['requires_signature'],
                ]);
            }
        }
    }
}
