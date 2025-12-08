# Chatbox Server

A standalone server for handling Zalo Mini App chat functionality with AI-powered responses.

## Features

- Zalo OA webhook integration for receiving messages
- AI-powered chat responses using Google Gemini
- Message analysis and lead extraction
- Queue-based message processing with Redis
- Automatic follow-up reminders
- Google Sheets integration for lead export
- Image and file caching
- Admin notifications for system errors

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
   - Database connection (PostgreSQL)
   - Redis connection
   - Zalo OA credentials
   - Gemini API keys
   - Google Sheets (optional)

3. Run database migrations:
```bash
npm run migrate
```

## Running

Start the server:
```bash
npm start
```

Start the worker for queue processing:
```bash
npm run worker
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

- `POST /api/webhook/zalo` - Zalo webhook for incoming messages
- `POST /api/gemini/chat` - Direct chat API (requires userId)

## Architecture

- **server.js**: Main Express server with routes and middleware
- **worker.js**: BullMQ worker for processing chat jobs
- **src/chats/**: Core chat services (analysis, responses, Zalo API)
- **src/utils/**: Utility functions (logging, caching, notifications)
- **src/models/**: Database models (Zalo tokens, API keys)
- **src/controllers/**: Route handlers
- **src/routes/**: Express routes

## Dependencies

- Node.js 18+
- PostgreSQL
- Redis
- Zalo OA account
- Google Gemini API keys