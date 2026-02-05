import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authService, UserProfile } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Mail, User, Calendar } from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!authService.isAuthenticated()) {
        navigate({ to: '/' });
        return;
      }

      try {
        const userProfile = await authService.getUserProfile();
        if (userProfile) {
          setProfile(userProfile);
        } else {
          navigate({ to: '/' });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        navigate({ to: '/' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5">
            <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
            <p className="text-sm text-gray-600 mt-1">Welcome back, {profile?.displayName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-8 py-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-[#0078D4] to-[#106EBE] rounded-lg shadow-sm p-6 mb-6 text-white">
            <h2 className="text-xl font-semibold mb-2">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}!</h2>
            <p className="text-blue-50">Here's your MeetFlow workspace. Choose an action below to get started.</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate({ to: '/dashboard/mail/compose' } as any)}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-[#0078D4] transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#0078D4] p-3 rounded-lg group-hover:bg-[#106EBE] transition-colors">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Compose Email</h4>
                    <p className="text-sm text-gray-600">Create a new message</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate({ to: '/dashboard/calendar' } as any)}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-[#0078D4] transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#0078D4] p-3 rounded-lg group-hover:bg-[#106EBE] transition-colors">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Calendar</h4>
                    <p className="text-sm text-gray-600">View your schedule and events</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate({ to: '/dashboard/profile' } as any)}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-[#0078D4] transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#0078D4] p-3 rounded-lg group-hover:bg-[#106EBE] transition-colors">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Profile</h4>
                    <p className="text-sm text-gray-600">View and manage your account</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
