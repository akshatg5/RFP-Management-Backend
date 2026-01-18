# RFP Management System - Backend

A procurement management system backend built with Express, Prisma, and Google Gemini AI.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Google Gemini API key
- Resend API key for email functionality

## Local Setup

1. Clone the repository and navigate to the backend directory.

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory by copying `.env.example`:
   ```
   cp .env.example .env
   ```

4. Fill in the environment variables in `.env`:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `GEMINI_API_KEY`: Google Gemini API key for AI features
   - `RESEND_API_KEY`: Resend API key for email handling
   - `PORT`: Server port (default is 3000)

5. Run Prisma migrations to set up the database schema:
   ```
   npx prisma migrate dev
   ```

6. Generate Prisma client:
   ```
   npx prisma generate
   ```

7. Start the development server:
   ```
   npm run dev
   ```

The server will start on the port specified in your `.env` file (default: 3000).

## API Endpoints

- `/api/rfps` - RFP management
- `/api/vendors` - Vendor management
- `/api/proposals` - Proposal handling
- `/api/emails` - Email operations
- `/api/webhooks` - Inbound email webhooks

## Deployment

The application is configured for deployment on Vercel.

### Frontend Repository : 
https://github.com/akshatg5/RFP-Management-Frontend
