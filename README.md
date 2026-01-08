# WMSU Document Management and Tracking System

## Overview
This repository hosts a Laravel-powered document management and tracking system tailored for campus-wide workflows. It combines a RESTful backend with an Inertia.js-driven frontend to streamline document routing, status monitoring, and audit trails.

## Tech Stack
- Laravel 10.x with Sanctum authentication
- Inertia.js + Vue 3 frontend
- Vite build tooling
- MySQL or MariaDB database

## Prerequisites
- PHP 8.2+
- Composer 2.x
- Node.js 20+
- npm 10+
- MySQL 8+ (or equivalent)

## Installation
```bash
# install PHP dependencies
composer install

# install JavaScript dependencies
npm install

# copy environment template and configure
cp .env.example .env
```

Edit `.env` to set your database, mail, queue, and storage credentials.

## Database Setup
```bash
# generate application key
php artisan key:generate

# run database migrations and seeders
php artisan migrate --seed
```

## Local Development
```bash
# compile frontend assets in dev mode
npm run dev

# alternatively, build optimized assets
npm run build

# start the Laravel development server
php artisan serve
```

The Vite dev server proxies asset requests; keep both the Laravel and Vite processes running during development.

## Testing
```bash
php artisan test
```

Add new feature tests under `tests/Feature` and unit tests under `tests/Unit` to maintain coverage.

## Additional Resources
- [Laravel Documentation](https://laravel.com/docs)
- [Inertia.js Documentation](https://inertiajs.com/)
- [Vite Documentation](https://vitejs.dev/)
