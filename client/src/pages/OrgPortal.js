import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orgAPI } from '../utils/api';

const statusBadge = (status) => {
  const map = {
    queued: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
    acknowledged: 'bg-indigo-100 text-indigo-700',
    accepted: 'bg-purple-100 text-purple-700',
    in_progress: 'bg-orange-100 text-orange-700',
    resolved: 'bg-green-100 text-green-700'
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

const OrgPortal = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orgAPI.listAssignments({ limit: 50 });
      setAssignments(res.data.assignments || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAction = async (id, action) => {
    setActionLoading(`${id}:${action}`);
    setError('');
    try {
      if (action === 'acknowledge') await orgAPI.acknowledge(id);
      if (action === 'accept') await orgAPI.accept(id);
      if (action === 'in-progress') await orgAPI.inProgress(id);
      if (action === 'resolve') await orgAPI.resolve(id);
      await fetchAssignments();
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organization Portal</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">View assigned complaints and update progress.</p>
        </div>
        <button
          onClick={fetchAssignments}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 min-h-[200px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignments.length === 0 ? (
            <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300">No assignments yet.</p>
            </div>
          ) : (
            assignments.map((a) => {
              const complaint = a.complaint;
              const id = a._id;
              return (
                <div
                  key={id}
                  className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {complaint?.title || 'Complaint'}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Category: {complaint?.category || '-'}
                        {complaint?.city ? ` • City: ${complaint.city}` : ''}
                        {complaint?.pincode ? ` • Pincode: ${complaint.pincode}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </div>

                  {complaint?.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 line-clamp-3">
                      {complaint.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={() => complaint?._id && navigate(`/complaint/${complaint._id}`)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      View
                    </button>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => doAction(id, 'acknowledge')}
                        disabled={actionLoading === `${id}:acknowledge`}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => doAction(id, 'accept')}
                        disabled={actionLoading === `${id}:accept`}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => doAction(id, 'in-progress')}
                        disabled={actionLoading === `${id}:in-progress`}
                        className="px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => doAction(id, 'resolve')}
                        disabled={actionLoading === `${id}:resolve`}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        Resolved
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default OrgPortal;
