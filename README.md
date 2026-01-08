# WMSU Document Management and Tracking System

## Purpose
The WMSU Document Management and Tracking System (DMTS) digitizes the end-to-end routing of internal documents across Western Mindanao State University. It replaces manual hand-offs with a centralized workflow that improves turnaround time, transparency, and compliance.

## What the App Delivers
- **Campus-wide visibility** – Track where a document is in the approval pipeline and who is responsible for the next action.
- **Secure collaboration** – Manage access through department-based permissions, individual roles, and Sanctum-backed API tokens.
- **Complete audit trails** – Log every status change, file upload, and user action for accountability and reporting.
- **Paperless records** – Store document metadata, attachments, and routing history in one location for quick retrieval.
- **Actionable notifications** – Deliver real-time in-app prompts and optional email notices for new assignments or escalations.

## Core Modules
- **Document Intake** – Register new documents, attach files, categorize by type, and assign originating departments.
- **Routing & Approvals** – Configure routing paths, forward documents to recipients, set deadlines, and capture comments.
- **Tracking Dashboard** – Surface overdue items, recently updated documents, and department workloads.
- **Activity Logging** – Persist trail data via `DocumentActivityLog` and `UserActivityLog` records for audits.
- **File Management** – Handle uploads in `public/storage`, validate file types, and version attachments when re-uploaded.
- **Notification Center** – Generate in-app alerts through `InAppNotification` and send administrative onboarding emails.

## Document Lifecycle at a Glance
1. **Create** – A staff member encodes the document, attaches supporting files, and chooses initial recipients.
2. **Route** – Recipients review, comment, endorse, or reassign the document to the next department.
3. **Track** – Stakeholders monitor status updates through dashboards and receive notifications on key events.
4. **Archive** – Completed documents remain searchable with full audit history for future reference or compliance.

## Architecture Snapshot
- **Backend**: Laravel 10.x, queued jobs, notifications, policy-based authorization.
- **Frontend**: Inertia.js with Vue 3 components compiled by Vite.
- **Database**: MySQL or MariaDB with migrations and factories for seeding realistic data.
- **Authentication**: Laravel Sanctum for SPA tokens and session-based guards.

## Prerequisites
- PHP 8.2+
- Composer 2.x
- Node.js 20+
- npm 10+
- MySQL 8+ (or compatible server)

## Getting Started
```bash
# install PHP dependencies
composer install

# install JavaScript dependencies
npm install

# create environment file
cp .env.example .env
```

Update `.env` with database credentials, mail transport, queue driver, and file storage paths. Configure `APP_URL`, `VITE_APP_URL`, and `VITE_BACKEND_URL` so Inertia routes resolve correctly.

## Database Setup
```bash
# generate encryption key
php artisan key:generate

# run migrations and seed baseline data
php artisan migrate --seed
```

Seeder classes bootstrap sample departments, administrative users, and routing templates for demo purposes.

## Local Development
Run the backend and frontend in parallel:
```bash
# start Laravel HTTP server
php artisan serve

# in a second terminal: launch Vite dev server
npm run dev
```

For production-ready assets:
```bash
npm run build
```

## Quality Checks
```bash
# run automated tests
php artisan test

# optional: static analysis (requires setup)
./vendor/bin/phpstan analyse
./vendor/bin/pint
```

Place new feature tests in `tests/Feature` and isolated logic tests in `tests/Unit` to keep coverage comprehensive.

## Deployment Notes
- Configure storage linking with `php artisan storage:link` for serving uploaded files.
- Schedule `php artisan schedule:run` via cron for reminders and escalation jobs.
- Use queue workers (`php artisan queue:work`) if notifications or heavy processing are enabled.

## Reference Links
- [Laravel Documentation](https://laravel.com/docs)
- [Inertia.js Documentation](https://inertiajs.com/)
- [Vite Documentation](https://vitejs.dev/)
