import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Homescreen from './Homescreen.jsx'
import CartPage from './orders.jsx'
import Login from './Login.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Homescreen />} />
      <Route path="/home" element={<Homescreen />} />
      <Route path="/details" element={<CartPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
