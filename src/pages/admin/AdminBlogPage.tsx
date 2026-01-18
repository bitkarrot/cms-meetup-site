import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminBlog from '@/components/admin/AdminBlog';

export default function AdminBlogPage() {
  const { isAdmin } = useAdminAuth();
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminBlog />;
}