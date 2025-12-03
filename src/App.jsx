import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/shared/Layout';
import Home from './pages/Home';
import FELDashboard from './pages/FELDashboard';
import ExpensesDashboard from './pages/ExpensesDashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard-fel" element={<FELDashboard />} />
          <Route path="/dashboard-gastos" element={<ExpensesDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
