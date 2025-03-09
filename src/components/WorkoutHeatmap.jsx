import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const WorkoutHeatmap = ({ workoutDates, startDate, endDate, isDarkMode, isCurrentMonth }) => {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convert Sunday (0) to 6, and subtract 1 from other days to make Monday (1) -> 0
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = getFirstDayOfMonth(startDate);

  const generateDays = () => {
    const days = [];
    const totalDays = getDaysInMonth(startDate);
    const workoutDatesSet = new Set(workoutDates);

    // Add empty cells for proper alignment
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="aspect-square rounded-lg"
        />
      );
    }

    for (let i = 1; i <= totalDays; i++) {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), i);
      const dateString = currentDate.toISOString().split('T')[0];
      const isWorkoutDay = workoutDatesSet.has(dateString);
      // Only show as workout day if it's in the past or today
      const shouldShowAsWorkout = isWorkoutDay && currentDate <= today;

      days.push(
        <div
          key={i}
          className={`aspect-square flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${
            shouldShowAsWorkout
              ? 'bg-[#1e4d5c] hover:bg-[#1a4552] shadow-sm'
              : isDarkMode
              ? 'bg-zinc-800 hover:bg-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200'
          } ${
            currentDate.toDateString() === today.toDateString()
              ? 'ring-2 ring-blue-400'
              : ''
          }`}
        >
          <span className={`text-xs ${
            shouldShowAsWorkout
              ? 'text-white font-medium'
              : isDarkMode
              ? 'text-zinc-400'
              : 'text-zinc-600'
          }`}>
            {i}
          </span>
        </div>
      );
    }
    return days;
  };

  return (
    <Card className={`${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : ''} h-full backdrop-blur-sm`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          {startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
            <div 
              key={day} 
              className={`text-center font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
              {day}
            </div>
          ))}
          {generateDays()}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutHeatmap; 