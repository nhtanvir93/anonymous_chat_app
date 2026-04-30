export const redisKeys = {
  activeUsers: (roomId: string) => `room:${roomId}:active_users`,
  socketMeta: (socketId: string) => `socket:${socketId}:meta`,
  session: (token: string) => `session:${token}`,
  user: (id: string) => `user:${id}`,
  channels: {
    messageNew: (roomId: string) => `room:${roomId}:message:new`,
    roomDeleted: (roomId: string) => `room:${roomId}:deleted`,
  },
};
