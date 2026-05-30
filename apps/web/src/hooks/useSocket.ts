'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useSocket(tenantId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const socket = io(`${SOCKET_URL}/ws`, {
      query: { tenantId },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [tenantId]);

  return socketRef;
}
