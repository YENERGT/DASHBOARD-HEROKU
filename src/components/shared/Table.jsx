import React from 'react';

const Table = ({ columns, data, className = '' }) => {
  return (
    <div className={`bg-dark-card border border-dark-border rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-bg border-b border-dark-border">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-dark-hover transition-colors duration-150"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 text-sm text-gray-300"
                    >
                      {column.render
                        ? column.render(row[column.accessor], row)
                        : row[column.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No hay datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
