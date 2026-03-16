'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigationGroups = [
  {
    label: 'Study',
    items: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Planner', href: '/planner' },
      { name: 'Session Log', href: '/session-log' },
      { name: 'Sessions', href: '/sessions' },
    ]
  },
  {
    label: 'Skills',
    items: [
      { name: 'Essays', href: '/essays' },
      { name: 'English Trainer', href: '/english-trainer' },
      { name: 'Mistake Log', href: '/mistake-log' },
    ]
  },
  {
    label: 'Progress',
    items: [
      { name: 'Topic Mastery', href: '/topic-mastery' },
      { name: 'Weekly Tracker', href: '/weekly-tracker' },
    ]
  },
  {
    label: 'SAT',
    items: [
      { name: 'SAT Prep', href: '/sat' },
    ]
  },
  {
    label: 'Tools',
    items: [
      { name: 'Pomodoro', href: '/pomodoro-routine' },
    ]
  },
]

function DropdownMenu({ label, items, pathname }: { label: string; items: any[]; pathname: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasActiveItem = items.some(item => pathname === item.href)

  return (
    <div className="relative group">
      <button
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          hasActiveItem
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
      <div className={`absolute left-0 mt-0 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${
        isOpen ? 'block' : 'hidden group-hover:block'
      }`}>
        <div className="py-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-2 text-sm ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">PaperOne</span>
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-2">
              {navigationGroups.map((group) => (
                <DropdownMenu
                  key={group.label}
                  label={group.label}
                  items={group.items}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/profile">
              <span className="hidden sm:block text-sm text-gray-700 cursor-pointer hover:underline">
                {session?.user?.name || session?.user?.email}
              </span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="hidden sm:block text-sm text-gray-700 hover:text-gray-900"
            >
              Sign out
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 flex justify-between items-center"
                >
                  {group.label}
                  <svg className={`h-4 w-4 transition-transform ${openDropdown === group.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                {openDropdown === group.label && (
                  <div className="pl-4 space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => {
                            setMobileMenuOpen(false)
                            setOpenDropdown(null)
                          }}
                          className={`block px-3 py-2 rounded-md text-sm font-medium ${
                            isActive
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }`}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <div className="px-3 py-2 text-sm text-gray-600">{session?.user?.name || session?.user?.email}</div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
