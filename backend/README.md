# HabitForge Backend

Production-ready MERN backend for HabitForge - MongoDB is the single source of truth for all data.

## Tech Stack

- **Node.js** with Express
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Nodemailer** for password reset emails

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
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# SMTP Configuration for Password Reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@habitforge.com

# Optional: AI API Keys
# GEMINI_API_KEY=your-gemini-api-key
# OPENAI_API_KEY=your-openai-api-key
```

## Running the Server

```bash
npm run dev   # Development with hot reload
npm start     # Production
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)
- `PUT /api/auth/password` - Change password (requires auth)
- `POST /api/auth/upload-avatar` - Upload avatar image (requires auth)
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token

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

### Stats & Leaderboard
- `GET /api/stats/:userId` - Get comprehensive stats
- `GET /api/leaderboard` - Get leaderboard data

### Rewards
- `GET /api/rewards/user` - Get user rewards
- `PUT /api/rewards/xp` - Add XP points
- `GET /api/rewards/achievements` - Get all achievements
- `POST /api/rewards/unlock-achievement` - Unlock achievement
- `GET /api/rewards/redeemable` - Get redeemable rewards
- `POST /api/rewards/redeem` - Redeem a reward

### Reflections
- `GET /api/reflections/:weekStart` - Get weekly reflection
- `POST /api/reflections` - Save weekly reflection
- `GET /api/reflections` - Get all reflections

### AI (requires API key configuration)
- `POST /api/ai/recommendations` - Get AI recommendations
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/automation` - Get automation suggestions
- `POST /api/ai/generate-image` - Generate motivational images

## File Uploads

Avatar images are stored in `uploads/avatars/` directory. The server serves these files statically.

For production deployments, consider:
- Using cloud storage (AWS S3, Cloudinary)
- Implementing CDN for serving images
- Setting up proper backup strategies

## Security Notes

- Change `JWT_SECRET` to a strong, unique value in production
- Use HTTPS in production
- Configure CORS properly for your domain
- Implement rate limiting for API endpoints
- Regularly update dependencies

## Deployment

Deploy to any Node.js hosting platform:
- Render
- Railway
- Heroku
- AWS EC2/ECS
- DigitalOcean App Platform

Ensure environment variables are configured in your hosting platform.
