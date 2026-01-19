import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminEvents from '@/components/admin/AdminEvents';

export default function AdminEventsPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminEvents />;
}