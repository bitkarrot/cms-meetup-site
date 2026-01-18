import { createContext, useContext, ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAdminAuth as useAdminAuthCheck } from '@/hooks/useRemoteNostrJson';

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  user: any; // TODO: Type this properly
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const { isAdmin, isLoading: adminLoading } = useAdminAuthCheck(user?.pubkey);
  
  return (
    <AdminAuthContext.Provider value={{
      isAdmin,
      isLoading: adminLoading,
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