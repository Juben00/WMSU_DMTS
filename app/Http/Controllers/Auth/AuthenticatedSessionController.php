<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\UserActivityLog;

class AuthenticatedSessionController extends Controller
{
        /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        // Log user login activity
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'login',
            'description' => 'User logged in',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        // ✅ Redirect based on role
        if (strtolower(Auth::user()->role) === 'superadmin') {
            return redirect()->route('admin.analytics'); // or dashboard for superadmin
        }

        return redirect()->route('dashboard'); // normal user
    }


    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Log user logout activity before logging out
        if (Auth::check()) {
            UserActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'logout',
                'description' => 'User logged out',
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        }

                Auth::guard('web')->logout();

        // Invalidate the session and regenerate CSRF token
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Redirect to login with a flag to trigger page refresh
        return redirect('/login');
    }
}
