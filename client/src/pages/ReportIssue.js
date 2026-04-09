import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI, aiAPI } from '../utils/api';
import { CATEGORIES } from '../utils/constants';
import { MapPin, Upload, CheckCircle, ExternalLink, Shield, Satellite, Map as MapIcon, Crosshair, Loader2, Brain, Sparkles, AlertTriangle, Zap, Link } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CartoDB'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  labels: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
};

const LocationMarker = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lng, lat);
    },
  });

  return position ? <Marker position={position} icon={redIcon} /> : null;
};

const FlyToLocation = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 18, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const ReportIssue = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: ''
  });
  const [location, setLocation] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [flyTarget, setFlyTarget] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [imageAiResult, setImageAiResult] = useState(null);
  const [blockchainTx, setBlockchainTx] = useState(null);
  const aiTimeout = useRef(null);
  const navigate = useNavigate();

  const formatAddress = (data) => {
    if (!data.address) return data.display_name || '';
    const a = data.address;
    const parts = [];
    if (a.road || a.pedestrian || a.street) parts.push(a.road || a.pedestrian || a.street);
    if (a.neighbourhood || a.suburb) parts.push(a.neighbourhood || a.suburb);
    if (a.city || a.town || a.village || a.city_district) parts.push(a.city || a.town || a.village || a.city_district);
    if (a.state_district) parts.push(a.state_district);
    if (a.state) parts.push(a.state);
    if (a.postcode) parts.push(a.postcode);
    if (a.country) parts.push(a.country);
    return parts.filter(Boolean).join(', ');
  };

  const reverseGeocode = useCallback(async (lng, lat) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      if (data.address) {
        setFormData(prev => ({ ...prev, address: formatAddress(data) }));
      } else if (data.display_name) {
        setFormData(prev => ({ ...prev, address: data.display_name }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  }, []);

  const handleMapClick = useCallback((lng, lat) => {
    setLocation([lng, lat]);
    reverseGeocode(lng, lat);
  }, [reverseGeocode]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation([lng, lat]);
          setMarkerPos([lat, lng]);
          setMapCenter([lat, lng]);
          setFlyTarget([lat, lng]);
          reverseGeocode(lng, lat);
          setDetectingLocation(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setDetectingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setDetectingLocation(false);
    }
  }, [reverseGeocode]);

  const redetectLocation = () => {
    setDetectingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation([lng, lat]);
          setMarkerPos([lat, lng]);
          setFlyTarget([lat, lng]);
          reverseGeocode(lng, lat);
          setDetectingLocation(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setDetectingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const triggerAiAnalysis = (title, description) => {
    if (aiTimeout.current) clearTimeout(aiTimeout.current);
    if (!title && !description) {
      setAiSuggestion(null);
      return;
    }
    aiTimeout.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await aiAPI.analyze({ title, description });
        if (res.data.success) {
          setAiSuggestion(res.data.ai);
        }
        // Check duplicates if we have location
        if (location) {
          const dupRes = await aiAPI.duplicates({ title, description, coordinates: location });
          if (dupRes.data.success && dupRes.data.count > 0) {
            setDuplicates(dupRes.data.duplicates);
            setShowDuplicates(true);
          } else {
            setDuplicates([]);
            setShowDuplicates(false);
          }
        }
      } catch (err) {
        console.error('AI analysis error:', err);
      } finally {
        setAiLoading(false);
      }
    }, 600);
  };

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    setFormData(updated);
    if (e.target.name === 'title' || e.target.name === 'description') {
      triggerAiAnalysis(updated.title, updated.description);
    }
  };

  const applySuggestedCategory = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    setImages([...images, ...files]);

    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...previews]);

    // AI Image Analysis
    try {
      const res = await aiAPI.imageAnalyze({
        filename: files[0]?.name,
        title: formData.title,
        description: formData.description,
        category: formData.category
      });
      if (res.data.success) {
        setImageAiResult(res.data.imageAnalysis);
      }
    } catch (err) {
      console.error('Image AI error:', err);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!location) {
      setError('Location is required. Click on the map or enable location services.');
      setLoading(false);
      return;
    }
    if (images.length === 0) {
      setError('Image is required, please upload at least one image.');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('location', JSON.stringify({
        type: 'Point',
        coordinates: location
      }));

      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const response = await complaintsAPI.create(formDataToSend);
      setSuccess(true);

      if (response.data.blockchainTx) {
        setBlockchainTx({ ...response.data.blockchainTx, _action: 'Complaint Registered on Blockchain' });
      } else {
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-soft p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Issue Reported Successfully!</h2>
          {blockchainTx ? (
            <div className="mt-4 space-y-3">
              <div className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <Link size={14} className="mr-1.5" /> Recorded on Blockchain
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Transaction Hash</p>
                <code className="text-xs text-gray-700 break-all font-mono">{blockchainTx.transactionId}</code>
              </div>
              {blockchainTx.hash && (
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Data Hash</p>
                  <code className="text-xs text-gray-700 break-all font-mono">{blockchainTx.hash}</code>
                </div>
              )}
              <a
                href={`https://sepolia.etherscan.io/tx/${blockchainTx.transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <ExternalLink size={14} className="mr-2" /> View on Etherscan
              </a>
              <div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report an Issue</h1>
        <p className="mt-2 text-gray-600">Help improve your community by reporting civic problems</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-soft rounded-lg p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Issue Title *
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Large pothole on Main Street"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          {/* AI Category Suggestion */}
          {aiSuggestion && aiSuggestion.suggestedCategory !== 'other' && aiSuggestion.categoryConfidence > 30 && formData.category !== aiSuggestion.suggestedCategory && (
            <div className="mt-2 flex items-center space-x-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <Brain size={16} className="text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-indigo-800">
                AI suggests: <strong className="capitalize">{aiSuggestion.suggestedCategory.replace(/_/g, ' ')}</strong>
                <span className="text-indigo-500 ml-1">({aiSuggestion.categoryConfidence}% confident)</span>
              </span>
              <button
                type="button"
                onClick={() => applySuggestedCategory(aiSuggestion.suggestedCategory)}
                className="ml-auto text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex-shrink-0"
              >
                Apply
              </button>
            </div>
          )}
          {aiLoading && (
            <div className="mt-2 flex items-center space-x-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              <span>AI analyzing...</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Provide detailed information about the issue..."
          />
        </div>

        {/* AI Severity + Duplicate Panel */}
        {aiSuggestion && (
          <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50 p-4 space-y-3">
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles size={16} className="text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">AI Analysis</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Severity Badge */}
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                aiSuggestion.severity === 'critical' ? 'bg-red-100 text-red-800' :
                aiSuggestion.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                aiSuggestion.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {aiSuggestion.severity === 'critical' ? <AlertTriangle size={14} className="mr-1.5" /> :
                 aiSuggestion.severity === 'high' ? <Zap size={14} className="mr-1.5" /> : null}
                Severity: <span className="ml-1 capitalize">{aiSuggestion.severity}</span>
              </div>

              {/* Category Confidence */}
              {aiSuggestion.suggestedCategory !== 'other' && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                  <Brain size={14} className="mr-1.5" />
                  Detected: <span className="ml-1 capitalize">{aiSuggestion.suggestedCategory.replace(/_/g, ' ')}</span>
                  <span className="ml-1 text-indigo-500">({aiSuggestion.categoryConfidence}%)</span>
                </div>
              )}
            </div>

            {/* Multiple category suggestions */}
            {aiSuggestion.allCategorySuggestions && aiSuggestion.allCategorySuggestions.length > 1 && (
              <div className="text-xs text-gray-500">
                Also matches: {aiSuggestion.allCategorySuggestions.slice(1, 3).map(s =>
                  <span key={s.category} className="capitalize">{s.category.replace(/_/g, ' ')}</span>
                ).reduce((prev, curr) => [prev, ', ', curr])}
              </div>
            )}
          </div>
        )}

        {/* Duplicate Warning */}
        {showDuplicates && duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">Similar complaints found nearby!</span>
            </div>
            <div className="space-y-2">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{dup.complaint.title}</p>
                    <p className="text-xs text-gray-500 truncate">{dup.complaint.description?.substring(0, 80)}</p>
                  </div>
                  <span className="ml-3 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    {dup.similarity}% match
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-2">You can still submit if this is a different issue.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location * <span className="text-xs text-gray-400 font-normal">— click on map to select or auto-detect</span>
          </label>

          <div className="relative rounded-lg overflow-hidden border border-gray-300" style={{ height: '350px' }}>
            <MapContainer
              center={mapCenter}
              zoom={detectingLocation ? 5 : 16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                key={isSatellite ? 'satellite' : 'street'}
                url={isSatellite ? TILE_LAYERS.satellite.url : TILE_LAYERS.street.url}
                attribution={isSatellite ? TILE_LAYERS.satellite.attribution : TILE_LAYERS.street.attribution}
                maxZoom={19}
              />
              {isSatellite && (
                <TileLayer
                  key="labels-overlay"
                  url={TILE_LAYERS.labels.url}
                  attribution={TILE_LAYERS.labels.attribution}
                  maxZoom={19}
                  zIndex={10}
                />
              )}
              <LocationMarker
                position={markerPos}
                setPosition={setMarkerPos}
                onLocationSelect={handleMapClick}
              />
              {flyTarget && <FlyToLocation center={flyTarget} />}
            </MapContainer>

            <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => setIsSatellite(!isSatellite)}
                className="bg-white shadow-lg rounded-lg p-2 hover:bg-gray-100 transition"
                title={isSatellite ? 'Switch to Street View' : 'Switch to Satellite View'}
              >
                {isSatellite ? <MapIcon size={18} className="text-gray-700" /> : <Satellite size={18} className="text-gray-700" />}
              </button>
              <button
                type="button"
                onClick={redetectLocation}
                disabled={detectingLocation}
                className="bg-white shadow-lg rounded-lg p-2 hover:bg-gray-100 transition disabled:opacity-50"
                title="Re-detect my location"
              >
                {detectingLocation ? (
                  <Loader2 size={18} className="text-primary-600 animate-spin" />
                ) : (
                  <Crosshair size={18} className="text-primary-600" />
                )}
              </button>
            </div>

            {detectingLocation && (
              <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur rounded-lg px-3 py-2 flex items-center space-x-2 shadow">
                <Loader2 size={14} className="animate-spin text-primary-600" />
                <span className="text-xs text-gray-700">Detecting your location...</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start space-x-2">
            <MapPin className="text-gray-400 mt-2 flex-shrink-0" size={18} />
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              placeholder="Address will auto-fill when you select location on map"
            />
          </div>
          {location && (
            <div className="mt-2 flex items-center space-x-2">
              <p className="text-sm text-green-600">✓ Location selected</p>
              <p className="text-xs text-gray-400">({location[1].toFixed(6)}, {location[0].toFixed(6)})</p>
            </div>
          )}
          {!location && !detectingLocation && (
            <p className="mt-2 text-sm text-amber-600">⚠ Click on the map to select location or allow location access</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Images * (Max 5)
          </label>
          <div className="mt-2">
            <label className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-primary-500 transition">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <span className="relative font-medium text-primary-600 hover:text-primary-500">
                    Upload files
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
              </div>
              <input
                type="file"
                className="sr-only"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* AI Image Analysis Result */}
          {imageAiResult && imagePreviews.length > 0 && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles size={14} className="text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-800">AI Image Analysis</span>
              </div>
              <p className="text-sm text-indigo-700">{imageAiResult.message}</p>
              {imageAiResult.tips && imageAiResult.tips.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {imageAiResult.tips.map((tip, i) => (
                    <p key={i} className="text-xs text-indigo-500 flex items-center">
                      <Zap size={10} className="mr-1 flex-shrink-0" /> {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Shield size={16} />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Full-screen blockchain loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="relative mx-auto w-20 h-20 mb-5">
              <div className="w-20 h-20 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">⛓️</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Registering on Blockchain</h3>
            <p className="text-sm text-gray-500 mt-2">Uploading images & signing transaction on Sepolia network</p>
            <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds, please don't close this page</p>
            <div className="flex justify-center space-x-1 mt-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssue;
