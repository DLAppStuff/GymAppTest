import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Plus, Download, Upload, ChevronDown, ChevronUp, X, Moon, Sun, Timer, LogOut, Settings, Activity } from 'lucide-react';
import { Tabs, TabsContent } from "./components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
import { Button } from "./components/ui/button";
import { Combobox } from "./components/ui/combobox";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import ExerciseCharts from './components/ExerciseCharts';
import WorkoutHeatmap from './components/WorkoutHeatmap';
import StatsHero from './components/StatsHero';
import BottomNav from './components/BottomNav';
import CategoryBalance from './components/CategoryBalance';
import RunningStats from './components/RunningStats';
import MonthlyTrends from './components/MonthlyTrends';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import "./styles/globals.css";
import { format } from 'date-fns';
import Auth from './components/Auth';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { loadData, saveData } from './lib/storage';

// Long press hook from the old version
const useLongPress = (callback = () => {}, ms = 800) => {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    let timerId;
    if (startLongPress) {
      timerId = setTimeout(callback, ms);
    } else {
      clearTimeout(timerId);
    }
    return () => clearTimeout(timerId);
  }, [startLongPress, callback, ms]);

  const start = () => setStartLongPress(true);
  const stop = () => setStartLongPress(false);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop
  };
};

const SetItem = ({ exerciseName, set, index, deleteSetCallback, isDarkMode }) => {
  const longPressEvent = useLongPress(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    if (set.date === todayDate) {
      if (window.confirm(`Delete set: ${set.weight}kg x ${set.reps}?`)) {
        deleteSetCallback(exerciseName, index);
      }
    } else {
      alert("You can only delete sets logged for today.");
    }
  }, 800);

  return (
    <div {...longPressEvent} className={`p-2 rounded border text-center ${
      isDarkMode 
        ? 'bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600' 
        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`}>
      {set.weight}kg x {set.reps}
    </div>
  );
};

