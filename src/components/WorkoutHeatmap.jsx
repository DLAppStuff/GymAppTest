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
  const daysInMonth = getDaysInMonth(startDate);

  // Create a Set of unique workout dates for efficient lookup
  const createWorkoutDatesSet = () => {
    // Create a map to count occurrences of each date
    const dateMap = {};
    
    // Count each date occurrence
    workoutDates.forEach(dateStr => {
      if (!dateStr) return; // Skip empty dates
      
      // Normalize the date string format to YYYY-MM-DD
      // Use the date string directly if it's already in YYYY-MM-DD format
      const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      dateMap[normalizedDate] = (dateMap[normalizedDate] || 0) + 1;
    });
    
    // Return a Set of dates that have at least one workout
    return new Set(Object.keys(dateMap));
  };

  const workoutDatesSet = createWorkoutDatesSet();

  const generateDays = () => {
    const days = [];

    // Add empty cells for proper alignment
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="aspect-square rounded-lg"
        />
      );
    }

    // Always generate 31 days
    for (let i = 1; i <= 31; i++) {
      const isValidDate = i <= daysInMonth;
      
      // Create date string in YYYY-MM-DD format directly without using Date object
      // This avoids timezone issues
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(i).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Check if this date has a workout
      const isWorkoutDay = workoutDatesSet.has(dateString);
      
      // Create a Date object for display/comparison purposes only
      const currentDate = new Date(year, startDate.getMonth(), i);
      
      // Only show as workout day if it's a valid date for this month
      const shouldShowAsWorkout = isWorkoutDay && isValidDate;

      days.push(
        <div
          key={i}
          className={`aspect-square flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${
            shouldShowAsWorkout
              ? 'bg-[#2a7d93] hover:bg-[#246d81] shadow-sm'
              : isDarkMode
              ? 'bg-zinc-800 hover:bg-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200'
          } ${
            currentDate.toDateString() === today.toDateString() && isValidDate
              ? 'ring-2 ring-blue-400'
              : ''
          }`}
        >
          {isValidDate && (
            <span className={`text-xs ${
              shouldShowAsWorkout
                ? 'text-white font-medium'
                : isDarkMode
                ? 'text-zinc-400'
                : 'text-zinc-600'
            }`}>
              {i}
            </span>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <Card className={`${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : ''} backdrop-blur-sm`}>
      <CardHeader className="pb-0">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          {startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-7 gap-1 text-xs">
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