# HabitForge - Smart Habit Tracker

A production-ready MERN (MongoDB, Express, React, Node.js) habit tracking application with gamification, analytics, and AI-powered recommendations.

## Features

- 🎯 **Habit Tracking** - Create, track, and manage daily/weekly/monthly habits
- 📊 **Analytics** - Visualize your progress with charts and statistics
- 🏆 **Gamification** - Earn XP, level up, and unlock achievements
- 🤖 **AI Recommendations** - Get personalized habit suggestions
- 📅 **Weekly Reviews** - Reflect on your progress and plan ahead
- 🏅 **Leaderboard** - Compete with other users
- 🎁 **Rewards System** - Redeem XP for rewards

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- shadcn/ui component library
- React Query for data fetching
- React Router for navigation

### Backend
- Node.js with Express
- MongoDB with Mongoose ODM
- JWT authentication with bcrypt
- Multer for file uploads
- Nodemailer for email (password reset)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)
- SMTP server credentials (optional, for password reset emails)

### Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API URL
# VITE_API_URL=http://localhost:5000

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/habitforge
# JWT_SECRET=your-super-secret-key-change-in-production
# JWT_EXPIRES_IN=7d
# FRONTEND_URL=http://localhost:5173
# 
# SMTP Configuration (optional, for password reset)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@habitforge.com

# Start development server
npm run dev

# Or for production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/upload-avatar` - Upload avatar image

### Habits
- `POST /api/habits` - Create habit
- `GET /api/habits/:userId` - Get user's habits
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit

### Habit Logs
- `POST /api/habit-logs` - Toggle habit completion
- `GET /api/habit-logs/:userId` - Get user's logs
- `GET /api/habit-logs/habit/:habitId` - Get habit's logs

### Stats & Leaderboard
- `GET /api/stats/:userId` - Get user statistics
- `GET /api/leaderboard` - Get leaderboard

### Rewards
- `GET /api/rewards/user` - Get user rewards
- `PUT /api/rewards/xp` - Add XP
- `GET /api/rewards/achievements` - Get all achievements
- `POST /api/rewards/unlock-achievement` - Unlock achievement
- `GET /api/rewards/redeemable` - Get redeemable rewards
- `POST /api/rewards/redeem` - Redeem reward

### Reflections
- `GET /api/reflections/:weekStart` - Get weekly reflection
- `POST /api/reflections` - Save weekly reflection

### AI (requires API key configuration)
- `POST /api/ai/recommendations` - Get AI recommendations
- `POST /api/ai/chat` - Chat with AI assistant

## Deployment

### Frontend

Build the frontend for production:

```bash
npm run build
```

Deploy the `dist` folder to any static hosting service (Netlify, Vercel, AWS S3, etc.)

### Backend

Deploy to any Node.js hosting platform:
- Render
- Railway
- Heroku
- AWS EC2/ECS
- DigitalOcean App Platform

Ensure environment variables are configured in your hosting platform.

### MongoDB

Use MongoDB Atlas for production:
1. Create a free cluster at https://mongodb.com/atlas
2. Get connection string
3. Update `MONGO_URI` in backend environment

## File Uploads

Avatar images are stored locally in `backend/uploads/avatars/`. For production, consider:
- Using cloud storage (AWS S3, Cloudinary)
- Implementing CDN for serving images
- Setting up proper backup strategies

## Security Considerations

- Change `JWT_SECRET` to a strong, unique value in production
- Use HTTPS in production
- Configure CORS properly for your domain
- Implement rate limiting for API endpoints
- Regularly update dependencies

## License

MIT License - feel free to use for personal or commercial projects.
