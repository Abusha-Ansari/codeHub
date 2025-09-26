# CodeHub - System Architecture Flow

## Overview
CodeHub is a comprehensive web development platform built with Next.js 15, featuring a modern architecture that enables users to create, manage, version control, and deploy HTML, CSS, and JavaScript projects.

## Technology Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Monaco Editor** for code editing
- **Clerk** for authentication
- **Zustand** for state management
- **Sonner** for notifications

### Backend
- **Next.js API Routes** (Server-side)
- **Supabase** (PostgreSQL database)
- **Clerk** for user management
- **Row Level Security (RLS)** for data protection

### Key Dependencies
- `@monaco-editor/react` - Advanced code editor
- `react-dropzone` - File upload functionality
- `next-themes` - Dark/light mode support
- `lucide-react` - Icon library

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Landing     │  │ Dashboard   │  │ Project     │  │ Explore/Deploy Pages   │ │
│  │ Page        │  │ Page        │  │ Editor      │  │ (Public Access)        │ │
│  │ (/)         │  │ (/dashboard)│  │ (/projects) │  │ (/explore, /deploy)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AUTHENTICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Clerk Authentication                              │ │
│  │  • JWT Token Management    • Session Handling    • Route Protection       │ │
│  │  • User Registration       • Login/Logout        • Middleware Integration │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            Next.js Middleware                              │ │
│  │  • Route Protection         • Public Route Matching                       │ │
│  │  • Auth State Validation    • Request Interception                        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Projects    │  │ Files       │  │ Commits     │  │ Deployments            │ │
│  │ API         │  │ API         │  │ API         │  │ API                    │ │
│  │             │  │             │  │             │  │                        │ │
│  │ /api/       │  │ /api/       │  │ /api/       │  │ /api/projects/[id]/    │ │
│  │ projects    │  │ projects/   │  │ projects/   │  │ deploy                 │ │
│  │             │  │ [id]/files  │  │ [id]/       │  │ /api/deploy/[slug]     │ │
│  │ • CRUD      │  │             │  │ commits     │  │                        │ │
│  │ • 3 Project │  │ • File CRUD │  │             │  │ • Deploy Projects      │ │
│  │   Limit     │  │ • Upload    │  │ • Create    │  │ • Public Access        │ │
│  │ • Public    │  │ • Monaco    │  │ • Restore   │  │ • URL Generation       │ │
│  │   Discovery │  │   Editor    │  │ • History   │  │                        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                      │                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ User API    │  │ Explore     │  │ Preview     │  │ Webhooks               │ │
│  │             │  │ API         │  │ API         │  │ API                    │ │
│  │ /api/user   │  │ /api/       │  │ /api/       │  │ /api/webhooks          │ │
│  │             │  │ explore     │  │ projects/   │  │                        │ │
│  │ • Profile   │  │             │  │ [id]/       │  │ • Clerk Integration    │ │
│  │ • Settings  │  │ • Public    │  │ preview     │  │ • User Sync            │ │
│  │             │  │   Projects  │  │             │  │                        │ │
│  │             │  │ • Gallery   │  │ • Live      │  │                        │ │
│  │             │  │   View      │  │   Preview   │  │                        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           Supabase PostgreSQL Database                         │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ users       │  │ projects    │  │ project_    │  │ commits                │ │
│  │             │  │             │  │ files       │  │                        │ │
│  │ • clerk_id  │  │ • name      │  │             │  │ • message              │ │
│  │ • email     │  │ • user_id   │  │ • name      │  │ • project_id           │ │
│  │ • username  │  │ • is_public │  │ • content   │  │ • user_id              │ │
│  │ • profile   │  │ • deployed  │  │ • file_type │  │ • parent_commit_id     │ │
│  │   data      │  │   _url      │  │ • size      │  │ • created_at           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                      │                                         │
│  ┌─────────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │ commit_     │  │ deployments                                             │  │
│  │ files       │  │                                                         │  │
│  │             │  │ • project_id    • url           • status               │  │
│  │ • commit_id │  │ • commit_id     • created_at    • deployment_data      │  │
│  │ • file_     │  │                                                         │  │
│  │   snapshot  │  │                                                         │  │
│  │ • content   │  │                                                         │  │
│  └─────────────┘  └─────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Row Level Security (RLS)                            │ │
│  │  • User-based access control    • Project ownership validation            │ │
│  │  • Public project access        • Secure data isolation                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core User Flows

