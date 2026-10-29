import { useState } from 'react'
import {
  Sparkles,
  Filter,
  Package,
  Building2,
  Calendar,
  Users,
  Download,
  Plus,
  Microscope,
  Cpu,
  Trash2,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Input,
  Textarea,
  SearchBar,
  Select,
  FilterDropdown,
  DropdownMenu,
  ResourceCard,
  OrganisationCard,
  StatCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  Modal,
  ConfirmDialog,
  useToast,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  EmptyState,
  Pagination,
  FileUpload,
  type UploadedFileItem,
  DateTimePicker,
  Alert,
  ErrorMessage,
  PageHeader,
} from '@/components/ui'

export function DesignSystemPage() {
  const toast = useToast()

  // State controls for interactive demos
  const [activeTab, setActiveTab] = useState('overview')
  const [activePillTab, setActivePillTab] = useState('all')
  const [searchValue, setSearchValue] = useState('')
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [filterValues, setFilterValues] = useState<string[]>(['cleanroom', 'compute'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(2)
  const [selectedDate, setSelectedDate] = useState('2026-10-30')
  const [selectedSlot, setSelectedSlot] = useState('10:00 - 11:00')
  const [showAlert, setShowAlert] = useState(true)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const [textareaValue, setTextareaValue] = useState('')

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([
    {
      id: 'f1',
      name: 'lab_safety_compliance_cert.pdf',
      size: 1420000,
      status: 'completed',
    },
    {
      id: 'f2',
      name: 'institutional_approval_letter.docx',
      size: 512000,
      status: 'uploading',
      progress: 68,
    },
  ])

  const demoTabs = [
    { id: 'overview', label: 'Overview & Primitives' },
    { id: 'forms', label: 'Inputs & Form Controls', count: 6 },
    { id: 'cards', label: 'Cards & Domain Views', count: 3 },
    { id: 'feedback', label: 'Overlays & Feedback', count: 5 },
    { id: 'data', label: 'Data & Navigation', count: 4 },
  ]

  const demoPillTabs = [
    { id: 'all', label: 'All Equipment' },
    { id: 'labs', label: 'Cleanrooms & Labs', count: 12 },
    { id: 'computing', label: 'Compute Clusters', count: 4 },
    { id: 'prototyping', label: '3D & Prototyping', count: 8 },
  ]

  const filterOptions = [
    { id: 'cleanroom', label: 'Class 100 Cleanroom', count: 4 },
    { id: 'compute', label: 'GPU Cluster (H100)', count: 2 },
    { id: 'spectrometry', label: 'Mass Spectrometry', count: 7 },
    { id: 'bioprinting', label: 'Bioprinting', count: 3 },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Page Header Component Showcase */}
      <PageHeader
        title="ShareSphere Design System"
        subtitle="A cohesive, accessible UI component library built for multi-organisation resource discovery, reservation workflows, and administrative dashboards."
        badge={
          <Badge variant="primary" showDot size="md">
            v1.0 Tokens & Primitives
          </Badge>
        }
        breadcrumbs={[
          { label: 'Public', to: '/' },
          { label: 'Design System' },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.info('Design tokens exported', 'Tokens are defined in index.css')}
            >
              Export Tokens
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => toast.success('Theme Active', 'Inter font and brand palettes loaded')}
            >
              Verify Palette
            </Button>
          </>
        }
      />

      {/* Tabs navigation */}
      <Tabs
        tabs={demoTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-8"
      />

      {/* SECTION 1: BUTTONS & BADGES & TOASTS */}
      {(activeTab === 'overview' || activeTab === 'feedback') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">1. Buttons & Badges</h2>
            <p className="text-xs text-neutral-500">
              Semantic variants, multiple size scales, loading indicators, and status badges.
            </p>
          </div>

          <Card>
            <CardHeader
              title="Button Variants & Sizes"
              subtitle="All buttons support left/right icons, loading spinners, and disabled states."
            />
            <CardContent className="space-y-6">
              {/* Variants */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Variants
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="subtle">Subtle</Button>
                  <Button variant="danger">Danger</Button>
                  <Button
                    variant="primary"
                    isLoading={isButtonLoading}
                    onClick={() => {
                      setIsButtonLoading(true)
                      setTimeout(() => setIsButtonLoading(false), 2000)
                    }}
                  >
                    Click to Load
                  </Button>
                  <Button variant="outline" disabled>
                    Disabled
                  </Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Sizes & Icons
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs" leftIcon={<Plus className="h-3 w-3" />}>
                    Extra Small (xs)
                  </Button>
                  <Button size="sm" leftIcon={<Filter className="h-3.5 w-3.5" />}>
                    Small (sm)
                  </Button>
                  <Button size="md" rightIcon={<Sparkles className="h-4 w-4" />}>
                    Medium (md)
                  </Button>
                  <Button size="lg" leftIcon={<Calendar className="h-5 w-5" />}>
                    Large (lg)
                  </Button>
                </div>
              </div>

              {/* Status Badges */}
              <div className="border-t border-neutral-100 pt-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Status Badges
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary" showDot>
                    Verified Org
                  </Badge>
                  <Badge variant="success" showDot>
                    Available
                  </Badge>
                  <Badge variant="warning" showDot>
                    Under Review
                  </Badge>
                  <Badge variant="error" showDot>
                    Maintenance
                  </Badge>
                  <Badge variant="info">Institutional</Badge>
                  <Badge variant="purple" showDot>
                    AI Matched
                  </Badge>
                </div>
              </div>

              {/* Toast Triggers */}
              <div className="border-t border-neutral-100 pt-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Toast Notifications Demo
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success(
                        'Booking Confirmed',
                        'Reservation #BK-8921 has been sent to MIT Lab manager.'
                      )
                    }
                  >
                    Trigger Success Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.error(
                        'Verification Required',
                        'Please upload your institutional ID to request this resource.'
                      )
                    }
                  >
                    Trigger Error Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.warning(
                        'Slot Nearing Capacity',
                        'Only 1 workstation remaining for the selected time window.'
                      )
                    }
                  >
                    Trigger Warning Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info(
                        'Maintenance Scheduled',
                        'Cryo-EM microscope undergoes calibration every Monday 08:00.'
                      )
                    }
                  >
                    Trigger Info Toast
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* SECTION 2: FORMS, SEARCH & INPUTS */}
      {(activeTab === 'overview' || activeTab === 'forms') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">
              2. Inputs, Search, Dropdowns & Date Selection
            </h2>
            <p className="text-xs text-neutral-500">
              High-contrast forms, search bar with shortcut tags, custom dropdowns, and file uploads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input fields */}
            <Card>
              <CardHeader title="Text Inputs & Textareas" />
              <CardContent className="space-y-4">
                <Input
                  label="Resource Name"
                  placeholder="e.g. PerkinElmer Spectrum Two FTIR"
                  isRequired
                  helperText="Enter the official equipment name as listed by manufacturer."
                />

                <Input
                  label="Institutional Email"
                  placeholder="name@university.edu"
                  errorText="Please use your official .edu or institutional domain."
                  defaultValue="user@gmail.com"
                />

                <Textarea
                  label="Technical Specifications & Access Rules"
                  placeholder="Describe required safety training, consumable fees, or operating procedures..."
                  rows={3}
                  maxCharacters={300}
                  currentCount={textareaValue.length}
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  optionalLabel="Optional"
                />
              </CardContent>
            </Card>

            {/* Search & Dropdown Controls */}
            <Card>
              <CardHeader title="Search & Filter Controls" />
              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-neutral-600 mb-2">
                    Universal Search Bar
                  </p>
                  <SearchBar
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search by resource, keyword, or lab name..."
                    shortcutKey="⌘K"
                    isLoading={isSearchLoading}
                    onSubmit={(q) => {
                      setIsSearchLoading(true)
                      setTimeout(() => {
                        setIsSearchLoading(false)
                        toast.info(`Search executed for: "${q}"`)
                      }, 1000)
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Select
                    label="Organisation Type"
                    defaultValue="university"
                    options={[
                      { value: 'university', label: 'University / College' },
                      { value: 'research', label: 'Research Institute' },
                      { value: 'makerspace', label: 'Makerspace' },
                      { value: 'enterprise', label: 'R&D Enterprise' },
                    ]}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-800">
                      Multi-Select Filter
                    </label>
                    <FilterDropdown
                      label="Categories"
                      options={filterOptions}
                      selectedValues={filterValues}
                      onChange={setFilterValues}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Action Popover Menu:</span>
                  <DropdownMenu
                    trigger={
                      <Button variant="outline" size="sm" rightIcon={<MoreVertical className="h-3.5 w-3.5" />}>
                        Resource Options
                      </Button>
                    }
                    items={[
                      { id: 'reserve', label: 'Reserve Now', icon: <Calendar className="h-3.5 w-3.5" /> },
                      { id: 'duplicate', label: 'Clone Listing', icon: <Package className="h-3.5 w-3.5" /> },
                      { id: 'divider', label: '', divider: true },
                      {
                        id: 'delete',
                        label: 'Archive Resource',
                        variant: 'danger',
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        onClick: () => setIsConfirmOpen(true),
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date & Time Selection */}
            <Card>
              <CardHeader title="Date & Time Selection" subtitle="Booking slot picker" />
              <CardContent>
                <DateTimePicker
                  label="Select Reservation Slot"
                  date={selectedDate}
                  timeSlot={selectedSlot}
                  onChangeDate={setSelectedDate}
                  onChangeTimeSlot={setSelectedSlot}
                  helperText="Selected slot will be reserved for 15 minutes during verification."
                />
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader title="File Upload Control" subtitle="Supports drag & drop, file status, and removal" />
              <CardContent>
                <FileUpload
                  label="Safety & Verification Documents"
                  helperText="Upload signed MOU or lab clearance certificate"
                  files={uploadedFiles}
                  onFilesSelected={(newFiles) => {
                    const added: UploadedFileItem[] = newFiles.map((f, i) => ({
                      id: `new-${Date.now()}-${i}`,
                      name: f.name,
                      size: f.size,
                      status: 'completed',
                    }))
                    setUploadedFiles((prev) => [...prev, ...added])
                    toast.success('Files Attached', `${newFiles.length} file(s) ready for review`)
                  }}
                  onFileRemove={(id) => {
                    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* SECTION 3: CARDS & DOMAIN COMPONENTS */}
      {(activeTab === 'overview' || activeTab === 'cards') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">
              3. Domain Cards & Dashboard Statistic Cards
            </h2>
            <p className="text-xs text-neutral-500">
              Specialized ShareSphere cards for equipment listings, verified organisations, and analytics.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Resources Listed"
              value="248"
              change={{ value: '+14% vs last month', trend: 'up' }}
              icon={<Package className="h-5 w-5" />}
              iconColor="brand"
            />
            <StatCard
              title="Verified Organisations"
              value="36"
              change={{ value: '+4 this week', trend: 'up' }}
              icon={<Building2 className="h-5 w-5" />}
              iconColor="success"
            />
            <StatCard
              title="Pending Bookings"
              value="19"
              change={{ value: 'Action required', trend: 'neutral' }}
              icon={<Calendar className="h-5 w-5" />}
              iconColor="warning"
            />
            <StatCard
              title="Active Researchers"
              value="1,420"
              change={{ value: '+8.2%', trend: 'up' }}
              icon={<Users className="h-5 w-5" />}
              iconColor="purple"
            />
          </div>

          {/* Subtabs for resources */}
          <div className="pt-2">
            <Tabs
              tabs={demoPillTabs}
              activeTab={activePillTab}
              onChange={setActivePillTab}
              variant="pill"
              className="mb-4"
            />

            {/* Resource Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResourceCard
                id="res-1"
                title="Class 100 ISO 5 Cleanroom Facility"
                category="Cleanrooms & Fab"
                organisationName="IIT Delhi Nanotech Center"
                isOrgVerified
                location="Hauz Khas, New Delhi"
                availabilityStatus="available"
                accessLevel="approval_required"
                rate="₹1,200 / hr"
                icon={<Microscope className="h-8 w-8 text-brand-600" />}
                onViewDetails={(id) => toast.info(`Viewing details for resource: ${id}`)}
                onRequestAccess={() => setIsModalOpen(true)}
              />

              <ResourceCard
                id="res-2"
                title="NVIDIA DGX H100 8-GPU Compute Node"
                category="High-Performance Compute"
                organisationName="AI Frontier Lab, Bangalore"
                isOrgVerified
                location="Whitefield, Bangalore"
                availabilityStatus="in_use"
                accessLevel="members_only"
                rate="Compute Credits"
                icon={<Cpu className="h-8 w-8 text-purple-600" />}
                onViewDetails={(id) => toast.info(`Viewing details for resource: ${id}`)}
                onRequestAccess={() => setIsModalOpen(true)}
              />

              <ResourceCard
                id="res-3"
                title="Formlabs Form 4L Industrial 3D Printer"
                category="Rapid Prototyping"
                organisationName="MakerHive Community Lab"
                isOrgVerified={false}
                location="Indiranagar, Bangalore"
                availabilityStatus="maintenance"
                accessLevel="open"
                rate="Material Costs Only"
                icon={<Package className="h-8 w-8 text-neutral-500" />}
                onViewDetails={(id) => toast.info(`Viewing details for resource: ${id}`)}
                onRequestAccess={() => setIsModalOpen(true)}
              />
            </div>
          </div>

          {/* Organisation Cards */}
          <div className="pt-4">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">
              Verified Organisation Cards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OrganisationCard
                id="org-1"
                name="Indian Institute of Science (IISc)"
                type="Premier Research University"
                isVerified
                location="Bangalore, Karnataka"
                resourcesCount={42}
                description="Central analytical instrumentation facility offering high-resolution TEM, XRD, NMR, and biophysical characterization tools."
                onViewProfile={(id) => toast.info(`View org profile: ${id}`)}
                onBrowseResources={(id) => toast.info(`Browse resources for: ${id}`)}
              />

              <OrganisationCard
                id="org-2"
                name="BioFab Innovations Makerspace"
                type="Hardware Incubator & Lab"
                isVerified
                location="Hyderabad, Telangana"
                resourcesCount={15}
                description="Collaborative prototyping facility equipped with CNC mills, laser cutters, electronics testing stations, and microfluidic fabrication."
                onViewProfile={(id) => toast.info(`View org profile: ${id}`)}
                onBrowseResources={(id) => toast.info(`Browse resources for: ${id}`)}
              />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: DATA TABLES & EMPTY STATES */}
      {(activeTab === 'overview' || activeTab === 'data') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">
              4. Tables, Pagination, Skeletons & Empty States
            </h2>
            <p className="text-xs text-neutral-500">
              Tabular data layouts with status indicators, empty state fallbacks, and pagination.
            </p>
          </div>

          <Card padding="none">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Recent Resource Booking Requests
                </h3>
                <p className="text-xs text-neutral-500">
                  Real-time status overview across participating institutions.
                </p>
              </div>
              <Badge variant="primary">5 Active</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Slot / Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-neutral-700">
                    #BK-4091
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-neutral-900">JEOL 200kV Cryo-TEM</p>
                      <p className="text-xs text-neutral-400">IISc Nanotech</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-neutral-800">
                        Dr. Rahul Verma
                      </p>
                      <p className="text-[11px] text-neutral-400">IIT Bombay</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    Oct 30 • 10:00 - 14:00 (4h)
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" showDot>
                      Approved
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs">
                      View QR
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-neutral-700">
                    #BK-4092
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-neutral-900">Class 100 Cleanroom</p>
                      <p className="text-xs text-neutral-400">IIT Delhi</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-neutral-800">
                        Pooja Sundaram
                      </p>
                      <p className="text-[11px] text-neutral-400">BioGen Labs</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    Nov 02 • 09:00 - 13:00 (4h)
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning" showDot>
                      Pending Approval
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs">
                      Review
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-mono text-xs font-semibold text-neutral-700">
                    #BK-4089
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-neutral-900">8-GPU H100 Cluster</p>
                      <p className="text-xs text-neutral-400">AI Frontier Lab</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-neutral-800">
                        Arjun Nambiar
                      </p>
                      <p className="text-[11px] text-neutral-400">BITS Pilani</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    Oct 28 • 18:00 - 06:00 (12h)
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Completed</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs">
                      Summary
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Pagination
              currentPage={currentPage}
              totalPages={5}
              totalItems={48}
              itemsPerPage={10}
              onPageChange={setCurrentPage}
            />
          </Card>

          {/* Skeletons & Empty States Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <Card>
              <CardHeader
                title="Loading Skeletons"
                subtitle="Pulse shimmer state while fetching data asynchronously"
              />
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <SkeletonAvatar size="md" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <SkeletonText lines={3} />
                <div className="pt-2">
                  <SkeletonCard />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Empty States"
                subtitle="Contextual empty state when no items match criteria"
              />
              <CardContent>
                <EmptyState
                  title="No Pending Bookings Found"
                  description="All resource requests have been processed. You will be notified when new reservation requests are submitted."
                  actionLabel="Explore Available Resources"
                  onAction={() => toast.info('Navigating to Explore Resources')}
                  secondaryActionLabel="Refresh Feed"
                  onSecondaryAction={() => toast.success('Feed Refreshed')}
                  compact
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* SECTION 5: ALERTS & MODALS */}
      {(activeTab === 'overview' || activeTab === 'feedback') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">
              5. Alerts, Error States & Dialogs
            </h2>
            <p className="text-xs text-neutral-500">
              High-visibility notifications, inline validation, and modal confirmation dialogs.
            </p>
          </div>

          <div className="space-y-3">
            {showAlert && (
              <Alert
                variant="warning"
                title="Scheduled Power Maintenance on Cleanroom Node B"
                onClose={() => setShowAlert(false)}
                action={
                  <Button variant="outline" size="xs">
                    View Impacted Slots
                  </Button>
                }
              >
                Facilities will be offline on Sunday, Nov 01 from 02:00 to 06:00 IST for UPS battery replacement.
              </Alert>
            )}

            <Alert variant="info" title="AI-Assisted Matching Active">
              Natural language queries are supported in the Explore view. Describe the experiment you want to conduct to get matched tools.
            </Alert>

            <Alert variant="error" title="MOU Expiring Soon">
              Your inter-institutional agreement with BioFab Innovations expires in 14 days. Please contact your coordinator.
            </Alert>

            <Alert variant="success" title="Organisation Verified">
              MIT Nanotech Core Lab has successfully completed peer verification.
            </Alert>

            <div className="p-3 bg-white rounded-lg border border-neutral-200">
              <span className="text-xs text-neutral-500 block mb-1">
                Inline Form Error State Example:
              </span>
              <ErrorMessage message="This time slot overlaps with an existing reserved session on Cleanroom Stage 2." />
            </div>
          </div>

          {/* Modal Demo Button */}
          <div className="flex items-center gap-3 pt-3">
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Open Request Modal Dialog
            </Button>
            <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
              Open Confirm Deletion Dialog
            </Button>
          </div>
        </section>
      )}

      {/* DEMO MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Access to Class 100 Cleanroom"
        description="Submit your project details and requested time window for lab coordinator review."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false)
                toast.success('Request Submitted', 'Lab coordinator has been notified.')
              }}
            >
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Title"
            placeholder="e.g. Photolithography on GaN Wafers"
            isRequired
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lead Investigator" defaultValue="Dr. Sarah Connor" isRequired />
            <Input label="Department" defaultValue="Electrical & Nano Engineering" />
          </div>
          <Textarea
            label="Chemicals & Consumables Required"
            placeholder="List any hazardous substances or custom substrates being brought into cleanroom..."
            rows={3}
          />
          <div className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
            <span>
              Your profile has Level-3 Cleanroom safety certification on file.
            </span>
          </div>
        </div>
      </Modal>

      {/* DEMO CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false)
          toast.error('Listing Archived', 'Resource has been taken offline.')
        }}
        title="Archive Resource Listing?"
        message="Are you sure you want to archive this resource listing? Active bookings will remain valid, but no new booking requests will be accepted."
        confirmLabel="Yes, Archive"
        variant="danger"
      />
    </div>
  )
}
