import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Save, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react';

const GymTrackerV3 = () => {
  const [exercises, setExercises] = useState({});
  const [prs, setPRs] = useState({});
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Push');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showGraphs, setShowGraphs] = useState({});

  const categories = ['Push', 'Pull', 'Legs'];

  useEffect(() => {
    const savedData = localStorage.getItem('gymProgress_v3');
    if (savedData) {
      const { exercises: savedExercises, prs: savedPRs } = JSON.parse(savedData);
      setExercises(savedExercises);
      setPRs(savedPRs);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gymProgress_v3', JSON.stringify({ exercises, prs }));
  }, [exercises, prs]);

  const prepareWeightData = (sets) => {
    const dailyMaxes = sets.reduce((acc, set) => {
      const { date, weight } = set;
      if (!acc[date] || weight > acc[date].weight) {
        acc[date] = { date, weight };
      }
      return acc;
    }, {});

    return Object.values(dailyMaxes).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  };

  const addExercise = () => {
    if (newExerciseName.trim()) {
      setExercises(prev => ({
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

  const addSet = (exercise) => {
    const date = new Date().toISOString().split('T')[0];
    const weight = parseFloat(document.getElementById(`${exercise}-weight`).value);
    const reps = parseInt(document.getElementById(`${exercise}-reps`).value);
    
    if (weight && reps) {
      setExercises(prev => {
        const updatedExercise = { ...prev[exercise] };
        const newSet = { date, weight, reps };
        updatedExercise.sets.push(newSet);
        
        const dailyVolume = updatedExercise.sets
          .filter(set => set.date === date)
          .reduce((total, set) => total + (set.weight * set.reps), 0);
        
        const existingVolumeIndex = updatedExercise.dailyVolume.findIndex(v => v.date === date);
        if (existingVolumeIndex !== -1) {
          updatedExercise.dailyVolume[existingVolumeIndex].volume = dailyVolume;
        } else {
          updatedExercise.dailyVolume.push({ date, volume: dailyVolume });
        }
        
        if (weight > (prs[exercise]?.weight || 0)) {
          setPRs(prev => ({
            ...prev,
            [exercise]: { weight, date }
          }));
        }
        
        document.getElementById(`${exercise}-weight`).value = '';
        document.getElementById(`${exercise}-reps`).value = '';
        
        return {
          ...prev,
          [exercise]: updatedExercise
        };
      });
    }
  };

  const toggleGraphs = (exercise) => {
    setShowGraphs(prev => ({
      ...prev,
      [exercise]: !prev[exercise]
    }));
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
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

      {categories.map(category => (
        <div key={category} className="mb-8 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>
          
          {Object.entries(exercises)
            .filter(([_, data]) => data.category === category)
            .map(([exercise, data]) => (
              <div key={exercise} className="mb-4 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium">{exercise}</h3>
                    {prs[exercise] && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Trophy size={16} />
                        <span className="text-sm">PR: {prs[exercise].weight}kg</span>
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

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Today's Sets:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.sets
                      .filter(set => set.date === new Date().toISOString().split('T')[0])
                      .map((set, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border">
                          {set.weight}kg x {set.reps}
                        </div>
                      ))}
                  </div>
                </div>

                {showGraphs[exercise] && (
                  <div className="grid grid-cols-2 gap-4">
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

                    <div className="h-64">
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
                )}
              </div>
            ))}
        </div>
      ))}

      <div className="fixed bottom-4 right-4">
        <button 
          onClick={() => setShowAddExerciseModal(true)}
          className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
        >
          +
        </button>
      </div>

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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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

      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Backup & Sync</h3>
            <div className="flex flex-col gap-4">
              <button className="flex items-center gap-2 bg-green-500 text-white p-2 rounded">
                <Download size={16} />
                Export Data
              </button>
              <button className="flex items-center gap-2 bg-yellow-500 text-white p-2 rounded">
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