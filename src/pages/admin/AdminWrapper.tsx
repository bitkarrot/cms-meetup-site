import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminWrapper() {
  const { isAdmin, isLoading } = useAdminAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminLayout />;
}