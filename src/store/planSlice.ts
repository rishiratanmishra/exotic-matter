import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface Artifact {
  id: string;
  title: string;
  type: 'plan' | 'walkthrough' | 'code' | 'other';
  content: string;
}

interface PlanState {
  tasks: Task[];
  artifacts: Artifact[];
  currentStep: number;
}

const initialState: PlanState = {
  tasks: [],
  artifacts: [],
  currentStep: 0,
};

const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    setTasks(state, action: PayloadAction<Task[]>) {
      state.tasks = action.payload;
    },
    updateTaskStatus(state, action: PayloadAction<{ id: string; status: Task['status'] }>) {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (task) task.status = action.payload.status;
    },
    addArtifact(state, action: PayloadAction<Artifact>) {
      state.artifacts.push(action.payload);
    },
    updateArtifact(state, action: PayloadAction<Artifact>) {
      const index = state.artifacts.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.artifacts[index] = action.payload;
      } else {
        state.artifacts.push(action.payload);
      }
    },
    clearPlan(state) {
      state.tasks = [];
      state.artifacts = [];
      state.currentStep = 0;
    },
  },
});

export const { setTasks, updateTaskStatus, addArtifact, updateArtifact, clearPlan } = planSlice.actions;
export default planSlice.reducer;
