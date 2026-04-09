import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Home, Map, FileText, User, Shield, LogOut, BarChart3, Sun, Moon, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isOrgUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/assets/logo.png" alt="CivicSense" className="w-12 h-12 object-contain app-logo" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">CivicSense</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/map" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
              <Map size={18} />
              <span>Map</span>
            </Link>
            <Link to="/analytics" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <BarChart3 size={18} />
              <span>Analytics</span>
            </Link>
            <Link to="/leaderboard" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <Trophy size={18} />
              <span>Leaderboard</span>
            </Link>

            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                  <Home size={18} />
                  <span>Dashboard</span>
                </Link>

                <Link to="/report" className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">
                  <FileText size={18} />
                  <span>Report Issue</span>
                </Link>

                {isAdmin && (
                  <Link to="/admin" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                    <Shield size={18} />
                    <span>Admin</span>
                  </Link>
                )}

                {isOrgUser && (
                  <Link to="/org" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                    <Shield size={18} />
                    <span>Org Portal</span>
                  </Link>
                )}

                <Link to="/profile" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                  <User size={18} />
                  <span>{user?.name}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-gray-900"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/map"
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Map View
            </Link>
            <Link
              to="/analytics"
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Analytics
            </Link>
            <Link
              to="/leaderboard"
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Leaderboard
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/report"
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Report Issue
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                {isOrgUser && (
                  <Link
                    to="/org"
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Org Portal
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
