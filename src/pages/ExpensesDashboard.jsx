import React from 'react';

const ExpensesDashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Gastos</h1>
        <p className="text-gray-400">
          Análisis de gastos y profit (En desarrollo)
        </p>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">💰</div>
        <h3 className="text-xl font-bold text-white mb-2">Próximamente</h3>
        <p className="text-gray-400">
          Esta sección estará disponible pronto con análisis de gastos, profit y rentabilidad.
        </p>
      </div>
    </div>
  );
};

export default ExpensesDashboard;
