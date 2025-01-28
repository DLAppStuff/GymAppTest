/**
 * GymTrackerV3
 * Enhanced React component that tracks gym exercises, sets, and personal records (PRs).
 * Features:
 *  - Local storage persistence
 *  - Separate exercise categories
 *  - Add sets (weight x reps)
 *  - Display daily volume and max weight progress with Recharts
 *  - Personal Record (PR) detection
 *  - Export/Import (backup) functionality
 */

import React, { useState, useEffect } from 'react';

// Recharts (for graphs)
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Icon imports from lucide-react (for visual icons)
import {
  Trophy,
  Save,
  Download,
  Upload,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const GymTrackerV3 = () => {
  // --------------------------------------------------------------------------
  // 1. React State Hooks
  // --------------------------------------------------------------------------
  // exercises: An object storing info about each exercise and its sets
  const [exercises, setExercises] = useState({});
  // prs: Stores personal records for each exercise (weight + date)
  const [prs, setPRs] = useState({});
  // showAddExerciseModal: Controls whether the "Add New Exercise" modal is open
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  // newExerciseName: The text user types for a new exercise
  const [newExerciseName, setNewExerciseName] = useState('');
  // selectedCategory: Which category is chosen (Push, Pull, or Legs) when adding a new exercise
  const [selectedCategory, setSelectedCategory] = useState('Push');
  // showBackupModal: Controls the visibility of the "Backup/Sync" modal
  const [showBackupModal, setShowBackupModal] = useState(false);
  // showGraphs: An object tracking which exercises have their graphs expanded
  const [showGraphs, setShowGraphs] = useState({});

  // The list of possible categories
  const categories = ['Push', 'Pull', 'Legs'];

  // --------------------------------------------------------------------------
  // 2. Load and Save from/to Local Storage
  // --------------------------------------------------------------------------
  // On initial load, retrieve the saved data (exercises + prs) from local storage
  useEffect(() => {
    const savedData = localStorage.getItem('gymProgress_v3');
    if (savedData) {
      // We stored it as { exercises, prs }, so parse that back
      const { exercises: savedExercises, prs: savedPRs } = JSON.parse(savedData);
      setExercises(savedExercises);
      setPRs(savedPRs);
    }
  }, []);

  // Whenever exercises or prs change, save them back to local storage
  useEffect(() => {
    localStorage.setItem(
      'gymProgress_v3',
      JSON.stringify({ exercises, prs })
    );
  }, [exercises, prs]);

  // --------------------------------------------------------------------------
  // 3. Utility Functions
  // --------------------------------------------------------------------------
  /**
   * prepareWeightData
   * Given an array of sets (with {date, weight, reps}), we find the maximum weight per day
   * and return an array sorted by date, for plotting max weight progress over time.
   */
  const prepareWeightData = (sets) => {
    // dailyMaxes will collect "highest weight for each date"
    const dailyMaxes = sets.reduce((acc, set) => {
      const { date, weight } = set;
      // If we haven't seen this date OR found a smaller weight, update it
      if (!acc[date] || weight > acc[date].weight) {
        acc[date] = { date, weight };
      }
      return acc;
    }, {});

    // Convert the dailyMaxes object into an array and sort by date
    return Object.values(dailyMaxes).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  // --------------------------------------------------------------------------
  // 4. Exercise and Sets Management
  // --------------------------------------------------------------------------
  /**
   * addExercise
   * Creates a new exercise in state with the given name and category.
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
      // Reset form states
      setNewExerciseName('');
      setShowAddExerciseModal(false);
    }
  };

  /**
   * addSet
   * Adds a new set (weight x reps) to the specified exercise. Also updates dailyVolume and personal records.
   */
  const addSet = (exercise) => {
    // Use today's date in ISO format (YYYY-MM-DD)
    const date = new Date().toISOString().split('T')[0];
    // Grab the weight and reps from input fields (by ID)
    const weightInput = document.getElementById(`${exercise}-weight`);
    const repsInput = document.getElementById(`${exercise}-reps`);

    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);

    // Only proceed if both fields have valid values
    if (weight && reps) {
      setExercises((prev) => {
        const updatedExercise = { ...prev[exercise] };

        // Create the new set object
        const newSet = { date, weight, reps };
        // Push to the exercise's "sets" array
        updatedExercise.sets.push(newSet);

        // Calculate total volume for this date (weight * reps for all sets on this date)
        const dailyVolume = updatedExercise.sets
          .filter((set) => set.date === date)
          .reduce((total, set) => total + set.weight * set.reps, 0);

        // Either update an existing entry in dailyVolume or add a new one
        const existingVolumeIndex = updatedExercise.dailyVolume.findIndex(
          (v) => v.date === date
        );
        if (existingVolumeIndex !== -1) {
          updatedExercise.dailyVolume[existingVolumeIndex].volume = dailyVolume;
        } else {
          updatedExercise.dailyVolume.push({ date, volume: dailyVolume });
        }

        // Check if this weight is a new personal record
        if (weight > (prs[exercise]?.weight || 0)) {
          setPRs((prev) => ({
            ...prev,
            [exercise]: { weight, date }
          }));
        }

        // Clear the input fields
        weightInput.value = '';
        repsInput.value = '';

        // Return the updated exercises
        return {
          ...prev,
          [exercise]: updatedExercise
        };
      });
    }
  };

  /**
   * toggleGraphs
   * Show/hide the progress graphs (max weight + volume) for a given exercise.
   */
  const toggleGraphs = (exercise) => {
    setShowGraphs((prev) => ({
      ...prev,
      [exercise]: !prev[exercise]
    }));
  };

  // --------------------------------------------------------------------------
  // 5. Backup/Restore (Export/Import)
  // --------------------------------------------------------------------------
  /**
   * handleExport
   * Creates a JSON string from {exercises, prs} and allows user to download it.
   */
  const handleExport = () => {
    // Convert our data to JSON
    const dataToExport = JSON.stringify({ exercises, prs }, null, 2);
    // Create a blob for the data
    const blob = new Blob([dataToExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a hidden link element for downloading the file
    const link = document.createElement('a');
    link.href = url;
    // The file name can be anything; here we use 'gym-progress-data.json'
    link.download = 'gym-progress-data.json';
    link.click();
    // Clean up
    URL.revokeObjectURL(url);
  };

  /**
   * handleImport
   * Lets user paste in JSON data, parses it, and updates the app state (exercises, prs).
   */
  const handleImport = () => {
    // We'll do a simple text-based import via prompt
    const importedData = prompt('Paste your exported JSON data here:');
    if (importedData) {
      try {
        const parsed = JSON.parse(importedData);
        // We expect { exercises, prs }
        if (parsed.exercises && parsed.prs) {
          setExercises(parsed.exercises);
          setPRs(parsed.prs);
          alert('Data imported successfully!');
        } else {
          alert('Invalid data format. Make sure you have { exercises, prs }.');
        }
      } catch (error) {
        alert('Invalid JSON. Please try again.');
      }
    }
  };

  // --------------------------------------------------------------------------
  // 6. Component JSX
  // --------------------------------------------------------------------------
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header with title and backup button */}
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

      {/* Loop over each category (Push, Pull, Legs) */}
      {categories.map((category) => (
        <div key={category} className="mb-8 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>

          {Object.entries(exercises)
            .filter(([_, data]) => data.category === category)
            .map(([exercise, data]) => (
              <div key={exercise} className="mb-4 bg-gray-50 rounded-lg p-4">
                {/* Exercise Header (Name + PR + Toggle Graph Button) */}
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGraphs(exercise)}
                      className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      {showGraphs[exercise] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showGraphs[exercise] ? 'Hide Progress' : 'Show Progress'}
                    </button>
                  </div>
                </div>

                {/* Inputs to add a new set (weight + reps) */}
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

                {/* Display today's sets (for quick reference) */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Today's Sets:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.sets
                      .filter((set) => set.date === new Date().toISOString().split('T')[0])
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

                {/* Show the graphs if toggled ON */}
                {showGraphs[exercise] && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Max Weight Progress Chart */}
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

                    {/* Volume Progress Chart */}
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
              </div>
            ))}
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

      {/* Modal for adding a new exercise */}
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

      {/* Modal for Backup/Sync (Export/Import) */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Backup & Sync</h3>
            <div className="flex flex-col gap-4">
              {/* Export Button */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-500 text-white p-2 rounded"
              >
                <Download size={16} />
                Export Data
              </button>
              {/* Import Button */}
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
