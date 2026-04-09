import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { User, Mail, Phone, FileText, ThumbsUp } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-soft p-6 text-center">
            <div className="mx-auto h-24 w-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mb-4">
              <User className="text-white" size={48} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{profile?.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{profile?.email}</p>
            <span className="inline-block mt-3 px-3 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
              {profile?.role === 'admin' ? 'Administrator' : 'Citizen'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Mail className="text-gray-400 mt-1 mr-3" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{profile?.email}</p>
                </div>
              </div>

              {profile?.phone && (
                <div className="flex items-start">
                  <Phone className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{profile.phone}</p>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Statistics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <FileText className="mx-auto text-primary-600 mb-2" size={24} />
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.complaintsReported?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Issues Reported</p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <ThumbsUp className="mx-auto text-primary-600 mb-2" size={24} />
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.votedComplaints?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Votes Cast</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
