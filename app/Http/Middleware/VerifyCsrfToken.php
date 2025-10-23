<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'login',
        'logout',
        'register',
        'forgot-password',
        'reset-password',
        'reset-password/*',
        'password/*',
        'email/verification-notification',
        'confirm-password',
        'verify-email/*',
        'users/documents/generate-order-number',
        'users/refresh-csrf',
    ];
}
