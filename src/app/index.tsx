import React from 'react'
import { IDEProvider } from '../context/IDEContext'
import Shell from '../components/layout/Shell'

export default function App() {
  return (
    <IDEProvider>
      <Shell />
    </IDEProvider>
  )
}
