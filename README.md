# ⚡ TaskFlow — Team Task Manager

A full-stack MERN application for managing projects, assigning tasks, and tracking team progress with role-based access control.

**Live Demo:** `https://your-app.railway.app`
**GitHub:** `https://github.com/yourusername/taskflow`

---

## 🚀 Features

- **Authentication** — JWT-based signup/login with secure password hashing (bcrypt)
- **Role-Based Access** — Admin and Member roles with granular permissions
- **Projects** — Create, update, archive projects with color coding and due dates
- **Team Management** — Add/remove members per project, assign project-level roles
- **Task Management** — Full CRUD with status (Todo → In Progress → Review → Done), priority, assignee, due date
- **Kanban Board** — Visual drag-ready board grouped by task status
- **Dashboard** — Stats overview, overdue alerts, progress charts, due-this-week panel
- **Comments** — Threaded comments on tasks
- **Admin Panel** — Manage all users, change roles, delete accounts
- **Responsive UI** — Mobile-friendly dark-theme design

---

## 🛠 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, React Router v6, Axios  |
| Backend   | Node.js, Express 4                |
| Database  | MongoDB + Mongoose                |
| Auth      | JWT + bcryptjs                    |
| Styling   | Pure CSS (no framework)           |
| Hosting   | Railway (full-stack)              |

---

## 📦 Local Development

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
npm run install-all
```

### 2. Environment Variables
```bash
cp .env.example .env
```
Edit `.env`:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### 3. Run in Development
```bash
npm run dev
# Server: http://localhost:5000
# Client: http://localhost:3000
```

### 4. Run in Production
```bash
npm run build
npm start
```

---

## 🌐 Railway Deployment

### Step 1 — MongoDB Atlas
1. Create free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist `0.0.0.0/0` in Network Access
4. Copy connection string

### Step 2 — Deploy to Railway
1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables in Railway dashboard:

| Variable     | Value                        |
|--------------|------------------------------|
| NODE_ENV     | production                   |
| MONGO_URI    | your Atlas connection string |
| JWT_SECRET   | a long random secret         |
| JWT_EXPIRE   | 7d                           |

5. Railway auto-detects `railway.toml` and runs `npm run build` then `npm start`
6. Your app is live! 🎉

---

## 🔑 API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Projects
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | List tasks (with filters) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |
| DELETE | `/api/tasks/:id/comments/:cid` | Delete comment |
| GET | `/api/tasks/dashboard/stats` | Dashboard stats |

### Users (Admin Only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | List all users |
| PUT | `/api/users/:id/role` | Update user role |
| DELETE | `/api/users/:id` | Delete user |

---

## 🔐 Role Permissions

| Action | Admin | Project Admin | Member |
|--------|-------|---------------|--------|
| Create project | ✅ | ✅ | ✅ |
| Edit/delete any project | ✅ | ❌ | ❌ |
| Manage project members | ✅ | ✅ | ❌ |
| Create task | ✅ | ✅ | ✅ |
| Edit/delete any task | ✅ | ✅ | Own only |
| Manage users | ✅ | ❌ | ❌ |

---

## 📁 Project Structure

```
taskflow/
├── server/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   └── tasks.js
│   └── index.js              # Express entry point
├── client/
│   └── src/
│       ├── context/AuthContext.js
│       ├── pages/            # Route-level pages
│       ├── components/       # Reusable components
│       └── utils/            # API client, helpers
├── railway.toml
├── package.json              # Root (server deps + scripts)
└── README.md
```

---

## 🎨 Demo Accounts

After registering, use the demo buttons on the login page:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | demo123 |
| Member | member@demo.com | demo123 |

> Seed these by registering manually or adding a seed script.

---

## 📝 License

MIT © 2024
