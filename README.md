# Prime Bot Website

This is a Discord OAuth2 login system with MongoDB integration for managing a blacklist of users.

## Deployment to Vercel

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Set the following environment variables in Vercel:
   - `DISCORD_CLIENT_ID` - Your Discord application client ID
   - `DISCORD_CLIENT_SECRET` - Your Discord application client secret
   - `DISCORD_CALLBACK_URL` - Should be set to `https://your-app.vercel.app/auth/discord/callback`
   - `SESSION_SECRET` - A random string for session encryption
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_DB_NAME` - Your MongoDB database name (default: primebot)
   - `NODE_ENV` - Set to "production"

4. Configure your Discord application's OAuth2 redirect URL to match your Vercel deployment URL:
   - `https://your-app.vercel.app/auth/discord/callback`

5. Deploy the project

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Fill in the required environment variables in the `.env` file

5. Start the development server:
   ```
   npm run dev
   ```

6. Visit `http://localhost:3000` in your browser

## Project Structure

- `index.js` - Main entry point
- `js/server.js` - Express server configuration
- `html/` - Frontend HTML files
- `static/` - Static assets (CSS, images)
- `database.js` - MongoDB database connection and operations

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DISCORD_CLIENT_ID | Discord OAuth2 client ID | Yes |
| DISCORD_CLIENT_SECRET | Discord OAuth2 client secret | Yes |
| DISCORD_CALLBACK_URL | Discord OAuth2 callback URL | Yes |
| SESSION_SECRET | Secret for session encryption | Yes |
| MONGODB_URI | MongoDB connection string | Yes |
| MONGODB_DB_NAME | MongoDB database name | No (defaults to primebot) |
| PORT | Server port | No (defaults to 3000) |
| NODE_ENV | Environment (development/production) | No (defaults to development) |

## Features

- Discord OAuth2 authentication
- User session management with MongoDB
- Dashboard for authenticated users
- Blacklist management
- Responsive UI with Tailwind CSS