import React, { useState, useEffect, useRef } from 'react';

// Configuration
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const COUNTDOWN_SECONDS = 60; // 60 seconds warning countdown

export default function IdleTimeoutModal() {
  const [isIdle, setIsIdle] = useState(false);
  const [remainingTime, setRemainingTime] = useState(COUNTDOWN_SECONDS);
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetIdleTimer = () => {
    if (isIdle) return; // Don't reset if we are already showing the modal
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setRemainingTime(COUNTDOWN_SECONDS);
    }, IDLE_TIMEOUT_MS);
  };

  // Setup event listeners for user activity
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    const handleActivity = () => resetIdleTimer();
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetIdleTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isIdle]);

  // Handle the modal countdown
  useEffect(() => {
    if (isIdle) {
      countdownTimerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isIdle]);

  const handleStayLoggedIn = () => {
    setIsIdle(false);
    resetIdleTimer();
  };

  const handleLogout = () => {
    // In a real application, you would clear auth tokens here before redirecting
    alert("You have been automatically logged out due to inactivity.");
    window.location.href = "/login";
  };

  if (!isIdle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-opacity">
      <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        
        <div className="flex justify-center">
          <div className="bg-red-500/20 p-4 rounded-full ring-4 ring-red-500/10">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Are you still there?</h3>
          <p className="mt-3 text-slate-400 font-medium leading-relaxed">
            You've been idle for 10 minutes. For your security, you will be automatically logged out in:
          </p>
        </div>

        <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-orange-500 my-6">
          {remainingTime}s
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <button 
            onClick={handleLogout}
            className="px-5 py-3 rounded-xl font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Log Out Now
          </button>
          <button 
            onClick={handleStayLoggedIn}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            I'm still here
          </button>
        </div>
      </div>
    </div>
  );
}
