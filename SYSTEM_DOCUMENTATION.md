# WMSU Document Management and Tracking System (DMTS)
## Comprehensive System Documentation

### Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [Document Workflow](#document-workflow)
7. [Step-by-Step User Guide](#step-by-step-user-guide)
8. [API Endpoints](#api-endpoints)
9. [Security Features](#security-features)
10. [Installation & Deployment](#installation--deployment)

---

## System Overview

The WMSU Document Management and Tracking System (DMTS) is a comprehensive web-based application designed to digitize and streamline document processing workflows within Western Mindanao State University. The system facilitates document creation, routing, tracking, approval, and archival processes across multiple departments.

### Key Objectives
- **Digitize Document Workflows**: Replace paper-based document processing with digital alternatives
- **Track Document Movement**: Monitor document status and location in real-time
- **Ensure Accountability**: Maintain audit trails for all document activities
- **Improve Efficiency**: Reduce processing time and eliminate manual routing
- **Enhance Security**: Implement role-based access control and secure document handling

---

## Architecture & Technology Stack

### Backend Technologies
- **Framework**: Laravel 12.0 (PHP 8.2+)
- **Database**: MySQL/PostgreSQL
- **Authentication**: Laravel Sanctum/Breeze
- **File Storage**: Laravel Filesystem
- **Barcode Generation**: Picqer Barcode Generator
- **Email**: Laravel Mail with SMTP
- **Queue System**: Laravel Queues

### Frontend Technologies
- **Framework**: React 19.0 with TypeScript
- **UI Library**: Radix UI Components
- **Styling**: Tailwind CSS 4.0
- **State Management**: Inertia.js
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: Sonner, SweetAlert2

### Development Tools
- **Build Tool**: Vite 6.0
- **Testing**: Pest PHP, Laravel Pail
- **Code Quality**: ESLint, Prettier, Laravel Pint
- **Package Management**: Composer, NPM

---

## User Roles & Permissions

### 1. Super Administrator
**Access Level**: Full system access
**Responsibilities**:
- Manage all users and administrators
- Configure system settings
- Access analytics and reports
- Manage departments and organizational structure
- Monitor system activity logs
- Publish/unpublish documents globally

**Key Permissions**:
- Create/edit/delete admin accounts
- Access admin analytics dashboard
- View all system activity logs
- Manage department structure
- Override document permissions

### 2. Administrator (Department Level)
**Access Level**: Department-specific administration
**Responsibilities**:
- Manage users within their department
- Monitor department document flow
- Handle department-specific configurations
- Assist users with document-related issues

**Key Permissions**:
- Create/edit/delete users in their department
- View department analytics
- Access department activity logs
- Manage department document templates

### 3. Regular User
**Access Level**: Standard document operations
**Responsibilities**:
- Create and submit documents
- Respond to received documents
- Forward documents to appropriate recipients
- Track document status
- Manage personal document portfolio

**Key Permissions**:
- Create new documents
- View assigned documents
- Forward/respond to documents
- Access personal dashboard
- Update profile information

---

## Core Features

### 1. Document Management
- **Document Creation**: Multi-type document support with rich metadata
- **File Attachments**: Support for various file formats (PDF, DOC, XLS, images)
- **Version Control**: Track document revisions and changes
- **Barcode Generation**: Unique QR codes for document identification
- **Public Publishing**: Make documents publicly accessible with secure tokens

### 2. Document Types Supported
- Special Orders
- Memorandums
- Letters
- Travel Orders
- City Resolutions
- Invitations
- Vouchers
- Diplomas
- Checks
- Job Orders
- Contracts of Service
- Purchase Requests (PR)
- Appointments
- Purchase Orders
- General Documents

### 3. Workflow Management
- **Sequential Routing**: Documents follow predefined approval chains
- **Parallel Processing**: Multiple recipients can process simultaneously
- **Conditional Routing**: Smart routing based on document type and content
- **Status Tracking**: Real-time status updates (Pending, In Review, Approved, Rejected)
- **Deadline Management**: Track document processing deadlines

### 4. Notification System
- **In-App Notifications**: Real-time updates within the system
- **Email Notifications**: Automated email alerts for important events
- **Status Change Alerts**: Notifications when document status changes
- **Deadline Reminders**: Automated reminders for pending actions

### 5. Analytics & Reporting
- **Dashboard Metrics**: Key performance indicators and statistics
- **Document Analytics**: Processing times, bottlenecks, and trends
- **User Activity**: Track user engagement and productivity
- **Department Performance**: Compare department efficiency metrics
- **Custom Reports**: Generate specific reports for management

### 6. Security Features
- **Role-Based Access Control (RBAC)**: Granular permission management
- **CSRF Protection**: Cross-site request forgery prevention
- **Password Policies**: Enforced password complexity and rotation
- **Activity Logging**: Comprehensive audit trails
- **Secure File Storage**: Encrypted file storage and access control

---

## Database Schema

### Core Tables

#### Users Table
```sql
- id (Primary Key)
- first_name, last_name, middle_name, suffix
- gender (Male/Female)
- position
- department_id (Foreign Key)
- role (superadmin/admin/user)
- email (Unique)
- password (Hashed)
- is_active (Boolean)
- password_changed_at (Timestamp)
- email_verified_at (Timestamp)
```

#### Documents Table
```sql
- id (Primary Key)
- owner_id (Foreign Key to Users)
- department_id (Foreign Key to Departments)
- subject
- order_number
- document_type (Enum)
- status (pending/in_review/approved/rejected/returned)
- description
- signatory
- request_from
- request_from_department
- through_department_ids (JSON Array)
- is_public (Boolean)
- public_token (Unique String)
- barcode_value
- created_at, updated_at
```

#### Document Recipients Table
```sql
- id (Primary Key)
- document_id (Foreign Key)
- user_id (Foreign Key, Nullable)
- department_id (Foreign Key, Nullable)
- final_recipient_department_id (Foreign Key)
- status (pending/received/responded)
- comments (Text)
- sequence (Integer)
- forwarded_by (Foreign Key to Users)
- forwarded_to (Foreign Key to Users)
- received_by (Foreign Key to Users)
- is_active (Boolean)
- responded_at, received_at (Timestamps)
```

#### Departments Table
```sql
- id (Primary Key)
- name
- code (Unique)
- description
- type
- is_presidential (Boolean)
```

#### Document Files Table
```sql
- id (Primary Key)
- document_id (Foreign Key)
- original_filename
- file_path
- file_size
- mime_type
- upload_type
- uploaded_by (Foreign Key to Users)
```

#### Activity Logs Tables
```sql
User Activity Logs:
- user_id, action, description, ip_address, created_at

Document Activity Logs:
- document_id, user_id, action, description, created_at
```

---

## Document Workflow

### 1. Document Creation Process
```
User Creates Document → 
Fills Metadata (Subject, Type, Description) → 
Attaches Files → 
Selects Recipients → 
Generates Barcode → 
Submits for Processing
```

### 2. Document Routing Flow
```
Initial Submission → 
Department Review → 
Sequential Approval Chain → 
Final Approval/Rejection → 
Notification to Stakeholders → 
Archive/Publish
```

### 3. Status Lifecycle
```
Draft → Pending → In Review → Approved/Rejected/Returned
                              ↓
                         Published (Optional)
```

### 4. Recipient Actions
- **Receive**: Acknowledge document receipt
- **Forward**: Route to next recipient
- **Respond**: Add comments and change status
- **Return**: Send back for modifications
- **Approve/Reject**: Final decision on document

---

## Step-by-Step User Guide

### For Regular Users

#### Creating a New Document
1. **Access Document Creation**
   - Navigate to Dashboard
   - Click "Create Document" or use the "+" button
   - Select document type from dropdown

2. **Fill Document Details**
   - **Subject**: Enter descriptive document title
   - **Order Number**: Auto-generate or manually input
   - **Document Type**: Select from predefined types
   - **Description**: Provide detailed description
   - **Signatory**: Specify authorized signatory
   - **Request From**: Indicate requesting party

3. **Attach Files**
   - Click "Upload Files" button
   - Select files (PDF, DOC, XLS, images supported)
   - Maximum 10MB per file
   - Multiple files allowed

4. **Select Recipients**
   - Choose initial recipient department
   - Select routing departments (if applicable)
   - Specify final recipient
   - Set processing sequence

5. **Submit Document**
   - Review all information
   - Click "Submit Document"
   - System generates unique barcode
   - Document enters workflow

#### Managing Received Documents
1. **View Received Documents**
   - Go to "Documents" tab
   - Switch to "Received" view
   - Documents appear with status indicators

2. **Process Document**
   - Click on document to open
   - Review content and attachments
   - Choose action:
     - **Mark as Received**: Acknowledge receipt
     - **Forward**: Route to next recipient
     - **Respond**: Add comments and status
     - **Return**: Send back for changes

3. **Forward Document**
   - Select "Forward" option
   - Choose recipient (user or department)
   - Add forwarding comments
   - Confirm forwarding action

#### Tracking Document Status
1. **Dashboard Overview**
   - View document statistics
   - Check pending actions
   - Monitor recent activities

2. **Document Details**
   - Click on any document
   - View complete processing history
   - See current status and location
   - Track processing timeline

### For Administrators

#### Managing Users
1. **Access User Management**
   - Navigate to Admin Panel
   - Select "Users" section
   - View all department users

2. **Create New User**
   - Click "Add User" button
   - Fill user information:
     - Personal details (name, gender)
     - Position and department
     - Email address
     - Role assignment
   - System generates temporary password
   - User receives email with credentials

3. **Manage User Status**
   - Toggle user active/inactive status
   - Reset user passwords
   - Update user information
   - Delete users if necessary

#### Department Management
1. **View Departments**
   - Access "Departments" section
   - See all organizational units
   - Monitor department statistics

2. **Create Department**
   - Click "Add Department"
   - Enter department details:
     - Name and code
     - Description
     - Department type
     - Presidential office flag
   - Save department

#### Analytics and Reporting
1. **Dashboard Analytics**
   - View system-wide statistics
   - Monitor document processing trends
   - Check user activity metrics
   - Analyze department performance

2. **Generate Reports**
   - Access "Analytics" section
   - Select report parameters
   - Generate custom reports
   - Export data for analysis

### For Super Administrators

#### System Configuration
1. **Global Settings**
   - Configure system parameters
   - Set default document types
   - Manage notification templates
   - Configure email settings

2. **User and Role Management**
   - Create administrator accounts
   - Assign system-wide permissions
   - Monitor all user activities
   - Manage role hierarchies

3. **System Monitoring**
   - View comprehensive activity logs
   - Monitor system performance
   - Check security events
   - Analyze usage patterns

---

## API Endpoints

### Authentication Routes
```
POST /login - User authentication
POST /logout - User logout
GET /dashboard - Dashboard data
POST /password/change - Change password
```

### Document Management Routes
```
GET /documents - List user documents
POST /users/documents/send - Create new document
GET /documents/{id} - View document details
POST /documents/{id}/respond - Respond to document
POST /documents/{id}/forward - Forward document
POST /documents/{id}/received - Mark as received
GET /documents/{id}/chain - Get document history
POST /documents/{id}/publish - Publish document
DELETE /documents/{id} - Delete document
```

### User Management Routes
```
GET /users - List users
POST /users - Create user
PUT /users/{id} - Update user
DELETE /users/{id} - Delete user
GET /departments - List departments
```

### Admin Routes (Superadmin Only)
```
GET /Admin/users - Manage all users
GET /Admin/departments - Manage departments
GET /Admin/published-documents - Manage published documents
GET /Admin/activity-logs - View activity logs
GET /Admin/analytics - System analytics
```

---

## Security Features

### Authentication & Authorization
- **Multi-factor Authentication**: Email verification required
- **Role-Based Access Control**: Granular permissions by role
- **Session Management**: Secure session handling
- **Password Policies**: Enforced complexity requirements

### Data Protection
- **CSRF Protection**: All forms protected against CSRF attacks
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **File Upload Security**: Type validation and size limits

### Audit & Compliance
- **Activity Logging**: All user actions logged
- **Document Trails**: Complete document history
- **Access Monitoring**: Track document access
- **Data Retention**: Configurable retention policies

---

## Installation & Deployment

### System Requirements
- **PHP**: 8.2 or higher
- **Database**: MySQL 8.0+ or PostgreSQL 13+
- **Web Server**: Apache 2.4+ or Nginx 1.18+
- **Node.js**: 18.0+ for frontend build
- **Memory**: Minimum 2GB RAM
- **Storage**: 10GB+ available space

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone [repository-url]
   cd wmsu-dmts
   ```

2. **Install Dependencies**
   ```bash
   composer install
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database Setup**
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

5. **Build Frontend**
   ```bash
   npm run build
   ```

6. **Configure Web Server**
   - Point document root to `public/` directory
   - Configure URL rewriting for Laravel
   - Set appropriate file permissions

7. **Start Services**
   ```bash
   php artisan serve
   php artisan queue:work
   ```

### Production Deployment
1. **Server Configuration**
   - Configure SSL certificates
   - Set up database backups
   - Configure email services
   - Set up monitoring

2. **Performance Optimization**
   - Enable OPcache
   - Configure Redis for caching
   - Optimize database queries
   - Set up CDN for static assets

3. **Security Hardening**
   - Configure firewall rules
   - Set up intrusion detection
   - Regular security updates
   - Backup and recovery procedures

---

*This documentation serves as a comprehensive guide for understanding, using, and maintaining the WMSU Document Management and Tracking System. For additional support or clarification, please contact the system administrators.*
