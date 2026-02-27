# House Hopper Project

A comprehensive full-stack application with a React frontend and Node.js/Express backend, integrated with Firebase and Google Gemini AI.

## Project Structure

- **frontend/**: React application using Vite.
- **backend/**: Node.js Express server with AI and Firebase integrations.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

### 1. Setup Backend

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Configure environment variables:
1. Copy `.env.example` to `.env`.
2. Fill in your Firebase details and Gemini API key (see [GEMINI_SETUP.md](./GEMINI_SETUP.md)).

Start the backend server:

```bash
npm run dev
# Server runs on http://localhost:3001
```

### 2. Setup Frontend

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Configure environment variables:
1. Copy `.env.example` to `.env.local` (Vite uses `.env.local` for local overrides).
2. Add your `VITE_CLERK_PUBLISHABLE_KEY` and ensure `VITE_API_URL` points to your backend.

Start the frontend development server:

```bash
npm run dev
# App runs on http://localhost:5173
```

## Features

- **AI Integration**: Uses Google Gemini Pro/Flash models for intelligent responses.
- **Authentication**: Integrated with Clerk (Frontend) and Firebase (Backend).
- **Database**: Uses Firebase Firestore.

## Documentation

- [Gemini Setup Guide](./GEMINI_SETUP.md)
