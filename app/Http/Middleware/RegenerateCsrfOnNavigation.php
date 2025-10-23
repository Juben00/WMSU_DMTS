<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RegenerateCsrfOnNavigation
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get the current URL path
        $currentPath = $request->path();

        // Get the previous URL path from session
        $previousPath = $request->session()->get('previous_path');

        // Check if this is a navigation to a different page (not AJAX/API calls)
        $isPageNavigation = $request->header('X-Inertia') &&
                           $previousPath !== null &&
                           $previousPath !== $currentPath;

        // Only regenerate CSRF token on specific sensitive navigations, not all page navigations
        // This prevents unnecessary token regeneration that causes 419 errors
        $sensitivePages = ['login', 'logout', 'register', 'password/reset'];
        $shouldRegenerateToken = $isPageNavigation &&
                                in_array($currentPath, $sensitivePages);

        if ($shouldRegenerateToken) {
            $request->session()->regenerateToken();
        }

        // Store current path for next request
        $request->session()->put('previous_path', $currentPath);

        return $next($request);
    }
}
