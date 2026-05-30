'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';

const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null);

export function SocketProvider({ children, tenantId }: { children: ReactNode; tenantId?: string }) {
  const socket = useSocket(tenantId);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocketContext = () => useContext(SocketContext);
