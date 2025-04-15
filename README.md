
# Task Management Application

## Overview
This is a full-stack Task Management application built with React, TypeScript, Express, and PostgreSQL. The application provides a comprehensive solution for managing tasks with AI-powered features, time tracking, and reporting capabilities.

## Architecture

### Frontend Architecture (client/)
- **Framework**: React + TypeScript + Vite
- **Styling**: TailwindCSS with a custom theme
- **Component Structure**:
  - `/components/ui/`: Reusable UI components built with Radix UI
  - Core components like `DashboardAIAssistant`, `TaskCard`, `TaskColumn` for task management
  - Uses React Query for data fetching and state management
  - Custom hooks in `/hooks/` for shared logic
  - `/lib/` contains utilities, types, and configuration

### Backend Architecture (server/)
- **Framework**: Express.js with TypeScript
- **Key Files**:
  - `index.ts`: Main server setup with Express middleware and session handling
  - `routes.ts`: API route definitions with authentication middleware
  - `storage.ts`: Database operations
  - `ai.ts`: AI integration for task extraction
  - `db.ts`: Database connection handling

### Shared Code (shared/)
- `schema.ts`: Contains shared TypeScript types and Zod validation schemas
- Used by both frontend and backend for type safety

### Database Structure
- **Database**: PostgreSQL with Drizzle ORM
- **Tables**:
  - `users`: User authentication and management
  - `tasks`: Task storage with relations
  - `locations`: Location management
  - `reports`: Report generation and storage
  - `ai_messages`: Stores AI assistant interactions
  - `session`: Handles user sessions

## Key Features

### Task Management
- Kanban board view with drag-and-drop functionality
- Calendar view for scheduling and visualization
- Task categorization and prioritization
- Time tracking for tasks

### AI Integration
- AI-powered task extraction from natural language
- AI assistant for task management guidance
- Voice input support

### User Experience
- Modern, responsive UI with Tailwind CSS
- Real-time updates with React Query
- Photo upload capability for task attachments
- Location-based task organization

### Reporting
- Daily report generation
- Weekly report generation
- Time tracking statistics
- Task completion analytics

### Authentication
- Secure user authentication
- Session management
- Protected API routes

## Development Workflow
- Uses Vite for development server
- Hot module replacement enabled
- TypeScript compilation
- Tailwind CSS processing
- Automatic package installation

## API Structure
- RESTful endpoints for:
  - Task CRUD operations
  - User authentication
  - AI message handling
  - Location management
  - Report generation
  - Task statistics

## Deployment Configuration
- Configured for Replit Autoscaling deployment
- Build command: `npm run build`
- Start command: `npm run start`
- Serves on port 5000

## State Management
- React Query for server state
- React Context for auth state
- Local state with useState where appropriate

## Security Features
- Session-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation with Zod

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the application at http://localhost:5000

The application follows a modern architecture with clear separation of concerns, type safety throughout the stack, and scalable patterns for future development.
