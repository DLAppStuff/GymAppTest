import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';

const aggregateData = (weightData, volumeData) => {
  if (!weightData || !volumeData || weightData.length === 0) return [];
  
  // First aggregate max weights per day
  const weightMap = weightData.reduce((acc, curr) => {
    const { date, weight } = curr;
    if (!acc[date] || weight > acc[date].weight) {
      acc[date] = { date, weight: Number(weight) };
    }
    return acc;
  }, {});

  // Then aggregate volumes per day
  const volumeMap = volumeData.reduce((acc, curr) => {
    const { date, volume } = curr;
    if (!acc[date]) {
      acc[date] = { date, volume: 0 };
    }
    acc[date].volume += volume;
    return acc;
  }, {});

  // Combine both datasets
  const allDates = [...new Set([...Object.keys(weightMap), ...Object.keys(volumeMap)])];
  
  return allDates
    .map(date => ({
      date,
      weight: weightMap[date]?.weight || null,
      volume: volumeMap[date]?.volume || null
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const ExerciseCharts = ({ weightData, volumeData, isDarkMode }) => {
  const combinedData = aggregateData(weightData, volumeData);

  return (
    <div className="space-y-6">
      <div>
        <h4 className={`font-medium text-center mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-700'}`}>
          Progress Overview
        </h4>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData} margin={{ right: 20 }}>
              <CartesianGrid horizontal={true} vertical={false} stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
              <XAxis 
                dataKey="date" 
                stroke={isDarkMode ? '#71717a' : '#3f3f46'}
              />
              {/* Left Y-axis for Weight */}
              <YAxis 
                yAxisId="weight"
                stroke={isDarkMode ? '#f97316' : '#ea580c'}
                width={65}
                tickFormatter={(value) => `${value} kg`}
              />
              {/* Right Y-axis for Volume */}
              <YAxis 
                yAxisId="volume"
                orientation="right"
                stroke={isDarkMode ? '#a1a1aa' : '#52525b'}
                width={65}
                tickFormatter={(value) => `${value} kg`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: isDarkMode ? '#ffffff' : '#000000'
                }}
                formatter={(value, name) => {
                  if (name === 'weight') return [`${value} kg`, 'Max Weight'];
                  return [`${value} kg`, 'Volume'];
                }}
              />
              {/* Volume Bars */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill={isDarkMode ? '#71717a' : '#3f3f46'}
                opacity={0.7}
              />
              {/* Weight Line */}
              <Line
                yAxisId="weight"
                type="linear"
                dataKey="weight"
                stroke={isDarkMode ? '#f97316' : '#ea580c'}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: isDarkMode ? '#f97316' : '#ea580c',
                  stroke: isDarkMode ? '#f97316' : '#ea580c'
                }}
                activeDot={{
                  r: 6,
                  fill: isDarkMode ? '#f97316' : '#ea580c',
                  stroke: isDarkMode ? '#f97316' : '#ea580c'
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCharts; 