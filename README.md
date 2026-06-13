# House Hopper Project

A comprehensive full-stack application with a React frontend, Node.js/Express backend, and a Python machine learning microservice for property recommendations. It integrates Firebase Auth/Firestore and Google Gemini AI.

## Project Structure

- **frontend/**: React application using Vite (runs on port 5173).
- **backend/**: Node.js Express server with Firebase Admin, Gemini AI, and Stripe integrations (runs on port 3001 or 5000).
- **ml/**: Python FastAPI microservice for ML-based property recommendations (runs on port 5001).

## Prerequisites

- Node.js (v18 or higher recommended)
- Python 3.9+ (for the ML microservice)
- npm or yarn

## Getting Started

### 1. Setup Environment Variables

The project uses `.env` files to manage secrets securely.

**Frontend (`frontend/.env`)**:
Contains Firebase public keys and UI settings.
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your_admin_email
VITE_ADMIN_PASSWORD=your_admin_password
```

**Backend (`backend/.env`)**:
Contains server configuration, secret keys, and service API keys.
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
RECOMMENDATION_SERVICE_URL=http://localhost:5001
GEMINI_API_KEY=your_gemini_key
STRIPE_SECRET_KEY=your_stripe_key
```

**Firebase Admin Service Account (`backend/.env.firebase-service-account.json`)**:
Download your service account JSON from Firebase Console and place it in the backend directory.

### 2. Setup Backend

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Start the backend server:

```bash
npm run dev
# Server runs on configured PORT
```

### 3. Setup Frontend

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
# App runs on http://localhost:5173
```

### 4. Setup ML Recommendation Service

Navigate to the ml directory and install Python dependencies:

```bash
cd ml
pip install -r requirements.txt
```

Start the Python FastAPI service:

```bash
uvicorn app:app --port 5001 --reload
# Service runs on http://localhost:5001
```

## Features

- **Authentication**: Fully integrated with Firebase Authentication on both frontend and backend. Role-based access control (Admin vs User).
- **AI Integration**: Uses Google Gemini Pro/Flash models for intelligent responses.
- **ML Recommendations**: Uses a Hugging Face model via a Python microservice to provide personalized property recommendations.
- **Database**: Real-time scalable data storage with Firebase Firestore.
- **Payments**: Integrated with Stripe for premium subscription plans.

## Code Quality & Security

- Hardcoded API keys and credentials are strictly prohibited; all secrets are managed via `.env` files.
- The backend utilizes structured modular controllers, standardized API responses (`utils/response.js`), structured logging (`utils/logger.js`), and Zod validation (`utils/validators.js`).
- Database queries and ML fetching are optimized with parallelized promises and indexed targeting for high performance.
