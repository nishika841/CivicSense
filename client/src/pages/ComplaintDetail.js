import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complaintsAPI, commentsAPI, orgAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, ThumbsUp, Calendar, User, CheckCircle, ArrowLeftRight, Share2, MessageCircle, Clock } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, getCategoryLabel } from '../utils/constants';
import { format } from 'date-fns';
import BlockchainTxModal from '../components/BlockchainTxModal';

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

const BeforeAfterSlider = ({ beforeSrc, afterSrc }) => {
  const containerRef = useRef(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = useCallback((e) => {
    if (isDragging) updatePosition(e.clientX);
  }, [isDragging, updatePosition]);
  const handleTouchMove = useCallback((e) => {
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-72 rounded-xl overflow-hidden cursor-col-resize select-none border border-gray-200"
      onMouseDown={handleMouseDown}
      onTouchMove={handleTouchMove}
    >
      {/* After (full background) */}
      <img src={afterSrc} alt="After" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={beforeSrc} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: containerRef.current?.offsetWidth || '100%' }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10" style={{ left: `${sliderPos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <ArrowLeftRight size={18} className="text-gray-700" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full z-20">BEFORE</div>
      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full z-20">AFTER</div>
    </div>
  );
};

const ComplaintDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [officerUploading, setOfficerUploading] = useState(false);
  const [completionConfirmed, setCompletionConfirmed] = useState(false);
  const [officerError, setOfficerError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [blockchainTx, setBlockchainTx] = useState(null);
  const ongoingFileRef = useRef(null);
  const completionFileRef = useRef(null);

  useEffect(() => {
    fetchComplaint();
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    try {
      const res = await commentsAPI.getAll(id);
      if (res.data.success) setComments(res.data.comments);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await commentsAPI.create(id, commentText.trim());
      if (res.data.success) {
        setComments(prev => [...prev, res.data.comment]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  const fetchComplaint = async () => {
    try {
      const response = await complaintsAPI.getById(id);
      setComplaint(response.data.complaint);
    } catch (error) {
      console.error('Error fetching complaint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setVoting(true);
    try {
      const response = await complaintsAPI.vote(id);
      setComplaint({
        ...complaint,
        votes: response.data.votes,
        impactScore: response.data.impactScore
      });
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!isAuthenticated || confirming) return;
    setConfirming(true);
    try {
      const response = await complaintsAPI.confirmResolution(id);
      if (response.data.success) {
        setComplaint(response.data.complaint);
        if (response.data.blockchainTx) {
          setBlockchainTx({ ...response.data.blockchainTx, _action: 'User Confirmed Resolution' });
        }
      }
    } catch (error) {
      console.error('Error confirming resolution:', error);
      alert(error.response?.data?.message || 'Failed to confirm resolution');
    } finally {
      setConfirming(false);
    }
  };

  const isReporter = user && complaint && (user.id === complaint.reporter?.id || user.id === complaint.reporter);
  const isOfficer = user?.role === 'org_user';

  const apiBase = (process.env.REACT_APP_API_URL || '').replace('/api', '');

  const uploadOngoingPhoto = async (file) => {
    if (!file || officerUploading) return;
    setOfficerUploading(true);
    setOfficerError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      await orgAPI.uploadOngoingPhoto(id, formData);
      await fetchComplaint();
    } catch (e) {
      setOfficerError(e.response?.data?.message || 'Failed to upload ongoing photo');
    } finally {
      setOfficerUploading(false);
      if (ongoingFileRef.current) ongoingFileRef.current.value = '';
    }
  };

  const uploadCompletionPhoto = async (file) => {
    if (!file || officerUploading) return;
    if (!completionConfirmed) {
      setOfficerError('Please confirm completion before uploading the final photo');
      return;
    }
    setOfficerUploading(true);
    setOfficerError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('confirm', 'true');
      await orgAPI.uploadCompletionPhoto(id, formData);
      await fetchComplaint();
    } catch (e) {
      setOfficerError(e.response?.data?.message || 'Failed to upload completion photo');
    } finally {
      setOfficerUploading(false);
      if (completionFileRef.current) completionFileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Complaint not found</h2>
      </div>
    );
  }

  const hasVoted = user && complaint.voters?.includes(user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-soft overflow-hidden">
            {complaint.images && complaint.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                {complaint.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`${BASE_URL}${image}`}
                      alt={`Issue ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                      Before #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Confirmed banner */}
            {complaint.status === 'Confirmed' && (
              <div className="bg-green-50 border-t-4 border-green-500 p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-1 flex items-center">
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  Confirmed & Closed
                </h3>
                <p className="text-green-700 text-sm">The reporter has confirmed that this issue has been resolved.</p>
                {complaint.resolutionTransactionId && (
                  <a href={`https://sepolia.etherscan.io/tx/${complaint.resolutionTransactionId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                    View confirmation on blockchain
                  </a>
                )}
              </div>
            )}

            {/* Show resolution images prominently for resolved/confirmed complaints */}
            {(complaint.status === 'Resolved' || complaint.status === 'Confirmed') && (
              <div className="bg-green-50 border-t-4 border-green-400 p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  {complaint.status === 'Confirmed' ? 'Resolution Images' : 'Admin Resolved — Awaiting Your Confirmation'}
                </h3>
                {complaint.resolutionImages && complaint.resolutionImages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {complaint.resolutionImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={`${BASE_URL}${image}`}
                          alt={`Resolution ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg border-2 border-green-300"
                        />
                        <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                          After #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ This complaint is marked as resolved but no resolution images are available.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Confirm Resolution button — only for the reporter when status is Resolved */}
            {complaint.status === 'Resolved' && isReporter && (
              <div className="bg-orange-50 border-t-4 border-orange-400 p-4">
                {confirming ? (
                  <div className="flex flex-col items-center space-y-4 py-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg">⛓️</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-gray-800">Recording Confirmation on Blockchain...</p>
                      <p className="text-sm text-gray-500 mt-1">Signing transaction on Sepolia network</p>
                      <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds, please wait</p>
                    </div>
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">Admin has marked this issue as resolved</h3>
                    <p className="text-orange-700 text-sm mb-4">
                      Please review the resolution images above. If the issue is truly fixed, confirm below. This will be recorded on the blockchain.
                    </p>
                    <button
                      onClick={handleConfirmResolution}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                      Yes, I Confirm This Is Resolved
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Fallback: Show resolution images for non-resolved complaints if they exist */}
            {!['Resolved', 'Confirmed'].includes(complaint.status) && complaint.resolutionImages && complaint.resolutionImages.length > 0 && (
              <div className="bg-blue-50 border-t-2 border-blue-400 p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <CheckCircle className="text-blue-600 mr-2" size={20} />
                  Resolution Images Available
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {complaint.resolutionImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`${BASE_URL}${image}`}
                        alt={`Resolution ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg border-2 border-blue-300"
                      />
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Resolution #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[complaint.status]}`}>
                  {STATUS_LABELS[complaint.status]}
                </span>
                <span className="text-sm text-gray-500">
                  {getCategoryLabel(complaint.category)}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {complaint.title}
              </h1>

              <p className="text-gray-700 text-lg mb-6 whitespace-pre-wrap">
                {complaint.description}
              </p>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-start">
                  <MapPin className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">{complaint.location?.address}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reported On</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(complaint.createdAt), 'MMMM d, yyyy at h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reported By</p>
                    <p className="text-sm text-gray-600">{complaint.reporter?.name}</p>
                  </div>
                </div>
              </div>

              {isOfficer && (
                <div className="border-t mt-6 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Officer Updates</h3>

                  {officerError && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
                      {officerError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      ref={ongoingFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadOngoingPhoto(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => ongoingFileRef.current?.click()}
                      disabled={officerUploading}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition"
                    >
                      {officerUploading ? 'Uploading...' : 'Upload Ongoing Photo'}
                    </button>

                    <input
                      ref={completionFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadCompletionPhoto(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => completionFileRef.current?.click()}
                      disabled={officerUploading || !completionConfirmed}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {officerUploading ? 'Uploading...' : 'Upload Completion Photo'}
                    </button>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={completionConfirmed}
                      onChange={(e) => setCompletionConfirmed(e.target.checked)}
                      className="h-4 w-4"
                    />
                    I confirm this issue is completed.
                  </label>

                  <p className="mt-2 text-xs text-gray-500">
                    Uploading an ongoing photo sets status to {STATUS_LABELS.InProgress}. Uploading a completion photo (with confirmation) sets status to {STATUS_LABELS.Resolved}.
                  </p>
                </div>
              )}

              {complaint.progressImages && complaint.progressImages.length > 0 && (
                <div className="border-t mt-6 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ongoing Updates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {complaint.progressImages.map((image, index) => (
                      <img
                        key={index}
                        src={`${apiBase}${image}`}
                        alt={`Ongoing update ${index + 1}`}
                        className="w-full h-56 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {complaint.status === 'Resolved' && (
                <div className="border-t mt-6 pt-6 bg-green-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="text-green-600 mr-3" size={24} />
                    ✅ Issue Resolved — Before & After
                  </h3>

                  {complaint.resolutionImages && complaint.resolutionImages.length > 0 ? (
                    <>
                      {/* Before/After Comparison Slider */}
                      {complaint.images && complaint.images.length > 0 ? (
                        <>
                          <BeforeAfterSlider
                            beforeSrc={`${BASE_URL}${complaint.images[0]}`}
                            afterSrc={`${BASE_URL}${complaint.resolutionImages[0]}`}
                          />

                          {/* Extra resolution images */}
                          {complaint.resolutionImages.length > 1 && (
                            <div className="grid grid-cols-2 gap-3 mt-4">
                              {complaint.resolutionImages.slice(1).map((image, index) => (
                                <img
                                  key={index}
                                  src={`${BASE_URL}${image}`}
                                  alt={`Resolution ${index + 2}`}
                                  className="w-full h-48 object-cover rounded-lg border-2 border-green-200"
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {complaint.resolutionImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                key={index}
                                src={`${BASE_URL}${image}`}
                                alt={`Resolution ${index + 1}`}
                                className="w-full h-64 object-cover rounded-lg border-2 border-green-200"
                              />
                              <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                                After #{index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm">
                        ⚠️ This complaint is marked as resolved but no resolution images were provided.
                      </p>
                    </div>
                  )}

                  {complaint.resolvedAt && (
                    <div className="flex items-center mt-4 text-sm text-green-700 bg-green-100 px-4 py-3 rounded-lg border border-green-200">
                      <Clock size={16} className="mr-2" />
                      <strong>Resolved on {format(new Date(complaint.resolvedAt), 'MMMM d, yyyy')}</strong>
                      <span className="ml-2">
                        — Completed in <strong>{Math.ceil((new Date(complaint.resolvedAt) - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))} days</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment Thread */}
          <div className="bg-white rounded-lg shadow-soft overflow-hidden mt-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle size={20} className="mr-2 text-primary-600" />
                Discussion ({comments.length})
              </h3>

              {isAuthenticated ? (
                <div className="flex items-start space-x-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || postingComment}
                        className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-40 transition"
                      >
                        {postingComment ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg">Please <a href="/login" className="text-primary-600 font-medium hover:underline">login</a> to comment.</p>
              )}

              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c._id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        c.user?.role === 'admin' ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        <User size={14} className={c.user?.role === 'admin' ? 'text-amber-600' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{c.user?.name || 'User'}</span>
                          {c.user?.role === 'admin' && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">OFFICIAL</span>
                          )}
                          <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first to discuss!</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-soft p-6 sticky top-20">
            <button
              onClick={handleVote}
              disabled={voting || !isAuthenticated}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition ${
                hasVoted
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ThumbsUp size={20} fill={hasVoted ? 'currentColor' : 'none'} />
              <span>{hasVoted ? 'Voted' : 'Vote'}</span>
            </button>

            <div className="mt-6 space-y-4">
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{complaint.votes}</p>
                <p className="text-sm text-gray-600">Total Votes</p>
              </div>

              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{complaint.impactScore}</p>
                <p className="text-sm text-gray-600">Impact Score</p>
              </div>
            </div>

            {complaint.statusHistory && complaint.statusHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Status Timeline</h3>
                <div className="space-y-3">
                  {complaint.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-600"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {STATUS_LABELS[history.status]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(history.timestamp), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share Buttons */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Share2 size={14} className="mr-2" /> Share
              </h3>
              <div className="flex space-x-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🚨 Civic Issue: ${complaint.title}\n📍 ${complaint.location?.address}\n🔗 ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚨 Civic Issue: ${complaint.title} 📍 ${complaint.location?.address}`)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center py-2 px-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter/X
                </a>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                className="w-full mt-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                📋 Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

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

export default ComplaintDetail;
