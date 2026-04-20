import { Routes, Route } from 'react-router-dom'
import ClassListPage from './pages/ClassListPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClassListPage />} />
      <Route path="/classes" element={<ClassListPage />} />
    </Routes>
  )
}
