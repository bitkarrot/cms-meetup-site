import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminSettings from '@/components/admin/AdminSettings';

export default function AdminSettingsPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminSettings />;
}