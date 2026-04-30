import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { OnModuleInit, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { RedisService } from '../redis/redis.service';
import { redisKeys } from '../redis/redis.keys';
import { AuthService } from '../auth/auth.service';
import { RoomsService } from '../rooms/rooms.service';

interface SocketMeta {
  roomId: string;
  username: string;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly authService: AuthService,
    private readonly roomsService: RoomsService,
  ) {}

  async onModuleInit() {
    await this.redis.psubscribe('room:*:message:new', 'room:*:deleted');

    this.redis.onPMessage((_pattern, channel, message) => {
      if (channel.endsWith(':message:new')) {
        const roomId = channel.split(':')[1];
        const payload = JSON.parse(message) as object;
        this.server.to(roomId).emit('message:new', payload);
      }

      if (channel.endsWith(':deleted')) {
        const roomId = channel.split(':')[1];
        this.server.to(roomId).emit('room:deleted', { roomId });
      }
    });
  }

  async handleConnection(socket: Socket) {
    const token = socket.handshake.query['token'] as string;
    const roomId = socket.handshake.query['roomId'] as string;

    console.log({ token, roomId });

    const user = await this.authService.validateSession(token);
    if (!user) {
      socket.emit('error', {
        code: 401,
        message: 'Missing or expired session token',
      });
      socket.disconnect();
      return;
    }

    const room = await this.roomsService.findRoomById(roomId);
    if (!room) {
      socket.emit('error', { code: 404, message: 'Room not found' });
      socket.disconnect();
      return;
    }

    const { username } = user;

    await this.redis.set(
      redisKeys.socketMeta(socket.id),
      JSON.stringify({ roomId, username } satisfies SocketMeta),
      86400,
    );

    await this.redis.sadd(redisKeys.activeUsers(roomId), username);

    await socket.join(roomId);

    const activeUsers = await this.redis.smembers(
      redisKeys.activeUsers(roomId),
    );
    socket.emit('room:joined', { activeUsers });

    socket.to(roomId).emit('room:user_joined', { username, activeUsers });

    this.logger.log(`${username} joined room ${roomId}`);
  }

  async handleDisconnect(socket: Socket) {
    await this.cleanupSocket(socket);
  }

  @SubscribeMessage('room:leave')
  async handleLeave(socket: Socket) {
    await this.cleanupSocket(socket);
    socket.disconnect();
  }

  private async cleanupSocket(socket: Socket) {
    const raw = await this.redis.get(redisKeys.socketMeta(socket.id));
    if (!raw) return;

    const { roomId, username } = JSON.parse(raw) as SocketMeta;

    await this.redis.remove(redisKeys.socketMeta(socket.id));
    await this.redis.srem(redisKeys.activeUsers(roomId), username);

    const activeUsers = await this.redis.smembers(
      redisKeys.activeUsers(roomId),
    );

    this.server.to(roomId).emit('room:user_left', { username, activeUsers });

    this.logger.log(`${username} left room ${roomId}`);
  }
}
