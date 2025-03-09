import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Trophy, Plus, Download, Upload, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
import { Button } from "./components/ui/button";
import { Combobox } from "./components/ui/combobox";
import "./styles/globals.css";

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

const SetItem = ({ exerciseName, set, index, deleteSetCallback }) => {
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
    <div {...longPressEvent} className="bg-white p-2 rounded border text-center">
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
  const [selectedExercises, setSelectedExercises] = useState({
    Push: '',
    Pull: '',
    Legs: ''
  });

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

  const prepareWeightData = (sets) => {
    const dailyMaxes = sets.reduce((acc, set) => {
      const { date, weight } = set;
      if (!acc[date] || weight > acc[date].weight) {
        acc[date] = { date, weight };
      }
      return acc;
    }, {});
    return Object.values(dailyMaxes).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
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

  // Render the selected exercise card
  const renderExerciseCard = (exerciseName) => {
    if (!exerciseName || !exercises[exerciseName]) return null;
    
    const data = exercises[exerciseName];
    const todayDate = new Date().toISOString().split('T')[0];
    const lastSet = [...data.sets].reverse().find(set => set.date === todayDate) || data.sets[data.sets.length - 1];
    
    return (
      <Card key={exerciseName} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{exerciseName}</CardTitle>
              {prs[exerciseName] && (
                <CardDescription>
                  <span className="text-yellow-600 flex items-center gap-1">
                    <Trophy size={16} /> PR: {prs[exerciseName].weight} kg
                  </span>
                </CardDescription>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteExercise(exerciseName)}
            >
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Accordion type="single" collapsible defaultValue="add-set">
              <AccordionItem value="add-set">
                <AccordionTrigger>Add Set</AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleAddSet(
                      exerciseName,
                      formData.get('weight'),
                      formData.get('reps'),
                      formData.get('date')
                    );
                    e.target.reset();
                    // Re-add the last weight after form reset
                    const weightInput = e.target.querySelector('input[name="weight"]');
                    if (weightInput) {
                      weightInput.value = formData.get('weight');
                    }
                  }}>
                    <div className="space-y-2">
                      <input 
                        type="number" 
                        name="weight" 
                        placeholder="Weight (kg)" 
                        className="w-full p-2 border rounded" 
                        defaultValue={lastSet?.weight || ''} 
                        required 
                      />
                      <input type="number" name="reps" placeholder="Reps" className="w-full p-2 border rounded" required />
                      <input type="date" name="date" defaultValue={todayDate} className="w-full p-2 border rounded" required />
                      <Button type="submit" className="w-full">Add Set</Button>
                    </div>
                  </form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Today's Sets */}
            <div>
              <h4 className="font-medium mb-2">Today's Sets:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.sets
                  .map((set, idx) => ({ ...set, idx }))
                  .filter(set => set.date === new Date().toISOString().split('T')[0])
                  .map((set) => (
                    <SetItem
                      key={set.idx}
                      exerciseName={exerciseName}
                      set={set}
                      index={set.idx}
                      deleteSetCallback={deleteSet}
                    />
                  ))}
              </div>
            </div>

            {/* Progress Charts - Always shown */}
            <div>
              <h4 className="font-medium mb-2">Progress</h4>
              <div className="mt-4 space-y-6">
                <div className="h-[300px]">
                  <h4 className="font-medium mb-2">Max Weight Progress</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareWeightData(data.sets)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#8884d8" dot={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px]">
                  <h4 className="font-medium mb-2">Volume Progress</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="volume" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Enhanced Gym Tracker</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button variant="secondary" onClick={() => document.getElementById('import').click()}>
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
        <TabsList className="grid grid-cols-4">
          {['Overview', 'Push', 'Pull', 'Legs'].map((tab) => (
            <TabsTrigger key={tab} value={tab} onClick={() => setCurrentTab(tab)}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Workouts This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.workoutsThisWeek}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Workouts This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.workoutsThisMonth}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Exercises</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.totalExercises}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Sets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.totalSets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>New PRs This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.newPRsThisMonth}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>New PRs Past Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.newPRsPastMonth}</p>
              </CardContent>
            </Card>
          </div>

          {monthlyPRs.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Monthly PRs</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowMonthlyPRList(!showMonthlyPRList)}
                  >
                    {showMonthlyPRList ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showMonthlyPRList && (
                <CardContent>
                  <div className="space-y-2">
                    {monthlyPRs.map((pr, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b pb-2">
                        <span className="font-medium">{pr.exerciseName}</span>
                        <div className="flex items-center gap-2">
                          <span>{pr.weight} kg</span>
                          <span className="text-green-500">+{pr.surplus} kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
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
        className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg"
        onClick={() => setShowAddExerciseModal(true)}
      >
        <Plus size={24} />
      </Button>

      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Exercise</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddExercise();
              }}>
                <input
                  type="text"
                  placeholder="Exercise Name"
                  className="w-full p-2 border rounded mb-4"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                />
                <select
                  className="w-full p-2 border rounded mb-4"
                  value={newExercise.category}
                  onChange={(e) => setNewExercise(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Push">Push</option>
                  <option value="Pull">Pull</option>
                  <option value="Legs">Legs</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Add</Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddExerciseModal(false)}>
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
