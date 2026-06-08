# GoUnion Express Backend

Clean Node.js + Express backend scaffold for the GoUnion school social hub frontend.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The frontend currently defaults to `http://127.0.0.1:8001` in development, so this backend uses port `8001` by default.

Set `MONGODB_URI` in `.env` before starting the server. `MONGODB_DB_NAME` is optional when your URI already includes the database name.

On startup the backend connects to MongoDB and seeds one admin account from:

- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Production Env

Set these in Render or your server environment:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_URL`
- `FRONTEND_ORIGINS`
- `CLOUDINARY_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Signup confirmation and forgot-password emails use SMTP. In development, missing SMTP config logs the email content instead of failing.

## Storage

`POST /media/upload` uses memory upload handling and sends files to cloud storage. Cloudinary is wired already; add either `CLOUDINARY_URL` or the split Cloudinary keys in `.env`.

No local upload folder is used.

## Frontend-Compatible Endpoints

- `GET /health`
- `POST /token`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/confirm-email`
- `POST /users/`
- `GET /users/me/`
- `PUT /users/me/profile`
- `GET /users/suggestions`
- `GET /users/:id/posts`
- `POST /users/:id/follow`
- `POST /users/:id/unfollow`
- `GET /users/:id/following`
- `GET /users/:id/followers`
- `GET /profiles/:username`
- `GET /posts/`
- `GET /posts/feed`
- `POST /posts/`
- `GET /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/like`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments/`
- `POST /comments/:id/like`
- `GET /groups/`
- `POST /groups/`
- `GET /groups/:id`
- `PUT /groups/:id`
- `POST /groups/:id/join`
- `GET /groups/:id/members/`
- `GET /groups/:id/requests/`
- `POST /groups/requests/:requestId/approve`
- `GET /groups/:id/posts/`
- `PUT /groups/:groupId/members/:userId/role`
- `DELETE /groups/:groupId/members/:userId`
- `GET /search/users`
- `GET /search/posts`
- `GET /search/groups`
- `GET /friends/`
- `POST /friend-request/:userId`
- `GET /conversations/`
- `POST /conversations/`
- `GET /conversations/:id/messages/`
- `POST /conversations/:id/messages/`
- `GET /notifications/`
- `GET /notifications/unread-count`
- `POST /notifications/read-all`
- `POST /notifications/:id/read`
- `POST /reports/`
- `GET /admin/stats`
- `GET /admin/users`
- `PUT /admin/users/:id/role`
- `POST /admin/users/:id/toggle-active`
- `GET /admin/reports/`
- `POST /admin/reports/:id/resolve`
- `GET /stories/feed`
- `POST /stories/`
- `POST /stories/:id/view`
- `POST /stories/:id/like`
- `GET /mobile/version`

## Database

This version uses MongoDB through Mongoose. API response IDs are stable string IDs, so the frontend should not convert entity IDs to numbers.

