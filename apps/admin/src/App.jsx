import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WordbookList from './pages/WordbookList';
import WordList from './pages/WordList';
import StudentList from './pages/StudentList';
import PracticeRecordList from './pages/PracticeRecordList';
import PracticeDetailList from './pages/PracticeDetailList';
import SystemSetup from './pages/SystemSetup';
import SystemGuard from './components/SystemGuard';
import RootRedirect from './components/RootRedirect';
import SysLogin from './pages/sys/SysLogin';
import SysLayout from './components/SysLayout';
import TenantManagement from './pages/sys/TenantManagement';

function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <Routes>
          {/* System Setup */}
          <Route path="/setup" element={<SystemSetup />} />

          {/* System Admin Routes */}
          <Route path="/sys/login" element={<SysLogin />} />
          <Route path="/sys" element={<SysLayout />}>
            <Route index element={<Navigate to="/sys/tenants" />} />
            <Route path="tenants" element={<TenantManagement />} />
          </Route>

          {/* Tenant Admin Routes */}
          <Route path="/tenant/login" element={<Login />} />
          <Route path="/tenant" element={
            <SystemGuard>
              <Layout />
            </SystemGuard>
          }>
            <Route index element={<Navigate to="/tenant/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="wordbooks" element={<WordbookList />} />
            <Route path="wordbooks/:id/words" element={<WordList />} />
            <Route path="students" element={<StudentList />} />
            <Route path="practice-records" element={<PracticeRecordList />} />
            <Route path="practice-records/:id" element={<PracticeDetailList />} />
          </Route>

          {/* Default redirect - smart redirect based on login status */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}

export default App;
