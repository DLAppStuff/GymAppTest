import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

// The generic <Chart> component needs the controllers registered (not just the
// elements). Production builds tree-shake away anything unregistered, so
// omitting BarController/LineController crashes only in the prod bundle.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// Month-over-month comparison: workouts + runs + other activities as grouped
// bars (left axis, counts) and run distance as a line (right axis, km). `data`
// comes from getMonthlyTrends() in App.js: [{ label, workouts, runs, km, activities }].
export default function MonthlyTrends({ data, isDarkMode }) {
  const textColor = isDarkMode ? '#e4e4e7' : '#27272a';
  const gridColor = isDarkMode ? '#3f3f46' : '#e4e4e7';
  const orange = isDarkMode ? '#f97316' : '#ea580c';
  const blue = isDarkMode ? '#38bdf8' : '#0ea5e9';
  const green = isDarkMode ? '#34d399' : '#16a34a';
  const violet = isDarkMode ? '#a78bfa' : '#7c3aed';

  const hasData = data.some((d) => d.workouts || d.runs || d.km || d.activities);

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          type: 'bar',
          label: 'Workouts',
          data: data.map((d) => d.workouts),
          backgroundColor: orange,
          yAxisID: 'y',
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Runs',
          data: data.map((d) => d.runs),
          backgroundColor: blue,
          yAxisID: 'y',
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Activities',
          data: data.map((d) => d.activities),
          backgroundColor: violet,
          yAxisID: 'y',
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'line',
          label: 'km',
          data: data.map((d) => d.km),
          borderColor: green,
          backgroundColor: green,
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          order: 1, // draw the line on top of the bars
        },
      ],
    }),
    [data, orange, blue, green, violet]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: textColor, boxWidth: 12, padding: 16 },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'Sessions', color: textColor },
        grid: { color: gridColor },
        ticks: { color: textColor, precision: 0 },
      },
      y1: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        title: { display: true, text: 'km', color: textColor },
        grid: { drawOnChartArea: false },
        ticks: { color: textColor },
      },
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
    },
  };

  return (
    <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
      <CardHeader className="py-3">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          Monthly Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64">
            <Chart type="bar" data={chartData} options={chartOptions} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Log workouts, runs and activities to see your month-over-month comparison.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
