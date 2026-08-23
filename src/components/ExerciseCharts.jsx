import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ExerciseCharts = ({
  weightData,
  volumeData,
  isDarkMode,
  hideVolume = false,
  showYear = false,
  primaryKey = 'weight',
  primaryLabel = 'Weight',
  primaryAxisLabel = 'Weight (kg)',
  secondaryKey = 'volume',
  secondaryLabel = 'Volume',
  secondaryAxisLabel = 'Volume (kg)',
}) => {
  const getMaxValue = (data, key = 'weight') => {
    if (!data || data.length === 0) return 0;
    const max = Math.max(...data.map(d => d[key]));
    return Math.ceil(max * 1.1); // Add 10% padding
  };

  const chartData = useMemo(() => {
    // Body-weight history spans years, so append a minimalist 2-digit year (e.g.
    // "Jun 13 '26"). The escaped '' renders a literal apostrophe before yy.
    const formatDate = (dateStr) => format(new Date(dateStr), showYear ? "MMM d ''yy" : 'MMM d');

    // Get unique dates and sort them
    const dates = [...new Set([
      ...weightData.map(d => d.date),
      ...(!hideVolume ? volumeData.map(d => d.date) : [])
    ])].sort();

    // Create datasets
    return {
      labels: dates.map(formatDate),
      datasets: [
        {
          label: primaryLabel,
          data: dates.map(date => {
            const point = weightData.find(d => d.date === date);
            return point ? point[primaryKey] : null;
          }),
          borderColor: isDarkMode ? '#f97316' : '#ea580c',
          backgroundColor: isDarkMode ? '#f97316' : '#ea580c',
          yAxisID: 'y',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        ...(!hideVolume ? [{
          label: secondaryLabel,
          data: dates.map(date => {
            const point = volumeData.find(d => d.date === date);
            return point ? point[secondaryKey] : null;
          }),
          borderColor: isDarkMode ? '#a1a1aa' : '#52525b',
          backgroundColor: isDarkMode ? '#a1a1aa' : '#52525b',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        }] : []),
      ],
    };
  }, [weightData, volumeData, isDarkMode, hideVolume, showYear, primaryKey, primaryLabel, secondaryKey, secondaryLabel]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: primaryAxisLabel,
          color: isDarkMode ? '#e4e4e7' : '#27272a',
        },
        max: getMaxValue(weightData, primaryKey),
        grid: {
          color: isDarkMode ? '#3f3f46' : '#e4e4e7',
        },
        ticks: {
          color: isDarkMode ? '#e4e4e7' : '#27272a',
        },
      },
      ...(hideVolume ? {} : {
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: secondaryAxisLabel,
            color: isDarkMode ? '#d4d4d8' : '#52525b',
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: isDarkMode ? '#d4d4d8' : '#52525b',
          },
        },
      }),
      x: {
        grid: {
          color: isDarkMode ? '#3f3f46' : '#e4e4e7',
        },
        ticks: {
          color: isDarkMode ? '#e4e4e7' : '#27272a',
        },
      },
    },
  };

  return <Line options={chartOptions} data={chartData} />;
};

export default ExerciseCharts; 