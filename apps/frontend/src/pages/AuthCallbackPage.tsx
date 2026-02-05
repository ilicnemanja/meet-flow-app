import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authService } from '@/lib/auth';

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const errorParam = params.get('error');

      if (errorParam) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => {
          navigate({ to: '/' });
        }, 3000);
        return;
      }

      if (token) {
        authService.setToken(token);
        navigate({ to: '/dashboard' });
      } else {
        setError('No token received');
        setTimeout(() => {
          navigate({ to: '/' });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-400 mt-2">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p className="text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
};
