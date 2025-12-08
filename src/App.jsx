import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/shared/Layout';
import Home from './pages/Home';
import FELDashboard from './pages/FELDashboard';
import ExpensesDashboard from './pages/ExpensesDashboard';
import ProductsDashboard from './pages/ProductsDashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard-fel" element={<FELDashboard />} />
          <Route path="/dashboard-gastos" element={<ExpensesDashboard />} />
          <Route path="/dashboard-productos" element={<ProductsDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
