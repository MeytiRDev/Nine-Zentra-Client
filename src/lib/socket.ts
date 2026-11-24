import { io, type Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';
import type { Message, PublicUser, SendResult, TypingSignal } from './types';

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  typing: (payload: { from: number; state: TypingSignal }) => void;
  'request:new': (payload: { id: number; from: PublicUser }) => void;
  'request:accepted': (payload: { by: PublicUser }) => void;
  'profile:updated': (payload: { id: number }) => void;
}

export interface ClientToServerEvents {
  'message:send': (payload: { to: number; body: string }, ack: (res: SendResult) => void) => void;
  typing: (payload: { to: number; state: TypingSignal }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectSocket(): AppSocket {
  return io(API_URL, { auth: { token: getToken() } });
}
