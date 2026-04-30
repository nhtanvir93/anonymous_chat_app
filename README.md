# Anonymous Chat API

A real-time group chat service built with NestJS, PostgreSQL, Drizzle ORM, Redis, and Socket.io.

## Getting Started

### 1. Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### 2. Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 3. Start the app

```bash
docker compose up --build
```

### 4. Run database migrations

In a separate terminal, after the containers are up:

```bash
npx drizzle-kit push
```

### 5. Access the API

```
http://localhost:3000
```

The port is determined by the `PORT` value in your `.env` file.
