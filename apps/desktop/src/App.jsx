import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Books from './pages/Books';
import Stats from './pages/Stats';
import Wrong from './pages/Wrong';
import StudyCalendar from './pages/StudyCalendar';
import './styles/global.css';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('citour_student');
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <HashRouter>
      {/* 本地测试包全局标识 */}
      {import.meta.env.VITE_BUILD_TYPE === 'local' && (
        <div style={{
          position: 'fixed',
          top: '8px',
          right: '8px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          fontSize: '10px',
          fontWeight: '500',
          padding: '6px 10px',
          borderRadius: '8px',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '2px',
          maxWidth: '200px'
        }}>
          <span style={{ fontWeight: '600' }}>🔧 测试包</span>
          <span style={{
            fontSize: '9px',
            opacity: 0.9,
            wordBreak: 'break-all',
            textAlign: 'right'
          }}>
            {import.meta.env.VITE_API_URL || '本地代理'}
          </span>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={
          <PrivateRoute><Home /></PrivateRoute>
        } />
        <Route path="/practice/:taskId" element={
          <PrivateRoute><Practice /></PrivateRoute>
        } />
        <Route path="/books" element={
          <PrivateRoute><Books /></PrivateRoute>
        } />
        <Route path="/calendar" element={
          <PrivateRoute><StudyCalendar /></PrivateRoute>
        } />
        <Route path="/stats" element={
          <PrivateRoute><Stats /></PrivateRoute>
        } />
        <Route path="/wrong" element={
          <PrivateRoute><Wrong /></PrivateRoute>
        } />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
