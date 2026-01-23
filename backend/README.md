# Habit Forge Backend

MERN backend for Habit Forge - MongoDB is the single source of truth for habits, logs, streaks, and stats.

## Setup

```bash
cd backend
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/habitforge
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Running the Server

```bash
npm run dev   # Development with hot reload
npm start     # Production
```

## Migration from Supabase

To migrate existing habit data from Supabase to MongoDB:

```bash
npm run migrate
```

This script:
- Reads all habits and habit logs from Supabase
- Inserts them into MongoDB (idempotent - safe to run multiple times)
- Filters out test users (userId = "testuser")
- Does NOT delete Supabase data

## API Endpoints

### Habits
- `POST /api/habits` - Create a new habit
- `GET /api/habits/:userId` - Get all habits for a user
- `PUT /api/habits/:id` - Update a habit
- `DELETE /api/habits/:id` - Delete a habit (also deletes logs)

### Habit Logs
- `POST /api/habit-logs` - Toggle habit completion for a date
- `GET /api/habit-logs/:userId` - Get all logs for a user
- `GET /api/habit-logs/habit/:habitId` - Get logs for a specific habit
- `DELETE /api/habit-logs/:id` - Delete a specific log

### Stats
- `GET /api/stats/:userId` - Get comprehensive stats (streaks, completion rates, etc.)
- `GET /api/stats/leaderboard/all` - Get leaderboard data

### Health
- `GET /health` - Returns "API running"

## Notes

- Server runs on port 5000
- MongoDB is required - install and run MongoDB locally or use MongoDB Atlas
- This backend runs separately from the Lovable frontend
- User authentication is handled by Supabase - use Supabase user.id as userId
