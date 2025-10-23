<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentRecipient;
use App\Models\User;
use App\Models\DocumentFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Picqer\Barcode\BarcodeGeneratorSVG;
use Illuminate\Support\Str;
use App\Models\Departments;
use App\Notifications\InAppNotification;
use App\Models\UserActivityLog;
use App\Models\DocumentActivityLog;
use Illuminate\Notifications\DatabaseNotification;
use App\Models\Department;

class DocumentController extends Controller
{

    public function forwardDocument(Request $request, Document $document)
    {
        $request->validate([
            'forward_type' => 'required|in:user,department',
            'forward_to_id' => [
                'required',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->forward_type === 'user') {
                        if (!User::where('id', $value)->exists()) {
                            $fail('The selected user is invalid.');
                        }
                    } elseif ($request->forward_type === 'department') {
                        if (!Departments::where('id', $value)->exists()) {
                            $fail('The selected department is invalid.');
                        }
                    }
                }
            ],
            'comments' => 'nullable|string|max:1000',
            'files.*' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif', // 50MB max per file
        ]);

        // Find the current active recipient (the one forwarding)
        $currentRecipient = DocumentRecipient::where('document_id', $document->id)
            ->where('is_active', true)
            ->orderByDesc('sequence')
            ->first();

        if ($currentRecipient) {
            // Mark the current recipient as responded/forwarded and inactive
            $currentRecipient->update([
                'status' => 'received',
                'responded_at' => now(),
                'is_active' => false,
            ]);
        }

        // set the document status to in_review
        if ($document->status === 'approved') {
            $document->update(['status' => 'approved']);
        } else {
            $document->update(['status' => 'in_review']);
        }

        // find the id of the user who forwarded the document
        $forwardedById = Auth::id();

        // Get the final_recipient_id from existing recipient records
        $existingRecipient = DocumentRecipient::where('document_id', $document->id)
            ->whereNotNull('final_recipient_department_id')
            ->first();
        $finalRecipientId = $existingRecipient ? $existingRecipient->final_recipient_department_id : null;

        // Determine the next sequence number
        $nextSequence = DocumentRecipient::where('document_id', $document->id)->max('sequence') + 1;

        DocumentRecipient::create([
            'document_id' => $document->id,
            'user_id' => $request->forward_type === 'user' ? $request->forward_to_id : null,
            'department_id' => $request->forward_type === 'department' ? $request->forward_to_id : null,
            'forwarded_by' => $forwardedById,
            'status' => 'pending',
            'comments' => $request->comments,
            'sequence' => $nextSequence,
            'is_active' => true,
            'final_recipient_department_id' => $finalRecipientId,
            'responded_at' => null,
            'received_at' => null
        ]);

        // Get the newly created recipient (the one just forwarded to)
        $newRecipient = DocumentRecipient::where('document_id', $document->id)
            ->where('department_id', $request->forward_to_id)
            ->where('sequence', $nextSequence)
            ->first();

        // Handle multiple file uploads if present
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $filePath = $file->store('documents', 'public');
                $document->files()->create([
                    'file_path' => $filePath,
                    'original_filename' =>  $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => Auth::id(),
                    'upload_type' => 'response',
                    'document_recipient_id' => $newRecipient ? $newRecipient->id : null,
                ]);
            }
        }

        // check if all of the recipients have received the document and if the document is for_info then update the document status to received
        $allRecipients = DocumentRecipient::where('document_id', $document->id)->get();
        $allReceived = $allRecipients->every(function($recipient) {
            return $recipient->status === 'received';
        });
        if ($allReceived && $document->document_type === 'for_info') {
            $document->update(['status' => 'received']);
        }

        // check the forward_type and get the user or department
        $forwardedTo = $request->forward_type === 'user' ? User::with(relations: 'department')->find($request->forward_to_id) : Departments::find($request->forward_to_id);
        // Notify the new recipient and document owner
        if ($request->forward_type === 'user' && $forwardedTo) {
            $forwardedTo->notify(new InAppNotification("A {$document->document_type} document '{$document->subject}' has been forwarded to you by " . Auth::user()->first_name . ' ' . Auth::user()->last_name . ".", [
                'document_id' => $document->id,
                'document_name' => $document->subject
            ]));
        } elseif ($request->forward_type === 'department' && $forwardedTo) {
            // Notify all users in the department
            $departmentUsers = User::where('department_id', $forwardedTo->id)->get();
            foreach ($departmentUsers as $user) {
                $user->notify(new InAppNotification("A {$document->document_type} document '{$document->subject}' has been forwarded to your department by " . Auth::user()->first_name . ' ' . Auth::user()->last_name . ".", [
                    'document_id' => $document->id,
                    'document_name' => $document->subject
                ]));
            }
        }
        $document->owner->notify(new InAppNotification("Your document '{$document->subject}' has been forwarded.", ['document_id' => $document->id, 'document_name' => $document->subject]));

        // After forwarding document
        if ($request->forward_type === 'user' && $forwardedTo) {
            $forwardedToName = $forwardedTo->first_name . ' ' . $forwardedTo->last_name;
            $forwardedToDept = $forwardedTo->department ? $forwardedTo->department->name : 'No Department';
            $description = "Document forwarded to {$forwardedToName} ({$forwardedToDept})";
        } elseif ($request->forward_type === 'department' && $forwardedTo) {
            $forwardedToName = $forwardedTo->name;
            $description = "Document forwarded to Department: {$forwardedToName}";
        } else {
            $description = "Document forwarded to Unknown recipient";
        }

        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => 'forwarded',
            'description' => $description,
            'created_at' => now(),
        ]);

        return redirect()->route('documents.view', $document->id)->with('success', 'Document forwarded successfully');
    }

    public function respondToDocument(Request $request, Document $document)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,returned',
            'comments' => 'nullable|string|max:1000',
            'attachment_files.*' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif', // 50MB max per file
        ]);

        $recipient = DocumentRecipient::where('document_id', $document->id)
            ->where(function ($query) {
                $query->where('department_id', Auth::user()->department_id)
                    ->orWhere('final_recipient_department_id', Auth::user()->department_id);
            })
            ->whereIn('status', ['pending', 'forwarded', 'received'])
            ->first();

        if (!$recipient && $request->status !== 'returned') {
            return redirect()->back()->withErrors([
                'message' => 'You are not authorized to approve this document or you have already responded.'
            ]);
        }

        $currentSequence = DocumentRecipient::where('document_id', $document->id)->max('sequence');

        // Mark the current sequence to received
        $currentSequenceRecipient = DocumentRecipient::where('document_id', $document->id)->where('sequence', $currentSequence)->first();
        $currentSequenceRecipient?->update([
            'status' => 'received',
            'responded_at' => now(),
            'is_active' => false,
        ]);

        $isAdmin = Auth::user()->role === 'admin';
        $userDepartmentId = Auth::user()->department_id;

        $isFinalApprover = $currentSequenceRecipient && $currentSequenceRecipient->final_recipient_department_id === $userDepartmentId;

        // Get the final_recipient_department_id from existing recipient records
        $existingRecipient = DocumentRecipient::where('document_id', $document->id)
            ->whereNotNull('final_recipient_department_id')
            ->first();
        $finalRecipientId = $existingRecipient ? $existingRecipient->final_recipient_department_id : null;

        if ($request->status === 'returned') {

            $documentOwnerDepartmentId = $document->owner->department_id;

            $newRecipient = DocumentRecipient::create([
            'document_id' => $document->id,
            'department_id' => $documentOwnerDepartmentId,
            'final_recipient_department_id' => $finalRecipientId,
            'forwarded_by' => Auth::id(),
            'status' => $request->status,
            'comments' => $request->comments,
            'responded_at' => now(),
            'is_active' => false,
            'sequence' => $currentSequence + 1,
            ]);

        } else {
        // Create a new recipient record for the response
        $newRecipient = DocumentRecipient::create([
            'document_id' => $document->id,
            'department_id' => Auth::user()->department_id,
            'final_recipient_department_id' => $finalRecipientId,
            'forwarded_by' => null,
            'status' => $request->status,
            'comments' => $request->comments,
            'received_by' => ($request->status === 'approved' && $isFinalApprover) ? Auth::id() : null,
            'responded_at' => now(),
            'is_active' => false,
            'sequence' => $currentSequence + 1,
        ]);
        }


        // Handle multiple file uploads if present
        if ($request->hasFile('attachment_files')) {
            foreach ($request->file('attachment_files') as $file) {
                $filePath = $file->store('documents', 'public');
                $document->files()->create([
                    'file_path' => $filePath,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => Auth::id(),
                    'upload_type' => 'response',
                    'document_recipient_id' => $newRecipient ? $newRecipient->id : null,
                ]);
            }
        }

        $user = Auth::user();
        $dept = $user->department ? $user->department->name : 'No Department';

        // new document log
        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => $request->status,
            'description' => "Document {$request->status} by {$user->first_name} {$user->last_name} ({$dept})",
        ]);

        // If the final approver responds, update document status accordingly
        if ($isFinalApprover && $request->status === 'approved' && $isAdmin) {
            $document->update(['status' => 'approved']);
            $document->owner->notify(new InAppNotification("Your document '{$document->subject}' was approved by the final approver.", ['document_id' => $document->id, 'document_name' => $document->subject]));
            $user = Auth::user();
            $dept = $user->department ? $user->department->name : 'No Department';

        } elseif ($isFinalApprover && $request->status === 'rejected' && $isAdmin) {
            $document->update(['status' => 'rejected']);
            $document->owner->notify(new InAppNotification("Your document '{$document->subject}' was rejected by the final approver.", ['document_id' => $document->id, 'document_name' => $document->subject]));
            $user = Auth::user();
            $dept = $user->department ? $user->department->name : 'No Department';

        } elseif ($request->status === 'returned') {
            $document->update(['status' => 'returned']);
            $document->owner->notify(new InAppNotification("Your document '{$document->subject}' was returned by the final approver.", ['document_id' => $document->id, 'document_name' => $document->subject]));
            $user = Auth::user();
            $dept = $user->department ? $user->department->name : 'No Department';
        }

        return redirect()->back()->with('success', 'Response recorded successfully');
    }

    public function getDocumentChain(Document $document)
    {
        $chain = DocumentRecipient::where('document_id', $document->id)
            ->with(['department', 'forwardedBy:id,first_name,last_name,email'])
            ->orderBy('sequence')
            ->get();

        return response()->json([
            'document' => $document,
            'approval_chain' => $chain
        ]);
    }

    public function viewDocument(Document $document)
    {
        // Check if user has access to the document
        // User can access if they are the owner OR if the document was sent to their department
        $userDepartmentId = Auth::user()->department_id;
        $hasAccess = $document->owner_id === Auth::id() ||
                    $document->recipients()->where('department_id', $userDepartmentId)->exists();

        if (!$hasAccess) {
            abort(403, 'Unauthorized access to document');
        }

        $document->load(['files', 'owner.department', 'recipients.department', 'recipients.forwardedBy', 'recipients.finalRecipient']);

        // Get users from the same department as the current user, excluding the current user
        $users = User::where('department_id', Auth::user()->department_id)
            ->where('id', '!=', Auth::id())
            ->with('department')
            ->get();

        // throughDepartments: array of department objects (id, name) for through_department_ids
        $throughDepartmentIds = $document->through_department_ids ?? [];
        $throughDepartments = collect();
        if (!empty($throughDepartmentIds)) {
            $throughDepartments = Departments::whereIn('id', $throughDepartmentIds)->get(['id', 'name']);
        }

        // Get  other departments (excluding current user's department and current user and the document owner)
        $otherDepartments = Departments::where('id', '!=', Auth::user()->department_id)->get();

        // Add is_final_approver to the document data
        $documentData = $document->toArray();
        $documentData['owner_id'] = $document->owner_id;

        // Approval chain: recipients ordered by sequence, with department and forwardedBy
        $approvalChain = $document->recipients()->with(['user', 'department', 'forwardedBy.department', 'finalRecipient'])->orderBy('sequence')->get()->map(function($recipient) {
            return [
                'id' => $recipient->id,
                'user' => $recipient->user ? [
                    'id' => $recipient->user->id,
                    'first_name' => $recipient->user->first_name,
                    'last_name' => $recipient->user->last_name,
                    'role' => $recipient->user->role,
                ] : null,
                'department' => $recipient->department ? [
                    'id' => $recipient->department->id,
                    'name' => $recipient->department->name
                ] : null,
                'status' => $recipient->status,
                'comments' => $recipient->comments,
                'responded_at' => $recipient->responded_at,
                'sequence' => $recipient->sequence,
                'forwarded_by' => $recipient->forwardedBy ? [
                    'id' => $recipient->forwardedBy->id,
                    'first_name' => $recipient->forwardedBy->first_name,
                    'last_name' => $recipient->forwardedBy->last_name,
                    'role' => $recipient->forwardedBy->role,
                    'department' => $recipient->forwardedBy->department ? [
                        'id' => $recipient->forwardedBy->department->id,
                        'name' => $recipient->forwardedBy->department->name
                    ] : null,
                ] : null,
                'received_by' => $recipient->receivedBy ? [
                    'id' => $recipient->receivedBy->id,
                    'first_name' => $recipient->receivedBy->first_name,
                    'last_name' => $recipient->receivedBy->last_name,
                    'role' => $recipient->receivedBy->role,
                ] : null,
                'final_recipient' => $recipient->finalRecipient ? [
                    'id' => $recipient->finalRecipient->id,
                    'name' => $recipient->finalRecipient->name
                ] : null,
            ];
        });
        $documentData['approval_chain'] = $approvalChain;

        // Get the final recipient information from the first recipient record
        $firstRecipient = $document->recipients()->with('finalRecipient')->first();
        $documentData['final_recipient'] = $firstRecipient && $firstRecipient->finalRecipient ? [
            'id' => $firstRecipient->finalRecipient->id,
            'name' => $firstRecipient->finalRecipient->name
        ] : null;

        // Check if current user is a recipient and can respond, get the latest data
        $currentRecipient = $document->recipients()
            ->where('department_id', Auth::user()->department_id)
            ->orderByDesc('sequence')
            ->first();

        $documentData['can_respond'] = $currentRecipient && in_array($currentRecipient->status, ['pending', 'forwarded', 'received', 'approved']);
        $documentData['can_respond_other_data'] = $currentRecipient;
        $documentData['recipient_status'] = $currentRecipient ? $currentRecipient->status : null;

        // Fetch document activity logs
        $activityLogs = DocumentActivityLog::with('user')
            ->where('document_id', $document->id)
            ->get();

        return Inertia::render('Users/Documents/View', [
            'document' => $documentData,
            'auth' => [
                'user' => Auth::user()
            ],
            'users' => $users,
            'otherDepartments' => $otherDepartments,
            'throughUsers' => $throughDepartments,
            'activityLogs' => $activityLogs,
        ]);
    }

    public function markAsReceived(Document $document)
    {
        $documentRecipient = DocumentRecipient::where('document_id', $document->id)
            ->where('department_id', Auth::user()->department_id)
            ->orderByDesc('sequence')
            ->first();
        if ($documentRecipient) {
            $documentRecipient->update([
                'status' => 'received',
                'responded_at' => now(),
                'received_at' => now()
            ]);
        }

        // Check if all recipients have received the document and if the document is for_info, then update the document status to received
        $allRecipients = DocumentRecipient::where('document_id', $document->id)->get();
        $allReceived = $allRecipients->every(function($recipient) {
            return $recipient->status === 'received';
        });
        if ($allReceived && $document->document_type === 'for_info') {
            $document->update(['status' => 'received']);
        } else {
            $document->update(['status' => 'in_review']);
        }

        return redirect()->back()->with('success', 'Document marked as received.');
    }

    public function downloadDocument(Document $document, DocumentFile $file)
    {
        // Debug: Log the request
        Log::info('Download request', [
            'user_id' => Auth::id(),
            'document_id' => $document->id,
            'file_id' => $file->id,
            'authenticated' => Auth::check()
        ]);

        // Check if user is authenticated
        if (!Auth::check()) {
            Log::warning('User not authenticated for download');
            abort(401, 'Authentication required');
        }

        // Check if user has access to the document
        // User can access if they are the owner OR if the document was sent to their department (department-wide visibility)
        $userDepartmentId = Auth::user()->department_id;
        $hasAccess = $document->owner_id === Auth::id() ||
                    $document->recipients()->where('department_id', $userDepartmentId)->exists();

        if (!$hasAccess) {
            Log::warning('User not authorized for document', [
                'user_id' => Auth::id(),
                'document_owner_id' => $document->owner_id,
                'user_department_id' => $userDepartmentId,
                'is_recipient' => $document->recipients()->where('department_id', $userDepartmentId)->exists()
            ]);
            abort(403, 'Unauthorized access to document');
        }

        // Check if file belongs to the document
        if ($file->document_id !== $document->id) {
            Log::warning('File does not belong to document', [
                'file_document_id' => $file->document_id,
                'requested_document_id' => $document->id
            ]);
            abort(404, 'File not found');
        }

        // Check if file exists in storage (remove 'public/' prefix if present)
        $storagePath = $file->file_path;
        if (str_starts_with($storagePath, 'public/')) {
            $storagePath = substr($storagePath, 7); // Remove 'public/' prefix
        }

        if (!Storage::disk('public')->exists($storagePath)) {
            Log::warning('File not found in storage', [
                'file_path' => $file->file_path,
                'storage_path' => $storagePath
            ]);
            abort(404, 'File not found in storage');
        }

        // Get the full path to the file
        $path = Storage::disk('public')->path($storagePath);

        Log::info('File download successful', [
            'file_path' => $file->file_path,
            'original_filename' => $file->original_filename,
            'mime_type' => $file->mime_type
        ]);

        // Return the file as a download response
        return response()->download(
            $path,
            $file->original_filename,
            ['Content-Type' => $file->mime_type]
        );
    }

    public function publishDocument(Request $request, Document $document)
    {
        // Only owner can publish, and only if approved
        if ($document->owner_id !== Auth::id()) {
            abort(403, 'Only the owner can publish this document.');
        }
        if ($document->status !== 'approved' && $document->status !== 'received') {
            abort(403, 'Document must be approved before publishing.');
        }
        if ($document->is_public) {
            return redirect()->back()->with('info', 'Document is already public.');
        }

        // Generate unique public token
        $publicToken = Str::random(32);
        // Generate public URL
        $publicUrl = route('documents.public_view', ['public_token' => $publicToken], false);

        // No barcode generation here; it is now done when the document is sent

        // Update document
        $document->update([
            'is_public' => true,
            'public_token' => $publicToken,
        ]);

        // Notify the document owner
        $document->owner->notify(new InAppNotification("Your document '{$document->subject}' has been published publicly.", ['document_id' => $document->id, 'document_name' => $document->subject]));

        // Get user and department information for logging
        $user = Auth::user();
        $dept = $user->department ? $user->department->name : 'No Department';

        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => 'published',
            'description' => "Document published publicly by {$user->first_name} {$user->last_name} ({$dept})",
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Document published publicly.');
    }

    public function publicView($public_token)
    {
        $document = Document::where(function($query) use ($public_token) {
            $query->where('public_token', $public_token)
                  ->orWhere('barcode_value', $public_token);
        })
        ->where('is_public', true)
        ->with(['files', 'owner.department', 'recipients.department', 'department'])
        ->first();

        if (!$document) {
            // If no document found, show the search page
            return Inertia::render('Users/Documents/PublicSearch', [
                'searchToken' => $public_token,
            ]);
        }

        $documentData = $document->toArray();
        $documentData['owner_id'] = $document->owner_id;

        // You may want to return a special Inertia/Blade view for public documents
        return Inertia::render('Users/Documents/PublicView', [
            'document' => $documentData,
        ]);
    }

    public function publicDocuments()
    {
        $search = request()->get('search');

        $query = Document::where('is_public', true)
            ->with(['files', 'owner', 'recipients.department']);

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('subject', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%')
                  ->orWhere('barcode_value', 'like', '%' . $search . '%')
                  ->orWhere('public_token', 'like', '%' . $search . '%')
                  ->orWhere('order_number', 'like', '%' . $search . '%')
                  ->orWhere('document_type', 'like', '%' . $search . '%')
                  ->orWhereHas('owner', function($ownerQuery) use ($search) {
                      $ownerQuery->where('first_name', 'like', '%' . $search . '%')
                                ->orWhere('last_name', 'like', '%' . $search . '%');
                  });
            });
        }

        $documents = $query->orderByDesc('created_at')
            ->get()
            ->map(function($document) {
                return [
                    'id' => $document->id,
                    'order_number' => $document->order_number,
                    'subject' => $document->subject,
                    'description' => $document->description,
                    'status' => $document->status,
                    'document_type' => $document->document_type,
                    'is_public' => $document->is_public,
                    'public_token' => $document->public_token,
                    'barcode_value' => $document->barcode_value,
                    'created_at' => $document->created_at,
                    'owner' => [
                        'id' => $document->owner->id,
                        'name' => $document->owner->first_name . ' ' . $document->owner->last_name,
                        'email' => $document->owner->email,
                        'office' => $document->owner->department->name ?? 'No Department',
                    ],
                    'files_count' => $document->files->count(),
                    'public_url' => route('documents.public_view', ['public_token' => $document->public_token]),
                ];
            });

        return Inertia::render('Users/Documents/PublicSearch', [
            'documents' => $documents,
            'search' => $search,
        ]);
    }

    public function destroy(Document $document)
    {
        // Delete physical files from storage
        foreach ($document->files as $file) {
            if (Storage::disk('public')->exists($file->file_path)) {
                Storage::disk('public')->delete($file->file_path);
            }
        }


        // Delete notifications related to this document
        // Get all users involved with this document (owner and department admins)
        $involvedUserIds = collect([$document->owner_id]);

        // Add department admins for all recipient departments
        $recipientDepartmentIds = $document->recipients->pluck('department_id')->unique();
        foreach ($recipientDepartmentIds as $deptId) {
            $deptAdmin = User::where('department_id', $deptId)->where('role', 'admin')->first();
            if ($deptAdmin) {
                $involvedUserIds->push($deptAdmin->id);
            }
        }

        $involvedUserIds = $involvedUserIds->unique();

                // Delete notifications for all involved users that reference this document
        foreach ($involvedUserIds as $userId) {
            $user = User::find($userId);
            if ($user) {
                // Delete notifications that contain this document_id in their data
                $deletedCount = $user->notifications()
                    ->whereRaw("JSON_EXTRACT(data, '$.data.document_id') = ?", [$document->id])
                    ->delete();
            }
        }

        // Also delete any notifications for all users that might reference this document
        // This is a fallback to catch any notifications that might have been missed
        $totalDeleted = DatabaseNotification::whereRaw("JSON_EXTRACT(data, '$.data.document_id') = ?", [$document->id])->delete();

        if ($totalDeleted > 0) {
            Log::info('Deleted additional notifications for document', [
                'document_id' => $document->id,
                'total_deleted' => $totalDeleted
            ]);
        }

        // Delete the document (this will cascade delete files and recipients)
        $document->delete();

        // // Log document deletion (history)
        // $user = Auth::user();
        // $dept = $user->department ? $user->department->name : 'No Department';
        // DocumentActivityLog::create([
        //     'document_id' => $document->id,
        //     'user_id' => Auth::id(),
        //     'action' => 'deleted',
        //     'description' => "Document deleted by {$user->first_name} {$user->last_name} ({$dept})",
        //     'created_at' => now(),
        // ]);

        // Log document deletion
        UserActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'document_deleted',
            'description' => 'Deleted document: ' . $document->subject . ' (ID: ' . $document->id . ')',
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);

        return redirect()->route('users.documents')->with('success', 'Document deleted successfully.');
    }

    public function unpublishDocument(Document $document)
    {
        // Only owner can unpublish
        if ($document->owner_id !== Auth::id()) {
            abort(403, 'Only the owner can unpublish this document.');
        }

        if (!$document->is_public) {
            return redirect()->back()->with('info', 'Document is not published.');
        }

        // Update document
        $document->update([
            'is_public' => false,
            'public_token' => null,
        ]);

        // Get user and department information for logging
        $user = Auth::user();
        $dept = $user->department ? $user->department->name : 'No Department';

        DocumentActivityLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => 'unpublished',
            'description' => "Document unpublished by {$user->first_name} {$user->last_name} ({$dept})",
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Document unpublished successfully.');
    }
}
