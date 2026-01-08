<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Document;
use App\Models\DocumentRecipient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Exception;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use App\Models\Departments;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Log;
use Picqer\Barcode\BarcodeGeneratorSVG;
use App\Notifications\InAppNotification;
use App\Models\UserActivityLog;
use App\Models\DocumentActivityLog;
use App\Notifications\SendAdminAccountMail;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index()
        {
        $users = User::where('role', 'user')->get();

        return Inertia::render('Admins/user', [
            'users' => $users
        ]);
    }

    public function departments()
    {
        // get all users with role user or receiver and with department same as the user's department
        $users = User::whereIn('role', ['user', 'receiver'])->where('department_id', Auth::user()->department_id)->with('department')->get();
        return Inertia::render('Users/Department', [
            'auth' => [
                'user' => Auth::user(),
                'department' => Auth::user()->department
            ],
            'users' => $users
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'last_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'middle_name' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'suffix' => ['nullable', 'string', 'max:255'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'position' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
        ]);

        $randomPassword = Str::random(12);

        $user = User::create([
            'first_name' => Str::title(trim($request->first_name)),
            'last_name' => Str::title(trim($request->last_name)),
            'middle_name' => $request->filled('middle_name') ? Str::title(trim($request->middle_name)) : null,
            'suffix' => $request->filled('suffix') ? Str::title(trim($request->suffix)) : null,
            'gender' => $request->gender,
            'position' => $request->position,
            'department_id' => Auth::user()->department_id,
            'role' => "user",   // default role is user
            'email' => $request->email,
            'password' => Hash::make($randomPassword),
        ]);

        // Notify the user about their account creation
        $user->notify(new InAppNotification('Your account has been created.', ['user_id' => $user->id]));

        // send email to the user
        $user->notify(new SendAdminAccountMail($user->first_name . ' ' . $user->last_name, $user->email, $randomPassword));

        // Log user creation
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_created',
            'description' => 'Created user: ' . $user->email,
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return redirect()->route('users.departments');
    }

    public function toggleStatus(User $admin)
    {
        $admin->update([
            'is_active' => !$admin->is_active
        ]);

        return redirect()->route('admins.index');
    }

    public function destroy(User $user)
    {
        $user->delete();
        // Notify the user (if possible) and all admins
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new InAppNotification('A user has been deleted.', ['user_id' => $user->id]));
        }
        // Log user deletion
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_deleted',
            'description' => 'Deleted user: ' . $user->email,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
        return redirect()->route('users.departments');
    }

    // Document Profile Methods
    public function documents()
    {
        // Get documents where user is the owner
        $ownedDocuments = Document::where('owner_id', Auth::id())
            ->select('id', 'subject', 'document_type', 'status', 'created_at', 'owner_id', 'is_public', 'barcode_value', 'order_number')
            ->with(['files:id,document_id'])
            ->get();

        // Get documents where user is a recipient and has received the document
        // OR documents sent to the same department (department-wide visibility)
        $userDepartmentId = Auth::user()->department_id;
        $receivedDocuments = Document::whereHas('recipients', function($query) use ($userDepartmentId) {
            $query->where(function($q) use ($userDepartmentId) {
                // Documents received by the current user
                $q->where('received_by', Auth::id())
                  ->where('status', 'received');
            })->orWhere(function($q) use ($userDepartmentId) {
                // Documents sent to the same department and received by any user in that department
                $q->where('department_id', $userDepartmentId)
                  ->where('status', 'received');
            });
        })
        ->select('id', 'subject', 'document_type', 'status', 'created_at', 'owner_id', 'is_public', 'barcode_value', 'order_number')
        ->with(['recipients' => function($q) use ($userDepartmentId) {
            $q->where(function($query) use ($userDepartmentId) {
                $query->where('received_by', Auth::id())
                      ->where('status', 'received');
            })->orWhere(function($query) use ($userDepartmentId) {
                $query->where('department_id', $userDepartmentId)
                      ->where('status', 'received');
            })
              ->select('id', 'document_id', 'department_id', 'status', 'received_by', 'sequence', 'received_at');
        }, 'files:id,document_id'])
        ->get();

        // Get returned documents where user is the owner, but only if the owner is the current recipient and has received it
        $ownerDepartmentId = Auth::user()->department_id;
        $returnedDocuments = Document::where('owner_id', Auth::id())
            ->where('status', 'returned')
            ->whereHas('recipients', function($query) use ($ownerDepartmentId) {
                $query->where('department_id', $ownerDepartmentId)
                      ->where('status', 'received')
                      ->whereRaw('sequence = (SELECT MAX(sequence) FROM document_recipients WHERE document_id = documents.id)');
            })
            ->select('id', 'subject', 'document_type', 'status', 'created_at', 'owner_id', 'is_public', 'barcode_value', 'order_number')
            ->with(['files:id,document_id'])
            ->get();

        // Merge the collections and remove duplicates
        $documents = $ownedDocuments->concat($receivedDocuments)->concat($returnedDocuments)->unique('id');

        // Attach recipient_status for the current user's department or owner's department if owner
        $departmentId = Auth::user()->department_id;
        $ownerDepartmentId = Auth::user()->department_id;
        $documents = $documents->map(function($doc) use ($departmentId, $ownerDepartmentId) {
            // Always get the latest recipient (max sequence) for this document
            $latestRecipient = DocumentRecipient::where('document_id', $doc->id)
                ->orderByDesc('sequence')
                ->first();
            $doc->user_id = $latestRecipient ? $latestRecipient->user_id : null;
            $doc->department_id = $latestRecipient ? $latestRecipient->department_id : null;
            $doc->sequence = $latestRecipient ? $latestRecipient->sequence : null;
            $doc->recipient_status = $latestRecipient ? $latestRecipient->status : null;
            $doc->recipient_received_by = $latestRecipient ? $latestRecipient->received_by : null;
            $doc->received_at = $latestRecipient ? $latestRecipient->received_at : null;

            // Calculate if document is overstayed (more than 1 day)
            $doc->is_overstayed = false;
            if ($latestRecipient && $latestRecipient->received_at && $latestRecipient->status === 'received') {
                $receivedAt = \Carbon\Carbon::parse($latestRecipient->received_at);
                $now = \Carbon\Carbon::now();
                $doc->is_overstayed = $receivedAt->diffInDays($now) >= 1;
                $doc->days_overstayed = $receivedAt->diffInDays($now);
            }

            return $doc;
        });

        // Get document_data from session and then clear it
        $documentData = session('document_data');
        if ($documentData) {
            session()->forget('document_data');
        }

        return Inertia::render('Users/Documents', [
            'documents' => $documents,
            'receivedDocuments' => $receivedDocuments,
            'auth' => [
                'user' => Auth::user()
            ],
            'document_data' => $documentData
        ]);
    }

    public function profile()
    {
        $user = User::with('department')->find(Auth::id());
        return Inertia::render('Users/Profile', [
            'user' => $user
        ]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'last_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'middle_name' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'suffix' => ['nullable', 'string', 'max:255'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'position' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore(Auth::id()),
            ],
        ]);

        $user = User::find(Auth::id());
        // Normalize capitalization on name fields
        $user->first_name = Str::title(trim($validated['first_name']));
        $user->last_name = Str::title(trim($validated['last_name']));
        $user->middle_name = isset($validated['middle_name']) && $validated['middle_name'] !== null
            ? Str::title(trim($validated['middle_name']))
            : null;
        $user->suffix = isset($validated['suffix']) && $validated['suffix'] !== null
            ? Str::title(trim($validated['suffix']))
            : null;
        $user->position = $validated['position'];
        $user->gender = $validated['gender'];
        $user->email = $validated['email'];
        $user->save();

        // Log user update
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_updated',
            'description' => 'Updated user: ' . $user->email,
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return redirect()->route('users.profile')->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::find(Auth::id());
        $user->password = Hash::make($request->input('password'));
        $user->markPasswordAsChanged();
        $user->save();

        return redirect()->route('users.profile')->with('success', 'Password updated successfully.');
    }

    public function createDocument()
    {
        $departments = Departments::with(['users' => function($query) {
            $query->whereIn('role', ['receiver', 'admin'])->where('id', '!=', Auth::user()->id)
                  ->orderBy('role', 'desc'); // This will put receivers first
        }])->get();

        // get all department including the current user's department
        $departments = Departments::get();

        // Load the authenticated user with department relationship
        $user = User::with('department')->find(Auth::id());

        return Inertia::render('Users/CreateDocument', [
            'auth' => [
                'user' => $user
            ],
            'departments' => $departments
        ]);
    }

    public function generateOrderNumber(Request $request)
    {
        try {
            // Check if user is authenticated first
            if (!Auth::check()) {
                Log::warning('Unauthenticated user attempted to generate order number', [
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent()
                ]);
                return response()->json(['error' => 'User not authenticated.'], 401);
            }

            // Basic logging for debugging
            Log::info('Order number generation request', [
                'user_id' => Auth::id(),
                'ip' => $request->ip()
            ]);

            $currentUser = Auth::user();

            // Additional session validation
            if (!$currentUser || !$currentUser->is_active) {
                Log::warning('Inactive or invalid user attempted to generate order number', [
                    'user_id' => $currentUser?->id,
                    'email' => $currentUser?->email,
                    'is_active' => $currentUser?->is_active
                ]);
                return response()->json(['error' => 'User account is not active.'], 401);
            }

            $departmentId = $currentUser->department_id;
            $department = $currentUser->department;
            $currentDate = now();


            // Check if user has a department assigned
            if (!$department) {
                Log::warning('User without department tried to generate order number', [
                    'user_id' => $currentUser->id,
                    'email' => $currentUser->email
                ]);
                return response()->json(['error' => 'User does not have a department assigned.'], 400);
            }

                        // Simplified approach with retry mechanism for duplicate detection
            try {
                // Check if this is the President's office (OP)
                $isPresidentOffice = $department->is_presidential;

                Log::info('Starting order number generation', [
                    'department_id' => $departmentId,
                    'department_code' => $department->code,
                    'is_president_office' => $isPresidentOffice,
                    'current_date' => $currentDate
                ]);

                // Get the latest order number for this department (excluding archived)
                $query = Document::where('department_id', $departmentId)
                    ->whereDate('created_at', $currentDate)
                    ->where('status', '!=', 'archived');

                $latestDocument = $query->orderBy('order_number', 'desc')->first();

                Log::info('Latest document found', [
                    'latest_document' => $latestDocument ? $latestDocument->order_number : 'none',
                    'department_id' => $departmentId,
                    'is_president_office' => $isPresidentOffice
                ]);

                if ($latestDocument) {
                    // Extract only the sequence number part (last 3 digits after the last dash)
                    $parts = explode('-', $latestDocument->order_number);
                    $lastPart = end($parts);

                    // Validate that the last part is numeric
                    if (!is_numeric($lastPart)) {
                        Log::error('Invalid order number format found', [
                            'order_number' => $latestDocument->order_number,
                            'department_id' => $departmentId
                        ]);
                        throw new Exception('Invalid order number format in database.');
                    }

                    $nextNumber = intval($lastPart) + 1;
                    Log::info('Next number calculated', [
                        'last_order_number' => $latestDocument->order_number,
                        'last_part' => $lastPart,
                        'next_number' => $nextNumber
                    ]);
                } else {
                    $nextNumber = 1;
                    Log::info('No previous documents found, starting with number 1');
                }

                // Format the order number based on department and document type
                $departmentCode = $department->code;

                // Try to find a unique order number (retry up to 10 times)
                $maxAttempts = 10;
                $attempt = 0;
                $orderNumber = null;
                $existingDocument = null;

                do {
                    $attempt++;
                    $dateString = $currentDate->format('mdy'); // MMDDYY format
                    $orderNumber = sprintf('%s-%s-%03d', $departmentCode, $dateString, $nextNumber);

                    // Check if this order number already exists
                    $existingDocument = Document::where('order_number', $orderNumber)
                        ->where('department_id', $departmentId)
                        ->whereDate('created_at', $currentDate)
                        ->where('status', '!=', 'archived')
                        ->first();

                    if ($existingDocument) {
                        Log::warning('Duplicate order number detected, trying next number', [
                            'attempt' => $attempt,
                            'order_number' => $orderNumber,
                            'department_id' => $departmentId,
                            'user_id' => $currentUser->id
                        ]);
                        $nextNumber++;
                    }
                } while ($existingDocument && $attempt < $maxAttempts);

                if ($existingDocument) {
                    Log::error('Unable to generate unique order number after maximum attempts', [
                        'max_attempts' => $maxAttempts,
                        'department_id' => $departmentId,
                        'user_id' => $currentUser->id
                    ]);
                    throw new Exception('Unable to generate unique order number. Please try again.');
                }

                // Log successful generation
                Log::info('Order number generated successfully', [
                    'user_id' => $currentUser->id,
                    'department_id' => $departmentId,
                    'order_number' => $orderNumber
                ]);

                return response()->json(['order_number' => $orderNumber]);
            } catch (Exception $e) {
                Log::error('Error in order number generation', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (Exception $e) {
            Log::error('Error generating order number', [
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'department_id' => Auth::user()?->department_id,
                'department_code' => Auth::user()?->department?->code,
                'current_year' => now()->year
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function testCsrf(Request $request)
    {
        try {
            // Check if user is authenticated
            if (!Auth::check()) {
                return response()->json(['error' => 'User not authenticated.'], 401);
            }

            // Log CSRF token information
            Log::info('CSRF test endpoint accessed', [
                'user_id' => Auth::id(),
                'has_csrf_token' => $request->hasHeader('X-CSRF-TOKEN'),
                'csrf_token_length' => strlen($request->header('X-CSRF-TOKEN', '')),
                'session_id' => $request->session()->getId(),
                'all_headers' => $request->headers->all()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'CSRF token is valid',
                'user_id' => Auth::id(),
                'session_id' => $request->session()->getId()
            ]);

        } catch (Exception $e) {
            Log::error('Error in CSRF test', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function testDepartment(Request $request)
    {
        try {
            // Check if user is authenticated
            if (!Auth::check()) {
                return response()->json(['error' => 'User not authenticated.'], 401);
            }

            $user = Auth::user();
            $department = $user->department;

            Log::info('Department test endpoint accessed', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'department_id' => $user->department_id,
                'department_exists' => $department ? 'yes' : 'no',
                'department_code' => $department ? $department->code : 'null',
                'department_name' => $department ? $department->name : 'null'
            ]);

            return response()->json([
                'success' => true,
                'user_id' => $user->id,
                'department_id' => $user->department_id,
                'department' => $department ? [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code
                ] : null
            ]);

        } catch (Exception $e) {
            Log::error('Error in department test', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function refreshCsrf(Request $request)
    {
        try {
            // Check if user is authenticated
            if (!Auth::check()) {
                return response()->json(['error' => 'User not authenticated.'], 401);
            }

            // Regenerate CSRF token
            $request->session()->regenerateToken();

            Log::info('CSRF token refreshed', [
                'user_id' => Auth::id(),
                'session_id' => $request->session()->getId(),
                'new_token' => csrf_token()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'CSRF token refreshed successfully',
                'csrf_token' => csrf_token(),
                'user_id' => Auth::id()
            ]);

        } catch (Exception $e) {
            Log::error('Error refreshing CSRF token', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function sendDocument(Request $request)
    {
        try {

        // Get the current user's department
        $currentUser = Auth::user();
        $departmentId = $currentUser->department_id;
        $department = $currentUser->department;

        // Check if this is the President's office (OP)
        $isPresidentOffice = $department && $department->is_presidential;

        // Define validation rules based on department type
        $orderNumberRule = ['required', 'string', 'max:255'];
        // Determine current date for daily reset
        $currentDate = now();
        if ($isPresidentOffice) {
            // For President's office: unique per department, document_type, and order_number, but only for non-archived and current day
            $orderNumberRule[] = function ($attribute, $value, $fail) use ($departmentId, $request, $currentDate) {
                $exists = Document::where('department_id', $departmentId)
                    ->where('document_type', $request->input('document_type'))
                    ->where('order_number', $value)
                    ->where(function($query) use ($currentDate) {
                        $query->where('status', '!=', 'archived')
                              ->whereDate('created_at', $currentDate);
                    })
                    ->exists();
                if ($exists) {
                    $fail('The order number has already been taken for this department and document type today.');
                }
            };
        } else {
            // For other departments: unique per department and order_number, but only for non-archived and current day
            $orderNumberRule[] = function ($attribute, $value, $fail) use ($departmentId, $currentDate) {
                $exists = Document::where('department_id', $departmentId)
                    ->where('order_number', $value)
                    ->where(function($query) use ($currentDate) {
                        $query->where('status', '!=', 'archived')
                              ->whereDate('created_at', $currentDate);
                    })
                    ->exists();
                if ($exists) {
                    $fail('The order number has already been taken for this department today.');
                }
            };
        }

        $isPresidentDepartment = Auth::user()->department->is_presidential;

        $validationRules = [
            'subject' => 'required|string|max:255',
            'order_number' => 'required|string|max:255',
            'document_type' => 'required|in:special_order,order,memorandum,for_info,letters,email,travel_order,city_resolution,invitations,vouchers,diploma,checks,job_orders,contract_of_service,pr',
            'description' => 'nullable|string',
            'files' => 'nullable|array',
            'files.*' => 'nullable|file|max:51200|mimes:pdf,doc,docx,,txt,jpg,jpeg,png',
            'recipient_ids' => 'required|array|min:1',
            'recipient_ids.*' => 'exists:departments,id',
            'initial_recipient_id' => 'nullable|exists:departments,id',
            'through_department_ids' => 'nullable|array',
            'through_department_ids.*' => 'exists:departments,id',
        ];

        // Add president-specific validation rules
        if ($isPresidentDepartment) {
            $validationRules['signatory'] = 'nullable|string|max:255';
            $validationRules['request_from_department'] = 'nullable|string|max:255';
        }

        $validated = $request->validate($validationRules);

        // Create the document
        $documentData = [
            'owner_id' => Auth::id(),
            'department_id' => $departmentId,
            'subject' => $validated['subject'],
            'order_number' => $validated['order_number'],
            'document_type' => $validated['document_type'],
            'description' => $validated['description'],
            'through_department_ids' => $request->input('through_department_ids', []),
            'status' => 'pending',
        ];

        // Add president-specific fields only if user is from president's department
        if ($isPresidentDepartment) {
            $documentData['signatory'] = $request->input('signatory');
            $documentData['request_from_department'] = $request->input('request_from_department');
        }

        // Final check to ensure order number is unique
        $existingDocument = Document::where('order_number', $validated['order_number'])
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $currentDate)
            ->first();

        if ($existingDocument) {
            Log::error('Duplicate order number detected before document creation', [
                'order_number' => $validated['order_number'],
                'department_id' => $departmentId,
                'user_id' => Auth::id()
            ]);
            throw new Exception('Duplicate order number detected. Please try again.');
        }

        $document = Document::create($documentData);

        // Recipient logic
        if ($validated['document_type'] === 'for_info') {
            // Multi-recipient logic (unchanged)
            $sequence = 1;
            foreach ($validated['recipient_ids'] as $recipientDeptId) {
                if (!$recipientDeptId) continue;

                DocumentRecipient::create([
                    'document_id' => $document->id,
                    'department_id' => $recipientDeptId,
                    'status' => 'pending',
                    'sequence' => $sequence,
                    'is_active' => true,
                ]);
                $sequence++;
            }
        } else {
            // For memorandum, order, special_order documents
            $sendToDeptId = $request->input('recipient_ids')[0] ?? null;

            if (!$sendToDeptId) {
                throw new Exception('Main recipient department is required for this document type.');
            }

            $throughDeptIds = $request->input('through_department_ids', []);

            // Determine the initial recipient (first through department if any, otherwise the main recipient)
            $initialRecipientDeptId = !empty($throughDeptIds) ? $throughDeptIds[0] : $sendToDeptId;

            DocumentRecipient::create([
                'document_id' => $document->id,
                'department_id' => $initialRecipientDeptId, // Initially send to first through department or directly to main recipient
                'final_recipient_department_id' => $sendToDeptId,
                'status' => 'pending',
                'sequence' => 1,
                'is_active' => true,
                'forwarded_by' => null,
            ]);
        }

        // Generate barcode at the moment the document is sent
        $currentUser = Auth::user();
        $department = $currentUser->department;

        // use the value of order_number as the barcode value but without the dashes
        $barcodeValue = $document->order_number;
        $barcodeValue = str_replace('-', '', $barcodeValue);

        // Save to document
        $document->update([
            'barcode_value' => $barcodeValue,
        ]);


        // Reload recipients and their users so the activity log can access user info
        $document->load('recipients.department');

        // Log document creation
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'document_created',
            'description' => 'Created document: ' . $document->subject . ' (ID: ' . $document->id . ')',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => 'document_sent',
            'description' => 'Sent document: ' . $document->subject . ' to ' . $document->recipients->map(function($recipient) {
                $dept = $recipient->department ? $recipient->department->name : 'No Department';
                return $dept;
            })->implode(', '),
            'created_at' => now(),
        ]);

        // Handle multiple file uploads (only if files are provided)
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $filePath = $file->store('documents', 'public');
                $document->files()->create([
                    'file_path' => $filePath,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => Auth::id(),
                    'upload_type' => 'original',
                ]);
            }
        }

        // Notify the document owner
        $document->owner->notify(new InAppNotification('Your document has been created and sent.', ['document_id' => $document->id, 'document_name' => $document->subject]));

        // Notify all initial recipients
        if ($validated['document_type'] === 'for_info') {
            foreach ($validated['recipient_ids'] as $recipientDeptId) {
                // Notify all users in the department
                $departmentUsers = User::where('department_id', $recipientDeptId)->get();
                foreach ($departmentUsers as $user) {
                    $user->notify(new InAppNotification("A new {$document->document_type} document '{$document->subject}' has been sent to your department by {$document->owner->first_name} {$document->owner->last_name}.", ['document_id' => $document->id, 'document_name' => $document->subject]));
                }
            }
        } else {
            // For memorandum, order, special_order documents
            $sendToDeptId = $request->input('recipient_ids')[0] ?? null;
            $throughDeptIds = $request->input('through_department_ids', []);

            if (!empty($throughDeptIds)) {
                // If there are through departments, notify all users in the first through department
                $firstThroughDeptUsers = User::where('department_id', $throughDeptIds[0])->get();
                foreach ($firstThroughDeptUsers as $user) {
                    $user->notify(new InAppNotification("A new {$document->document_type} document '{$document->subject}' has been sent through your department by {$document->owner->first_name} {$document->owner->last_name}.", ['document_id' => $document->id, 'document_name' => $document->subject]));
                }
            } else {
                // If no through departments, notify all users in the main recipient department
                $recipientUsers = User::where('department_id', $sendToDeptId)->get();
                foreach ($recipientUsers as $user) {
                    $user->notify(new InAppNotification("A new {$document->document_type} document '{$document->subject}' has been sent to your department by {$document->owner->first_name} {$document->owner->last_name}.", ['document_id' => $document->id, 'document_name' => $document->subject]));
                }
            }
        }

        // Log the document sent
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'document_sent',
            'description' => 'Document sent to departments: ' . $document->recipients->pluck('department_id')->implode(', '),
        ]);

        // For Inertia.js requests, redirect with document data in session
        return redirect()->route('users.documents')->with([
            'success' => 'Document sent successfully.',
            'document_data' => [
                'id' => $document->id,
                'subject' => $document->subject,
                'order_number' => $document->order_number,
                'barcode_value' => $document->barcode_value,
            ]
        ]);

        } catch (\Throwable $th) {
            Log::error('Error in sendDocument', [
                'error' => $th->getMessage(),
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            // Handle validation errors specifically
            if ($th instanceof ValidationException) {
                return back()->withErrors($th->errors());
            }

            // Handle other exceptions
            return back()->withErrors([
                'message' => $th->getMessage(),
            ]);
        }
    }

    public function showDocument($document)
    {
        // $document = Auth::user()->documents()->findOrFail($document);
        // return Inertia::render('Users/Documents/Show', [
        //     'document' => $document
        // ]);
    }

    public function editDocument($document)
    {
        $doc = Document::where('id', $document)
            ->where('owner_id', Auth::id())
            ->where('status', 'returned')
            ->with(['files', 'recipients.department'])
            ->firstOrFail();

        // Get all departments that were originally involved in the document
        $involvedDepartments = collect();

        // include final recipient department from DocumentRecipient records
        $finalRecipientRecord = $doc->recipients()->whereNotNull('final_recipient_department_id')->first();
        if ($finalRecipientRecord && $finalRecipientRecord->final_recipient_department_id) {
            $finalRecipientDepartment = Departments::find($finalRecipientRecord->final_recipient_department_id);
            if ($finalRecipientDepartment) {
                $involvedDepartments->push([
                    'id' => $finalRecipientDepartment->id,
                    'name' => $finalRecipientDepartment->name,
                    'type' => 'sent_to'
                ]);
            }
        }

        foreach ($doc->recipients as $recipient) {
            if ($recipient->department) {
                $involvedDepartments->push([
                    'id' => $recipient->department->id,
                    'name' => $recipient->department->name,
                    'type' => 'sent_through'
                ]);
            }
        }

        // Add departments from through_department_ids (sent through)
        if ($doc->through_department_ids) {
            $throughDepartments = Departments::whereIn('id', $doc->through_department_ids)->get();
            foreach ($throughDepartments as $dept) {
                $involvedDepartments->push([
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'type' => 'sent_through'
                ]);
            }
        }

        // Remove duplicates and sort by name
        $involvedDepartments = $involvedDepartments->unique('id')->sortBy('name')->values();

        // Remove the current user's department from the involved departments
        // $currentUser = Auth::user();
        // if ($currentUser && $currentUser->department_id) {
        //     $involvedDepartments = $involvedDepartments->filter(function ($dept) use ($currentUser) {
        //         return $dept['id'] !== $currentUser->department_id;
        //     })->values();
        // }

        return Inertia::render('Users/EditDocument', [
            'document' => $doc,
            'involvedDepartments' => $involvedDepartments,
        ]);
    }

    public function updateDocument(Request $request, $document)
    {
        $doc = Document::where('id', $document)
            ->where('owner_id', Auth::id())
            ->where('status', 'returned')
            ->firstOrFail();

        //
        $doc->update([
            'status' => 'pending',
        ]);

        // Check if this is the President's office (OP)
        $department = $doc->department;
        $isPresidentOffice = $department && $department->is_presidential;

        // Define validation rules based on department type
        // $orderNumberRule = 'required|string|max:255';
        $orderNumberRule = ['required', 'string', 'max:255'];
        // In updateDocument, skip the current document's id
        $currentDate = now();
        if ($isPresidentOffice) {
            $orderNumberRule[] = function ($attribute, $value, $fail) use ($doc, $currentDate) {
                $exists = Document::where('department_id', $doc->department_id)
                    ->where('document_type', $doc->document_type)
                    ->where('order_number', $value)
                    ->whereDate('created_at', $currentDate)
                    ->where('id', '!=', $doc->id)
                    ->exists();
                if ($exists) {
                    $fail('The order number has already been taken for this department and document type today.');
                }
            };
        } else {
            $orderNumberRule[] = function ($attribute, $value, $fail) use ($doc, $currentDate) {
                $exists = Document::where('department_id', $doc->department_id)
                    ->where('order_number', $value)
                    ->whereDate('created_at', $currentDate)
                    ->where('id', '!=', $doc->id)
                    ->exists();
                if ($exists) {
                    $fail('The order number has already been taken for this department today.');
                }
            };
        }

        $validated = $request->validate([
            'order_number' => $orderNumberRule,
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'selected_department_id' => 'required|exists:departments,id',
            'files' => 'nullable|array',
            // 50MB max per file; allow only safe office/image/text types
            'files.*' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif',
        ]);

        $doc->order_number = $validated['order_number'];
        $doc->subject = $validated['subject'];
        $doc->description = $validated['description'] ?? '';
        $doc->status = 'pending'; // Reset status so it can be resent
        $doc->save();

        // Log document update
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'document_updated',
            'description' => 'Updated document: ' . $doc->subject . ' (ID: ' . $doc->id . ')',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        // Handle file uploads (optional: delete old files if needed)
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $filePath = $file->store('documents', 'public');
                $doc->files()->create([
                    'file_path' => $filePath,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => Auth::id(),
                    'upload_type' => 'original',
                ]);
            }
        }

        // set the previous chain to received
        $lastRecipient = $doc->recipients()->orderByDesc('sequence')->first();
        if ($lastRecipient) {
            // Set the previous recipient's status to 'received' (not pending)
            $lastRecipient->status = 'returned';
            $lastRecipient->save();
        }

        // get the final recipient department id where document id is the same as the current document
        $finalRecipientDepartmentId = DocumentRecipient::where('document_id', $doc->id)->whereNotNull('final_recipient_department_id')->first()->final_recipient_department_id;

        // Create new recipient record for the selected department
        DocumentRecipient::create([
            'document_id' => $doc->id,
            'department_id' => $validated['selected_department_id'],
            'final_recipient_department_id' => $finalRecipientDepartmentId,
            'status' => 'pending',
            'sequence' => $doc->recipients()->max('sequence') + 1,
            'is_active' => true,
            'forwarded_by' => null,
            'comments' => 'Document resent by owner to selected department.',
        ]);

        // new document log
        DocumentActivityLog::create([
            'document_id' => $doc->id,
            'user_id' => Auth::id(),
            'action' => 'document_resent',
            'description' => 'Document resent by owner.',
        ]);

        // Notify all users in the selected department
        $selectedDepartmentUsers = User::where('department_id', $validated['selected_department_id'])->get();
        foreach ($selectedDepartmentUsers as $user) {
            $user->notify(new InAppNotification(
                "A {$doc->document_type} document '{$doc->subject}' has been resent to your department by " . Auth::user()->first_name . ' ' . Auth::user()->last_name . ".",
                [
                    'document_id' => $doc->id,
                    'document_name' => $doc->subject
                ]
            ));
        }

        return redirect()->route('users.documents', $doc->id)->with('success', 'Document updated and resent successfully.');
    }

    public function destroyDocument($document)
    {
        // $document = Auth::user()->documents()->findOrFail($document);

        // // Delete file from storage
        // Storage::disk('public')->delete($document->file_path);

        // $document->delete();

        // return redirect()->route('users.documents')->with('success', 'Document deleted successfully.');
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'last_name' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'middle_name' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z]+$/'],
            'suffix' => ['nullable', 'string', 'max:255'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'position' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'in:receiver,user'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
        ]);

        // Check if trying to update to receiver role and if one already exists for this department
        if ($request->role === 'receiver' && $user->role !== 'receiver') {
            $existingReceiver = User::where('department_id', Auth::user()->department_id)
                ->where('role', 'receiver')
                ->where('id', '!=', $user->id)
                ->first();

            if ($existingReceiver) {
                return back()->withErrors([
                    'role' => 'A receiver already exists for this department.'
                ]);
            }
        }

        $user->update([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'middle_name' => $request->middle_name,
            'suffix' => $request->suffix,
            'gender' => $request->gender,
            'position' => $request->position,
            'role' => $request->role,
            'email' => $request->email,
        ]);

        // Notify the user and all admins
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new InAppNotification('A user has been updated.', ['user_id' => $user->id]));
        }
        $user->notify(new InAppNotification('Your account has been updated.', ['user_id' => $user->id]));

        // Log user update
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_updated',
            'description' => 'Updated user: ' . $user->email,
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return redirect()->route('users.departments');
    }

    // Dashboard Data for User
    public function dashboardData()
    {
        $userId = Auth::id();
        $userDepartmentId = Auth::user()->department_id;

        // Fetch as collections
        $ownedDocuments = Document::where('owner_id', $userId)->get();

        // Fix: Use user's department_id instead of user_id for recipient documents
        $receivedDocuments = Document::whereHas('recipients', function($query) use ($userDepartmentId) {
            $query->where('department_id', $userDepartmentId);
        })->get();

        // Merge collections and remove duplicates (if any)
        $allDocuments = $ownedDocuments->merge($receivedDocuments)->unique('id');

        $totalDocuments = $allDocuments->count();
        $pendingDocuments = $allDocuments->where('status', 'pending')->count();
        $completedDocuments = $allDocuments->where('status', 'approved')->count();

        // Count published documents where user is owner or recipient
        $publishedDocuments = $allDocuments->where('is_public', true)->count();

        // Recent Activities: last 5 actions involving the user's department (received documents)
        $recentActivities = DocumentRecipient::where('department_id', $userDepartmentId)
            ->orderByDesc('responded_at')
            ->with('document')
            ->take(5)
            ->get()
            ->map(function($activity) {
                return [
                    'order_number' => $activity->document->order_number,
                    'subject' => $activity->document->subject ?? 'Untitled',
                    'status' => $activity->status,
                    'responded_at' => $activity->responded_at,
                    'created_at' => $activity->document->created_at,
                    'comments' => $activity->comments,
                ];
            });

        return response()->json([
            'totalDocuments' => $totalDocuments,
            'pendingDocuments' => $pendingDocuments,
            'completedDocuments' => $completedDocuments,
            'publishedDocuments' => $publishedDocuments,
            'recentActivities' => $recentActivities,
        ]);
    }

    // User's Published Documents Management
    public function publishedDocuments()
    {
        $userId = Auth::id();
        $userDepartmentId = Auth::user()->department_id;

        // Get documents where user is the owner
        $ownedDocuments = Document::where('owner_id', $userId)
            ->where('is_public', true)
            ->with(['files', 'owner'])
            ->get()
            ->map(function($document) {
                return [
                    'id' => $document->id,
                    'subject' => $document->subject,
                    'description' => $document->description,
                    'status' => $document->status,
                    'is_public' => $document->is_public,
                    'public_token' => $document->public_token,
                    'barcode_value' => $document->barcode_value,
                    'created_at' => $document->created_at,
                    'files_count' => $document->files->count(),
                    'public_url' => route('documents.public_view', ['public_token' => $document->public_token]),
                    'user_role' => 'owner',
                    'owner_name' => $document->owner->first_name . ' ' . $document->owner->last_name,
                ];
            });

        // Get documents where user is a recipient or sent to their department - department-wide visibility
        $receivedDocuments = Document::whereHas('recipients', function($query) use ($userDepartmentId) {
            $query->where('department_id', $userDepartmentId);
        })
        ->where('is_public', true)
        ->where('owner_id', '!=', $userId) // Exclude documents where user is also the owner
        ->with(['files', 'owner'])
        ->get()
        ->map(function($document) {
            return [
                'id' => $document->id,
                'subject' => $document->subject,
                'description' => $document->description,
                'status' => $document->status,
                'is_public' => $document->is_public,
                'public_token' => $document->public_token,
                'barcode_value' => $document->barcode_value,
                'created_at' => $document->created_at,
                'files_count' => $document->files->count(),
                'public_url' => route('documents.public_view', ['public_token' => $document->public_token]),
                'user_role' => 'recipient',
                'owner_name' => $document->owner->first_name . ' ' . $document->owner->last_name,
            ];
        });

        // Merge and sort by creation date
        $publishedDocuments = $ownedDocuments->concat($receivedDocuments)
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Users/PublishedDocuments', [
            'publishedDocuments' => $publishedDocuments,
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    // Unpublish document (user can only unpublish their own documents)
    public function unpublishDocument(Document $document)
    {
        // Check if the user owns this document
        if ($document->owner_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        $document->update([
            'is_public' => false,
            'public_token' => null,
            'barcode_value' => null,
        ]);

        return redirect()->route('users.published-documents')->with('success', 'Document unpublished successfully.');
    }

    public function deleteDocumentFile($document, $file)
    {
        $doc = Document::where('id', $document)
            ->where('owner_id', Auth::id())
            ->where('status', 'returned')
            ->firstOrFail();
        $fileModel = $doc->files()->where('id', $file)->firstOrFail();
        // Delete the physical file
        if ($fileModel->file_path) {
            Storage::disk('public')->delete($fileModel->file_path);
        }
        $fileModel->delete();
        return redirect()->route('users.documents.edit', $doc->id)->with('success', 'File deleted successfully.');
    }

    // Confirm document receipt via barcode
    public function confirmReceive(Request $request)
    {
        $request->validate([
            'barcode_value' => 'required|string',
        ]);

        $barcode = $request->input('barcode_value');
        $user = Auth::user();
        $departmentId = $user->department_id;

        // 1. Find the document by barcode
        $document = Document::where('barcode_value', $barcode)->first();

        if (!$document) {
            throw ValidationException::withMessages([
                'barcode_value' => ['Document not found.']
            ]);
        }

        // can only be received if the document is not yet received
        if ($document->status === 'received') {
            throw ValidationException::withMessages([
                'barcode_value' => ['Document already received.']
            ]);
        }

        if ($document->document_type === 'for_info') {
            // Allow any pending recipient for this department to receive
            $recipient = DocumentRecipient::where('document_id', $document->id)
                ->where('department_id', $departmentId)
                ->where('status', 'pending')
                ->first();
            if (!$recipient) {
                // Check if there is any received record for this user and department
                $alreadyReceived = DocumentRecipient::where('document_id', $document->id)
                    ->where('department_id', $departmentId)
                    ->where('received_by', $user->id)
                    ->where('status', 'received')
                    ->exists();
                if ($alreadyReceived) {
                    throw ValidationException::withMessages([
                        'barcode_value' => ['Your department has already received this document.']
                    ]);
                } else {
                    throw ValidationException::withMessages([
                        'barcode_value' => ['You are not a pending recipient for this document in your department.']
                    ]);
                }
            }
        } else {
        // Find the max sequence for this document (across all recipients)
            $maxSequence = DocumentRecipient::where('document_id', $document->id)->max('sequence');

            // Find the recipient record for this department/user with the max sequence
            $recipient = DocumentRecipient::where('document_id', $document->id)
                ->where(function($q) use ($departmentId, $user) {
                    $q->where('department_id', $departmentId)
                    ->orWhere('user_id', $user->id);
                })
                ->where('sequence', $maxSequence)
                ->first();
            }
        // If no recipient record, user is not a recipient or not the current recipient
        if (!$recipient) {
            throw ValidationException::withMessages([
                'barcode_value' => ['You are not the current recipient for this document. Only the latest recipient can receive it.']
            ]);
        }

        // If already received, check if it was by this user or another user in the same department
        if ($recipient->status === 'received') {
            if ($recipient->received_by == $user->id) {
                throw ValidationException::withMessages([
                    'barcode_value' => ['You have already received this document.']
                ]);
            } else {
                throw ValidationException::withMessages([
                    'barcode_value' => ['This document has already been received by another user in your department.']
                ]);
            }
        }

        if ($document->status === 'returned') {
            $document->status = 'returned';
            $document->save();
        } else if ($document->status === 'approved') {
            $document->status = 'approved';
            $document->save();
        } else if ($document->status === 'rejected') {
            $document->status = 'rejected';
            $document->save();
        } else {
            $document->status = 'in_review';
            $document->save();
        }

        // Mark as received
        $recipient->status = 'received';
        $recipient->responded_at = now();
        $recipient->received_at = now();
        $recipient->received_by = $user->id;
        $recipient->save();

        // Log the action
        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => 'document_received',
            'description' => 'Confirmed receipt of document: ' . $document->subject . ' (ID: ' . $document->id . ') via barcode.',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'action' => 'document_received',
            'description' => 'Document received by department: ' . ($user->department->name ?? 'Unknown') . ' via barcode.',
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Document successfully marked as received.');
    }
}
