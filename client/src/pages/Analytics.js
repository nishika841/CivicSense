import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyticsAPI } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  TrendingUp, Clock, CheckCircle, AlertCircle, Users, BarChart3,
  Timer, MapPin, Loader2, Search, X, Globe
} from 'lucide-react';

const COLORS = ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];
const STATUS_COLORS = { Reported: '#eab308', Verified: '#3b82f6', InProgress: '#a855f7', Resolved: '#22c55e' };

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [areaQuery, setAreaQuery] = useState('');
  const [activeArea, setActiveArea] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [areaQuery]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = areaQuery ? { area: areaQuery } : {};
      const response = await analyticsAPI.get(params);
      setData(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectPlace = (place) => {
    const parts = place.display_name.split(',');
    const label = parts.slice(0, 2).join(',').trim();
    setActiveArea(label);
    setAreaQuery(label.split(',')[0].trim());
    setSearchInput(label);
    setShowResults(false);
  };

  const clearArea = () => {
    setAreaQuery('');
    setActiveArea('');
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load analytics</h2>
        <p className="text-gray-500 mt-2">Please try again later.</p>
      </div>
    );
  }

  const { overview, statusDistribution, categoryDistribution, hotspotAreas, monthlyTrends } = data;

  const statusData = statusDistribution.map(s => ({
    name: s._id === 'InProgress' ? 'In Progress' : s._id,
    value: s.count,
    fill: STATUS_COLORS[s._id] || '#6b7280'
  }));

  const categoryData = (categoryDistribution || []).map((c, i) => ({
    name: (c._id || 'Other').replace(/_/g, ' '),
    count: c.count,
    fill: COLORS[i % COLORS.length]
  }));

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendData = (monthlyTrends || []).reverse().map(t => ({
    name: `${monthNames[t._id.month]} ${t._id.year}`,
    complaints: t.count
  }));

  const hotspots = (hotspotAreas || []).filter(h => h._id);

  const stats = [
    { name: 'Total Complaints', value: overview.totalComplaints, icon: AlertCircle, color: 'bg-blue-100 text-blue-600', bg: 'bg-blue-50' },
    { name: 'Resolved', value: overview.resolvedCount, icon: CheckCircle, color: 'bg-green-100 text-green-600', bg: 'bg-green-50' },
    { name: 'Pending', value: overview.pendingCount, icon: Clock, color: 'bg-amber-100 text-amber-600', bg: 'bg-amber-50' },
    { name: 'Resolution Rate', value: `${overview.resolutionRate}%`, icon: TrendingUp, color: 'bg-purple-100 text-purple-600', bg: 'bg-purple-50' },
    { name: 'Avg Resolution', value: `${overview.avgResolutionDays} days`, icon: Timer, color: 'bg-red-100 text-red-600', bg: 'bg-red-50' },
    { name: 'Total Users', value: overview.totalUsers, icon: Users, color: 'bg-cyan-100 text-cyan-600', bg: 'bg-cyan-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <BarChart3 size={28} className="text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600">Real-time transparency dashboard — open to everyone</p>
            </div>
          </div>
        </div>

        {/* Area Search */}
        <div ref={searchRef} className="mt-5 relative max-w-lg">
          <div className="flex items-center bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
            <Search size={18} className="ml-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search area, city, or state to filter stats..."
              className="flex-1 px-3 py-3 text-sm border-none outline-none focus:ring-0"
            />
            {searching && <Loader2 size={16} className="mr-2 text-gray-400 animate-spin" />}
            {activeArea && !searching && (
              <button onClick={clearArea} className="mr-3 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
              {searchResults.map((place, idx) => {
                const parts = place.display_name.split(',');
                const title = parts[0].trim();
                const subtitle = parts.slice(1, 3).join(',').trim();
                const typeLabel = (place.type || '').replace(/_/g, ' ');
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900 font-medium truncate flex-1">{title}</p>
                      {typeLabel && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize flex-shrink-0">{typeLabel}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
                  </button>
                );
              })}
            </div>
          )}

          {showResults && searchResults.length === 0 && searchInput && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg p-4 text-center z-50">
              <p className="text-sm text-gray-500">No places found for "{searchInput}"</p>
            </div>
          )}
        </div>

        {activeArea && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
              <MapPin size={14} className="mr-1.5" />
              Showing stats for: {activeArea}
            </span>
            <button onClick={clearArea} className="text-sm text-gray-500 hover:text-red-500 underline">
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-soft p-4">
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution Pie */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">No data yet</div>
          )}
        </div>

        {/* Category Distribution Bar */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaints by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Complaint Trends</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="complaints"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 5, fill: '#6366f1' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">No trend data yet — complaints will appear here over time</div>
        )}
      </div>

      {/* Hotspot Areas */}
      {hotspots.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <MapPin size={20} className="inline mr-2 text-red-500" />
            Top Hotspot Areas
          </h3>
          <div className="space-y-3">
            {hotspots.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex items-center space-x-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-red-100 text-red-700' : idx === 1 ? 'bg-orange-100 text-orange-700' : idx === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className="text-sm text-gray-900 font-medium truncate max-w-md">{area._id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">{area.count}</span>
                  <span className="text-xs text-gray-500">complaints</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
