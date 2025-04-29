import React from 'react'
import { useUser } from '../../context/UserContextApi'
import { Navigate, Outlet } from 'react-router-dom';

function Verify() {
    const {user,loading}=useUser();
    if(loading) return <div>Loading....</div>
  return (
    user ? <Outlet/> : <Navigate to='/login'/>
  )
}

export default Verify