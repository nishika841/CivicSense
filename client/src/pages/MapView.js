import React, { useState, useEffect, useRef } from 'react';
import { complaintsAPI } from '../utils/api';
import { Link } from 'react-router-dom';
import { getCategoryIcon, STATUS_COLORS, STATUS_LABELS } from '../utils/constants';
import { Satellite, Map as MapIcon, Crosshair, Loader2, Search, X, Flame } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createColorIcon = (color) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="3.5" fill="#fff"/>
    </svg>`;
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const STATUS_MARKER_COLORS = {
  Reported: '#eab308',
  Verified: '#3b82f6',
  InProgress: '#a855f7',
  Resolved: '#22c55e'
};

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

const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }
    if (points.length > 0) {
      heatLayerRef.current = L.heatLayer(points, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.2: '#22c55e', 0.4: '#eab308', 0.6: '#f97316', 0.8: '#ef4444', 1.0: '#dc2626' }
      }).addTo(map);
    }
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [points, map]);

  return null;
};

const FlyToLocation = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 17, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapView = () => {
  const [complaints, setComplaints] = useState([]);
  const [mapCenter] = useState([20.5937, 78.9629]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(17);
  const [isSatellite, setIsSatellite] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [userPos, setUserPos] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchComplaints();
    getUserLocation();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserPos([lat, lng]);
          setFlyTarget([lat, lng]);
          setDetectingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setDetectingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setDetectingLocation(false);
    }
  };

  const redetectLocation = () => {
    setDetectingLocation(true);
    getUserLocation();
  };

  const fetchComplaints = async () => {
    try {
      const response = await complaintsAPI.getAll({ limit: 100 });
      setComplaints(response.data.complaints || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=8&addressdetails=1&extratags=1`,
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

  const getSmartZoom = (place) => {
    const type = (place.type || '').toLowerCase();
    const cls = (place.class || '').toLowerCase();
    if (['house', 'building', 'shop', 'amenity', 'restaurant', 'hotel'].some(t => type.includes(t) || cls.includes(t))) return 19;
    if (['road', 'street', 'residential', 'pedestrian', 'path'].some(t => type.includes(t))) return 18;
    if (['neighbourhood', 'suburb', 'quarter', 'village'].some(t => type.includes(t))) return 17;
    if (['town', 'city_district', 'borough'].some(t => type.includes(t))) return 16;
    if (['city'].some(t => type.includes(t))) return 14;
    if (['state', 'county', 'region'].some(t => type.includes(t))) return 10;
    if (['country'].some(t => type.includes(t))) return 6;
    if (place.boundingbox) {
      const [s, n, w, e] = place.boundingbox.map(Number);
      const span = Math.max(n - s, e - w);
      if (span < 0.005) return 18;
      if (span < 0.02) return 17;
      if (span < 0.1) return 15;
      if (span < 0.5) return 13;
      return 11;
    }
    return 17;
  };

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const zoom = getSmartZoom(place);
    setFlyZoom(zoom);
    setFlyTarget([lat, lng]);
    setSearchQuery(place.display_name);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      <MapContainer
        center={mapCenter}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
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

        {flyTarget && <FlyToLocation center={flyTarget} zoom={flyZoom} />}

        {showHeatmap && (
          <HeatmapLayer
            points={complaints
              .filter(c => c.location?.coordinates)
              .map(c => {
                const [lng, lat] = c.location.coordinates;
                const intensity = c.status === 'Resolved' ? 0.3 : c.status === 'Reported' ? 1.0 : 0.6;
                return [lat, lng, intensity];
              })}
          />
        )}

        {userPos && (
          <Marker
            position={userPos}
            icon={L.divIcon({
              html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>`,
              className: 'user-location-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
          />
        )}

        {complaints.map((complaint) => {
          if (!complaint.location?.coordinates) return null;
          const [lng, lat] = complaint.location.coordinates;
          const color = STATUS_MARKER_COLORS[complaint.status] || '#6b7280';

          return (
            <Marker
              key={complaint._id}
              position={[lat, lng]}
              icon={createColorIcon(color)}
            >
              <Popup maxWidth={300} minWidth={250}>
                <div className="p-1">
                  {complaint.images && complaint.images.length > 0 && (
                    <img
                      src={`${process.env.REACT_APP_API_URL.replace('/api', '')}${complaint.images[0]}`}
                      alt={complaint.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[complaint.status]}`}>
                      {STATUS_LABELS[complaint.status]}
                    </span>
                    <span className="text-xl">{getCategoryIcon(complaint.category)}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    {complaint.title}
                  </h3>

                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {complaint.description}
                  </p>

                  <div className="text-xs text-gray-500 mb-2">
                    <p>👍 {complaint.votes} votes</p>
                    {complaint.address && <p>📍 {complaint.address}</p>}
                  </div>

                  <Link
                    to={`/complaint/${complaint._id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Search Bar — top center */}
      <div ref={searchRef} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
        <div className="relative">
          <div className="flex items-center bg-white rounded-xl shadow-lg overflow-hidden">
            <Search size={18} className="ml-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search any city, area, or place..."
              className="flex-1 px-3 py-3 text-sm border-none outline-none focus:ring-0"
            />
            {searching && <Loader2 size={16} className="mr-2 text-gray-400 animate-spin" />}
            {searchQuery && !searching && (
              <button onClick={clearSearch} className="mr-3 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((place, idx) => {
                const parts = place.display_name.split(',');
                const title = parts[0].trim();
                const subtitle = parts.slice(1, 4).join(',').trim();
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

          {showResults && searchResults.length === 0 && searchQuery && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-sm text-gray-500">No places found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls — top right */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        <button
          onClick={() => setIsSatellite(!isSatellite)}
          className="bg-white shadow-lg rounded-lg p-2.5 hover:bg-gray-100 transition"
          title={isSatellite ? 'Street View' : 'Satellite View'}
        >
          {isSatellite ? <MapIcon size={20} className="text-gray-700" /> : <Satellite size={20} className="text-gray-700" />}
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`shadow-lg rounded-lg p-2.5 transition ${showHeatmap ? 'bg-red-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title={showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        >
          <Flame size={20} className={showHeatmap ? 'text-white' : 'text-orange-500'} />
        </button>
        <button
          onClick={redetectLocation}
          disabled={detectingLocation}
          className="bg-white shadow-lg rounded-lg p-2.5 hover:bg-gray-100 transition disabled:opacity-50"
          title="Go to my location"
        >
          {detectingLocation ? (
            <Loader2 size={20} className="text-blue-600 animate-spin" />
          ) : (
            <Crosshair size={20} className="text-blue-600" />
          )}
        </button>
      </div>

      {/* Legend — top left */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">Map Legend</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-xs">Reported</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-xs">Verified</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs">Resolved</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Showing {complaints.length} issues
        </p>
      </div>

      {/* Detecting location indicator */}
      {detectingLocation && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">Detecting your location...</span>
        </div>
      )}
    </div>
  );
};

export default MapView;
