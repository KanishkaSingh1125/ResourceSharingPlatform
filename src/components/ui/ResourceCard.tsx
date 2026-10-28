import { type ReactNode } from 'react'
import { MapPin, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
import { Badge, type BadgeVariant } from './Badge'
import { Button } from './Button'

export type ResourceAvailability = 'available' | 'in_use' | 'maintenance' | 'reserved'
export type ResourceAccessLevel = 'open' | 'members_only' | 'approval_required'

export interface ResourceCardProps {
  id: string
  title: string
  category: string
  organisationName: string
  isOrgVerified?: boolean
  location: string
  imageUrl?: string
  icon?: ReactNode
  availabilityStatus: ResourceAvailability
  accessLevel?: ResourceAccessLevel
  rate?: string
  onViewDetails?: (id: string) => void
  onRequestAccess?: (id: string) => void
  className?: string
}

const statusBadgeConfig: Record<
  ResourceAvailability,
  { label: string; variant: BadgeVariant }
> = {
  available: { label: 'Available', variant: 'success' },
  in_use: { label: 'In Use', variant: 'warning' },
  maintenance: { label: 'Maintenance', variant: 'error' },
  reserved: { label: 'Reserved', variant: 'default' },
}

const accessLevelLabels: Record<ResourceAccessLevel, string> = {
  open: 'Open Access',
  members_only: 'Members Only',
  approval_required: 'Approval Required',
}

export function ResourceCard({
  id,
  title,
  category,
  organisationName,
  isOrgVerified = true,
  location,
  imageUrl,
  icon,
  availabilityStatus,
  accessLevel = 'approval_required',
  rate = 'Institutional Sharing',
  onViewDetails,
  onRequestAccess,
  className = '',
}: ResourceCardProps) {
  const statusConfig = statusBadgeConfig[availabilityStatus]

  return (
    <div
      className={`group flex flex-col justify-between overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs transition-all hover:border-neutral-300 hover:shadow-md ${className}`}
    >
      <div>
        {/* Visual / Banner Header */}
        <div className="relative h-44 w-full overflow-hidden bg-neutral-100 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
              {icon || (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-200/60 text-neutral-600 font-semibold text-lg">
                  {title.charAt(0)}
                </div>
              )}
              <span className="text-xs uppercase tracking-wider font-medium text-neutral-400">
                {category}
              </span>
            </div>
          )}

          {/* Availability Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={statusConfig.variant} showDot size="sm">
              {statusConfig.label}
            </Badge>
          </div>

          {/* Access level pill */}
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-neutral-900/70 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-medium text-white">
              {accessLevelLabels[accessLevel]}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="font-medium text-brand-700">{category}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rate}
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-neutral-900 group-hover:text-brand-700 transition-colors line-clamp-1">
            {title}
          </h3>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="font-medium text-neutral-800 line-clamp-1">
              {organisationName}
            </span>
            {isOrgVerified && (
              <span title="Verified Organisation">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600 shrink-0" />
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Card Footer / Actions */}
      <div className="border-t border-neutral-100 bg-neutral-50/50 p-4 pt-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails && onViewDetails(id)}
          className="text-xs text-neutral-600 hover:text-neutral-900"
        >
          Details
        </Button>

        <Button
          variant="primary"
          size="sm"
          disabled={availabilityStatus === 'maintenance'}
          onClick={() => onRequestAccess && onRequestAccess(id)}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          className="text-xs"
        >
          Request
        </Button>
      </div>
    </div>
  )
}
