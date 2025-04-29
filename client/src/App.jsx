// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth/Auth'
import Home from './pages/Home/Home'
import Verify from './pages/Auth/Verify'
import Room from './pages/Meeting/Room'


const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Routes>
      <Route path='/signup' element={<Auth type="signup" />} />
      <Route path='/login' element={<Auth type="login" />} />
      <Route path='/' element={<Home/>} />
      <Route element={<Verify/>}>
      <Route path='/meeting/:id' element={<Room/>} />
      </Route>
      {/*<Route path="*" element={<NotFound />} />*/}
      </Routes>
    </div>
  )
}

export default App