### 1. User Authentication Flow
```
User → Landing Page → Sign Up/In (Clerk) → Middleware Validation → Dashboard
                                    ↓
                            User Record Creation (Supabase)
```

### 2. Project Creation Flow
```
Dashboard → New Project → Form Validation → API Call → Database Insert → Project Editor
     ↓                                                        ↓
Project Limit Check (3 max)                          Default Files Creation
```

### 3. Code Editing Flow
```
Project Editor → File Selection → Monaco Editor → Content Changes → Save API → Database Update
       ↓                                                                           ↓
File Upload/Create                                                        Live Preview
```

### 4. Version Control Flow
```
Project Editor → Commit Button → Commit Form → API Call → Snapshot Creation → History Update
                                                    ↓
                                            File Content Backup
```

### 5. Deployment Flow
```
Project Editor → Deploy Button → API Call → URL Generation → Public Access
                                    ↓              ↓
                            Deployment Record    Live Site
```

### 6. Public Discovery Flow
```
Explore Page → API Call → Public Projects → Project Cards → Deployment Links
```

---

## Data Flow Architecture

### Request Flow
1. **Client Request** → Next.js App Router
2. **Middleware** → Authentication Check
3. **API Route** → Business Logic
4. **Supabase Client** → Database Query
5. **RLS Policies** → Access Control
6. **Response** → Client Update

### State Management
- **Local State**: React useState for component-level data
- **Global State**: Zustand for cross-component state
- **Server State**: API calls with React hooks
- **Authentication State**: Clerk provider context

---

## Security Architecture

### Authentication & Authorization
- **Clerk JWT Tokens** for user identification
- **Next.js Middleware** for route protection
- **Row Level Security** for database access control
- **API Route Guards** for endpoint protection

### Data Protection
- **User Isolation**: RLS policies ensure users only access their data
- **Public Access Control**: Separate policies for public projects
- **Input Validation**: Schema validation for all inputs
- **File Type Restrictions**: Only HTML, CSS, JS files allowed

---

## Performance Optimizations

### Frontend
- **Code Splitting**: Next.js automatic route-based splitting
- **Monaco Editor**: Lazy loading for better performance
- **Theme System**: CSS variables for instant theme switching
- **Optimistic Updates**: Immediate UI feedback

### Backend
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Supabase handles connection management
- **Caching**: Next.js built-in caching mechanisms
- **API Optimization**: Minimal data transfer

---

## Deployment Architecture

### Development
- **Local Development**: Next.js dev server
- **Hot Reloading**: Instant code changes
- **TypeScript**: Compile-time error checking

### Production
- **Static Generation**: Pre-built pages where possible
- **Server-Side Rendering**: Dynamic content rendering
- **Edge Functions**: Supabase edge functions for performance
- **CDN Distribution**: Static asset optimization

---

## File Structure Mapping

```
app/
├── (auth)/                 # Authentication pages
├── api/                    # API endpoints
│   ├── projects/          # Project management
│   ├── deploy/            # Deployment system
│   ├── explore/           # Public discovery
│   └── webhooks/          # External integrations
├── dashboard/             # User dashboard
├── projects/              # Project editor
├── explore/               # Public gallery
└── deploy/                # Public deployments

components/
├── ui/                    # Reusable UI components
├── navbar.tsx             # Navigation
└── theme-provider.tsx     # Theme management

lib/
├── supabase.ts           # Database client
├── validations.ts        # Input validation
└── utils.ts              # Utility functions
```

---

## Integration Points

### External Services
- **Clerk**: User authentication and management
- **Supabase**: Database and real-time features
- **Monaco Editor**: Advanced code editing
- **Vercel/Netlify**: Deployment platform

### Internal Integrations
- **API Routes**: Server-side business logic
- **Database**: Data persistence and retrieval
- **File System**: Project file management
- **Theme System**: UI consistency

This architecture provides a scalable, secure, and maintainable foundation for the CodeHub platform, supporting the core features of project management, code editing, version control, and deployment.
