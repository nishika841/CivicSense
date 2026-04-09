import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../utils/api';
import { TrendingUp, Clock, CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import ComplaintCard from '../components/ComplaintCard';

const Dashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchComplaints();
  }, [filter, sortBy, searchQuery]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {
        sortBy,
        order: 'desc',
        limit: 50
      };
      if (filter !== 'all') {
        params.status = filter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await complaintsAPI.getAll(params);
      setComplaints(response.data.complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  const stats = [
    {
      name: 'Total Issues',
      value: complaints.length,
      icon: AlertCircle,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Closed',
      value: complaints.filter(c => c.status === 'Resolved' || c.status === 'Confirmed').length,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'In Progress',
      value: complaints.filter(c => c.status === 'InProgress').length,
      icon: Clock,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'High Impact',
      value: complaints.filter(c => c.impactScore > 50).length,
      icon: TrendingUp,
      color: 'bg-red-100 text-red-600'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center space-x-4">
        <img src="/assets/logo.png" alt="CivicSense" className="w-14 h-14 object-contain app-logo" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Track and manage civic issues in your community</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow-soft rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-lg p-3 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-soft rounded-lg p-6">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Issues</h2>

            <div className="mt-4 sm:mt-0 flex space-x-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="Reported">Reported</option>
                <option value="Verified">Verified</option>
                <option value="InProgress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Confirmed">Confirmed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="createdAt">Recent</option>
                <option value="votes">Most Voted</option>
                <option value="impactScore">Impact Score</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search complaints by title, description, location, or category..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            {searchQuery && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {complaints.length} result{complaints.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by reporting a new issue.</p>
            <div className="mt-6">
              <Link
                to="/report"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                Report Issue
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complaints.map((complaint) => (
              <ComplaintCard key={complaint._id} complaint={complaint} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
