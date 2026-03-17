'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const PI = Math.PI
const CIRCLE_RADIUS = 120

interface TimerState {
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number
  autoStartNext: boolean
  subject: string
  topic: string
  isRunning: boolean
  isWorkSession: boolean
  secondsRemaining: number
  cyclesCompleted: number
  totalSessionMinutes: number
  sessionStartTime: Date
  showSettings: boolean
  isComplete: boolean
}

export default function TimerPage() {
  const [state, setState] = useState<TimerState>({
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfter: 4,
    autoStartNext: true,
    subject: '',
    topic: '',
    isRunning: false,
    isWorkSession: true,
    secondsRemaining: 25 * 60,
    cyclesCompleted: 0,
    totalSessionMinutes: 0,
    sessionStartTime: new Date(),
    showSettings: true,
    isComplete: false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context on first user interaction
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (e) {
        console.log('Audio context not available')
      }
    }
  }, [])

  // Play beep sound
  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) return
      const ctx = audioContextRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.frequency.value = 440
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {
      console.log('Beep failed')
    }
  }, [])

  // Timer countdown logic
  useEffect(() => {
    if (!state.isRunning) return

    intervalRef.current = setInterval(() => {
      setState(prev => {
        let newSeconds = prev.secondsRemaining - 1

        if (newSeconds <= 0) {
          // Interval complete
          playBeep()

          if (prev.isWorkSession) {
            // Work session ended
            const newCycles = prev.cyclesCompleted + 1
            let nextIsWork = true
            let nextSeconds = prev.breakMinutes * 60

            // Check if long break needed
            if (newCycles % prev.longBreakAfter === 0) {
              nextSeconds = prev.longBreakMinutes * 60
            }

            // Check if all cycles complete (after long break)
            if (newCycles % prev.longBreakAfter === 0) {
              initializeAudioContext()
              const sessionMinutes = Math.round(
                (new Date().getTime() - prev.sessionStartTime.getTime()) / 60000
              )
              return {
                ...prev,
                cyclesCompleted: newCycles,
                isWorkSession: false,
                secondsRemaining: nextSeconds,
                totalSessionMinutes: sessionMinutes,
                isRunning: prev.autoStartNext,
                isComplete: false, // Will be marked complete on next break end
              }
            }

            // Normal break
            return {
              ...prev,
              cyclesCompleted: newCycles,
              isWorkSession: false,
              secondsRemaining: nextSeconds,
              isRunning: prev.autoStartNext,
            }
          } else {
            // Break session ended
            initializeAudioContext()
            const sessionMinutes = Math.round(
              (new Date().getTime() - prev.sessionStartTime.getTime()) / 60000
            )

            // Check if this was a long break (after completing cycles)
            if (prev.cyclesCompleted % prev.longBreakAfter === 0) {
              return {
                ...prev,
                isWorkSession: true,
                secondsRemaining: prev.workMinutes * 60,
                totalSessionMinutes: sessionMinutes,
                isComplete: true,
              }
            }

            // Regular break -> back to work
            return {
              ...prev,
              isWorkSession: true,
              secondsRemaining: prev.workMinutes * 60,
              isRunning: prev.autoStartNext,
            }
          }
        }

        return { ...prev, secondsRemaining: newSeconds }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.isRunning, state.isWorkSession, playBeep, initializeAudioContext])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        initializeAudioContext()
        setState(prev => ({
          ...prev,
          isRunning: !prev.isRunning,
          showSettings: false,
        }))
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        initializeAudioContext()
        setState(prev => ({
          ...prev,
          isRunning: false,
          isWorkSession: true,
          secondsRemaining: prev.workMinutes * 60,
          cyclesCompleted: 0,
          totalSessionMinutes: 0,
          sessionStartTime: new Date(),
          isComplete: false,
        }))
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        initializeAudioContext()
        setState(prev => ({
          ...prev,
          isRunning: false,
          isWorkSession: !prev.isWorkSession,
          secondsRemaining: prev.isWorkSession
            ? prev.breakMinutes * 60
            : prev.workMinutes * 60,
        }))
      } else if (e.key === 'Escape') {
        window.history.back()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [initializeAudioContext])

  const handleStart = useCallback(() => {
    initializeAudioContext()
    setState(prev => ({
      ...prev,
      isRunning: !prev.isRunning,
      showSettings: false,
    }))
  }, [initializeAudioContext])

  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isWorkSession: true,
      secondsRemaining: prev.workMinutes * 60,
      cyclesCompleted: 0,
      totalSessionMinutes: 0,
      sessionStartTime: new Date(),
      isComplete: false,
    }))
  }, [])

  const handleSkip = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isWorkSession: !prev.isWorkSession,
      secondsRemaining: prev.isWorkSession
        ? prev.breakMinutes * 60
        : prev.workMinutes * 60,
    }))
  }, [])

  const handleSaveSession = async () => {
    try {
      const response = await fetch('/api/pomodoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startedAt: state.sessionStartTime.toISOString(),
          endedAt: new Date().toISOString(),
          workMinutes: state.workMinutes,
          breakMinutes: state.breakMinutes,
          cyclesCompleted: state.cyclesCompleted,
          subject: state.subject || null,
          topicName: state.topic || null,
          status: 'completed',
          totalMinutes: state.totalSessionMinutes,
        }),
      })

      if (response.ok) {
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isComplete: false,
            isRunning: false,
            isWorkSession: true,
            secondsRemaining: prev.workMinutes * 60,
            cyclesCompleted: 0,
            totalSessionMinutes: 0,
            sessionStartTime: new Date(),
          }))
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  const handleStartAnother = useCallback(() => {
    setState(prev => ({
      ...prev,
      isComplete: false,
      isRunning: false,
      isWorkSession: true,
      secondsRemaining: prev.workMinutes * 60,
      cyclesCompleted: 0,
      totalSessionMinutes: 0,
      sessionStartTime: new Date(),
      showSettings: true,
    }))
  }, [])

  const minutes = Math.floor(state.secondsRemaining / 60)
  const seconds = state.secondsRemaining % 60
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // Calculate progress for SVG
  const totalSeconds = state.isWorkSession
    ? state.workMinutes * 60
    : state.isWorkSession === false && state.cyclesCompleted % state.longBreakAfter === 0
    ? state.longBreakMinutes * 60
    : state.breakMinutes * 60

  const progress = 1 - state.secondsRemaining / totalSeconds
  const circumference = 2 * PI * CIRCLE_RADIUS
  const offset = circumference * progress

  if (state.isComplete) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            position: 'fixed',
            top: '1.5rem',
            left: '1.5rem',
            background: 'transparent',
            border: 'none',
            color: 'white',
            opacity: 0.3,
            cursor: 'pointer',
            fontSize: '1.5rem',
            transition: 'opacity 0.2s',
            padding: '0.25rem',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
        >
          ×
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '2rem' }}>
            Session complete
          </h1>
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: '#aaa',
              marginBottom: '3rem',
            }}
          >
            {state.cyclesCompleted} cycles · {state.totalSessionMinutes} minutes focused
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleStartAnother}
              style={{
                paddingBlock: '0.75rem',
                paddingInline: '2rem',
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
            >
              Start another
            </button>
            <button
              onClick={handleSaveSession}
              style={{
                paddingBlock: '0.75rem',
                paddingInline: '2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              Log this session
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Exit Button */}
      <button
        onClick={() => window.history.back()}
        style={{
          position: 'fixed',
          top: '1.5rem',
          left: '1.5rem',
          background: 'transparent',
          border: 'none',
          color: 'white',
          opacity: 0.3,
          cursor: 'pointer',
          fontSize: '1.5rem',
          transition: 'opacity 0.2s',
          padding: '0.25rem',
          zIndex: 100,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
      >
        ×
      </button>

      {/* Settings Toggle Button */}
      <button
        onClick={() => setState(prev => ({ ...prev, showSettings: !prev.showSettings }))}
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          background: 'transparent',
          border: 'none',
          color: 'white',
          opacity: 0.5,
          cursor: 'pointer',
          fontSize: '1.5rem',
          transition: 'opacity 0.2s',
          zIndex: 100,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
      >
        ⚙️
      </button>

      {/* Settings Panel */}
      {state.showSettings && !state.isRunning && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#1a1a1a',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 200,
            maxWidth: '90%',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
            Settings
          </h2>

          {/* Work Minutes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>
              Work Duration (minutes)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, workMinutes: Math.max(1, prev.workMinutes - 1) }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                −
              </button>
              <span style={{ minWidth: '3rem', textAlign: 'center', fontSize: '1.125rem' }}>
                {state.workMinutes}
              </span>
              <button
                onClick={() => setState(prev => ({ ...prev, workMinutes: prev.workMinutes + 1 }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Break Minutes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>
              Break Duration (minutes)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, breakMinutes: Math.max(1, prev.breakMinutes - 1) }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                −
              </button>
              <span style={{ minWidth: '3rem', textAlign: 'center', fontSize: '1.125rem' }}>
                {state.breakMinutes}
              </span>
              <button
                onClick={() => setState(prev => ({ ...prev, breakMinutes: prev.breakMinutes + 1 }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Long Break After */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>
              Long Break After (cycles)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, longBreakAfter: Math.max(2, prev.longBreakAfter - 1) }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                −
              </button>
              <span style={{ minWidth: '3rem', textAlign: 'center', fontSize: '1.125rem' }}>
                {state.longBreakAfter}
              </span>
              <button
                onClick={() => setState(prev => ({ ...prev, longBreakAfter: prev.longBreakAfter + 1 }))}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Subject Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>
              Subject (optional)
            </label>
            <input
              type="text"
              value={state.subject}
              onChange={e => setState(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g., Chemistry"
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Topic Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>
              Topic (optional)
            </label>
            <input
              type="text"
              value={state.topic}
              onChange={e => setState(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Thermodynamics"
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Auto-start Toggle */}
          <div style={{ marginBottom: '0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.autoStartNext}
                onChange={e => setState(prev => ({ ...prev, autoStartNext: e.target.checked }))}
                style={{ cursor: 'pointer', width: '1.25rem', height: '1.25rem' }}
              />
              <span style={{ fontSize: '0.875rem' }}>Auto-start next interval</span>
            </label>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div style={{ textAlign: 'center', marginTop: '-2rem' }}>
        {/* Mode Label */}
        <div
          style={{
            fontSize: '0.875rem',
            color: '#777',
            letterSpacing: '0.15em',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {state.isWorkSession ? 'FOCUS' : 'BREAK'}
        </div>

        {/* Time Display with SVG Ring */}
        <div style={{ position: 'relative', width: '320px', height: '320px', margin: '0 auto 2rem' }}>
          <svg
            width="320"
            height="320"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <circle
              cx="160"
              cy="160"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
            />
            <circle
              cx="160"
              cy="160"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={state.isWorkSession ? '#3b82f6' : '#10b981'}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '160px 160px',
                transition: state.isRunning ? 'none' : 'stroke-dashoffset 0.5s ease',
              }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(72px, 12vw, 128px)',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                letterSpacing: '0.05em',
              }}
            >
              {timeString}
            </div>
          </div>
        </div>

        {/* Current Task */}
        {(state.subject || state.topic) && (
          <div style={{ fontSize: '0.875rem', color: '#777', marginBottom: '1.5rem' }}>
            {state.subject && <span>{state.subject}</span>}
            {state.subject && state.topic && <span> · </span>}
            {state.topic && <span>{state.topic}</span>}
          </div>
        )}

        {/* Cycle Indicator */}
        <div style={{ fontSize: '0.875rem', color: '#777', marginBottom: '2rem' }}>
          Cycle {state.cyclesCompleted + 1} / {state.longBreakAfter}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        {/* Reset Button */}
        <button
          onClick={handleReset}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
        >
          ↻
        </button>

        {/* Start/Pause Button */}
        <button
          onClick={handleStart}
          style={{
            background: 'transparent',
            border: '2px solid white',
            color: 'white',
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            transition: 'all 0.2s',
            fontWeight: 600,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {state.isRunning ? '⏸' : '▶'}
        </button>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
        >
          ⏭
        </button>
      </div>

      {/* Keyboard Help */}
      <div
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          color: '#666',
          textAlign: 'center',
        }}
      >
        <div>Space: Start/Pause | R: Reset | S: Skip | Esc: Exit</div>
      </div>
    </div>
  )
}
