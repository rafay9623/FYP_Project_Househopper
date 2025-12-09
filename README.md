# HouseHoppers Backend

Real Estate Investment Platform - Backend API Server

## Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **Firebase Admin SDK** - Database and storage
- **Clerk** - Authentication middleware
- **CORS** - Cross-origin resource sharing

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- Clerk account for authentication

### Installation

```bash
npm install
```

### Environment Variables

Create a `server/.env` or `server/server.env` file in the backend directory:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Firebase Admin SDK
# Option 1: Use service account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Option 2: Use individual credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
```

### Firebase Setup

1. Download your Firebase service account JSON file from Firebase Console
2. Place it in `server/firebase-service-account.json`
3. Or configure individual credentials in environment variables

### Development

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Production

```bash
npm start
```

## API Endpoints

- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get property by ID
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Portfolios
- `GET /api/portfolios` - Get all portfolios
- `GET /api/portfolios/:id` - Get portfolio by ID
- `POST /api/portfolios` - Create portfolio
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/properties/user/:userId` - Get properties by user ID

## Project Structure

```
backend/
├── server/
│   ├── db/              # Database configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   └── index.js         # Server entry point
└── package.json
```

## Authentication

The backend uses Clerk for authentication. Make sure to:
1. Set up Clerk in your dashboard
2. Configure the secret key in environment variables
3. The middleware will extract user information from requests

