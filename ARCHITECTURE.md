
# Architecture

## Overview

The application is a real-time group chat service. It has three main moving parts: a NestJS HTTP/WebSocket server, a PostgreSQL database, and Redis. Here is how they fit together:

[![architecture-diagram.jpg](https://i.postimg.cc/dVwDd7gk/architecture-diagram.jpg)](https://postimg.cc/QHYXZM8h)

When a client sends a message via `POST /rooms/:id/messages`, the service saves it to PostgreSQL and publishes it to a Redis channel. The WebSocket gateway — which is subscribed to that channel — picks it up and broadcasts it to all connected clients in the room. The REST controller never touches the WebSocket layer directly. This separation is intentional: it means the same flow works even when clients are connected to different server instances.

---

## Session Strategy

There are no passwords in this system. A user logs in with just a username. On login, the server looks up or creates the user in PostgreSQL, then generates a cryptographically random 32-byte hex token:

```

sessionToken = randomBytes(32).toString('hex')

```

Two keys are written to Redis:

| Key | Value | TTL |
|-----|-------|-----|
| `session:<token>` | `userId` | 24 hours |
| `user:<userId>` | `token` | 24 hours |

The bidirectional mapping serves two purposes. `session:<token>` is used on every request to validate the token and look up who the user is. `user:<userId>` is used on re-login — before issuing a new token, the server finds and invalidates the old one so only one session per user is active at a time.

On every authenticated request, the guard reads `session:<token>` from Redis. If it is missing or expired, the request is rejected with 401. The token is never stored in the database — Redis is the sole source of truth for sessions.

---

## Redis Pub/Sub and WebSocket Fan-out

The reason pub/sub exists is to handle multiple server instances. If two clients are connected to different instances of the server, a direct in-memory broadcast would only reach the clients on one instance. Redis solves this by acting as a message bus between all instances.

The flow for a new message looks like this:

```

Client
│
│ POST /rooms/:id/messages
▼
REST Controller
│
│ saves to PostgreSQL
▼
MessagesService
│
│ redis.publish("room:<roomId>:message:new", payload)
▼
Redis
│
│ delivers to all subscribers
▼
ChatGateway (on every server instance)
│
│ server.to(roomId).emit("message:new", payload)
▼
All connected clients in that room

```

The gateway subscribes using `psubscribe("room:*:message:new", "room:*:deleted")` on startup. Pattern subscriptions mean it automatically handles any room without needing to manage per-room subscriptions dynamically. The same pattern is used for `room:deleted` — the REST endpoint publishes the event and all gateway instances broadcast it to their connected clients.

Each server instance has three Redis connections: one for general operations (get, set, sadd, etc.), one dedicated to publishing, and one dedicated to subscribing. A connection in subscribe mode cannot be used for anything else, which is why they are kept separate.

---

## Estimated Concurrent User Capacity

A single 2 vCPU / 2 GB RAM instance (Render free/starter tier) can comfortably handle around **3,000–5,000 concurrent WebSocket connections**.

**Memory is the real bottleneck, not CPU.** Node's event-driven model keeps open TCP connections cheap, but socket state alone costs roughly 2 KB per connection — so 5,000 users already burns ~10 MB before you factor in Redis round-trips, NestJS overhead, and Drizzle queries.

**Redis stays fast** (sub-millisecond), though each broadcast requires two round-trips. Postgres load remains relatively light since real-time operations mostly go through Redis.

> This assumes moderate message frequency — not every user sending messages simultaneously.

---

## What I'd Change at 10× Load

At 30,000–50,000 concurrent users, here's what breaks and how to fix it:

**Horizontal Scaling** — already possible with the current pub/sub setup. Add instances behind a load balancer and swap manual pub/sub for Socket.io's Redis adapter.

**Redis Cluster** — a single Redis node becomes the bottleneck at high message volume. Clustering distributes the load across nodes.

**PgBouncer** — connection pool exhaustion becomes a real risk at this scale. Placing PgBouncer in front of Postgres prevents it.

**Read Replicas** — `GET /rooms/:id/messages` is read-heavy. Routing it away from the primary reduces pressure significantly.

**Rate Limiting on POST /messages** — without it, a single user can flood the pub/sub pipeline. A simple per-user limit (e.g. 5 msg/s) protects the whole system.

**Split WebSocket and REST Servers** — WebSocket servers are memory-bound and long-lived; REST servers are CPU-bound and short-lived. Separating them lets you scale each independently based on actual demand.

---

## Known Limitations

**1. Active user count breaks with multiple tabs**

In `handleDisconnect`, `cleanupSocket` calls `srem` to remove the username from the active set the moment *any* socket disconnects — no check for whether the user has other active connections:

```ts
await this.redis.srem(redisKeys.activeUsers(roomId), username);
```

A per-user connection counter in Redis would fix this — only `srem` when the count hits zero.

---

**2. No message delivery guarantees**

`onModuleInit` subscribes to Redis and emits directly to the room:

```ts
this.server.to(roomId).emit('message:new', payload);
```

There's no acknowledgement, no queue, no retry. If a client is mid-reconnect, the message is simply gone. The REST history endpoint is the only recovery path.

---

**3. Redis restart logs everyone out**

Sessions are validated via `authService.validateSession(token)` which reads from Redis, and socket metadata is stored in Redis too:

```ts
await this.redis.set(redisKeys.socketMeta(socket.id), ...)
await this.redis.sadd(redisKeys.activeUsers(roomId), username)
```

A Redis restart wipes all of this — no persistence, no fallback. Every active user gets disconnected and their session becomes invalid until they log in again.
