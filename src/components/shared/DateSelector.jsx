const DateSelector = ({ selectedDate, onDateChange, periodType }) => {
  // Formatear la fecha según el tipo de período
  const formatDateForInput = () => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch(periodType) {
      case 'day':
        return `${year}-${month}-${day}`; // YYYY-MM-DD
      case 'month':
        return `${year}-${month}`; // YYYY-MM
      case 'year':
        return `${year}`; // YYYY
      default:
        return `${year}-${month}-${day}`;
    }
  };

  // Manejar cambio de fecha
  const handleChange = (e) => {
    const value = e.target.value;
    let newDate;

    switch(periodType) {
      case 'day':
        // value = "2024-12-04"
        newDate = new Date(value + 'T12:00:00');
        break;
      case 'month':
        // value = "2024-12"
        const [yearM, monthM] = value.split('-');
        newDate = new Date(parseInt(yearM), parseInt(monthM) - 1, 15);
        break;
      case 'year':
        // value = "2024"
        newDate = new Date(parseInt(value), 5, 15); // Junio 15
        break;
      default:
        newDate = new Date(value);
    }

    onDateChange(newDate);
  };

  // Volver a hoy
  const goToToday = () => {
    onDateChange(new Date());
  };

  // Determinar el tipo de input según el período
  const getInputType = () => {
    switch(periodType) {
      case 'day':
        return 'date';
      case 'month':
        return 'month';
      case 'year':
        return 'number';
      default:
        return 'date';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {periodType === 'year' ? (
        // Para año, usar input number con rango
        <input
          type="number"
          value={formatDateForInput()}
          onChange={handleChange}
          min="2020"
          max="2030"
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      ) : (
        // Para día y mes, usar input date/month
        <input
          type={getInputType()}
          value={formatDateForInput()}
          onChange={handleChange}
          min={periodType === 'month' ? '2020-01' : '2020-01-01'}
          max={periodType === 'month' ? '2030-12' : '2030-12-31'}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      )}

      <button
        onClick={goToToday}
        className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors font-medium"
        title="Volver a hoy"
      >
        📍 Hoy
      </button>
    </div>
  );
};

export default DateSelector;
