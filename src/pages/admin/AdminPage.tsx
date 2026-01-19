import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminDashboard />;
}