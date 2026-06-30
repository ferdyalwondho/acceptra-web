<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HelpController extends Controller
{
    public function index(Request $request): Response
    {
        $role = $request->user()->role;

        $group = match (true) {
            in_array($role, ['super_admin', 'admin', 'viewer']) => 'aviat',
            str_starts_with($role, 'approver_')                 => 'approver',
            default                                             => 'partner',
        };

        return Inertia::render('Help/Index', ['roleGroup' => $group]);
    }
}
