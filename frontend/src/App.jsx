// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';

// Импорты страниц
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import PlanListPage from './pages/Plans/PlanListPage';
import CreatePlanPage from './pages/Plans/CreatePlanPage';
import PlanDetailsPage from './pages/Plans/PlanDetailsPage';
import ReportListPage from './pages/Reports/ReportListPage';
import CreateReportPage from './pages/Reports/CreateReportPage'; 
import ReportDetailsPage from './pages/Reports/ReportDetailsPage'; 
import UserManagementPage from './pages/Admin/UserManagementPage';
import EditPlanPage from './pages/Plans/components/EditPlanPage';
import NotFoundPage from './pages/NotFoundPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';

function App() {
  console.log("Rendering App - Applying route protection");
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Основной Layout */}
          <Route path="/" element={<Layout />}>

            {/* Публичные роуты */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Приватные роуты */}
            <Route index element={ <RequireAuth> <HomePage /> </RequireAuth> } />

            {/* Планы */}
            <Route path="/plans" element={ <RequireAuth> <PlanListPage /> </RequireAuth> } />
            <Route path="/plans/new" element={ <RequireAuth> <CreatePlanPage /> </RequireAuth> } />
            <Route path="/plans/:id/edit" element={ <RequireAuth> <EditPlanPage /> </RequireAuth> } />
            <Route path="/plans/:id" element={ <RequireAuth> <PlanDetailsPage /> </RequireAuth> } />

            {/* --- Отчеты (ВАЖЕН ПОРЯДОК!) --- */}
            <Route path="/reports" element={ <RequireAuth> <ReportListPage /> </RequireAuth> } />
            {/* Сначала более конкретный путь "new" */}
            <Route path="/reports/new" element={ <RequireAuth> <CreateReportPage /> </RequireAuth> } />
            {/* Затем путь с параметром ":id" */}
            <Route path="/reports/:id" element={ <RequireAuth> <ReportDetailsPage /> </RequireAuth> } />
             {/* --- Конец секции Отчеты --- */}

            <Route
                path="/admin/users"
                element={
                  <RequireAuth allowedRoles={['ADMIN']}> {/* Защищаем ролью ADMIN */}
                    <UserManagementPage />
                  </RequireAuth>
                }
            />

                        <Route
                path="/analytics"
                element={
                  <RequireAuth allowedRoles={['ADMIN', 'ANALYST']}> 
                    <AnalyticsPage />
                  </RequireAuth>
                }
            />

            {/* Роут не найден */}
            <Route path="*" element={<NotFoundPage />} />

          </Route> {/* Конец Layout Route */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;