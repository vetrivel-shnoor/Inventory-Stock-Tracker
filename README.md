# Inventory & Stock Tracker

This is a comprehensive Inventory Management System built with a Node.js/Express backend and a modern web frontend.

## Features
- Background processing for media using BullMQ and Redis
- RESTful API with Express
- Database integration using MongoDB
- Authentication and authorization with Passport
- File uploads and image processing using Sharp

## Setup Instructions
1. Navigate to the `Backend` directory and copy `.env.example` to `.env`. Fill in the environment variables (like MongoDB URI, Redis host, etc.).
2. Navigate to the `Web` directory and copy `.env.example` to `.env`. Fill in the frontend environment variables.
3. Start Redis server locally or via Docker.
4. Run `npm install` in both `Backend` and `Web` folders.
5. Start the backend with `npm run dev` in the `Backend` directory.
6. Start the frontend development server in the `Web` directory.

## Project Structure
- `Backend/`: Node.js server, API routes, workers for background tasks, and database models.
- `Web/`: Frontend application code.
