import React, { useEffect } from 'react'
import { IDEProvider } from '../context/IDEContext'
import Shell from '../components/layout/Shell'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { LocalAgentService } from '../services/LocalAgentService'

export default function App() {
  const modelPath = useSelector((state: RootState) => state.app.localModelPath);

  useEffect(() => {
    if (modelPath) {
      LocalAgentService.setModelPath(modelPath);
    }
  }, [modelPath]);

  return (
    <IDEProvider>
      <Shell />
    </IDEProvider>
  )
}