const GymTrackerV3 = ({ userId, onSignOut }) => {
  const [exercises, setExercises] = useState({});
  const [prs, setPRs] = useState({});
  const [currentTab, setCurrentTab] = useState('Overview');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', category: 'Push' });
  const [showMonthlyPRList, setShowMonthlyPRList] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState({
    Push: '',
    Pull: '',
    Legs: ''
  });
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [exerciseTimers, setExerciseTimers] = useState({});
  const [exerciseTimerIntervals, setExerciseTimerIntervals] = useState({});

  // Add state for input values
  const [inputValues, setInputValues] = useState({});

  // Body weight entries are hydrated from storage (local or cloud) on load.
  const [bodyWeights, setBodyWeights] = useState([]);
  // Running efforts: { date, distanceKm, durationSec }. Pace is always derived.
  const [runs, setRuns] = useState([]);
  const [runInput, setRunInput] = useState({
    distanceKm: '',
    minutes: '',
    seconds: '',
    date: new Date().toISOString().split('T')[0],
  });
  // Guards the save effect so we don't overwrite stored data with the empty
  // initial state before loadData() has populated it.
  const hydratedRef = useRef(false);

  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

  // Add stopwatch effect
  useEffect(() => {
    let intervalId;
    if (isStopwatchRunning) {
      intervalId = setInterval(() => {
        setStopwatchTime(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isStopwatchRunning]);

  // Format time for stopwatch
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format a duration (seconds) as mm:ss for run display.
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '–';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Derive pace (min/km) from distance + duration and format as "m:ss /km".
  const formatPace = (distanceKm, durationSec) => {
    if (!distanceKm || distanceKm <= 0 || !durationSec) return '–';
    const paceSec = durationSec / distanceKm;
    const mins = Math.floor(paceSec / 60);
    const secs = Math.round(paceSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  // Reset stopwatch when drawer opens
  const handleStopwatchOpen = () => {
    setStopwatchTime(0);
    setIsStopwatchRunning(true);
  };

  // Add exercise timer effect
  useEffect(() => {
    return () => {
      // Cleanup intervals on unmount
      Object.values(exerciseTimerIntervals).forEach(interval => clearInterval(interval));
    };
  }, [exerciseTimerIntervals]);

  // Handle exercise timer toggle
  const toggleExerciseTimer = (exerciseName) => {
    if (!exerciseTimers[exerciseName] || exerciseTimers[exerciseName] === false) {
      // Start timer
      setExerciseTimers(prev => ({ ...prev, [exerciseName]: 0 }));
      const intervalId = setInterval(() => {
        setExerciseTimers(prev => ({
          ...prev,
          [exerciseName]: (prev[exerciseName] || 0) + 1
        }));
      }, 1000);
      setExerciseTimerIntervals(prev => ({ ...prev, [exerciseName]: intervalId }));
    } else {
      // Stop and reset timer
      clearInterval(exerciseTimerIntervals[exerciseName]);
      setExerciseTimerIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[exerciseName];
        return newIntervals;
      });
      setExerciseTimers(prev => ({ ...prev, [exerciseName]: false }));
    }
  };

  // Load saved data (cloud when signed in, otherwise local cache) on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const data = await loadData(userId);
      if (!active) return;
      setExercises(data.exercises);
      setPRs(data.prs);
      setBodyWeights(data.bodyWeights);
      setRuns(data.runs || []);
      hydratedRef.current = true;
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // Add dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist all data (debounced) whenever it changes — to the cloud when
  // signed in, and always to the local cache for offline use. Skipped until
  // the initial load has hydrated state so we never clobber stored data.
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveData(userId, { exercises, prs, bodyWeights, runs });
  }, [exercises, prs, bodyWeights, runs, userId]);

  // Date utility functions
  const getMondayOfCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getSundayOfCurrentWeek = () => {
    const monday = getMondayOfCurrentWeek();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };

  const getStartOfCurrentMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  };

  const getEndOfCurrentMonth = () => {
    const start = getStartOfCurrentMonth();
    return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  };

  const getStartOfPreviousMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  };

  const getEndOfPreviousMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  };

  // Dashboard metrics calculation
  const getDashboardMetrics = () => {
    let totalExercises = 0;
    let totalSets = 0;

    const weekStart = getMondayOfCurrentWeek();
    const weekEnd = getSundayOfCurrentWeek();
    const monthStart = getStartOfCurrentMonth();
    const monthEnd = getEndOfCurrentMonth();

    const workoutDatesThisWeek = new Set();
    const workoutDatesThisMonth = new Set();
    // Sets logged per category this month, so the user can spot a neglected
    // category (e.g. skipping Legs).
    const setsByCategoryThisMonth = { Push: 0, Pull: 0, Legs: 0 };

    Object.keys(exercises).forEach((exerciseName) => {
      totalExercises += 1;
      const { sets, category } = exercises[exerciseName];
      totalSets += sets.length;
      sets.forEach(({ date }) => {
        const setDate = new Date(date);
        if (setDate >= weekStart && setDate <= weekEnd) {
          workoutDatesThisWeek.add(date);
        }
        if (setDate >= monthStart && setDate <= monthEnd) {
          workoutDatesThisMonth.add(date);
          if (setsByCategoryThisMonth[category] !== undefined) {
            setsByCategoryThisMonth[category] += 1;
          }
        }
      });
    });

    const newPRsThisMonth = Object.values(prs).filter((record) => {
      const prDate = new Date(record.date);
      return prDate >= monthStart && prDate <= monthEnd;
    }).length;

    const newPRsPastMonth = Object.values(prs).filter((record) => {
      const prDate = new Date(record.date);
      return prDate >= getStartOfPreviousMonth() && prDate <= getEndOfPreviousMonth();
    }).length;

    // Running stats for the current month.
    const runsThisMonthList = runs.filter((run) => {
      const runDate = new Date(run.date);
      return runDate >= monthStart && runDate <= monthEnd;
    });
    let kmThisMonth = 0;
    let durationThisMonth = 0;
    let longestRunKm = 0;
    let bestPaceSecPerKm = null;
    runsThisMonthList.forEach((run) => {
      const distanceKm = Number(run.distanceKm) || 0;
      const durationSec = Number(run.durationSec) || 0;
      kmThisMonth += distanceKm;
      durationThisMonth += durationSec;
      if (distanceKm > longestRunKm) longestRunKm = distanceKm;
      if (distanceKm > 0 && durationSec > 0) {
        const pace = durationSec / distanceKm;
        if (bestPaceSecPerKm === null || pace < bestPaceSecPerKm) bestPaceSecPerKm = pace;
      }
    });
    const avgPaceSecPerKm = kmThisMonth > 0 ? durationThisMonth / kmThisMonth : null;

    return {
      workoutsThisWeek: workoutDatesThisWeek.size,
      workoutsThisMonth: workoutDatesThisMonth.size,
      totalExercises,
      totalSets,
      newPRsThisMonth,
      newPRsPastMonth,
      setsByCategoryThisMonth,
      runsThisMonth: runsThisMonthList.length,
      kmThisMonth,
      avgPaceSecPerKm,
      longestRunKm,
      bestPaceSecPerKm
    };
  };

  // Month-over-month trends for the Overview chart. Buckets the last `monthsBack`
  // months (current month last), seeding empty months so the axis is continuous.
  // Workouts are counted as unique training *days* per month — consistent with
  // how workoutsThisMonth is computed elsewhere.
  const getMonthlyTrends = (monthsBack = 6) => {
    const now = new Date();
    const buckets = [];
    const index = {};
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // Disambiguate across a year boundary by tagging January with its year.
      const label =
        d.getMonth() === 0
          ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
          : d.toLocaleString('default', { month: 'short' });
      const bucket = { key, label, workoutDates: new Set(), runs: 0, km: 0 };
      index[key] = bucket;
      buckets.push(bucket);
    }

    Object.values(exercises).forEach((exercise) => {
      (exercise.sets || []).forEach(({ date }) => {
        const key = date.slice(0, 7); // YYYY-MM
        if (index[key]) index[key].workoutDates.add(date);
      });
    });

    runs.forEach((run) => {
      const key = run.date.slice(0, 7);
      if (index[key]) {
        index[key].runs += 1;
        index[key].km += Number(run.distanceKm) || 0;
      }
    });

    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      workouts: b.workoutDates.size,
      runs: b.runs,
      km: Number(b.km.toFixed(1)),
    }));
  };

  const handleDeleteExercise = (exerciseName) => {
    if (window.confirm(`Are you sure you want to delete exercise "${exerciseName}"?`)) {
      setExercises((prev) => {
        const newExercises = { ...prev };
        delete newExercises[exerciseName];
        return newExercises;
      });
      setPRs((prev) => {
        const newPRs = { ...prev };
        delete newPRs[exerciseName];
        return newPRs;
      });
      
      // Clear selection if the deleted exercise was selected
      Object.entries(selectedExercises).forEach(([category, selected]) => {
        if (selected === exerciseName) {
          setSelectedExercises(prev => ({
            ...prev,
            [category]: ''
          }));
        }
      });
    }
  };

  const handleAddExercise = () => {
    if (newExercise.name) {
      setExercises((prev) => ({
        ...prev,
        [newExercise.name]: {
          category: newExercise.category,
          sets: [],
          dailyVolume: []
        }
      }));
      setNewExercise({ name: '', category: 'Push' });
      setShowAddExerciseModal(false);
    }
  };

  const handleAddSet = (exerciseName, weight, reps, date = new Date().toISOString().split('T')[0]) => {
    // Ensure date is in YYYY-MM-DD format
    const formattedDate = date.includes('T') ? date.split('T')[0] : date;
    
    setExercises((prev) => {
      const exercise = prev[exerciseName];
      const newSet = { weight: Number(weight), reps: Number(reps), date: formattedDate };
      const newSets = [...(exercise.sets || []), newSet];
      
      // Calculate daily volume
      const dailyVolume = newSets
        .filter((s) => s.date === formattedDate)
        .reduce((total, s) => total + s.weight * s.reps, 0);

      // Update PR if necessary
      if (!prs[exerciseName] || weight > prs[exerciseName].weight) {
        setPRs((prevPRs) => ({
          ...prevPRs,
          [exerciseName]: { 
            weight: Number(Number(weight).toFixed(2)), 
            date: formattedDate,
            previousWeight: prs[exerciseName]?.weight ? Number(Number(prs[exerciseName].weight).toFixed(2)) : 0
          }
        }));
      }

      // Update or insert daily volume
      const existingVolumeIndex = exercise.dailyVolume?.findIndex(
        (v) => v.date === formattedDate
      );

      let updatedDailyVolume = exercise.dailyVolume || [];
      if (existingVolumeIndex !== -1) {
        updatedDailyVolume[existingVolumeIndex].volume = dailyVolume;
      } else {
        updatedDailyVolume.push({ date: formattedDate, volume: dailyVolume });
      }

      return {
        ...prev,
        [exerciseName]: {
          ...exercise,
          sets: newSets,
          dailyVolume: updatedDailyVolume
        }
      };
    });
  };

  const deleteSet = (exerciseName, setIndex) => {
    setExercises((prev) => {
      const updatedExercise = { ...prev[exerciseName] };
      updatedExercise.sets = updatedExercise.sets.filter((_, idx) => idx !== setIndex);
      
      // Recalculate daily volume
      const volumes = {};
      updatedExercise.sets.forEach(s => {
        if (!volumes[s.date]) volumes[s.date] = 0;
        volumes[s.date] += s.weight * s.reps;
      });
      updatedExercise.dailyVolume = Object.entries(volumes).map(([date, volume]) => ({ date, volume }));
      
      return {
        ...prev,
        [exerciseName]: updatedExercise
      };
    });
  };

  // Add a run. distanceKm is a number (km); durationSec the total time in seconds.
  // Keeps the list sorted by date descending (most recent first).
  const handleAddRun = (date, distanceKm, durationSec) => {
    const formattedDate = date.includes('T') ? date.split('T')[0] : date;
    const entry = {
      date: formattedDate,
      distanceKm: Number(Number(distanceKm).toFixed(2)),
      durationSec: Math.round(Number(durationSec)),
    };
    setRuns((prev) =>
      [...prev, entry].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    );
  };

  const handleDeleteRun = (index) => {
    const run = runs[index];
    if (
      window.confirm(
        `Delete run: ${run.distanceKm}km in ${formatDuration(run.durationSec)} on ${run.date}?`
      )
    ) {
      setRuns((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ exercises, prs, bodyWeights, runs }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gym-progress-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.exercises && data.prs) {
            setExercises(data.exercises);
            setPRs(data.prs);
            if (Array.isArray(data.bodyWeights)) {
              setBodyWeights(data.bodyWeights);
            }
            if (Array.isArray(data.runs)) {
              setRuns(data.runs);
            }
            alert('Data imported successfully!');
          } else {
            alert('Invalid data format. Make sure it has { exercises, prs }.');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Invalid JSON data. Please try again.');
        }
      };
      reader.readAsText(file);
    }
  };

  const metrics = getDashboardMetrics();
  const monthlyTrends = getMonthlyTrends();
  const monthStart = getStartOfCurrentMonth();
  const monthEnd = getEndOfCurrentMonth();
  const monthlyPRs = Object.entries(prs)
    .filter(([_, record]) => {
      const prDate = new Date(record.date);
      return prDate >= monthStart && prDate <= monthEnd;
    })
    .map(([exerciseName, record]) => ({
      exerciseName,
      weight: record.weight,
      surplus: record.previousWeight ? Number((record.weight - record.previousWeight).toFixed(2)) : 0
    }));

  // Prepare exercise options for each category
  const getExerciseOptions = (category) => {
    return Object.entries(exercises)
      .filter(([_, data]) => data.category === category)
      .map(([name, _]) => ({
        value: name,
        label: name
      }));
  };

  // Function to update input values
  const handleInputChange = (exerciseName, field, value) => {
    setInputValues(prev => ({
      ...prev,
      [exerciseName]: {
        ...prev[exerciseName],
        [field]: value
      }
    }));
  };

  // Render the selected exercise card
  const renderExerciseCard = (exerciseName) => {
    if (!exerciseName || !exercises[exerciseName]) return null;
    
    const data = exercises[exerciseName];
    const todayDate = new Date().toISOString().split('T')[0];
    const lastSet = [...data.sets].reverse().find(set => set.date === todayDate) || data.sets[data.sets.length - 1];
    
    // Get only today's sets
    const todaysSets = data.sets.filter(set => set.date === todayDate);

    // Aggregate weight and volume data by date
    const aggregatedData = data.sets.reduce((acc, set) => {
      const date = set.date;
      if (!acc[date]) {
        acc[date] = {
          maxWeight: set.weight,
          totalVolume: set.weight * set.reps
        };
      } else {
        acc[date].maxWeight = Math.max(acc[date].maxWeight, set.weight);
        acc[date].totalVolume += set.weight * set.reps;
      }
      return acc;
    }, {});

    // Convert aggregated data into arrays for the chart
    const weightData = Object.entries(aggregatedData).map(([date, data]) => ({
      date,
      weight: data.maxWeight
    })).sort((a, b) => a.date.localeCompare(b.date));

    const volumeData = Object.entries(aggregatedData).map(([date, data]) => ({
      date,
      volume: data.totalVolume
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Initialize input values if not set
    if (!inputValues[exerciseName]) {
      setInputValues(prev => ({
        ...prev,
        [exerciseName]: {
          weight: lastSet?.weight || '',
          reps: lastSet?.reps || '',
          date: todayDate
        }
      }));
    }

    return (
      <Card className={`mb-4 border-zinc-200 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className={isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}>{exerciseName}</CardTitle>
              {prs[exerciseName] && (
                <CardDescription>
                  <span className="text-amber-500 flex items-center gap-1">
                    <Trophy size={16} /> PR: {Number(prs[exerciseName].weight)} kg
                  </span>
                </CardDescription>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteExercise(exerciseName)}
              className={`${isDarkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}
            >
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger className={isDarkMode ? 'text-zinc-100' : 'text-zinc-700'}>
                  Add New Set
                </AccordionTrigger>
                <AccordionContent>
                  {/* Add Stopwatch */}
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleExerciseTimer(exerciseName)}
                      className={`${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                    >
                      <Timer size={16} />
                    </Button>
                    <span className={`text-sm font-medium ${
                      typeof exerciseTimers[exerciseName] === 'number' && exerciseTimers[exerciseName] >= 45
                        ? 'text-green-500'
                        : isDarkMode
                        ? 'text-zinc-100'
                        : 'text-zinc-900'
                    }`}>
                      {typeof exerciseTimers[exerciseName] === 'number'
                        ? formatTime(exerciseTimers[exerciseName])
                        : '0:00'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={inputValues[exerciseName]?.weight || ''}
                        onChange={(e) => handleInputChange(exerciseName, 'weight', e.target.value)}
                        className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reps">Reps</Label>
                      <Input
                        id="reps"
                        type="number"
                        value={inputValues[exerciseName]?.reps || ''}
                        onChange={(e) => handleInputChange(exerciseName, 'reps', e.target.value)}
                        className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={inputValues[exerciseName]?.date || todayDate}
                        onChange={(e) => handleInputChange(exerciseName, 'date', e.target.value)}
                        className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                  </div>
                  <Button
                    className={`w-full mt-4 ${isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white`}
                    onClick={() => {
                      const values = inputValues[exerciseName];
                      if (values?.weight && values?.reps) {
                        handleAddSet(exerciseName, values.weight, values.reps, values.date || todayDate);
                        handleInputChange(exerciseName, 'reps', '');
                      }
                    }}
                  >
                    Add Set
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Exercise history - only show today's sets */}
            <div>
              <div className="grid grid-cols-3 gap-2">
                {todaysSets.map((set, index) => (
                  <SetItem
                    key={index}
                    exerciseName={exerciseName}
                    set={set}
                    index={data.sets.indexOf(set)}
                    deleteSetCallback={deleteSet}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </div>

            {/* Charts with updated styling */}
            <div className="w-full h-64">
              <ExerciseCharts
                weightData={weightData}
                volumeData={volumeData}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Add body weight tracking functions
  const handleAddWeight = () => {
    if (newWeight && weightDate) {
      setBodyWeights(prev => {
        // Remove any existing weight for the same date
        const filtered = prev.filter(w => w.date !== weightDate);
        return [...filtered, { date: weightDate, weight: parseFloat(newWeight) }].sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
      });
      setNewWeight('');
    }
  };

  const getWeightMetrics = () => {
    if (bodyWeights.length === 0) return null;

    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastTwoWeeksWeights = bodyWeights.filter(w => new Date(w.date) >= twoWeeksAgo);
    
    const weeklyAvg = lastTwoWeeksWeights.length > 0
      ? lastTwoWeeksWeights.reduce((sum, w) => sum + w.weight, 0) / lastTwoWeeksWeights.length
      : null;

    const latestWeight = bodyWeights[bodyWeights.length - 1];
    const twoWeeksAgoWeight = bodyWeights.find(w => new Date(w.date) <= twoWeeksAgo);
    const twoWeekChange = twoWeeksAgoWeight ? latestWeight.weight - twoWeeksAgoWeight.weight : null;

    return {
      weeklyAvg: weeklyAvg?.toFixed(1),
      twoWeekChange: twoWeekChange?.toFixed(1),
      latest: latestWeight.weight
    };
  };

  // Run dates (YYYY-MM-DD) that fall within a given month range, for the heatmap.
  const runDatesInRange = (rangeStart, rangeEnd) =>
    runs
      .filter((run) => {
        const [year, month, day] = run.date.split('-').map(Number);
        const runDate = new Date(year, month - 1, day);
        return runDate >= rangeStart && runDate <= rangeEnd;
      })
      .map((run) => run.date);

  return (
    <div className={`p-4 max-w-6xl mx-auto min-h-screen content-pad-bottom ${isDarkMode ? 'app-bg-dark text-zinc-100' : 'app-bg-light text-zinc-900'}`}>
      <input
        type="file"
        id="import"
        className="hidden"
        accept=".json"
        onChange={handleImport}
      />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold tracking-tight">
          Gym<span className="text-brand">Genius</span>
        </h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent className={isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : ''}>
            <SheetHeader>
              <SheetTitle className={isDarkMode ? 'text-zinc-100' : ''}>Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                <CardHeader>
                  <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? <Sun size={16} className="mr-2" /> : <Moon size={16} className="mr-2" />}
                    {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  </Button>
                </CardContent>
              </Card>

              <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                <CardHeader>
                  <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>Data</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start" onClick={handleExport}>
                    <Download size={16} className="mr-2" /> Export
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => document.getElementById('import').click()}>
                    <Upload size={16} className="mr-2" /> Import
                  </Button>
                </CardContent>
              </Card>

              {onSignOut && (
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader>
                    <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
                      <LogOut size={16} className="mr-2" /> Sign out
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsContent value="Overview">
          <StatsHero metrics={metrics} />
          {/* First Part: Heatmaps and PR Tiles */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <WorkoutHeatmap
                  workoutDates={Object.values(exercises)
                    .flatMap(exercise => exercise.sets)
                    .filter(set => {
                      // Get the date parts directly from the date string
                      const [year, month, day] = set.date.split('-').map(Number);
                      const prevMonthStart = getStartOfPreviousMonth();
                      const prevMonthEnd = getEndOfPreviousMonth();
                      
                      // Create a date using local timezone
                      const setDate = new Date(year, month - 1, day);
                      return setDate >= prevMonthStart && setDate <= prevMonthEnd;
                    })
                    .map(set => set.date)
                  }
                  runDates={runDatesInRange(getStartOfPreviousMonth(), getEndOfPreviousMonth())}
                  startDate={getStartOfPreviousMonth()}
                  endDate={getEndOfPreviousMonth()}
                  isDarkMode={isDarkMode}
                  isCurrentMonth={false}
                />
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader className="py-3">
                    <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>New PRs Past Month</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>{metrics.newPRsPastMonth}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <WorkoutHeatmap
                  workoutDates={Object.values(exercises)
                    .flatMap(exercise => exercise.sets)
                    .filter(set => {
                      // Get the date parts directly from the date string
                      const [year, month, day] = set.date.split('-').map(Number);
                      const currentMonthStart = getStartOfCurrentMonth();
                      const currentMonthEnd = getEndOfCurrentMonth();
                      
                      // Create a date using local timezone
                      const setDate = new Date(year, month - 1, day);
                      return setDate >= currentMonthStart && setDate <= currentMonthEnd;
                    })
                    .map(set => set.date)
                  }
                  runDates={runDatesInRange(getStartOfCurrentMonth(), getEndOfCurrentMonth())}
                  startDate={getStartOfCurrentMonth()}
                  endDate={getEndOfCurrentMonth()}
                  isDarkMode={isDarkMode}
                  isCurrentMonth={true}
                />
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader className="py-3">
                    <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>New PRs This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>{metrics.newPRsThisMonth}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Monthly Push/Pull/Legs balance */}
            <CategoryBalance
              counts={metrics.setsByCategoryThisMonth}
              monthLabel={monthStart.toLocaleString('default', { month: 'long' })}
              isDarkMode={isDarkMode}
            />

            {/* Monthly running summary */}
            <RunningStats
              kmThisMonth={metrics.kmThisMonth}
              runsThisMonth={metrics.runsThisMonth}
              avgPaceSecPerKm={metrics.avgPaceSecPerKm}
              longestRunKm={metrics.longestRunKm}
              bestPaceSecPerKm={metrics.bestPaceSecPerKm}
              monthLabel={monthStart.toLocaleString('default', { month: 'long' })}
              isDarkMode={isDarkMode}
            />

            {/* Month-over-month workouts / runs / km comparison */}
            <MonthlyTrends data={monthlyTrends} isDarkMode={isDarkMode} />

            {/* Monthly PRs List */}
            {monthlyPRs.length > 0 && (
              <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                <CardHeader className="py-3">
                  <CardTitle className={`flex items-center justify-between ${isDarkMode ? 'text-zinc-100' : ''}`}>
                    <span>Monthly PRs</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowMonthlyPRList(!showMonthlyPRList)}
                      className={isDarkMode ? 'hover:bg-zinc-700' : ''}
                    >
                      {showMonthlyPRList ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showMonthlyPRList && (
                  <CardContent>
                    <div className="space-y-2">
                      {monthlyPRs.map((pr, idx) => (
                        <div key={idx} className={`flex justify-between items-center border-b pb-2 ${
                          isDarkMode ? 'border-zinc-700' : ''
                        }`}>
                          <span className={`font-medium ${isDarkMode ? 'text-zinc-100' : ''}`}>{pr.exerciseName}</span>
                          <div className="flex items-center gap-2">
                            <span className={isDarkMode ? 'text-zinc-100' : ''}>{Number(pr.weight)} kg</span>
                            <span className="text-green-500">+{Number(pr.surplus)} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Body Weight Tracker */}
            <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
              <CardHeader className="py-3">
                <CardTitle className={isDarkMode ? 'text-zinc-100' : ''}>Body Weight Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Input Section */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="Enter weight..."
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="weightDate">Date</Label>
                      <Input
                        id="weightDate"
                        type="date"
                        value={weightDate}
                        onChange={(e) => setWeightDate(e.target.value)}
                        className={`${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                    <Button 
                      onClick={handleAddWeight}
                      className={isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600' : ''}
                      disabled={!newWeight || !weightDate}
                    >
                      Add Weight
                    </Button>
                  </div>

                  {/* Metrics Section */}
                  {bodyWeights.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {(() => {
                        const metrics = getWeightMetrics();
                        if (!metrics) return null;
                        return (
                          <>
                            <Card className={isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50'}>
                              <CardHeader className="p-2">
                                <CardTitle className={`text-xs ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  Latest Weight
                                </CardTitle>
                                <CardDescription className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  {metrics.latest} kg
                                </CardDescription>
                              </CardHeader>
                            </Card>
                            <Card className={isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50'}>
                              <CardHeader className="p-2">
                                <CardTitle className={`text-xs ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  Weekly Average
                                </CardTitle>
                                <CardDescription className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  {metrics.weeklyAvg} kg
                                </CardDescription>
                              </CardHeader>
                            </Card>
                            <Card className={isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50'}>
                              <CardHeader className="p-2">
                                <CardTitle className={`text-xs ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  14-Day Change
                                </CardTitle>
                                <CardDescription className={`text-base font-bold mt-0.5 ${
                                  metrics.twoWeekChange > 0 ? 'text-green-500' : 
                                  metrics.twoWeekChange < 0 ? 'text-red-500' : 
                                  isDarkMode ? 'text-zinc-100' : ''
                                }`}>
                                  {metrics.twoWeekChange > 0 ? '+' : ''}{metrics.twoWeekChange} kg
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Weight Chart */}
                  {bodyWeights.length > 0 && (
                    <div className="h-64">
                      <ExerciseCharts
                        weightData={bodyWeights.map(w => ({
                          date: w.date,
                          weight: w.weight
                        }))}
                        volumeData={[]}
                        isDarkMode={isDarkMode}
                        hideVolume={true}
                      />
                    </div>
                  )}

                  {/* Weight History */}
                  {bodyWeights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className={`font-medium ${isDarkMode ? 'text-zinc-100' : ''}`}>Recent Entries</h3>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {[...bodyWeights].reverse().slice(0, 7).map((entry, idx) => (
                          <div 
                            key={entry.date} 
                            className={`flex justify-between p-2 rounded ${
                              isDarkMode ? 'bg-zinc-700' : 'bg-zinc-50'
                            }`}
                          >
                            <span className={isDarkMode ? 'text-zinc-200' : ''}>
                              {format(new Date(entry.date), 'MMM d, yyyy')}
                            </span>
                            <span className={`font-medium ${isDarkMode ? 'text-zinc-100' : ''}`}>
                              {entry.weight} kg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {['Push', 'Pull', 'Legs'].map((category) => (
          <TabsContent key={category} value={category}>
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Select Exercise</h2>
              <Combobox
                options={getExerciseOptions(category)}
                value={selectedExercises[category]}
                onChange={(value) => setSelectedExercises(prev => ({ ...prev, [category]: value }))}
                placeholder={`Select ${category} exercise...`}
                emptyMessage={`No ${category} exercises found.`}
              />
            </div>
            
            {selectedExercises[category] ? (
              renderExerciseCard(selectedExercises[category])
            ) : (
              <div className="text-center p-8 bg-muted rounded-lg">
                <p className="text-muted-foreground">Select an exercise from the dropdown above or add a new one.</p>
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="Runs">
          {(() => {
            const runToday = new Date().toISOString().split('T')[0];
            const distanceKm = parseFloat(runInput.distanceKm);
            const durationSec =
              (parseInt(runInput.minutes, 10) || 0) * 60 + (parseInt(runInput.seconds, 10) || 0);
            const canAdd = distanceKm > 0 && durationSec > 0;
            const submitRun = () => {
              if (!canAdd) return;
              handleAddRun(runInput.date || runToday, distanceKm, durationSec);
              setRunInput((prev) => ({ ...prev, distanceKm: '', minutes: '', seconds: '' }));
            };
            return (
              <div className="space-y-4">
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader className="py-3">
                    <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>Log a run</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="run-distance">Distance (km)</Label>
                        <Input
                          id="run-distance"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="5.0"
                          value={runInput.distanceKm}
                          onChange={(e) => setRunInput((prev) => ({ ...prev, distanceKm: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="run-date">Date</Label>
                        <Input
                          id="run-date"
                          type="date"
                          value={runInput.date || runToday}
                          onChange={(e) => setRunInput((prev) => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="run-min">Minutes</Label>
                        <Input
                          id="run-min"
                          type="number"
                          inputMode="numeric"
                          placeholder="25"
                          value={runInput.minutes}
                          onChange={(e) => setRunInput((prev) => ({ ...prev, minutes: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="run-sec">Seconds</Label>
                        <Input
                          id="run-sec"
                          type="number"
                          inputMode="numeric"
                          placeholder="00"
                          value={runInput.seconds}
                          onChange={(e) => setRunInput((prev) => ({ ...prev, seconds: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Pace: <span className="font-semibold text-run">{canAdd ? formatPace(distanceKm, durationSec) : '–'}</span>
                      </span>
                      <Button onClick={submitRun} disabled={!canAdd}>
                        <Plus size={16} className="mr-1" /> Add run
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader className="py-3">
                    <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>Recent runs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {runs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No runs logged yet. Add your first run above.</p>
                    ) : (
                      <div className="space-y-2">
                        {runs.map((run, idx) => (
                          <div
                            key={`${run.date}-${idx}`}
                            className={`flex items-center justify-between rounded-lg border p-2.5 ${
                              isDarkMode ? 'border-zinc-700 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Activity size={18} className="text-run" />
                              <div>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                                  {run.distanceKm} km · {formatDuration(run.durationSec)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {run.date} · {formatPace(run.distanceKm, run.durationSec)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete run"
                              onClick={() => handleDeleteRun(idx)}
                              className="text-muted-foreground hover:text-loss"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {showAddExerciseModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className={isDarkMode ? 'w-full max-w-md bg-zinc-800 border-zinc-700' : 'w-full max-w-md'}>
            <CardHeader>
              <CardTitle className={isDarkMode ? 'text-zinc-100' : ''}>Add New Exercise</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddExercise();
              }}>
                <input
                  type="text"
                  placeholder="Exercise Name"
                  className={`w-full p-2 border rounded mb-4 ${
                    isDarkMode 
                      ? 'bg-zinc-700 border-zinc-600 text-zinc-100 placeholder:text-zinc-400' 
                      : 'bg-white border-zinc-200'
                  }`}
                  value={newExercise.name}
                  onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                />
                <select
                  className={`w-full p-2 border rounded mb-4 ${
                    isDarkMode 
                      ? 'bg-zinc-700 border-zinc-600 text-zinc-100' 
                      : 'bg-white border-zinc-200'
                  }`}
                  value={newExercise.category}
                  onChange={(e) => setNewExercise(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Push">Push</option>
                  <option value="Pull">Pull</option>
                  <option value="Legs">Legs</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" className={`flex-1 ${isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600' : ''}`}>Add</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className={`flex-1 ${isDarkMode ? 'border-zinc-600 hover:bg-zinc-700' : ''}`} 
                    onClick={() => setShowAddExerciseModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating action buttons, stacked just above the bottom nav */}
      <div
        className="fixed right-4 z-40 flex flex-col items-center gap-3"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="h-12 w-12 rounded-full bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand/90"
              onClick={handleStopwatchOpen}
              aria-label="Rest timer"
            >
              <Timer size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white'}>
            <SheetHeader>
              <SheetTitle className={isDarkMode ? 'text-zinc-100' : ''}>Rest Timer</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center justify-center h-full">
              <div className={`text-6xl font-bold mb-4 ${
                stopwatchTime >= 45 ? 'text-green-500' : isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
              }`}>
                {formatTime(stopwatchTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                {stopwatchTime >= 45 ? 'Rest complete!' : 'Rest in progress...'}
              </p>
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="default"
          size="icon"
          className="h-14 w-14 rounded-full bg-brand text-white shadow-xl shadow-brand/40 hover:bg-brand/90"
          onClick={() => setShowAddExerciseModal(true)}
          aria-label="Add exercise"
        >
          <Plus size={24} />
        </Button>
      </div>

      <BottomNav currentTab={currentTab} onChange={setCurrentTab} />
    </div>
  );
};

// Top-level wrapper: manages the Supabase auth session and decides whether to
// show the login screen or the tracker. With no Supabase env vars it runs in
// local-only mode (no auth) so the app still works on a bare clone.
const App = () => {
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Local-only mode: no auth gate, data lives in localStorage.
  if (!isSupabaseConfigured) {
    return <GymTrackerV3 userId={null} onSignOut={null} />;
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg-dark text-zinc-100">
        Loading…
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <GymTrackerV3
      userId={session.user.id}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
};

export default App;
