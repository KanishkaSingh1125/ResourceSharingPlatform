import { Building2, MapPin, ShieldCheck, ArrowRight, Package } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'

export interface OrganisationCardProps {
  id: string
  name: string
  type: string
  isVerified?: boolean
  location: string
  resourcesCount: number
  description?: string
  logoUrl?: string
  onViewProfile?: (id: string) => void
  onBrowseResources?: (id: string) => void
  className?: string
}

export function OrganisationCard({
  id,
  name,
  type,
  isVerified = true,
  location,
  resourcesCount,
  description,
  logoUrl,
  onViewProfile,
  onBrowseResources,
  className = '',
}: OrganisationCardProps) {
  return (
    <div
      className={`group rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition-all hover:border-neutral-300 hover:shadow-md flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden font-bold text-brand-700">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-brand-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-neutral-900 group-hover:text-brand-700 transition-colors line-clamp-1">
                  {name}
                </h3>
                {isVerified && (
                  <span title="Verified Organisation">
                    <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{type}</p>
            </div>
          </div>

          <Badge variant={isVerified ? 'success' : 'default'} size="sm">
            {isVerified ? 'Verified' : 'Pending'}
          </Badge>
        </div>

        {description && (
          <p className="mt-3 text-xs leading-relaxed text-neutral-600 line-clamp-2">
            {description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-1 font-medium text-neutral-700">
            <Package className="h-3.5 w-3.5 text-brand-600" />
            <span>{resourcesCount} shared resources</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewProfile && onViewProfile(id)}
          className="text-xs text-neutral-600"
        >
          View Profile
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBrowseResources && onBrowseResources(id)}
          rightIcon={<ArrowRight className="h-3 w-3" />}
          className="text-xs"
        >
          Browse Resources
        </Button>
      </div>
    </div>
  )
}
