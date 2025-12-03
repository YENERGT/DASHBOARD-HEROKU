import React from 'react';

const PeriodSelector = ({ selectedPeriod, onPeriodChange }) => {
  const periods = [
    { id: 'day', label: 'Día', icon: '📅' },
    { id: 'month', label: 'Mes', icon: '📆' },
    { id: 'year', label: 'Año', icon: '🗓️' }
  ];

  return (
    <div className="inline-flex bg-dark-card border border-dark-border rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.id}
          onClick={() => onPeriodChange(period.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${selectedPeriod === period.id
              ? 'bg-primary-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-dark-hover'
            }
          `}
        >
          <span>{period.icon}</span>
          <span>{period.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
