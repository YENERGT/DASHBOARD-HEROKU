const PeriodSelector = ({ selectedPeriod, onPeriodChange }) => {
  const periods = [
    { id: 'day', label: 'dia' },
    { id: 'month', label: 'mes' },
    { id: 'year', label: 'año' }
  ];

  return (
    <div className="inline-flex bg-[#1A1A1A] p-1 gap-1">
      {periods.map((period) => (
        <button
          key={period.id}
          onClick={() => onPeriodChange(period.id)}
          className={`
            px-4 py-2 text-sm font-medium transition-all duration-200
            ${selectedPeriod === period.id
              ? 'bg-[#10B981] text-[#0A0A0A] font-semibold'
              : 'text-[#6B7280] hover:text-white hover:bg-[#2A2A2A]'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
