import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const WorkoutHeatmap = ({ workoutDates, runDates = [], startDate, endDate, isDarkMode, isCurrentMonth }) => {
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

  // Create a Set of unique dates (normalized to YYYY-MM-DD) for efficient lookup.
  const createDatesSet = (dates) => {
    const set = new Set();
    (dates || []).forEach(dateStr => {
      if (!dateStr) return; // Skip empty dates
      const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      set.add(normalizedDate);
    });
    return set;
  };

  const workoutDatesSet = createDatesSet(workoutDates);
  const runDatesSet = createDatesSet(runDates);

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
      
      // Classify the day: gym only, run only, or both.
      const isGymDay = isValidDate && workoutDatesSet.has(dateString);
      const isRunDay = isValidDate && runDatesSet.has(dateString);
      const isBoth = isGymDay && isRunDay;
      const isActive = isGymDay || isRunDay;

      // Create a Date object for display/comparison purposes only
      const currentDate = new Date(year, startDate.getMonth(), i);

      // Background: gym = brand orange, run = run color, both = diagonal split.
      let bgClass = isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200';
      let bgStyle;
      if (isBoth) {
        bgClass = 'shadow-sm';
        bgStyle = {
          background:
            'linear-gradient(135deg, hsl(var(--brand)) 0 50%, hsl(var(--run)) 50% 100%)',
        };
      } else if (isGymDay) {
        bgClass = 'bg-brand hover:bg-brand/90 shadow-sm shadow-brand/30';
      } else if (isRunDay) {
        bgClass = 'bg-run hover:bg-run/90 shadow-sm shadow-run/30';
      }

      days.push(
        <div
          key={i}
          style={bgStyle}
          className={`aspect-square flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${bgClass} ${
            currentDate.toDateString() === today.toDateString() && isValidDate
              ? 'ring-2 ring-brand/60'
              : ''
          }`}
        >
          {isValidDate && (
            <span className={`text-xs ${
              isActive
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
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div
              key={i}
              className={`text-center font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
            >
              {day}
            </div>
          ))}
          {generateDays()}
        </div>
        <div className={`mt-3 flex items-center gap-3 text-[10px] ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Gym
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-run" /> Run
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand)) 0 50%, hsl(var(--run)) 50% 100%)' }}
            />{' '}
            Both
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutHeatmap; 