import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Admin pages
import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import CreateTest from './admin/CreateTest';
import Results from './admin/Results';

// Candidate auth & dashboard
import CandidateLogin from './candidate/CandidateLogin';
import CandidateRegister from './candidate/CandidateRegister';
import CandidateDashboard from './candidate/CandidateDashboard';

// Candidate test flow
import Instructions from './candidate/Instructions';
import TestPage from './candidate/TestPage';
import Done from './candidate/Done';

const ProtectedAdmin = ({ children }) => {
  return localStorage.getItem('adminToken') ? children : <Navigate to="/admin" replace />;
};

const ProtectedCandidate = ({ children }) => {
  return localStorage.getItem('candidateId') ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedAdmin><Dashboard /></ProtectedAdmin>} />
        <Route path="/admin/create" element={<ProtectedAdmin><CreateTest /></ProtectedAdmin>} />
        <Route path="/admin/edit/:testId" element={<ProtectedAdmin><CreateTest /></ProtectedAdmin>} />
        <Route path="/admin/results/:testId" element={<ProtectedAdmin><Results /></ProtectedAdmin>} />

        {/* Candidate auth */}
        <Route path="/login" element={<CandidateLogin />} />
        <Route path="/register" element={<CandidateRegister />} />

        {/* Candidate area */}
        <Route path="/dashboard" element={<ProtectedCandidate><CandidateDashboard /></ProtectedCandidate>} />
        <Route path="/test/:testId/instructions" element={<ProtectedCandidate><Instructions /></ProtectedCandidate>} />
        <Route path="/test/:testId/take" element={<ProtectedCandidate><TestPage /></ProtectedCandidate>} />
        <Route path="/test/:testId/done" element={<ProtectedCandidate><Done /></ProtectedCandidate>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
