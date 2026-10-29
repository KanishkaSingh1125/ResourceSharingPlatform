import { type ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  icon?: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}: TabsProps) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        className={`inline-flex items-center gap-1 rounded-lg bg-neutral-100 p-1 text-sm ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : isActive
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              {tab.icon && <span className="h-3.5 w-3.5 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-800'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`border-b border-neutral-200 ${className}`}>
      <nav role="tablist" className="-mb-px flex space-x-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
                tab.disabled
                  ? 'opacity-40 cursor-not-allowed border-transparent text-neutral-400'
                  : isActive
                  ? 'border-brand-600 text-brand-700 font-semibold'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
              }`}
            >
              {tab.icon && (
                <span
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-brand-600' : 'text-neutral-400 group-hover:text-neutral-500'
                  }`}
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

