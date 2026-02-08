import { ReactNode } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AdminProtectionProps {
  children: ReactNode;
}

export function AdminProtection({ children }: AdminProtectionProps) {
  const { isAdmin, isLoading, user } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to login with Nostr to access the admin panel.
            </p>
            <div className="flex justify-center">
              <LoginArea className="w-full" />
            </div>
            <div className="mt-12">
              <Button className="w-full" variant="outline" size="sm">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don't have permission to access the admin panel. Your pubkey is not in the allowed list.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}