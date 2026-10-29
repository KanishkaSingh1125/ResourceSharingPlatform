import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  createResource,
  getCategories,
  getOrgResources,
  updateResource,
} from '@/features/resources'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { Resource, ResourceCategory, ResourceType } from '@/types'

export function OrgResourcesPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('shared')
  const [capacity, setCapacity] = useState('1')
  const [requiresApproval, setRequiresApproval] = useState(true)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setResources([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [resourceResult, categoryResult] = await Promise.all([
      getOrgResources(activeOrganisation.id),
      getCategories(),
    ])
    if (resourceResult.error || categoryResult.error) {
      setError([resourceResult.error, categoryResult.error].filter(Boolean).join(' '))
    } else {
      setResources(resourceResult.data)
      setCategories(categoryResult.data)
    }
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  const canManage = ['owner', 'admin', 'manager'].includes(activeOrganisation?.my_role ?? '')

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeOrganisation) return
    const parsedCapacity = Number(capacity)
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError('Capacity must be a positive whole number.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await createResource({
      org_id: activeOrganisation.id,
      category_id: categoryId || undefined,
      name: name.trim(),
      description: description.trim(),
      location: location.trim(),
      resource_type: resourceType,
      capacity: parsedCapacity,
      requires_approval: requiresApproval,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setName('')
    setCategoryId('')
    setDescription('')
    setLocation('')
    setResourceType('shared')
    setCapacity('1')
    setRequiresApproval(true)
    setShowForm(false)
    setNotice('Resource created as a draft. Review its details and publish it when ready.')
    await load()
  }

  async function togglePublication(resource: Resource) {
    const publication_status = resource.publication_status === 'published' ? 'draft' : 'published';
    setSaving(true);
    setError(null);
    const result = await updateResource(resource.id, { publication_status });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Refresh the list from the server to reflect the persisted change
    await load();
    setNotice(publication_status === 'published' ? 'Resource published.' : 'Resource moved to draft.');
  }

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to manage resources.'}</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage listings for {activeOrganisation.name}.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
          {canManage && (
            <Button type="button" size="sm" onClick={() => setShowForm(current => !current)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add resource
            </Button>
          )}
        </div>
      </div>
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

      {showForm && canManage && (
        <Card className="mt-5">
          <h2 className="text-lg font-semibold text-neutral-900">Create a resource draft</h2>
          <form onSubmit={event => void handleCreate(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700">
              Resource name
              <input required maxLength={160} value={name} onChange={event => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Category
              <select value={categoryId} onChange={event => setCategoryId(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="">Uncategorised</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-neutral-700 sm:col-span-2">
              Description
              <textarea maxLength={3000} rows={3} value={description} onChange={event => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Location
              <input maxLength={250} value={location} onChange={event => setLocation(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Resource type
              <select value={resourceType} onChange={event => setResourceType(event.target.value as ResourceType)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="shared">Shared</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Capacity
              <input type="number" min="1" step="1" required value={capacity} onChange={event => setCapacity(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={requiresApproval} onChange={event => setRequiresApproval(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300" />
              Require organisation approval for booking requests
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create draft'}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-5 space-y-3" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading resources…</Card>
        ) : error && resources.length === 0 ? null : resources.length === 0 ? (
          <Card className="py-10 text-center text-sm text-neutral-600">No resources are listed for this organisation yet.</Card>
        ) : resources.map(resource => (
          <Card key={resource.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-neutral-900">{resource.name}</h2>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{resource.publication_status.replace('_', ' ')}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">{resource.description || 'No description provided.'}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {resource.resource_type} · Capacity {resource.capacity}
                {resource.location && ` · ${resource.location}`}
                {resource.resource_categories?.name && ` · ${resource.resource_categories.name}`}
              </p>
            </div>
            {canManage && resource.publication_status !== 'archived' && resource.publication_status !== 'suspended' && (
              <Button type="button" variant="outline" size="sm" disabled={saving}
                onClick={() => void togglePublication(resource)}>
                {resource.publication_status === 'published' ? 'Move to draft' : 'Publish'}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
