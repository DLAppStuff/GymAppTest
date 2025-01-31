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
import {
  Trophy,
  Save,
  Download,
  Upload,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const GymTrackerV3 = () => {
  /**
   * ---------------------
   * 1. State Hooks
   * ---------------------
   */
  const [exercises, setExercises] = useState({});
  const [prs, setPRs] = useState({});
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // For creating a new exercise
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Push');

  // Toggles for each exercise (hide/show its details)
  const [showExercise, setShowExercise] = useState({});

  // Toggles for the graphs within an exercise
  const [showGraphs, setShowGraphs] = useState({});

  // Current active tab (Overview, Push, Pull, Legs)
  const [currentTab, setCurrentTab] = useState('Overview');

  // Possible categories
  const categories = ['Push', 'Pull', 'Legs'];

  // A map from exerciseName -> current weight input
  // Keeps the "Add Set" weight input always in sync with the last used weight.
  const [inputWeights, setInputWeights] = useState({});

  /**
   * ---------------------
   * 2. Load/Save to Local Storage
   * ---------------------
   */
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

  /**
   * ---------------------
   * 3. Utility Functions
   * ---------------------
   */

  /**
   * prepareWeightData
   * Given an array of sets, returns an array of objects
   * representing the max weight for each date, sorted by date.
   */
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

  /**
   * addExercise
   * Creates a new exercise in state with empty sets & daily volume.
   */
  const addExercise = () => {
    if (newExerciseName.trim()) {
      setExercises((prev) => ({
        ...prev,
        [newExerciseName]: {
          category: selectedCategory,
          sets: [],
          tags: [],
          dailyVolume: []
        }
      }));
      // Initialize weight input for this exercise (optional)
      setInputWeights((prev) => ({
        ...prev,
        [newExerciseName]: ''
      }));
      setNewExerciseName('');
      setShowAddExerciseModal(false);
    }
  };

  /**
   * addSet
   * Adds a new set (with weight, reps, date) to a given exercise,
   * updates daily volume, and checks for a new PR if needed.
   */
  const addSet = (exercise) => {
    const weight = parseFloat(inputWeights[exercise]);
    const repsInput = document.getElementById(`${exercise}-reps`);
    const dateInput = document.getElementById(`${exercise}-date`);

    const reps = parseInt(repsInput.value);
    const dateValue = dateInput.value;

    if (weight && reps && dateValue) {
      setExercises((prev) => {
        const updatedExercise = { ...prev[exercise] };

        // Add the new set
        const newSet = { date: dateValue, weight, reps };
        updatedExercise.sets.push(newSet);

        // Calculate daily volume for that date
        const dailyVolume = updatedExercise.sets
          .filter((s) => s.date === dateValue)
          .reduce((total, s) => total + s.weight * s.reps, 0);

        // Update or insert the daily volume entry
        const existingVolumeIndex = updatedExercise.dailyVolume.findIndex(
          (v) => v.date === dateValue
        );
        if (existingVolumeIndex !== -1) {
          updatedExercise.dailyVolume[existingVolumeIndex].volume = dailyVolume;
        } else {
          updatedExercise.dailyVolume.push({ date: dateValue, volume: dailyVolume });
        }

        // Check for a new Personal Record (PR)
        if (weight > (prs[exercise]?.weight || 0)) {
          setPRs((prevPRs) => ({
            ...prevPRs,
            [exercise]: { weight, date: dateValue }
          }));
        }

        return {
          ...prev,
          [exercise]: updatedExercise
        };
      });

      // Keep the last used weight as the pre-filled value for next time
      setInputWeights((prev) => ({
        ...prev,
        [exercise]: weight.toString()
      }));

      // Clear reps input (optional)
      repsInput.value = '';
      // dateInput stays as is (you might choose to reset it to today's date if preferred)
    }
  };

  /**
   * toggleGraphs
   * Show/hide the progress charts for a given exercise.
   */
  const toggleGraphs = (exercise) => {
    setShowGraphs((prev) => ({
      ...prev,
      [exercise]: !prev[exercise]
    }));
  };

  /**
   * toggleExerciseView
   * Show/hide the details of a specific exercise.
   */
  const toggleExerciseView = (exerciseName) => {
    setShowExercise((prev) => ({
      ...prev,
      [exerciseName]: !prev[exerciseName]
    }));
  };

  /**
   * handleExport
   * Exports the current data (exercises + prs) to a .json file.
   */
  const handleExport = () => {
    const dataToExport = JSON.stringify({ exercises, prs }, null, 2);
    const blob = new Blob([dataToExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'gym-progress-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * handleImport
   * Prompts user to paste JSON data, then merges it into state if valid.
   */
  const handleImport = () => {
    const importedData = prompt('Paste your exported JSON data here:');
    if (importedData) {
      try {
        const parsed = JSON.parse(importedData);
        if (parsed.exercises && parsed.prs) {
          setExercises(parsed.exercises);
          setPRs(parsed.prs);
          alert('Data imported successfully!');
        } else {
          alert('Invalid data format. Make sure it has { exercises, prs }.');
        }
      } catch (err) {
        alert('Invalid JSON. Please try again.');
      }
    }
  };

  /**
   * ---------------------
   * 4. Dashboard Calculations
   * ---------------------
   */
  const getDashboardMetrics = () => {
    let totalExercises = 0;
    let totalSets = 0;
    let totalVolume = 0;

    const today = new Date();

    // For last 7 days
    const pastWeekDate = new Date();
    pastWeekDate.setDate(today.getDate() - 7);
    const datesInLastWeek = new Set();

    // For last 30 days
    const pastMonthDate = new Date();
    pastMonthDate.setDate(today.getDate() - 30);
    const datesInLastMonth = new Set();

    Object.keys(exercises).forEach((exerciseName) => {
      totalExercises += 1;
      const { sets } = exercises[exerciseName];

      totalSets += sets.length;
      sets.forEach(({ weight, reps, date }) => {
        totalVolume += weight * reps;

        const setDate = new Date(date);
        // last 7 days
        if (setDate >= pastWeekDate && setDate <= today) {
          datesInLastWeek.add(date);
        }
        // last 30 days
        if (setDate >= pastMonthDate && setDate <= today) {
          datesInLastMonth.add(date);
        }
      });
    });

    return {
      totalExercises,
      totalSets,
      totalVolume,
      lastWeekWorkouts: datesInLastWeek.size,
      lastMonthWorkouts: datesInLastMonth.size
    };
  };

  const {
    totalExercises,
    totalSets,
    totalVolume,
    lastWeekWorkouts,
    lastMonthWorkouts
  } = getDashboardMetrics();

  /**
   * ---------------------
   * 5. Tabs & Rendering
   * ---------------------
   */

  // Define the tabs for your top navigation
  const TABS = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Push', label: 'Push' },
    { id: 'Pull', label: 'Pull' },
    { id: 'Legs', label: 'Legs' }
  ];

  // This function renders content based on the currentTab
  const renderTabContent = () => {
    if (currentTab === 'Overview') {
      // ---- OVERVIEW / DASHBOARD TAB ----

      // Filter for new PRs in the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(new Date().getDate() - 30);

      const recentPRs = Object.entries(prs).filter(([exerciseName, record]) => {
        const prDate = new Date(record.date);
        return prDate >= thirtyDaysAgo && prDate <= new Date();
      });

      return (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>

          {/* Metrics Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Total Exercises */}
            <div className="p-4 bg-white rounded shadow text-center">
              <div className="text-sm text-gray-500">Total Exercises</div>
              <div className="text-2xl font-bold">{totalExercises}</div>
            </div>
            {/* 2. Total Sets */}
            <div className="p-4 bg-white rounded shadow text-center">
              <div className="text-sm text-gray-500">Total Sets</div>
              <div className="text-2xl font-bold">{totalSets}</div>
            </div>
            {/* 3. Total Volume */}
            <div className="p-4 bg-white rounded shadow text-center">
              <div className="text-sm text-gray-500">Total Volume</div>
              <div className="text-2xl font-bold">{totalVolume} kg</div>
            </div>
            {/* 4. Workouts (Last 7 Days) */}
            <div className="p-4 bg-white rounded shadow text-center">
              <div className="text-sm text-gray-500">Workouts (Last 7 Days)</div>
              <div className="text-2xl font-bold">{lastWeekWorkouts}</div>
            </div>
          </div>

          {/* Add tile for Workouts (Last 30 Days) */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded shadow text-center">
              <div className="text-sm text-gray-500">Workouts (Last 30 Days)</div>
              <div className="text-2xl font-bold">{lastMonthWorkouts}</div>
            </div>
          </div>

          {/* Recent PRs Section */}
          <div className="mt-8 p-4 bg-white rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Recent PRs (Last 30 Days)</h3>
            {recentPRs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No new PRs this month! Keep pushing!
              </p>
            ) : (
              <ul className="list-disc pl-5">
                {recentPRs.map(([exerciseName, record]) => (
                  <li key={exerciseName}>
                    <strong>{exerciseName}:</strong> {record.weight} kg on{' '}
                    {record.date}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }

    // ---- PUSH / PULL / LEGS TABS ----
    if (['Push', 'Pull', 'Legs'].includes(currentTab)) {
      const category = currentTab; // "Push" | "Pull" | "Legs"
      return (
        <div className="p-4">
          <div key={category} className="mb-8 border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">{category} Exercises</h2>
            {Object.entries(exercises)
              .filter(([_, data]) => data.category === category)
              .map(([exercise, data]) => {
                const isExerciseExpanded =
                  showExercise[exercise] !== undefined
                    ? showExercise[exercise]
                    : true;

                const currentWeight = inputWeights[exercise] || '';

                return (
                  <div
                    key={exercise}
                    className="mb-4 bg-gray-50 rounded-lg p-4"
                  >
                    {/* Exercise Header: Name, PR, Toggle Button */}
                    <div className="flex justify-between items-center mb-4 flex-wrap">
                      <div className="mb-2 sm:mb-0">
                        <h3 className="text-lg font-medium">{exercise}</h3>
                        {prs[exercise] && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Trophy size={16} />
                            <span className="text-sm">
                              PR: {prs[exercise].weight} kg
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExerciseView(exercise)}
                        className="flex items-center gap-1 bg-gray-300 px-3 py-1 rounded"
                      >
                        {isExerciseExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                        {isExerciseExpanded ? 'Hide Exercise' : 'Show Exercise'}
                      </button>
                    </div>

                    {/* If exercise is expanded, show its details */}
                    {isExerciseExpanded && (
                      <>
                        {/* Inputs row: Weight, Reps, Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <input
                            id={`${exercise}-weight`}
                            type="number"
                            placeholder="Weight (kg)"
                            className="border rounded p-2"
                            value={currentWeight}
                            onChange={(e) =>
                              setInputWeights((prev) => ({
                                ...prev,
                                [exercise]: e.target.value
                              }))
                            }
                          />
                          <input
                            id={`${exercise}-reps`}
                            type="number"
                            placeholder="Reps"
                            className="border rounded p-2"
                          />
                          <input
                            id={`${exercise}-date`}
                            type="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="border rounded p-2"
                          />
                          <button
                            onClick={() => addSet(exercise)}
                            className="bg-green-500 text-white p-2 rounded sm:col-span-3"
                          >
                            Add Set
                          </button>
                        </div>

                        {/* Today's Sets */}
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Today's Sets:</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {data.sets
                              .filter(
                                (set) =>
                                  set.date ===
                                  new Date().toISOString().split('T')[0]
                              )
                              .map((set, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-2 rounded border text-center"
                                >
                                  {set.weight}kg x {set.reps}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Button to show/hide graphs */}
                        <div className="flex items-center gap-2 mb-4">
                          <button
                            onClick={() => toggleGraphs(exercise)}
                            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded"
                          >
                            {showGraphs[exercise] ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                            {showGraphs[exercise]
                              ? 'Hide Progress'
                              : 'Show Progress'}
                          </button>
                        </div>

                        {/* Graphs (stacked) */}
                        {showGraphs[exercise] && (
                          <div>
                            {/* Max Weight Progress */}
                            <div className="h-64 mb-6">
                              <h4 className="font-medium mb-2">
                                Max Weight Progress
                              </h4>
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <LineChart data={prepareWeightData(data.sets)}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#8884d8"
                                    dot={true}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Volume Progress */}
                            <div className="h-64">
                              <h4 className="font-medium mb-2">
                                Volume Progress
                              </h4>
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <LineChart data={data.dailyVolume}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Line
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="#82ca9d"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header: Title + Backup/Sync Button */}
      <div className="flex justify-between items-center mb-4 flex-wrap">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Enhanced Gym Tracker</h1>
        <button
          onClick={() => setShowBackupModal(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          <Save size={16} />
          Backup/Sync
        </button>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 py-2 rounded ${
              currentTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT: Depends on currentTab */}
      {renderTabContent()}

      {/* Floating "+" button to add a new exercise (visible on all tabs) */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowAddExerciseModal(true)}
          className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
        >
          +
        </button>
      </div>

      {/* Modal: Add New Exercise */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Add New Exercise</h3>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Exercise name"
                className="border rounded p-2"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded p-2"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                onClick={addExercise}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Add Exercise
              </button>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Backup & Sync (Export/Import) */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Backup & Sync</h3>
            <div className="flex flex-col gap-4">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-500 text-white p-2 rounded"
              >
                <Download size={16} />
                Export Data
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 bg-yellow-500 text-white p-2 rounded"
              >
                <Upload size={16} />
                Import Data
              </button>
            </div>
            <button
              onClick={() => setShowBackupModal(false)}
              className="mt-4 text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymTrackerV3;
