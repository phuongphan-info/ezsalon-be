import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    this.connectedUsers.set(client.id, data.userId);
    client.to(data.room).emit('user-joined', {
      userId: data.userId,
      message: `User ${data.userId} joined the room`,
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    client.to(data.room).emit('user-left', {
      userId: data.userId,
      message: `User ${data.userId} left the room`,
    });
  }

  @SubscribeMessage('send-message')
  handleMessage(
    @MessageBody() data: { room: string; message: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.room).emit('receive-message', {
      userId: data.userId,
      message: data.message,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { room: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.room).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }
}
