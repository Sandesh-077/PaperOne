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
  isLongBreak: boolean
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
    isLongBreak: false,
    secondsRemaining: 25 * 60,
    cyclesCompleted: 0,
    totalSessionMinutes: 0,
    sessionStartTime: new Date(),
    showSettings: true,
    isComplete: false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const phaseEndTimeRef = useRef<number | null>(null)

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

  const getElapsedMinutes = useCallback((startedAt: Date, endedAtMs: number) => {
    const elapsedMs = Math.max(0, endedAtMs - startedAt.getTime())
    return Math.max(1, Math.round(elapsedMs / 60000))
  }, [])

  const transitionToNextPhase = useCallback(
    (prev: TimerState, endedAtMs: number): TimerState => {
      playBeep()

      if (prev.isWorkSession) {
        const newCycles = prev.cyclesCompleted + 1
        const nextIsLongBreak = newCycles % prev.longBreakAfter === 0
        const nextSeconds = (nextIsLongBreak ? prev.longBreakMinutes : prev.breakMinutes) * 60

        return {
          ...prev,
          cyclesCompleted: newCycles,
          isWorkSession: false,
          isLongBreak: nextIsLongBreak,
          secondsRemaining: nextSeconds,
          isRunning: prev.autoStartNext,
        }
      }

      if (prev.isLongBreak) {
        const sessionMinutes = getElapsedMinutes(prev.sessionStartTime, endedAtMs)
        initializeAudioContext()

        return {
          ...prev,
          isWorkSession: true,
          isLongBreak: false,
          isRunning: false,
          secondsRemaining: prev.workMinutes * 60,
          totalSessionMinutes: sessionMinutes,
          isComplete: true,
        }
      }

      return {
        ...prev,
        isWorkSession: true,
        isLongBreak: false,
        secondsRemaining: prev.workMinutes * 60,
        isRunning: prev.autoStartNext,
      }
    },
    [getElapsedMinutes, initializeAudioContext, playBeep]
  )

  const handleStop = useCallback(async () => {
    const now = Date.now()
    const currentPhaseTotalSeconds = state.isWorkSession
      ? state.workMinutes * 60
      : state.isLongBreak
      ? state.longBreakMinutes * 60
      : state.breakMinutes * 60

    const progressed =
      state.cyclesCompleted > 0 ||
      state.secondsRemaining < currentPhaseTotalSeconds

    const elapsedMinutes = getElapsedMinutes(state.sessionStartTime, now)

    if (progressed && elapsedMinutes > 0) {
      try {
        await fetch('/api/pomodoro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startedAt: state.sessionStartTime.toISOString(),
            endedAt: new Date(now).toISOString(),
            workMinutes: state.workMinutes,
            breakMinutes: state.breakMinutes,
            cyclesCompleted: state.cyclesCompleted,
            subject: state.subject || null,
            topicName: state.topic || null,
            status: 'abandoned',
            totalMinutes: elapsedMinutes,
          }),
        })
      } catch (error) {
        console.error('Failed to save stopped session:', error)
      }
    }

    phaseEndTimeRef.current = null
    setState(prev => ({
      ...prev,
      isRunning: false,
      isWorkSession: true,
      isLongBreak: false,
      secondsRemaining: prev.workMinutes * 60,
      cyclesCompleted: 0,
      totalSessionMinutes: 0,
      sessionStartTime: new Date(now),
      isComplete: false,
      showSettings: true,
    }))
  }, [
    getElapsedMinutes,
    state.breakMinutes,
    state.cyclesCompleted,
    state.isLongBreak,
    state.isWorkSession,
    state.secondsRemaining,
    state.sessionStartTime,
    state.subject,
    state.topic,
    state.workMinutes,
    state.longBreakMinutes,
  ])

  // Timer countdown logic
  useEffect(() => {
    if (!state.isRunning) {
      phaseEndTimeRef.current = null
      return
    }

    if (!phaseEndTimeRef.current) {
      phaseEndTimeRef.current = Date.now() + state.secondsRemaining * 1000
    }

    const tick = () => {
      const endTime = phaseEndTimeRef.current ?? Date.now()
      const remainingMs = endTime - Date.now()

      if (remainingMs <= 0) {
        setState(prev => {
          const now = Date.now()
          const next = transitionToNextPhase(prev, now)
          phaseEndTimeRef.current = next.isRunning ? now + next.secondsRemaining * 1000 : null
          return next
        })
        return
      }

      setState(prev => {
        const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
        if (nextSeconds === prev.secondsRemaining) return prev
        return { ...prev, secondsRemaining: nextSeconds }
      })
    }

    tick()
    intervalRef.current = setInterval(tick, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.isRunning, state.secondsRemaining, transitionToNextPhase])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        initializeAudioContext()
        setState(prev => {
          const now = Date.now()
          const willRun = !prev.isRunning

          if (willRun) {
            const isNewSession =
              prev.cyclesCompleted === 0 &&
              prev.isWorkSession &&
              prev.secondsRemaining === prev.workMinutes * 60

            phaseEndTimeRef.current = now + prev.secondsRemaining * 1000
            return {
              ...prev,
              isRunning: true,
              showSettings: false,
              sessionStartTime: isNewSession ? new Date(now) : prev.sessionStartTime,
            }
          }

          phaseEndTimeRef.current = null
          return {
            ...prev,
            isRunning: false,
            showSettings: false,
          }
        })
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        initializeAudioContext()
        phaseEndTimeRef.current = null
        setState(prev => ({
          ...prev,
          isRunning: false,
          isWorkSession: true,
          isLongBreak: false,
          secondsRemaining: prev.workMinutes * 60,
          cyclesCompleted: 0,
          totalSessionMinutes: 0,
          sessionStartTime: new Date(),
          isComplete: false,
        }))
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        initializeAudioContext()
        phaseEndTimeRef.current = null
        setState(prev => {
          if (prev.isWorkSession) {
            const newCycles = prev.cyclesCompleted + 1
            const nextIsLongBreak = newCycles % prev.longBreakAfter === 0

            return {
              ...prev,
              isRunning: false,
              isWorkSession: false,
              isLongBreak: nextIsLongBreak,
              cyclesCompleted: newCycles,
              secondsRemaining: (nextIsLongBreak ? prev.longBreakMinutes : prev.breakMinutes) * 60,
            }
          }

          return {
            ...prev,
            isRunning: false,
            isWorkSession: true,
            isLongBreak: false,
            secondsRemaining: prev.workMinutes * 60,
          }
        })
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        void handleStop()
      } else if (e.key === 'Escape') {
        window.history.back()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleStop, initializeAudioContext])

  const handleStart = useCallback(() => {
    initializeAudioContext()
    setState(prev => {
      const now = Date.now()
      const willRun = !prev.isRunning

      if (willRun) {
        const isNewSession =
          prev.cyclesCompleted === 0 &&
          prev.isWorkSession &&
          prev.secondsRemaining === prev.workMinutes * 60

        phaseEndTimeRef.current = now + prev.secondsRemaining * 1000

        return {
          ...prev,
          isRunning: true,
          showSettings: false,
          sessionStartTime: isNewSession ? new Date(now) : prev.sessionStartTime,
        }
      }

      phaseEndTimeRef.current = null
      return {
        ...prev,
        isRunning: false,
        showSettings: false,
      }
    })
  }, [initializeAudioContext])

  const handleReset = useCallback(() => {
    phaseEndTimeRef.current = null
    setState(prev => ({
      ...prev,
      isRunning: false,
      isWorkSession: true,
      isLongBreak: false,
      secondsRemaining: prev.workMinutes * 60,
      cyclesCompleted: 0,
      totalSessionMinutes: 0,
      sessionStartTime: new Date(),
      isComplete: false,
    }))
  }, [])

  const handleSkip = useCallback(() => {
    phaseEndTimeRef.current = null
    setState(prev => {
      if (prev.isWorkSession) {
        const newCycles = prev.cyclesCompleted + 1
        const nextIsLongBreak = newCycles % prev.longBreakAfter === 0

        return {
          ...prev,
          isRunning: false,
          isWorkSession: false,
          isLongBreak: nextIsLongBreak,
          cyclesCompleted: newCycles,
          secondsRemaining: (nextIsLongBreak ? prev.longBreakMinutes : prev.breakMinutes) * 60,
        }
      }

      return {
        ...prev,
        isRunning: false,
        isWorkSession: true,
        isLongBreak: false,
        secondsRemaining: prev.workMinutes * 60,
      }
    })
  }, [])

  const handleSaveSession = async () => {
    try {
      const computedMinutes = Math.max(
        state.totalSessionMinutes,
        getElapsedMinutes(state.sessionStartTime, Date.now())
      )

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
          totalMinutes: computedMinutes,
        }),
      })

      if (response.ok) {
        phaseEndTimeRef.current = null
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isComplete: false,
            isRunning: false,
            isWorkSession: true,
            isLongBreak: false,
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
    phaseEndTimeRef.current = null
    setState(prev => ({
      ...prev,
      isComplete: false,
      isRunning: false,
      isWorkSession: true,
      isLongBreak: false,
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
    : state.isLongBreak
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
        boxSizing: 'border-box',
        padding: '1.5rem',
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
            width: 'min(560px, calc(100vw - 2rem))',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
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
      <div
        style={{
          textAlign: 'center',
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
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
          {state.isWorkSession ? 'FOCUS' : state.isLongBreak ? 'LONG BREAK' : 'BREAK'}
        </div>

        {/* Time Display with SVG Ring */}
        <div
          style={{
            position: 'relative',
            width: 'min(78vw, 320px)',
            height: 'min(78vw, 320px)',
            maxWidth: '320px',
            maxHeight: '320px',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg
            width="320"
            height="320"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
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
      <div
        style={{
          display: 'flex',
          gap: '1rem 2rem',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '420px',
        }}
      >
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

        {/* Stop Button */}
        <button
          onClick={() => void handleStop()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(239,68,68,0.5)',
            color: '#fca5a5',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            transition: 'all 0.2s',
            fontWeight: 700,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.9)'
            e.currentTarget.style.color = '#fecaca'
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
            e.currentTarget.style.color = '#fca5a5'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          ■
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
          width: '100%',
          maxWidth: '420px',
          paddingInline: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <div>Space: Start/Pause | X: Stop | R: Reset | S: Skip | Esc: Exit</div>
      </div>
    </div>
  )
}
