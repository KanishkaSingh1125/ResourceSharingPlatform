import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

export function StartupNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section role="alert" style={{ maxWidth: 560, padding: 24, border: '1px solid #d5d9de', borderRadius: 8 }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        {children}
      </section>
    </main>
  )
}

export class RuntimeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ShareSphere] Application startup failed:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <StartupNotice title="ShareSphere couldn't start">
          <p>An unexpected application error occurred. Check the browser console for details.</p>
        </StartupNotice>
      )
    }
    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  document.body.textContent = 'ShareSphere could not start because its root element is missing.'
} else {
  const root = createRoot(rootElement)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => root.unmount())
  }
  const missingConfig = [
    !import.meta.env.VITE_SUPABASE_URL?.trim() && 'VITE_SUPABASE_URL',
    !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() && 'VITE_SUPABASE_ANON_KEY',
  ].filter((name): name is string => Boolean(name))

  if (missingConfig.length > 0) {
    root.render(
      <StartupNotice title="Supabase configuration is missing">
        <p>Add the following variable{missingConfig.length > 1 ? 's' : ''} to <code>.env.local</code>:</p>
        <ul>{missingConfig.map(name => <li key={name}><code>{name}</code></li>)}</ul>
        <p>Restart the development server after updating the file.</p>
      </StartupNotice>,
    )
  } else {
    void Promise.all([import('./lib/AuthContext'), import('./App')])
      .then(([{ AuthProvider }, { App }]) => {
        root.render(
          <StrictMode>
            <BrowserRouter>
              <RuntimeErrorBoundary>
                <AuthProvider>
                  <App />
                </AuthProvider>
              </RuntimeErrorBoundary>
            </BrowserRouter>
          </StrictMode>,
        )
      })
      .catch(error => {
        console.error('[ShareSphere] Application modules failed to load:', error)
        root.render(
          <StartupNotice title="ShareSphere couldn't start">
            <p>An application module failed to load. Check the browser console for details.</p>
          </StartupNotice>,
        )
      })
  }
}

