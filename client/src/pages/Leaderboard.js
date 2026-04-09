import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../utils/api';
import { Trophy, Medal, Star, Users, FileText, CheckCircle, Loader2 } from 'lucide-react';

const RANK_STYLES = [
  'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
  'bg-gradient-to-r from-gray-300 to-gray-400 text-white',
  'bg-gradient-to-r from-orange-400 to-orange-500 text-white',
];

const Leaderboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await leaderboardAPI.get();
      if (res.data.success) setData(res.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load leaderboard</h2>
      </div>
    );
  }

  const { leaderboard, stats } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <Trophy size={28} className="text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-gray-600">Top civic reporters — earn badges by reporting and helping resolve issues</p>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-soft p-4 text-center">
          <FileText size={24} className="mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalComplaints}</p>
          <p className="text-xs text-gray-500">Total Complaints</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-4 text-center">
          <Users size={24} className="mx-auto text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-4 text-center">
          <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalResolved}</p>
          <p className="text-xs text-gray-500">Resolved</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {[1, 0, 2].map((idx) => {
            const u = leaderboard[idx];
            if (!u) return null;
            const isFirst = idx === 0;
            return (
              <div key={u._id} className={`text-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <div className={`w-16 h-16 ${isFirst ? 'w-20 h-20' : ''} mx-auto rounded-full ${RANK_STYLES[idx]} flex items-center justify-center text-2xl font-bold mb-2 shadow-lg`}>
                  {isFirst ? '👑' : idx === 1 ? '🥈' : '🥉'}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                <p className="text-xs text-gray-500">{u.score} pts</p>
                <div className={`mt-2 ${isFirst ? 'h-24' : idx === 1 ? 'h-16' : 'h-12'} ${RANK_STYLES[idx]} rounded-t-lg w-24 flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">#{u.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Badge Legend */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Badges you can earn:</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '👑', name: '#1 Reporter', desc: 'Top of the leaderboard' },
            { icon: '🏆', name: 'Civic Champion', desc: '50+ complaints' },
            { icon: '⭐', name: 'Active Reporter', desc: '20+ complaints' },
            { icon: '🌟', name: 'Rising Citizen', desc: '5+ complaints' },
            { icon: '📢', name: 'Community Voice', desc: '100+ votes received' },
            { icon: '✅', name: 'Problem Solver', desc: '10+ resolved' },
            { icon: '🎯', name: 'Diverse Reporter', desc: '5+ categories' },
          ].map(b => (
            <div key={b.name} className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg" title={b.desc}>
              <span>{b.icon}</span>
              <span className="text-xs text-gray-700">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">All Rankings</h3>
        </div>
        {leaderboard.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {leaderboard.map((u) => (
              <div key={u._id} className="flex items-center px-6 py-4 hover:bg-gray-50 transition">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  u.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  u.rank === 2 ? 'bg-gray-200 text-gray-700' :
                  u.rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {u.rank}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.badges.map((b, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${b.color} font-medium`}>
                        {b.icon} {b.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-center flex-shrink-0">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.totalComplaints}</p>
                    <p className="text-[10px] text-gray-500">Reports</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.totalVotes}</p>
                    <p className="text-[10px] text-gray-500">Votes</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.resolvedCount}</p>
                    <p className="text-[10px] text-gray-500">Resolved</p>
                  </div>
                  <div className="w-16">
                    <p className="text-sm font-bold text-primary-600">{u.score}</p>
                    <p className="text-[10px] text-gray-500">Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Star size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No reporters yet. Be the first to file a complaint!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
