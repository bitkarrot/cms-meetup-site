import { AdminProtection } from '@/components/AdminProtection';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { isAdmin } = useAdminAuth();
  
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <AdminProtection><div /></AdminProtection>;
}