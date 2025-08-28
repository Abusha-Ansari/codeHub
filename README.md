# CodeHub 🚀

A modern web-based code editor and project management platform built with Next.js, featuring real-time collaboration, version control, and instant deployment capabilities.

## ✨ Features

- **🎨 Advanced Code Editor**: Monaco Editor with syntax highlighting, auto-completion, and custom snippets for HTML, CSS, and JavaScript
- **👥 User Authentication**: Secure authentication powered by Clerk
- **📁 Project Management**: Create, edit, and organize up to 3 projects per user
- **🌐 Public Project Gallery**: Explore and discover projects shared by the community
- **🔍 Smart Search**: Search projects by name, description, or creator
- **📱 Responsive Design**: Beautiful, modern UI that works on all devices
- **🌙 Dark/Light Theme**: Toggle between themes with next-themes
- **💾 Auto-save**: Automatic saving of your work
- **📥 File Download**: Export your projects as files
- **🎯 Live Preview**: Real-time preview of your web projects

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Code Editor**: Monaco Editor
- **Icons**: Lucide React
- **State Management**: Zustand
- **File Handling**: React Dropzone

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account
- Clerk account

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wp-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up the database**
   - Create a new Supabase project
   - Run the SQL schema from `lib/database.sql`
   - Configure your environment variables

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
wp-project/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── deploy/        # Deployment endpoints
│   │   ├── explore/       # Public projects API
│   │   └── projects/      # Project management API
│   ├── dashboard/         # User dashboard
│   ├── deploy/           # Deployment pages
│   ├── explore/          # Public project gallery
│   └── page.tsx          # Landing page
├── components/           # Reusable components
│   ├── ui/              # UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── code-editor.tsx  # Monaco Editor wrapper
│   │   └── ...
│   ├── navbar.tsx       # Navigation component
│   └── theme-provider.tsx
├── lib/                 # Utilities and configurations
│   ├── database.sql     # Database schema
│   ├── supabase.ts     # Supabase client
│   ├── utils.ts        # Utility functions
│   └── validations.ts  # Form validations
├── types/              # TypeScript type definitions
│   └── index.ts
└── public/             # Static assets
```

## 🎯 Key Features Explained

### Code Editor
- **Monaco Editor Integration**: Full-featured code editor with IntelliSense
- **Multi-language Support**: HTML, CSS, JavaScript with proper syntax highlighting
- **Custom Snippets**: Pre-built code snippets for faster development
- **Auto-completion**: Smart suggestions and auto-completion
- **Keyboard Shortcuts**: Familiar shortcuts like Ctrl+S for saving

### Project Management
- **Create Projects**: Up to 3 projects per user
- **File Organization**: Organize your HTML, CSS, and JS files
- **Version Control**: Track changes and project history
- **Public/Private**: Choose project visibility

### Community Features
- **Explore Page**: Discover projects from other developers
- **Search Functionality**: Find projects by name, description, or creator
- **Public Gallery**: Share your work with the community

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 🌐 API Endpoints

- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get specific project
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `GET /api/explore` - Get public projects
- `POST /api/deploy` - Deploy project

## 🎨 UI Components

Built with Radix UI and styled with Tailwind CSS:
- **Button**: Various styles and sizes
- **Card**: Project containers and layouts
- **Input**: Form inputs with validation
- **Code Editor**: Monaco-based editor with custom features

## 🔒 Authentication

CodeHub uses Clerk for authentication, providing:
- **Sign Up/Sign In**: Email and social login options
- **User Management**: Profile management and user sessions
- **Protected Routes**: Secure access to user-specific features

## 💾 Database Schema

The application uses Supabase with the following main tables:
- **users**: User profiles and authentication data
- **projects**: Project metadata and settings
- **project_files**: Individual project files and content
- **commits**: Version control and project history

## 🚀 Deployment

The application is designed to be deployed on platforms like:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Render**

Make sure to configure your environment variables in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Monaco Editor** - The code editor that powers VS Code
- **Clerk** - Authentication and user management
- **Supabase** - Backend as a service
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Low-level UI primitives

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Join our community discussions

---

**Built with ❤️ by the CodeHub team**
