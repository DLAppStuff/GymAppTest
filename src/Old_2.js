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
   * State Hooks
   */
  // Main data structures
  const [exercises, setExercises] = useState({});
  const [prs, setPRs] = useState({});

  // UI states for modals
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // New exercise form inputs
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Push');

  // Toggles for categories (show/hide entire category)
  const [showCategory, setShowCategory] = useState({
    Push: true,
    Pull: true,
    Legs: true
  });

  // Toggles for individual exercises (show/hide exercise details)
  const [showExercise, setShowExercise] = useState({});

  // Toggles for graphs (show/hide weight/volume charts per exercise)
  const [showGraphs, setShowGraphs] = useState({});

  // The list of possible categories
  const categories = ['Push', 'Pull', 'Legs'];

  /**
   * Load data from local storage on component mount
   */
  useEffect(() => {
    const savedData = localStorage.getItem('gymProgress_v3');
    if (savedData) {
      const { exercises: savedExercises, prs: savedPRs } = JSON.parse(savedData);
      setExercises(savedExercises);
      setPRs(savedPRs);
    }
  }, []);

  /**
   * Save data to local storage whenever exercises/prs change
   */
  useEffect(() => {
    localStorage.setItem(
      'gymProgress_v3',
      JSON.stringify({ exercises, prs })
    );
  }, [exercises, prs]);

  /**
   * prepareWeightData
   * Returns an array of "max weight per day" from an exercise's sets.
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
   * Creates a new exercise with the given name/category.
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
      setNewExerciseName('');
      setShowAddExerciseModal(false);
    }
  };

  /**
   * addSet
   * Adds a new weight x reps set to a given exercise. Updates daily volume and PR if needed.
   */
  const addSet = (exercise) => {
    const date = new Date().toISOString().split('T')[0];
    const weightInput = document.getElementById(`${exercise}-weight`);
    const repsInput = document.getElementById(`${exercise}-reps`);
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);

    if (weight && reps) {
      setExercises((prev) => {
        const updatedExercise = { ...prev[exercise] };
        // Add the new set
        const newSet = { date, weight, reps };
        updatedExercise.sets.push(newSet);

        // Calculate daily volume
        const dailyVolume = updatedExercise.sets
          .filter((set) => set.date === date)
          .reduce((total, s) => total + s.weight * s.reps, 0);

        // Insert or update dailyVolume entry
        const existingVolumeIndex = updatedExercise.dailyVolume.findIndex(
          (v) => v.date === date
        );
        if (existingVolumeIndex !== -1) {
          updatedExercise.dailyVolume[existingVolumeIndex].volume = dailyVolume;
        } else {
          updatedExercise.dailyVolume.push({ date, volume: dailyVolume });
        }

        // Check for PR
        if (weight > (prs[exercise]?.weight || 0)) {
          setPRs((prevPRs) => ({
            ...prevPRs,
            [exercise]: { weight, date }
          }));
        }

        // Clear input fields
        weightInput.value = '';
        repsInput.value = '';

        return {
          ...prev,
          [exercise]: updatedExercise
        };
      });
    }
  };

  /**
   * toggleGraphs
   * Show/hide the charts for a particular exercise.
   */
  const toggleGraphs = (exercise) => {
    setShowGraphs((prev) => ({
      ...prev,
      [exercise]: !prev[exercise]
    }));
  };

  /**
   * toggleCategoryView
   * Show/hide an entire category (Push, Pull, or Legs).
   */
  const toggleCategoryView = (cat) => {
    setShowCategory((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  /**
   * toggleExerciseView
   * Show/hide the exercise details (inputs, sets, graphs button) for a single exercise.
   */
  const toggleExerciseView = (exerciseName) => {
    setShowExercise((prev) => ({
      ...prev,
      [exerciseName]: !prev[exerciseName]
    }));
  };

  /**
   * handleExport
   * Export the current exercises/prs as a .json file.
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
   * Prompt user to paste in a JSON string and update the app state with it.
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

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header: Title + Backup/Sync Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Enhanced Gym Tracker</h1>
        <button
          onClick={() => setShowBackupModal(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          <Save size={16} />
          Backup/Sync
        </button>
      </div>

      {/* Loop over each category */}
      {categories.map((category) => (
        <div key={category} className="mb-8 border rounded-lg p-4">
          {/* Category Header (title + toggle button) */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{category}</h2>
            <button
              onClick={() => toggleCategoryView(category)}
              className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded"
            >
              {showCategory[category] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showCategory[category] ? 'Hide Category' : 'Show Category'}
            </button>
          </div>

          {/* Only render exercises if category is expanded */}
          {showCategory[category] &&
            Object.entries(exercises)
              .filter(([_, data]) => data.category === category)
              .map(([exercise, data]) => {
                // If we haven't set a value for showExercise[exercise] yet, default to true
                const isExerciseExpanded =
                  showExercise[exercise] !== undefined
                    ? showExercise[exercise]
                    : true;

                return (
                  <div key={exercise} className="mb-4 bg-gray-50 rounded-lg p-4">
                    {/* Exercise Header (Name + PR + Expand/Collapse button) */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
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
                      {/* Button to show/hide all details of this exercise */}
                      <button
                        onClick={() => toggleExerciseView(exercise)}
                        className="flex items-center gap-1 bg-gray-300 px-3 py-1 rounded"
                      >
                        {isExerciseExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExerciseExpanded ? 'Hide Exercise' : 'Show Exercise'}
                      </button>
                    </div>

                    {/* Only render the exercise details if it is expanded */}
                    {isExerciseExpanded && (
                      <>
                        {/* Inputs to add a new set */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <input
                            id={`${exercise}-weight`}
                            type="number"
                            placeholder="Weight (kg)"
                            className="border rounded p-2"
                          />
                          <input
                            id={`${exercise}-reps`}
                            type="number"
                            placeholder="Reps"
                            className="border rounded p-2"
                          />
                          <button
                            onClick={() => addSet(exercise)}
                            className="col-span-2 bg-green-500 text-white p-2 rounded"
                          >
                            Add Set
                          </button>
                        </div>

                        {/* Today's Sets */}
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Today's Sets:</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {data.sets
                              .filter(
                                (set) =>
                                  set.date ===
                                  new Date().toISOString().split('T')[0]
                              )
                              .map((set, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-2 rounded border"
                                >
                                  {set.weight}kg x {set.reps}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Graph toggle button + Graphs */}
                        <div className="flex items-center gap-2 mb-4">
                          <button
                            onClick={() => toggleGraphs(exercise)}
                            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded"
                          >
                            {showGraphs[exercise] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {showGraphs[exercise] ? 'Hide Progress' : 'Show Progress'}
                          </button>
                        </div>

                        {showGraphs[exercise] && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Max Weight Progress */}
                            <div className="h-64">
                              <h4 className="font-medium mb-2">Max Weight Progress</h4>
                              <ResponsiveContainer width="100%" height="100%">
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
                              <h4 className="font-medium mb-2">Volume Progress</h4>
                              <ResponsiveContainer width="100%" height="100%">
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
      ))}

      {/* Floating button to add a new exercise */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
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
