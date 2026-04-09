import { createContext, useContext, ReactNode } from 'react';
import type { NUser } from '@nostrify/react/login';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAdminAuth as useAdminAuthCheck } from '@/hooks/useRemoteNostrJson';

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  user: NUser | undefined;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const { isAdmin, isMaster, isLoading: adminLoading } = useAdminAuthCheck(user?.pubkey);
  
  return (
    <AdminAuthContext.Provider value={{
      isAdmin: isAdmin || isMaster,
      isLoading: isMaster ? false : adminLoading,
      user
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Export as default for react-refresh compatibility
export default AdminAuthProvider;

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}