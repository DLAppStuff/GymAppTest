import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const WorkoutHeatmap = ({ workoutDates, startDate, endDate, isDarkMode, isCurrentMonth = false }) => {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convert Sunday (0) to 6, and subtract 1 from other days to make Monday (1) -> 0
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const today = new Date();
  const daysInMonth = getDaysInMonth(startDate);
  const firstDayOfMonth = getFirstDayOfMonth(startDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const workoutDatesSet = new Set(workoutDates.map(date => new Date(date).getDate()));

  // Create calendar grid with empty cells for proper alignment
  const calendarGrid = Array(42).fill(null); // 6 rows × 7 days = 42 cells
  days.forEach((day, index) => {
    calendarGrid[firstDayOfMonth + index] = day;
  });

  const isToday = (day) => {
    return isCurrentMonth && 
           today.getDate() === day && 
           today.getMonth() === startDate.getMonth() && 
           today.getFullYear() === startDate.getFullYear();
  };

  return (
    <Card className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''} h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          {startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div 
              key={day} 
              className={`text-center ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
              {day}
            </div>
          ))}
          {calendarGrid.map((day, index) => (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center text-xs rounded-sm
                ${!day ? 'invisible' : ''}
                ${isToday(day) ? 'ring-2 ring-blue-500' : ''}
                ${workoutDatesSet.has(day) 
                  ? isDarkMode 
                    ? 'bg-green-800 text-green-100' 
                    : 'bg-green-100 text-green-800'
                  : isDarkMode
                    ? 'bg-zinc-700 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-600'
                }
              `}
            >
              {day}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutHeatmap; 