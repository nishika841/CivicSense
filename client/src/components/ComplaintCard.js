import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Calendar } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, getCategoryLabel, getCategoryIcon } from '../utils/constants';
import { format } from 'date-fns';

const ComplaintCard = ({ complaint }) => {
  const headerImage =
    (complaint.status === 'Resolved' || complaint.status === 'Confirmed') && complaint.resolutionImages && complaint.resolutionImages.length > 0
      ? complaint.resolutionImages[0]
      : complaint.images && complaint.images.length > 0
        ? complaint.images[0]
        : null;

  return (
    <Link
      to={`/complaint/${complaint._id}`}
      className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      {headerImage && (
        <div className="h-48 overflow-hidden bg-gray-100">
          <img
            src={`${process.env.REACT_APP_API_URL.replace('/api', '')}${headerImage}`}
            alt={complaint.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[complaint.status]}`}>
            {STATUS_LABELS[complaint.status]}
          </span>
          <span className="text-2xl">{getCategoryIcon(complaint.category)}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {complaint.title}
        </h3>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {complaint.description}
        </p>

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center">
            <MapPin size={14} className="mr-1" />
            <span className="truncate">{complaint.location?.address || 'Unknown location'}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ThumbsUp size={14} className="mr-1" />
              <span>{complaint.votes} votes</span>
            </div>
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              <span>{format(new Date(complaint.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {complaint.impactScore > 0 && (
            <div className="pt-2 border-t">
              <span className="text-xs font-medium text-primary-600">
                Impact Score: {complaint.impactScore}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ComplaintCard;
