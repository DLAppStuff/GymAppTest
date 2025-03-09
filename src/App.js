import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Download, Upload, ChevronDown, ChevronUp, X, Moon, Sun, Timer } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
import { Button } from "./components/ui/button";
import { Combobox } from "./components/ui/combobox";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import ExerciseCharts from './components/ExerciseCharts';
import WorkoutHeatmap from './components/WorkoutHeatmap';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import "./styles/globals.css";
import { format } from 'date-fns';

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

const GymTrackerV3 = () => {
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

  // Add body weight tracking states
  const [bodyWeights, setBodyWeights] = useState(() => {
    const saved = localStorage.getItem('bodyWeights');
    return saved ? JSON.parse(saved) : [];
  });

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

  useEffect(() => {
    const savedData = localStorage.getItem('gymProgress_v3');
    if (savedData) {
      const { exercises: savedExercises, prs: savedPRs } = JSON.parse(savedData);
      setExercises(savedExercises);
      setPRs(savedPRs);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'gymProgress_v3',
      JSON.stringify({ exercises, prs })
    );
  }, [exercises, prs]);

  // Add dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Add body weight tracking effect
  useEffect(() => {
    localStorage.setItem('bodyWeights', JSON.stringify(bodyWeights));
  }, [bodyWeights]);

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

    Object.keys(exercises).forEach((exerciseName) => {
      totalExercises += 1;
      const { sets } = exercises[exerciseName];
      totalSets += sets.length;
      sets.forEach(({ date }) => {
        const setDate = new Date(date);
        if (setDate >= weekStart && setDate <= weekEnd) {
          workoutDatesThisWeek.add(date);
        }
        if (setDate >= monthStart && setDate <= monthEnd) {
          workoutDatesThisMonth.add(date);
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

    return {
      workoutsThisWeek: workoutDatesThisWeek.size,
      workoutsThisMonth: workoutDatesThisMonth.size,
      totalExercises,
      totalSets,
      newPRsThisMonth,
      newPRsPastMonth
    };
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

  const handleAddSet = (exerciseName, weight, reps, date = new Date().toISOString()) => {
    setExercises((prev) => {
      const exercise = prev[exerciseName];
      const newSet = { weight: Number(weight), reps: Number(reps), date };
      const newSets = [...(exercise.sets || []), newSet];
      
      // Calculate daily volume
      const dailyVolume = newSets
        .filter((s) => s.date === date)
        .reduce((total, s) => total + s.weight * s.reps, 0);

      // Update PR if necessary
      if (!prs[exerciseName] || weight > prs[exerciseName].weight) {
        setPRs((prevPRs) => ({
          ...prevPRs,
          [exerciseName]: { 
            weight, 
            date,
            previousWeight: prs[exerciseName]?.weight || 0
          }
        }));
      }

      // Update or insert daily volume
      const existingVolumeIndex = exercise.dailyVolume?.findIndex(
        (v) => v.date === date
      );

      let updatedDailyVolume = exercise.dailyVolume || [];
      if (existingVolumeIndex !== -1) {
        updatedDailyVolume[existingVolumeIndex].volume = dailyVolume;
      } else {
        updatedDailyVolume.push({ date, volume: dailyVolume });
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

  const handleExport = () => {
    const dataStr = JSON.stringify({ exercises, prs }, null, 2);
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
      surplus: record.previousWeight ? (record.weight - record.previousWeight) : 0
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
                    <Trophy size={16} /> PR: {prs[exerciseName].weight} kg
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
                weightData={data.sets.map(set => ({
                  date: set.date,
                  weight: parseFloat(set.weight)
                }))}
                volumeData={data.sets.map(set => ({
                  date: set.date,
                  volume: parseFloat(set.weight) * parseFloat(set.reps)
                }))}
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
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekWeights = bodyWeights.filter(w => new Date(w.date) >= lastWeek);
    
    const weeklyAvg = lastWeekWeights.length > 0
      ? lastWeekWeights.reduce((sum, w) => sum + w.weight, 0) / lastWeekWeights.length
      : null;

    const latestWeight = bodyWeights[bodyWeights.length - 1];
    const weekAgoWeight = bodyWeights.find(w => new Date(w.date) <= lastWeek);
    const weekChange = weekAgoWeight ? latestWeight.weight - weekAgoWeight.weight : null;

    return {
      weeklyAvg: weeklyAvg?.toFixed(1),
      weekChange: weekChange?.toFixed(1),
      latest: latestWeight.weight
    };
  };

  return (
    <div className={`p-4 max-w-6xl mx-auto min-h-screen ${isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className="flex justify-between items-center mb-4">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Enhanced Gym Tracker</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport} 
            className={isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200'}
          >
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('import').click()} 
            className={isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200'}
          >
            <Upload size={16} className="mr-2" /> Import
          </Button>
          <input
            type="file"
            id="import"
            className="hidden"
            accept=".json"
            onChange={handleImport}
          />
        </div>
      </div>

      <Tabs defaultValue={currentTab} className="w-full">
        <TabsList className={isDarkMode ? 'grid grid-cols-4 bg-zinc-800' : 'grid grid-cols-4 bg-zinc-100'}>
          {['Overview', 'Push', 'Pull', 'Legs'].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab} 
              onClick={() => setCurrentTab(tab)}
              className={isDarkMode ? 'data-[state=active]:bg-zinc-700' : 'data-[state=active]:bg-zinc-200'}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview">
          {/* First Part: Heatmaps and PR Tiles */}
          <div className="w-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <WorkoutHeatmap
                  workoutDates={Object.values(exercises).flatMap(exercise => 
                    exercise.sets.map(set => set.date)
                  )}
                  startDate={getStartOfPreviousMonth()}
                  endDate={getEndOfPreviousMonth()}
                  isDarkMode={isDarkMode}
                  isCurrentMonth={false}
                />
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader>
                    <CardTitle className={isDarkMode ? 'text-zinc-100' : ''}>New PRs Past Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>{metrics.newPRsPastMonth}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <WorkoutHeatmap
                  workoutDates={Object.values(exercises).flatMap(exercise => 
                    exercise.sets.map(set => set.date)
                  )}
                  startDate={getStartOfCurrentMonth()}
                  endDate={getEndOfCurrentMonth()}
                  isDarkMode={isDarkMode}
                  isCurrentMonth={true}
                />
                <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                  <CardHeader>
                    <CardTitle className={isDarkMode ? 'text-zinc-100' : ''}>New PRs This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>{metrics.newPRsThisMonth}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
          {/* Adding explicit margin/spacer to prevent overlap */}
          <div className="h-24 w-full"></div>
          
          {/* Second Part: Monthly PRs List */}
          <div className="w-full pt-12 mt-12">
            {monthlyPRs.length > 0 && (
              <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
                <CardHeader>
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
                            <span className={isDarkMode ? 'text-zinc-100' : ''}>{pr.weight} kg</span>
                            <span className="text-green-500">+{pr.surplus} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Body Weight Tracker */}
          <div className="w-full pt-12 mt-12">
            <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-zinc-100' : ''}>Body Weight Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Input Section */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="weight">Weight (kg)</Label>
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
                    <div className="flex items-end">
                      <Button 
                        onClick={handleAddWeight}
                        className={isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600' : ''}
                        disabled={!newWeight || !weightDate}
                      >
                        Add Weight
                      </Button>
                    </div>
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
                              <CardHeader className="p-4">
                                <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  Latest Weight
                                </CardTitle>
                                <CardDescription className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  {metrics.latest} kg
                                </CardDescription>
                              </CardHeader>
                            </Card>
                            <Card className={isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50'}>
                              <CardHeader className="p-4">
                                <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  Weekly Average
                                </CardTitle>
                                <CardDescription className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  {metrics.weeklyAvg} kg
                                </CardDescription>
                              </CardHeader>
                            </Card>
                            <Card className={isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50'}>
                              <CardHeader className="p-4">
                                <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
                                  7-Day Change
                                </CardTitle>
                                <CardDescription className={`text-xl font-bold ${
                                  metrics.weekChange > 0 ? 'text-green-500' : 
                                  metrics.weekChange < 0 ? 'text-red-500' : 
                                  isDarkMode ? 'text-zinc-100' : ''
                                }`}>
                                  {metrics.weekChange > 0 ? '+' : ''}{metrics.weekChange} kg
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
                    <div className="space-y-2 mt-4">
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
      </Tabs>

      <Button 
        variant="default" 
        size="icon" 
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-zinc-800 hover:bg-zinc-700 p-2"
        onClick={() => setShowAddExerciseModal(true)}
      >
        <Plus size={40} className={isDarkMode ? 'text-white' : ''} />
      </Button>

      {/* Stopwatch Drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className={`fixed bottom-24 left-6 w-14 h-14 rounded-full shadow-lg p-2 ${
              isDarkMode
                ? 'bg-zinc-700 hover:bg-zinc-600'
                : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
            onClick={handleStopwatchOpen}
          >
            <Timer size={40} className={isDarkMode ? 'text-white' : ''} />
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

      {/* Dark Mode Toggle Button */}
      <Button 
        variant="default" 
        size="icon" 
        className={`fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg p-2 ${
          isDarkMode 
            ? 'bg-zinc-700 hover:bg-zinc-600' 
            : 'bg-zinc-800 hover:bg-zinc-700'
        }`}
        onClick={() => setIsDarkMode(!isDarkMode)}
      >
        {isDarkMode ? <Sun size={40} className="text-white" /> : <Moon size={40} className="text-white" />}
      </Button>

      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
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
    </div>
  );
};

export default GymTrackerV3;
