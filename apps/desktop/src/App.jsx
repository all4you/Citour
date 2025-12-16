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
