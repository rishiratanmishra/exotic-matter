import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import appReducer from './appSlice';
import editorReducer from './editorSlice';
import planReducer from './planSlice';
import idbStorage from './idbStorage';

const rootReducer = combineReducers({
  app: appReducer,
  editor: editorReducer,
  plan: planReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: idbStorage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
