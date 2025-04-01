import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBgColor, iconColor }) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center">
        <div className={`flex-shrink-0 rounded-md p-3 ${iconBgColor}`}>
          <div className={`h-6 w-6 ${iconColor}`}>
            {icon}
          </div>
        </div>
        <div className="ml-5">
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="font-semibold text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
