'use client';
import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null);

const LocationSocketContext = createContext<React.MutableRefObject<Socket | null> | null>(null);

export function SocketProvider({ children, tenantId }: { children: ReactNode; tenantId?: string }) {
  const socket = useSocket(tenantId);
  const locationSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const token = getToken();
    const locSocket = io(`${SOCKET_URL}/location`, {
      auth: { token },
      query: { tenantId },
      transports: ['websocket', 'polling'],
    });
    locationSocketRef.current = locSocket;
    return () => { locSocket.disconnect(); locationSocketRef.current = null; };
  }, [tenantId]);

  return (
    <SocketContext.Provider value={socket}>
      <LocationSocketContext.Provider value={locationSocketRef}>
        {children}
      </LocationSocketContext.Provider>
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
export const useLocationSocket = () => useContext(LocationSocketContext);
