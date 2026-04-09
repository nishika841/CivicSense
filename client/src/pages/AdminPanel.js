import React, { useState, useEffect } from 'react';
import { complaintsAPI, adminAPI, analyticsAPI } from '../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertTriangle, TrendingUp, Users, Loader2 } from 'lucide-react';
import ComplaintCard from '../components/ComplaintCard';
import BlockchainTxModal from '../components/BlockchainTxModal';

const AdminPanel = () => {
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [blockchainTx, setBlockchainTx] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [complaintsRes, analyticsRes] = await Promise.all([
        complaintsAPI.getAll({ limit: 50 }),
        analyticsAPI.get()
      ]);
      setComplaints(complaintsRes.data.complaints);
      setAnalytics(analyticsRes.data.analytics);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await adminAPI.verify(id);
      fetchData();
    } catch (error) {
      console.error('Error verifying complaint:', error);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await adminAPI.updateStatus(id, status);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleResolveComplaint = async (id, resolutionImages) => {
    setResolvingId(id);
    try {
      const formData = new FormData();
      Array.from(resolutionImages).forEach(file => {
        formData.append('resolutionImages', file);
      });
      const response = await adminAPI.resolve(id, formData);
      if (response.data.blockchainTx) {
        setBlockchainTx({ ...response.data.blockchainTx, _action: 'Admin Resolved Complaint on Blockchain' });
      }
      fetchData();
    } catch (error) {
      console.error('Error resolving complaint:', error);
      alert(error.response?.data?.message || 'Error resolving complaint');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#eab308'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">Manage complaints and view analytics</p>
      </div>

      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'complaints'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Complaints
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'analytics'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'overview' && analytics && (
        <div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow-soft rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-lg p-3 bg-blue-100 text-blue-600">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Complaints</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {analytics.overview.totalComplaints}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-soft rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-lg p-3 bg-green-100 text-green-600">
                    <CheckCircle size={24} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {analytics.overview.resolvedCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-soft rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-lg p-3 bg-purple-100 text-purple-600">
                    <TrendingUp size={24} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Resolution Rate</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {analytics.overview.resolutionRate}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-soft rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-lg p-3 bg-yellow-100 text-yellow-600">
                    <Users size={24} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {analytics.overview.totalUsers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.categoryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Hotspot Areas</h3>
            <div className="space-y-3">
              {analytics.hotspotAreas.slice(0, 5).map((area, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-900">{area._id || 'Unknown'}</span>
                  <span className="text-sm font-semibold text-primary-600">{area.count} issues</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="bg-white rounded-lg shadow-soft p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Complaints</h2>
          <div className="space-y-4">
            {complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Confirmed').map((complaint) => (
              <div key={complaint._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{complaint.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Status: {complaint.status}</span>
                      <span>Votes: {complaint.votes}</span>
                      <span>Impact: {complaint.impactScore}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    {complaint.status === 'Reported' && (
                      <button
                        onClick={() => handleVerify(complaint._id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        Verify
                      </button>
                    )}
                    {complaint.status === 'Verified' && (
                      <button
                        onClick={() => handleStatusUpdate(complaint._id, 'InProgress')}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                      >
                        Start Progress
                      </button>
                    )}
                    {complaint.status === 'InProgress' && (
                      <div className="space-y-2">
                        {resolvingId === complaint._id ? (
                          <div className="flex flex-col items-center space-y-3 py-4 px-6">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-green-600 text-xs">⛓️</span>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-gray-800">Recording on Blockchain...</p>
                              <p className="text-xs text-gray-500 mt-1">Uploading images & signing transaction on Sepolia</p>
                              <p className="text-xs text-gray-400 mt-0.5">This may take 15-30 seconds</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              id={`resolve-${complaint._id}`}
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files.length > 0) {
                                  handleResolveComplaint(complaint._id, e.target.files);
                                }
                              }}
                            />
                            <label
                              htmlFor={`resolve-${complaint._id}`}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition cursor-pointer inline-block text-center"
                            >
                              Upload After Images & Complete
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Required: Upload photos showing the resolved issue</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div>
          <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Complaints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analytics.recentComplaints.map((complaint) => (
                <ComplaintCard key={complaint._id} complaint={complaint} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">High Impact Issues</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analytics.topComplaints.map((complaint) => (
                <ComplaintCard key={complaint._id} complaint={complaint} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blockchain TX Popup */}
      {blockchainTx && (
        <BlockchainTxModal
          txData={blockchainTx}
          actionLabel={blockchainTx._action}
          onClose={() => setBlockchainTx(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
