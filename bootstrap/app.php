<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Production di belakang proxy Cloudflare: percayai header X-Forwarded-*
        // agar HTTPS, host, dan client IP terdeteksi benar (cegah redirect loop & link http://).
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\SetUserLocale::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        // FR-AUTH-03: unauthenticated users diarahkan ke /login (intended URL tersimpan otomatis)
        $middleware->redirectGuestsTo('/login');

        // Guest middleware: user yang sudah login diarahkan ke /dashboard
        $middleware->redirectUsersTo('/dashboard');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
