import React from 'react'
import { Outlet, Navigate } from 'react-router'

export default function AuthMiddleware(){
    const auth_token = localStorage.getItem('auth_token')
    if(auth_token){
        return <Outlet/>
    }
    else{
        return <Navigate to={'/login'}/>
    }
}