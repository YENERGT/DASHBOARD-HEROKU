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
    if (trend === undefined || trend === null) return 'text-[#6B7280]';
    return trend >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]';
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return '';
    return trend >= 0 ? '++' : '--';
  };

  const formatTrend = () => {
    if (trend === undefined || trend === null) return '';
    const sign = trend >= 0 ? '+' : '';
    return `[${sign}${trend.toFixed(1)}%]`;
  };

  return (
    <div className={`bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#10B981] transition-all duration-200 ${className}`}>
      {/* Header con icono y título */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-[#6B7280] text-xs font-medium">{title.toLowerCase().replace(/ /g, '_')}</p>
          {subtitle && (
            <p className="text-[#4B5563] text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <span className={`text-lg font-bold ${getTrendColor()}`}>{getTrendIcon() || icon}</span>
        )}
      </div>

      {/* Valor principal */}
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>

      {/* Comparación y tendencia */}
      <div className="space-y-1">
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-2 text-xs font-semibold ${getTrendColor()}`}>
            <span>{formatTrend()}</span>
          </div>
        )}
        {comparison && (
          <p className="text-[#4B5563] text-xs">
            {comparison}
          </p>
        )}
      </div>
    </div>
  );
};

export default Card;
