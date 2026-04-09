import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import OrgRoute from './components/OrgRoute';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import MapView from './pages/MapView';
import ComplaintDetail from './pages/ComplaintDetail';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import AIChatbot from './components/AIChatbot';
import Leaderboard from './pages/Leaderboard';
import OrgPortal from './pages/OrgPortal';

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/report" element={
              <PrivateRoute>
                <ReportIssue />
              </PrivateRoute>
            } />
            
            <Route path="/map" element={<MapView />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            
            <Route path="/complaint/:id" element={<ComplaintDetail />} />
            
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } />

            <Route path="/org" element={
              <OrgRoute>
                <OrgPortal />
              </OrgRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AIChatbot />
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
