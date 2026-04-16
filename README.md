# Team 15a Group Project

A full-stack MERN (MongoDB, Express, React, Node.js) application.

## Project Structure

```
team-15a-group-project/
├── backend/                 # Express.js backend API
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   └── server.js           # Entry point
├── frontend/               # React frontend (Vite)
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       └── services/       # API services
└── package.json            # Root package with scripts
```

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB Atlas account (free tier available)

## MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (free M0 tier is sufficient)
3. Set up database access:
   - Go to "Database Access" → Add New Database User
   - Create a username and password (save these!)
4. Set up network access:
   - Go to "Network Access" → Add IP Address
   - Click "Allow Access from Anywhere" for development
5. Get your connection string:
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd team-15a-group-project
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   # Copy the example env file to the backend folder
   cp .env.example backend/.env
   ```

4. Edit `backend/.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/team15a?retryWrites=true&w=majority
   PORT=5000
   NODE_ENV=development
   ```

## Running the Application

### Development Mode (both frontend and backend)

```bash
npm run dev
```

This starts:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

### Run Backend Only

```bash
npm run dev:backend
```

### Run Frontend Only

```bash
npm run dev:frontend
```

## API Endpoints

| Method | Endpoint       | Description      |
|--------|----------------|------------------|
| GET    | /api/users     | Get all users    |
| GET    | /api/users/:id | Get user by ID   |
| POST   | /api/users     | Create new user  |
| PUT    | /api/users/:id | Update user      |
| DELETE | /api/users/:id | Delete user      |

## Tech Stack

- **Frontend:** React 18, React Router, Axios, Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Dev Tools:** Nodemon, Concurrently, ESLint

## Team Members

- Team 15a

## License

ISC
