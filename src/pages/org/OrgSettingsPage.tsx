import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  UserCheck,
  ArrowRight,
} from 'lucide-react'
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  useToast,
  Tabs,
} from '@/components/ui'
import {
  getCurrentOrganisation,
  updateOrganisationProfile,
} from '@/services/organisationService'
import {
  type Organisation,
  type OrganisationType,
  type SharingMode,
} from '@/types/organisation'

export function OrgSettingsPage() {
  const { success, error } = useToast()
  const [org, setOrg] = useState<Organisation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Editable Form State
  const [legalName, setLegalName] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<OrganisationType>('university')
  const [registrationId, setRegistrationId] = useState('')
  const [officialEmail, setOfficialEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Address
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')

  // Usage & Representative
  const [sharingMode, setSharingMode] = useState<SharingMode>('both')
  const [expectedVolume, setExpectedVolume] = useState<'occasional' | 'weekly' | 'daily' | 'high_throughput'>('daily')
  const [repName, setRepName] = useState('')
  const [repTitle, setRepTitle] = useState('')
  const [repEmail, setRepEmail] = useState('')
  const [repPhone, setRepPhone] = useState('')
  const [repDepartment, setRepDepartment] = useState('')

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        setLoading(true)
        const current = await getCurrentOrganisation()
        if (!isMounted) return
        setOrg(current)

        // Populate fields
        setName(current.name)
        setLegalName(current.legalName)
        setType(current.type)
        setRegistrationId(current.registrationId)
        setOfficialEmail(current.officialEmail)
        setPhone(current.phone)
        setWebsiteUrl(current.websiteUrl || '')

        setStreetAddress(current.address.streetAddress)
        setCity(current.address.city)
        setState(current.address.state)
        setPostalCode(current.address.postalCode)
        setCountry(current.address.country)

        setSharingMode(current.intendedUse.mode)
        setExpectedVolume(current.intendedUse.expectedVolume)

        setRepName(current.representative.fullName)
        setRepTitle(current.representative.jobTitle)
        setRepEmail(current.representative.email)
        setRepPhone(current.representative.phone)
        setRepDepartment(current.representative.department || '')
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    try {
      setSaving(true)
      const updated = await updateOrganisationProfile(org.id, {
        name,
        legalName,
        type,
        registrationId,
        officialEmail,
        phone,
        websiteUrl: websiteUrl || undefined,
        address: {
          streetAddress,
          city,
          state,
          postalCode,
          country,
        },
        intendedUse: {
          ...org.intendedUse,
          mode: sharingMode,
          expectedVolume,
        },
        representative: {
          ...org.representative,
          fullName: repName,
          jobTitle: repTitle,
          email: repEmail,
          phone: repPhone,
          department: repDepartment,
        },
      })

      setOrg(updated)
      success('Settings Saved', 'Organisation profile details have been updated.')
    } catch (err) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save profile updates.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !org) {
    return (
      <div className="py-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-600 mb-3" />
        <p className="text-sm font-medium text-neutral-600">Loading organisation settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Organisation Settings"
        subtitle="Manage legal profile, campus location, authorized governance representatives, and sharing preferences."
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Settings' },
        ]}
      />

      <Tabs
        tabs={[
          { id: 'profile', label: 'Profile & Location' },
          { id: 'verification', label: 'Verification & Actions' },
          { id: 'sharing', label: 'Sharing Preferences' },
          { id: 'governance', label: 'Signatory & Governance' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <form onSubmit={handleSave} className="space-y-6 mt-6">
        {/* TAB 1: PROFILE & LOCATION */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Legal Identity & Entity Profile"
                subtitle="Official naming and registry identifiers as recognized by relevant regulatory boards."
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Display Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Legal / Registered Name
                    </label>
                    <Input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Organisation Category
                    </label>
                    <Select
                      value={type}
                      onChange={(e) => setType(e.target.value as OrganisationType)}
                      options={[
                        { value: 'university', label: 'University / Higher Education' },
                        { value: 'research_lab', label: 'Research Institute / Lab' },
                        { value: 'makerspace', label: 'Makerspace / Innovation Hub' },
                        { value: 'corporate_rd', label: 'Corporate R&D Facility' },
                        { value: 'hospital', label: 'Medical Research & Hospital' },
                        { value: 'ngo', label: 'Non-Profit / NGO' },
                        { value: 'other', label: 'Other Specialised Facility' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Official Registration ID (CIN / URN / Charter Code)
                    </label>
                    <Input
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Institutional Domain Email
                    </label>
                    <Input
                      type="email"
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Official Phone Number
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Website URL
                  </label>
                  <Input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://your-institution.edu"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Campus & Physical Location"
                subtitle="Physical facility address for resource collection, courier delivery, and laboratory check-ins."
              />
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Street Address & Building / Hall
                  </label>
                  <Input
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      State / Province
                    </label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Postal Code
                    </label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Country
                    </label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: VERIFICATION & ACTION ITEMS */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Accreditation & Trust Clearance"
                subtitle="Platform clearance determines resource borrowing limits and insurance tier."
                action={
                  <Link to="/org/verification">
                    <Button variant="outline" size="xs">
                      View Verification Hub
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                }
              />
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-neutral-200 bg-neutral-50">
                  <div>
                    <span className="text-xs text-neutral-500 block">Verification Status</span>
                    <span className="text-sm font-bold text-neutral-900 capitalize">
                      {org.verificationStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Badge
                    variant={
                      org.verificationStatus === 'approved'
                        ? 'success'
                        : org.verificationStatus === 'additional_info_required' ||
                          org.verificationStatus === 'under_review'
                        ? 'warning'
                        : org.verificationStatus === 'rejected' || org.verificationStatus === 'suspended'
                        ? 'error'
                        : 'default'
                    }
                    showDot
                    size="md"
                  >
                    {org.verificationStatus.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>

                {org.tier && (
                  <div className="text-xs text-neutral-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Trust Tier: <strong className="capitalize">{org.tier.replace(/_/g, ' ')}</strong> (Unlimited inter-college exchange)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outstanding Action Items */}
            <Card>
              <CardHeader
                title="Outstanding Action Items"
                subtitle="Tasks and compliance updates required by platform administrators."
              />
              <CardContent>
                {org.outstandingActions.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-neutral-800">No Outstanding Actions</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Your institutional profile and compliance documentation are up to date.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {org.outstandingActions.map((action) => (
                      <div
                        key={action.id}
                        className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <h4 className="text-xs font-bold text-amber-950">{action.title}</h4>
                            <Badge variant="warning" size="sm">
                              {action.priority} priority
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-700 leading-relaxed pl-6">
                            {action.description}
                          </p>
                        </div>
                        <Link to="/org/verification">
                          <Button variant="primary" size="xs">
                            Resolve
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification History Log */}
            <Card>
              <CardHeader
                title="Verification History Summary"
                subtitle="Recent audit and verification lifecycle events."
              />
              <CardContent>
                <div className="space-y-3 text-xs">
                  {org.history.slice(0, 3).map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded border border-neutral-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-neutral-800">{h.title}</span>
                        <p className="text-neutral-500 text-[11px]">
                          By {h.actor} • {new Date(h.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="default" size="sm">
                        {h.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: SHARING PREFERENCES */}
        {activeTab === 'sharing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Resource Sharing Framework"
                subtitle="Configure whether your organisation primarily shares, borrows, or engages reciprocally."
              />
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Primary Sharing Mode
                  </label>
                  <Select
                    value={sharingMode}
                    onChange={(e) => setSharingMode(e.target.value as SharingMode)}
                    options={[
                      { value: 'both', label: 'Both List & Borrow Resources (Reciprocal)' },
                      { value: 'share_only', label: 'Share Only (Facility / Equipment Provider)' },
                      { value: 'borrow_only', label: 'Borrow Only (Consumer Institution)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Expected Utilization Frequency
                  </label>
                  <Select
                    value={expectedVolume}
                    onChange={(e) =>
                      setExpectedVolume(e.target.value as 'occasional' | 'weekly' | 'daily' | 'high_throughput')
                    }
                    options={[
                      { value: 'occasional', label: 'Occasional (A few times per term / semester)' },
                      { value: 'weekly', label: 'Weekly (Routine project scheduling)' },
                      { value: 'daily', label: 'Daily (Active research laboratory collaboration)' },
                      { value: 'high_throughput', label: 'High Throughput (Continuous core facility load)' },
                    ]}
                  />
                </div>

                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600 space-y-1">
                  <p className="font-semibold text-neutral-800">Reciprocal Trust Incentive:</p>
                  <p>
                    Institutions that both share and borrow receive a 15% priority boost in AI-driven matching
                    and inter-institutional booking requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: GOVERNANCE & SIGNATORY */}
        {activeTab === 'governance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Designated Authorised Signatory"
                subtitle="Institutional representative legally authorized to sign inter-college sharing agreements."
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Representative Full Name
                    </label>
                    <Input
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Job Title / Designation
                    </label>
                    <Input
                      value={repTitle}
                      onChange={(e) => setRepTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Department / Unit
                    </label>
                    <Input
                      value={repDepartment}
                      onChange={(e) => setRepDepartment(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Representative Email
                    </label>
                    <Input
                      type="email"
                      value={repEmail}
                      onChange={(e) => setRepEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Direct Phone
                    </label>
                    <Input
                      value={repPhone}
                      onChange={(e) => setRepPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <UserCheck className="h-4 w-4 text-brand-600 shrink-0" />
                  <span>
                    Official Mandate Signed: <strong>Yes</strong> (Charter document verified on file).
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            isLoading={saving}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
