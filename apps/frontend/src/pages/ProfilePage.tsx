import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authService, UserProfile } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { User } from 'lucide-react';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getInitials = (name: string): string => {
    if (!name) return 'U';

    const nameParts = name.trim().split(/\s+/);

    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }

    const firstInitial = nameParts[0][0];
    const lastInitial = nameParts[nameParts.length - 1][0];
    return (firstInitial + lastInitial).toUpperCase();
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!authService.isAuthenticated()) {
        navigate({ to: '/' } as any);
        return;
      }

      try {
        const userProfile = await authService.getUserProfile();
        if (userProfile) {
          setProfile(userProfile);
        } else {
          navigate({ to: '/' } as any);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        navigate({ to: '/' } as any);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5">
            <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-600 mt-1">View and manage your account information</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0078D4] to-[#106EBE] px-6 py-8">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center">
                    {profile?.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#0078D4] font-bold text-2xl">
                        {profile ? getInitials(profile.displayName) : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-semibold">
                      {profile?.displayName}
                    </h2>
                    <p className="text-blue-50 mt-1">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Account Information
                </h3>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Display Name
                    </label>
                    <p className="text-gray-900 font-medium">
                      {profile?.displayName || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Email Address
                    </label>
                    <p className="text-gray-900 font-medium">
                      {profile?.email || 'Not provided'}
                    </p>
                  </div>

                  {profile?.jobTitle && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Job Title
                      </label>
                      <p className="text-gray-900 font-medium">
                        {profile.jobTitle}
                      </p>
                    </div>
                  )}

                  {profile?.officeLocation && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Office Location
                      </label>
                      <p className="text-gray-900 font-medium">
                        {profile.officeLocation}
                      </p>
                    </div>
                  )}

                  {profile?.mobilePhone && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Mobile Phone
                      </label>
                      <p className="text-gray-900 font-medium">
                        {profile.mobilePhone}
                      </p>
                    </div>
                  )}

                  {profile?.businessPhones && profile.businessPhones.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Business Phone
                      </label>
                      <p className="text-gray-900 font-medium">
                        {profile.businessPhones[0]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Account Status
                </h3>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Microsoft Account Connected</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Your account is successfully connected via Microsoft 365
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
