import { Link } from 'react-router-dom'
import { Mail, ShieldCheck, MapPin, ExternalLink } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export function PublicFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                S
              </div>
              <span className="text-base font-bold text-neutral-900">ShareSphere</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mb-4">
              A secure, multi-organisation platform connecting verified colleges, laboratories,
              makerspaces, and technical institutions to share underused spaces, equipment, and research facilities responsibly.
            </p>
            <div className="space-y-1 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-neutral-400" />
                <span>support@sharesphere.org</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <span>Inter-Institutional Trust & Sharing Network</span>
              </div>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/explore" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Explore Resources
                </Link>
              </li>
              <li>
                <a href="/#organisations" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Organisations
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/design-system" className="text-neutral-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1">
                  <span>Design System</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Membership & Dashboards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-3">
              Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/join" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Join as an Individual
                </Link>
              </li>
              <li>
                <Link to="/register-org" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Register Organisation
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Member Dashboard
                </Link>
              </li>
              <li>
                <Link to="/org" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Organisation Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/help" className="text-neutral-500 hover:text-brand-600 transition-colors">
                  Help & Documentation
                </Link>
              </li>
              <li>
                <span className="text-neutral-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-neutral-400">Privacy Policy</span>
              </li>
              <li>
                <span className="text-neutral-400">Institutional SLA</span>
              </li>
              <li>
                <span className="text-neutral-400">Safety & Liability Guidelines</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-neutral-100 pt-6 gap-3">
          <p className="text-xs text-neutral-400">
            &copy; {CURRENT_YEAR} ShareSphere. Secure Multi-Organisation Resource Sharing.
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Owner-Controlled Access</span>
            </span>
            <span>•</span>
            <span>Audit-Logged Bookings</span>
            <span>•</span>
            <span>PostgreSQL RLS Protected</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
