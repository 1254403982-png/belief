import { Routes, Route, Navigate } from 'react-router-dom'
import BrandScreen from './components/BrandScreen'
import BeliefCanvas from './components/BeliefCanvas'
import { useLanguage } from './i18n'

export default function App() {
  useLanguage()
  return (
    <Routes>
      <Route path="/" element={<BrandScreen />} />
      <Route path="/canvas" element={<BeliefCanvas />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
