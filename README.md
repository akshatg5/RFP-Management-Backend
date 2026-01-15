# Backend - Customer Support Agent

A Node.js/Express backend API for the customer support agent application.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for Docker setup)
- MongoDB (for local setup without Docker)

## Setup

### Option 1: Using Docker

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` file with your values:**
   - `JWT_SECRET`: Your JWT secret key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `MONGODB_URI`: Already set to `mongodb://mongodb:27017/customer-support` for Docker

3. **Start services:**
   ```bash
   docker-compose up
   ```

   This will start both MongoDB and the backend service. The API will be available at `http://localhost:3000`.

### Option 2: Local Development (Without Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` file:**
   - `MONGODB_URI`: Set to your local MongoDB URI (e.g., `mongodb://localhost:27017/customer-support`)
   - `JWT_SECRET`: Your JWT secret key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Set to `development` for local development

4. **Make sure MongoDB is running locally**

5. **Run in development mode:**
   ```bash
   npm run dev
   ```

   Or build and run in production mode:
   ```bash
   npm run build
   npm start
   ```

## Frontend Setup

To test the backend with a frontend interface, you can use the [Frontend Repository](https://github.com/akshatg5/AI_Customer_Support_Agent_Frontend).

### Setting up the Frontend

1. **Clone the frontend repository:**
   ```bash
   git clone https://github.com/akshatg5/AI_Customer_Support_Agent_Frontend.git
   cd AI_Customer_Support_Agent_Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the backend URL:**
   - Update the API base URL in the frontend configuration to point to your backend
   - Default backend URL: `http://localhost:3000`
   - Make sure CORS is properly configured in the backend to allow requests from the frontend

4. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Frontend will typically run on `http://localhost:5173` (Vite default)
   - The frontend will communicate with the backend API at `http://localhost:3000`

### Testing the Backend

Once both backend and frontend are running:
- Use the frontend interface to test authentication endpoints
- Test chat functionality through the UI

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
