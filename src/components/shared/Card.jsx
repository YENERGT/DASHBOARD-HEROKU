import React from 'react';

const Card = ({
  title,
  value,
  comparison,
  icon,
  trend,
  subtitle,
  className = ''
}) => {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-400';
    return trend.isPositive ? 'text-green-500' : 'text-red-500';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend.isPositive ? '📈' : '📉';
  };

  return (
    <div className={`bg-dark-card border border-dark-border rounded-lg p-6 hover:border-primary-500 transition-all duration-200 ${className}`}>
      {/* Header con icono y título */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs">{subtitle}</p>
          )}
        </div>
        {icon && (
          <span className="text-2xl">{icon}</span>
        )}
      </div>

      {/* Valor principal */}
      <div className="mb-3">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>

      {/* Comparación y tendencia */}
      {trend && (
        <div className="space-y-1">
          <div className={`flex items-center gap-2 text-sm font-semibold ${getTrendColor()}`}>
            <span>{getTrendIcon()}</span>
            <span>{trend.percentage}%</span>
            <span className="text-xs font-normal">
              {trend.difference > 0 ? '+' : ''}{trend.difference.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}
            </span>
          </div>
          {comparison && (
            <p className="text-gray-500 text-xs">
              {comparison}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;
