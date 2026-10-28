import {
  type Resource,
  type ResourceCategory,
  type ResourceCreateInput,
  type ResourceFilterParams,
  type ResourceUpdateInput,
} from '@/types/resource'
import { type PaginatedResult } from '@/types/serviceCommon'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const STORAGE_KEY_RESOURCES = 'sharesphere_resources_v1'

export const SEED_RESOURCES: Resource[] = [
  {
    id: 'res-cryo-tem-01',
    organisationId: 'org-mit-nanotech-01',
    organisationName: 'MIT Nanotech Core Lab',
    organisationSlug: 'mit-nanotech',
    organisationType: 'university',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Cryogenic Transmission Electron Microscope (Cryo-TEM 300kV)',
    slug: 'cryo-tem-300kv',
    description:
      'Thermo Fisher Titan Krios G4 300kV cryogenic TEM equipped with Falcon 4i direct electron detector and Selectris X energy filter. Capable of sub-2-Angstrom single particle analysis and cryo-electron tomography for macromolecular structural biology.',
    category: 'Laboratories',
    resourceType: 'equipment',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'MIT Main Campus',
      building: 'Building 24 - Nano Core Center',
      room: 'Basement Suite B-04',
      address: '77 Massachusetts Avenue',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3598, lng: -71.0942 },
    },
    capacity: 3,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: { amount: 120, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Cryo-grid screening required prior to high-resolution automated acquisition session.',
      'Mandatory liquid nitrogen replenishment protocol must be executed by certified operator.',
      'Data offload must utilize high-throughput Globus transfer endpoint.',
    ],
    requiredCredentials: [
      'Cryo-TEM Certified Operator Level 2',
      'Liquid Cryogen Safe Handling Certification',
    ],
    bookingConditions: [
      'Minimum booking slot of 4 hours.',
      'Requires 48-hour advance notice for beam alignment calibration.',
      'Operator identity badge required for security check-in.',
    ],
    specifications: {
      'Accelerating Voltage': '80 - 300 kV',
      'Detector': 'Falcon 4i Direct Electron Camera (4096 x 4096)',
      'Energy Filter': 'Selectris X (energy resolution < 0.35 eV)',
      'Sample Temperature': '< 90 K (Liquid Nitrogen Autoloader)',
      'Vacuum System': 'Ultra-High Vacuum Ion Getter Pumps',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      openTime: '08:00',
      closeTime: '22:00',
    },
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-10-01T10:30:00Z',
  },
  {
    id: 'res-cleanroom-litho-02',
    organisationId: 'org-mit-nanotech-01',
    organisationName: 'MIT Nanotech Core Lab',
    organisationSlug: 'mit-nanotech',
    organisationType: 'university',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'ISO Class 5 Cleanroom Photolithography Bay',
    slug: 'iso-class-5-lithography-bay',
    description:
      'Sub-micron cleanroom fabrication suite featuring Heidelberg MLA150 Maskless Aligner, spin coaters, hotplates, and optical inspection stations for semiconductor wafer prototyping, microfluidics, and photonics device fabrication.',
    category: 'Laboratories',
    resourceType: 'lab',
    images: [
      'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'MIT Main Campus',
      building: 'Building 12 - Nanofabrication Facility',
      room: 'Cleanroom Bay 3',
      address: '60 Vassar Street',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3614, lng: -71.0921 },
    },
    capacity: 6,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: { amount: 85, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Full Cleanroom Gowning Procedure mandatory prior to entry airlock.',
      'No non-cleanroom paper, pencils, or particulate-generating materials.',
      'Chemical bench operations require safety apron, face shield, and chemical gloves.',
    ],
    requiredCredentials: [
      'ISO Class 5 Cleanroom Gowning & Safety Protocol',
      'Chemical Hygiene & Acid Piranha Handling Certification',
    ],
    bookingConditions: [
      'Orientation and safety tour required for first-time cross-institutional users.',
      'Maximum 2 consecutive slots per researcher per day.',
    ],
    specifications: {
      'Cleanliness Class': 'ISO 5 (Class 100 equivalent)',
      'Substrate Sizes': 'Pieces to 200 mm (8 inch) wafers',
      'Minimum Feature Size': '0.6 um (MLA150 Maskless)',
      'Light Source': '375 nm and 405 nm solid-state lasers',
      'Alignment Accuracy': '< 500 nm',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '07:00',
      closeTime: '23:00',
    },
    createdAt: '2026-09-16T11:00:00Z',
    updatedAt: '2026-10-05T14:15:00Z',
  },
  {
    id: 'res-dgx-h100-03',
    organisationId: 'org-cambridge-hpc-02',
    organisationName: 'Cambridge High Performance Computing Lab',
    organisationSlug: 'cambridge-hpc',
    organisationType: 'research_lab',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'NVIDIA DGX H100 AI Supercompute Pod (8x H100 SXM5)',
    slug: 'nvidia-dgx-h100-pod',
    description:
      'Dedicated high-throughput GPU cluster node with 8x NVIDIA H100 80GB SXM5 GPUs interconnected via NVLink 4 (900 GB/s bi-directional). Dual 4th Gen Intel Xeon Scalable processors, 2TB DDR5 system memory, and 8x 400Gbps NDR InfiniBand interconnect.',
    category: 'Computers & High-Compute',
    resourceType: 'compute',
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Cambridge Computing Center',
      building: 'Data Center Node 4',
      room: 'Rack Suite A12',
      address: '100 Technology Square',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3632, lng: -71.0903 },
    },
    capacity: 12,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: { amount: 35, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Jobs must be orchestrated via Slurm workload scheduler.',
      'Checkpoints must be written to fast scratch NVMe storage arrays.',
      'Commercial cryptocurrency mining is strictly prohibited and leads to immediate credential revocation.',
    ],
    requiredCredentials: [
      'Slurm HPC Cluster Security & SSH Key Verification',
    ],
    bookingConditions: [
      'SSH public key required upon reservation confirmation.',
      'Pre-emptible job slots available at discounted rates.',
    ],
    specifications: {
      'GPUs': '8x NVIDIA H100 80GB SXM5 (640GB total HBM3)',
      'Tensor Performance': '32 PetaFLOPS FP8',
      'System Memory': '2,048 GB DDR5',
      'Networking': '8x OSFP ports with 400Gb/s NDR InfiniBand',
      'Local Storage': '30 TB NVMe U.2 SSD Array',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      openTime: '00:00',
      closeTime: '23:59',
    },
    createdAt: '2026-09-18T14:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
  {
    id: 'res-metal-3d-04',
    organisationId: 'org-harvard-maker-03',
    organisationName: 'Harvard Innovation Makerspace',
    organisationSlug: 'harvard-makerspace',
    organisationType: 'makerspace',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'EOS M 290 Direct Metal Laser Sintering (DMLS) 3D Printer',
    slug: 'eos-m-290-metal-3d-printer',
    description:
      'Industrial metal additive manufacturing system for direct production of precision metal prototypes, biomedical implants, and aerospace test components in Ti64 Titanium, Inconel 718, and 316L Stainless Steel.',
    category: 'Fabrication & 3D Printing',
    resourceType: 'equipment',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Allston Science & Engineering Complex',
      building: 'Makerspace Fabrication Lab',
      room: 'Additive Manufacturing Bay 102',
      address: '150 Western Avenue',
      city: 'Boston',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3649, lng: -71.1278 },
    },
    capacity: 4,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: { amount: 65, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Respirator and static-dissipative footwear required during powder sifting and chamber changeover.',
      'Only approved powder canisters verified by lab technician may be loaded.',
      'Post-process wire EDM cut-off requires separate operator clearance.',
    ],
    requiredCredentials: [
      'Metal Powder Bed Fusion Safety & PPE Level 2',
      'Inert Gas Argon Pressure System Clearance',
    ],
    bookingConditions: [
      'CAD build file (STL/STEP) must be pre-screened by makerspace manager.',
      'Consumable metal powder billed separately at cost.',
    ],
    specifications: {
      'Build Volume': '250 x 250 x 325 mm',
      'Laser Type': '400 W Yb-fiber laser (focus diameter 100 um)',
      'Layer Thickness': '20 - 100 um',
      'Supported Alloys': 'Ti64, 316L Stainless, AlSi10Mg, IN718',
      'Inert Atmosphere': 'Argon recirculating filtration system',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '08:30',
      closeTime: '19:00',
    },
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-10-12T16:20:00Z',
  },
  {
    id: 'res-bioreactor-05',
    organisationId: 'org-boston-bio-04',
    organisationName: 'Boston Biotech Commons',
    organisationSlug: 'boston-biotech',
    organisationType: 'research_lab',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Sartorius 10L Automated Bioreactor & Cell Culture Suite',
    slug: 'sartorius-10l-bioreactor-suite',
    description:
      'Biostat B-DCU autoclavable glass vessel bioreactor system with digital mass flow controllers for pH, dissolved oxygen (DO), temperature, and agitation control. Optimized for mammalian cell suspension, microbial fermentation, and recombinant protein scale-up.',
    category: 'Chemical & Bio Processing',
    resourceType: 'lab',
    images: [
      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Kendall Square Life Science Hub',
      building: 'Building B - Bioprocess Wing',
      room: 'Bio-Processing Lab 401',
      address: '500 Technology Square',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3639, lng: -71.0911 },
    },
    capacity: 5,
    isAccessible: true,
    availabilityStatus: 'in_use',
    accessLevel: 'approval_required',
    rate: { amount: 50, unit: 'hour', currency: 'USD' },
    usageRules: [
      'BSL-2 decontamination protocol must be executed before and after fermentation runs.',
      'Autoclave cycle validation logs must be initialed and posted.',
      'Biohazard waste disposal containers must be sealed and autoclaved before disposal.',
    ],
    requiredCredentials: [
      'BSL-2 Biosafety Containment Clearance',
      'Aseptic Cell Culture & Sterilization Verification',
    ],
    bookingConditions: [
      'Requires institutional biological safety committee (IBC) approval memo.',
      'Minimum continuous reservation duration: 24 hours for fed-batch runs.',
    ],
    specifications: {
      'Working Volume': '2.0 L to 10.0 L',
      'Agitation Speed': '20 - 2,000 rpm (magnetic drive)',
      'Temperature Control': 'Heating blanket and cooling finger (4 - 80 C)',
      'Gas Flow': '4-gas mixing (O2, N2, CO2, Air) via thermal mass flow controllers',
      'Sensors': 'Optical DO, gel-filled pH, and redox potential probes',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      openTime: '00:00',
      closeTime: '23:59',
    },
    createdAt: '2026-09-22T08:30:00Z',
    updatedAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 'res-signal-analyzer-06',
    organisationId: 'org-oxford-quantum-05',
    organisationName: 'Oxford Quantum Electronics Institute',
    organisationSlug: 'oxford-quantum',
    organisationType: 'university',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Keysight N9042B 110 GHz Real-Time Signal & Spectrum Analyzer',
    slug: 'keysight-110ghz-signal-analyzer',
    description:
      'Ultra-wideband millimeter-wave signal analyzer offering up to 110 GHz unbanded frequency coverage and 4 GHz analysis bandwidth. Designed for sub-THz 6G communications research, radar testing, and cryogenic quantum circuit readout characterization.',
    category: 'Testing & Measurement',
    resourceType: 'equipment',
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Science Area Physics Complex',
      building: 'Clarendon Laboratory',
      room: 'RF Quantum Test Bench 2',
      address: 'Parks Road',
      city: 'Oxford',
      country: 'United Kingdom',
      coordinates: { lat: 51.7588, lng: -1.2568 },
    },
    capacity: 2,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: { amount: 75, unit: 'hour', currency: 'GBP' },
    usageRules: [
      'Torque wrench (8 in-lb) mandatory for all 1.0mm and 1.85mm coaxial connector interfaces.',
      'Static discharge grounding wrist strap must be worn at all times.',
      'Never exceed maximum continuous input power rating (+30 dBm).',
    ],
    requiredCredentials: [
      'High-Frequency RF & Microwave Instrumentation Training',
    ],
    bookingConditions: [
      'Precision calibration kit (85058E) must be returned to desiccator after use.',
      'Remote automated measurement script testing allowed via dedicated VPN.',
    ],
    specifications: {
      'Frequency Range': '2 Hz to 110 GHz (Continuous Sweep)',
      'Analysis Bandwidth': '4 GHz Real-Time',
      'Phase Noise': '-134 dBc/Hz at 10 kHz offset (1 GHz carrier)',
      'Displayed Average Noise Level': '-174 dBm/Hz with preamplifier',
      'Input Connector': 'Ruggedized 1.0 mm Male (50 Ohm)',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '08:00',
      closeTime: '20:00',
    },
    createdAt: '2026-09-25T13:00:00Z',
    updatedAt: '2026-10-18T09:30:00Z',
  },
  {
    id: 'res-phantom-cam-07',
    organisationId: 'org-mit-nanotech-01',
    organisationName: 'MIT Nanotech Core Lab',
    organisationSlug: 'mit-nanotech',
    organisationType: 'university',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Phantom TMX 7510 Ultra High-Speed Video Camera (75,000 fps)',
    slug: 'phantom-tmx-7510-high-speed-camera',
    description:
      'Back-side illuminated (BSI) high-speed camera system capturing up to 75,000 frames per second at full 1 Megapixel resolution (1280 x 800), and up to 1.75 million fps at reduced resolution. Includes Nikon F and Canon EF motorized lens mount adapters, macro lenses, and LED pulsed lighting array.',
    category: 'Cameras & Imaging',
    resourceType: 'equipment',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'MIT Main Campus',
      building: 'Building 3 - Dynamics & Fluid Mechanics Lab',
      room: 'Optical Imaging Suite 3-112',
      address: '33 Massachusetts Avenue',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3592, lng: -71.0935 },
    },
    capacity: 3,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: { amount: 60, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Optical lens elements must only be cleaned with lens paper and reagent-grade isopropanol.',
      'CineMag high-speed storage flash drives must be ejected safely before disconnection.',
      'Do not aim pulsed LED arrays directly at sensor without protective neutral density attenuation.',
    ],
    requiredCredentials: [
      'High-Speed Optical Imaging & Sensor Safety Clearance',
    ],
    bookingConditions: [
      'Tripod mounting and studio lighting kits provided upon check-in.',
      'Data offload requires minimum 10 GbE network interface or portable NVMe drive.',
    ],
    specifications: {
      'Maximum Frame Rate (Full Res)': '75,000 fps at 1280 x 800',
      'Maximum Frame Rate (Reduced)': '1,750,000 fps at 1280 x 32',
      'Sensor Type': 'Custom BSI CMOS (18.5 um pixel size)',
      'Internal RAM Memory': '512 GB High-Speed Memory',
      'Exposure Time': 'Fast option down to 95 nanoseconds',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '08:30',
      closeTime: '18:00',
    },
    createdAt: '2026-09-28T15:00:00Z',
    updatedAt: '2026-10-20T12:00:00Z',
  },
  {
    id: 'res-anechoic-chamber-08',
    organisationId: 'org-stanford-wireless-06',
    organisationName: 'Stanford Wireless Research Lab',
    organisationSlug: 'stanford-wireless',
    organisationType: 'university',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Full Anechoic RF Shielded Test Chamber & Spherical Near-Field Range',
    slug: 'stanford-rf-anechoic-chamber',
    description:
      'Electromagnetically shielded anechoic room lined with broadband pyramidal microwave absorber tiles. Integrated multi-axis dual-polarized positioner for 3D antenna radiation pattern measurements, 5G MIMO beamforming evaluation, and satellite payload EMI/EMC compliance testing (400 MHz - 40 GHz).',
    category: 'Testing & Measurement',
    resourceType: 'space',
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Stanford Engineering Quad',
      building: 'Packard Electrical Engineering',
      room: 'Chamber Vault Sub-Level 1',
      address: '350 Jane Stanford Way',
      city: 'Stanford',
      state: 'California',
      country: 'United States',
      coordinates: { lat: 37.4275, lng: -122.1701 },
    },
    capacity: 8,
    isAccessible: true,
    availabilityStatus: 'maintenance',
    accessLevel: 'approval_required',
    rate: { amount: 150, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Do not step on or brush against foam absorber cones; cones are fragile carbon-loaded foam.',
      'RF Interlock door must be sealed before transmitting signals exceeding +10 dBm.',
      'Turn off high-power amplifiers before entering chamber volume.',
    ],
    requiredCredentials: [
      'RF Electromagnetic Radiation Safety Level 2',
      'Chamber Interlock & Turntable Controller Authorization',
    ],
    bookingConditions: [
      'Calibration check with standard gain horn antenna conducted prior to session.',
      'Currently in annual laser positioner recalibration until next Monday.',
    ],
    specifications: {
      'Frequency Range': '400 MHz to 40 GHz',
      'Quiet Zone Dimension': '1.5 m spherical quiet zone',
      'Shielding Effectiveness': '> 100 dB (10 kHz to 40 GHz)',
      'Rotary Positioner': 'Azimuth/Elevation dual-axis with 0.05 degree angular resolution',
      'Absorber Rating': '-45 dB reflectivity at 10 GHz',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '08:00',
      closeTime: '20:00',
    },
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-25T14:00:00Z',
  },
  {
    id: 'res-smart-auditorium-09',
    organisationId: 'org-boston-bio-04',
    organisationName: 'Boston Biotech Commons',
    organisationSlug: 'boston-biotech',
    organisationType: 'research_lab',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Executive Hybrid Symposium Auditorium & Collaborative Hall',
    slug: 'executive-hybrid-symposium-hall',
    description:
      'Acoustically tuned 120-seat symposium amphitheater with dual 4K laser projection, Shure wireless ceiling beamforming microphones, PTZ tracking video cameras, and live interpretation booths for multi-institution symposiums, grant presentations, and thesis defenses.',
    category: 'Meeting & Event Spaces',
    resourceType: 'space',
    images: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Kendall Square Life Science Hub',
      building: 'Auditorium Center',
      room: 'Symposium Hall 100',
      address: '500 Technology Square',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3639, lng: -71.0911 },
    },
    capacity: 120,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: { amount: 100, unit: 'hour', currency: 'USD' },
    usageRules: [
      'No food or uncovered beverages allowed inside the presentation amphitheater.',
      'AV patch panel must be reset to default configuration after use.',
      'All live streaming links and guest attendee Wi-Fi codes must be pre-arranged.',
    ],
    requiredCredentials: [],
    bookingConditions: [
      'Minimum booking slot: 2 hours.',
      'Security escort provided for gatherings exceeding 50 external attendees.',
    ],
    specifications: {
      'Seating Capacity': '120 theater-style raked seating with power outlets',
      'Display': 'Dual 10,000 Lumen 4K Laser Projectors with motorized 200 inch screens',
      'Audio': 'Shure Microflex Advance Beamforming Array + QSC Q-Sys DSP',
      'Video Streaming': '3x Panasonic 4K PTZ tracking cameras with SDI broadcast switcher',
      'Accessibility': 'Hearing assistance induction loop and ADA-compliant stage ramp',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      openTime: '08:00',
      closeTime: '21:00',
    },
    createdAt: '2026-10-05T09:00:00Z',
    updatedAt: '2026-10-24T17:00:00Z',
  },
  {
    id: 'res-robotics-cell-10',
    organisationId: 'org-harvard-maker-03',
    organisationName: 'Harvard Innovation Makerspace',
    organisationSlug: 'harvard-makerspace',
    organisationType: 'makerspace',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: 'Universal Robots UR10e Collaborative Robot Workcell',
    slug: 'ur10e-collaborative-robot-cell',
    description:
      '6-axis collaborative robotic arm with 12.5 kg payload and 1,300 mm reach. Equipped with Robotiq 2F-85 adaptive electric gripper, OnRobot HEX force/torque sensor, Photoneo 3D PhoXi spatial vision scanner, and safety safety-monitored light curtain cage.',
    category: 'Fabrication & 3D Printing',
    resourceType: 'tool',
    images: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    ],
    location: {
      campus: 'Allston Science & Engineering Complex',
      building: 'Robotics Integration Facility',
      room: 'Cobot Bay 2',
      address: '150 Western Avenue',
      city: 'Boston',
      state: 'Massachusetts',
      country: 'United States',
      coordinates: { lat: 42.3649, lng: -71.1278 },
    },
    capacity: 3,
    isAccessible: true,
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: { amount: 40, unit: 'hour', currency: 'USD' },
    usageRules: [
      'Emergency stop pendant must be within reach of operator at all times.',
      'Speed limit must not exceed 250 mm/s when humans are within collaborative workspace.',
      'Payload mass and center-of-gravity offsets must be calibrated in Polyscope software.',
    ],
    requiredCredentials: [
      'Collaborative Robotics Safety (ISO 10218-1 & ISO/TS 15066)',
    ],
    bookingConditions: [
      'ROS 2 / Python client API access available via local Ethernet gigabit switch.',
    ],
    specifications: {
      'Payload': '12.5 kg',
      'Reach': '1,300 mm (51.2 in)',
      'Pose Repeatability': '+/- 0.05 mm (ISO 9283)',
      'Degrees of Freedom': '6 rotating joints (+/- 360 degrees)',
      'End-Effector': 'Robotiq 2F-85 Electric Gripper + 6-Axis F/T Sensor',
    },
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '09:00',
      closeTime: '20:00',
    },
    createdAt: '2026-10-08T11:00:00Z',
    updatedAt: '2026-10-26T16:00:00Z',
  },
]

function getStoredResources(): Record<string, Resource> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESOURCES)
    if (!raw) {
      const initial: Record<string, Resource> = {}
      for (const res of SEED_RESOURCES) {
        initial[res.id] = res
      }
      localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load resources from storage', err)
    const initial: Record<string, Resource> = {}
    for (const res of SEED_RESOURCES) {
      initial[res.id] = res
    }
    return initial
  }
}

function saveStoredResources(data: Record<string, Resource>): void {
  try {
    localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save resources to storage', err)
  }
}

export async function getResources(
  filters: ResourceFilterParams = {}
): Promise<PaginatedResult<Resource>> {
  const {
    search,
    category,
    resourceType,
    organisationId,
    isOrgVerified,
    verificationStatus,
    availabilityStatus,
    accessLevel,
    minCapacity,
    isAccessible,
    requiresNoSpecialCredentials,
    requiredCredential,
    city,
    sortBy = 'createdAt',
    sortDirection = 'desc',
    page = 1,
    limit = 9,
  } = filters

  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('resources').select('*', { count: 'exact' })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      if (resourceType && resourceType !== 'all') {
        query = query.eq('resource_type', resourceType)
      }
      if (organisationId) {
        query = query.eq('organisation_id', organisationId)
      }
      if (availabilityStatus && availabilityStatus !== 'all') {
        query = query.eq('availability_status', availabilityStatus)
      }
      if (accessLevel && accessLevel !== 'all') {
        query = query.eq('access_level', accessLevel)
      }
      if (minCapacity !== undefined && minCapacity > 0) {
        query = query.gte('capacity', minCapacity)
      }
      if (isAccessible !== undefined) {
        query = query.eq('is_accessible', isAccessible)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (!error && data) {
        const rows = data as any[]
        const items: Resource[] = rows.map((row) => ({
          id: row.id,
          organisationId: row.organisation_id,
          organisationName: 'Member Institution',
          isOrgVerified: true,
          orgVerificationStatus: 'approved',
          title: row.title,
          slug: row.slug,
          description: row.description,
          category: row.category as ResourceCategory,
          resourceType: row.resource_type as Resource['resourceType'],
          images: Array.isArray(row.images) ? (row.images as string[]) : [],
          location: row.location as unknown as Resource['location'],
          capacity: row.capacity ?? undefined,
          isAccessible: row.is_accessible,
          availabilityStatus: row.availability_status as Resource['availabilityStatus'],
          accessLevel: row.access_level as Resource['accessLevel'],
          rate: row.rate as unknown as Resource['rate'],
          usageRules: Array.isArray(row.usage_rules) ? (row.usage_rules as string[]) : [],
          requiredCredentials: Array.isArray(row.required_credentials) ? (row.required_credentials as string[]) : [],
          bookingConditions: Array.isArray(row.booking_conditions) ? (row.booking_conditions as string[]) : [],
          specifications: (row.specifications as Record<string, string>) || {},
          operatingHours: row.operating_hours as unknown as Resource['operatingHours'],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))

        const total = count ?? items.length
        return {
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        }
      }
    } catch {
      // Fallback
    }
  }

  // Local-first persistent engine with deep query filtering
  const store = getStoredResources()
  let list = Object.values(store)

  // 1. Text Search across Title, Description, Category, Specs, Location, Organisation
  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim()
    list = list.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(q)
      const matchDesc = r.description.toLowerCase().includes(q)
      const matchCat = r.category.toLowerCase().includes(q)
      const matchOrg = r.organisationName.toLowerCase().includes(q)
      const matchCity = r.location.city.toLowerCase().includes(q)
      const matchSpecs = Object.entries(r.specifications || {}).some(
        ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
      )
      return matchTitle || matchDesc || matchCat || matchOrg || matchCity || matchSpecs
    })
  }

  // 2. Category filter
  if (category && category !== 'all') {
    list = list.filter((r) => r.category === category)
  }

  // 3. Resource Type filter
  if (resourceType && resourceType !== 'all') {
    list = list.filter((r) => r.resourceType === resourceType)
  }

  // 4. Organisation filter
  if (organisationId && organisationId !== 'all') {
    list = list.filter((r) => r.organisationId === organisationId)
  }

  // 5. Organisation verification status
  if (isOrgVerified !== undefined) {
    list = list.filter((r) => r.isOrgVerified === isOrgVerified)
  }
  if (verificationStatus && verificationStatus !== 'all') {
    list = list.filter((r) => r.orgVerificationStatus === verificationStatus)
  }

  // 6. Availability status
  if (availabilityStatus && availabilityStatus !== 'all') {
    list = list.filter((r) => r.availabilityStatus === availabilityStatus)
  }

  // 7. Access level
  if (accessLevel && accessLevel !== 'all') {
    list = list.filter((r) => r.accessLevel === accessLevel)
  }

  // 8. Min Capacity
  if (minCapacity !== undefined && minCapacity > 0) {
    list = list.filter((r) => (r.capacity ?? 0) >= minCapacity)
  }

  // 9. Accessibility
  if (isAccessible !== undefined && isAccessible) {
    list = list.filter((r) => r.isAccessible)
  }

  // 10. Credentials filter
  if (requiresNoSpecialCredentials) {
    list = list.filter((r) => !r.requiredCredentials || r.requiredCredentials.length === 0)
  }
  if (requiredCredential) {
    const credLower = requiredCredential.toLowerCase()
    list = list.filter((r) =>
      r.requiredCredentials?.some((c) => c.toLowerCase().includes(credLower))
    )
  }

  // 11. City / Location
  if (city && city.trim() !== '') {
    const cityLower = city.toLowerCase()
    list = list.filter((r) => r.location.city.toLowerCase().includes(cityLower))
  }

  // Sort
  list.sort((a, b) => {
    let diff = 0
    if (sortBy === 'title') {
      diff = a.title.localeCompare(b.title)
    } else if (sortBy === 'rate') {
      diff = a.rate.amount - b.rate.amount
    } else if (sortBy === 'availability') {
      const order: Record<string, number> = { available: 0, reserved: 1, in_use: 2, maintenance: 3, unavailable: 4 }
      diff = (order[a.availabilityStatus] ?? 9) - (order[b.availabilityStatus] ?? 9)
    } else {
      diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return sortDirection === 'desc' ? (sortBy === 'rate' || sortBy === 'availability' ? -diff : diff) : (sortBy === 'rate' || sortBy === 'availability' ? diff : -diff)
  })

  // Pagination
  const total = list.length
  const totalPages = Math.ceil(total / limit) || 1
  const validPage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (validPage - 1) * limit
  const paginatedItems = list.slice(startIndex, startIndex + limit)

  return {
    items: paginatedItems,
    total,
    page: validPage,
    limit,
    totalPages,
  }
}

export async function getResourceById(id: string): Promise<Resource | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single()

      const row = data as any
      if (!error && row) {
        return {
          id: row.id,
          organisationId: row.organisation_id,
          organisationName: 'Member Institution',
          isOrgVerified: true,
          orgVerificationStatus: 'approved',
          title: row.title,
          slug: row.slug,
          description: row.description,
          category: row.category as ResourceCategory,
          resourceType: row.resource_type as Resource['resourceType'],
          images: Array.isArray(row.images) ? (row.images as string[]) : [],
          location: row.location as unknown as Resource['location'],
          capacity: row.capacity ?? undefined,
          isAccessible: row.is_accessible,
          availabilityStatus: row.availability_status as Resource['availabilityStatus'],
          accessLevel: row.access_level as Resource['accessLevel'],
          rate: row.rate as unknown as Resource['rate'],
          usageRules: Array.isArray(row.usage_rules) ? (row.usage_rules as string[]) : [],
          requiredCredentials: Array.isArray(row.required_credentials) ? (row.required_credentials as string[]) : [],
          bookingConditions: Array.isArray(row.booking_conditions) ? (row.booking_conditions as string[]) : [],
          specifications: (row.specifications as Record<string, string>) || {},
          operatingHours: row.operating_hours as unknown as Resource['operatingHours'],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      }
    } catch {
      // fallback
    }
  }

  const store = getStoredResources()
  return store[id] || null
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const store = getStoredResources()
  return Object.values(store).find((r) => r.slug === slug) || null
}

export async function createResource(input: ResourceCreateInput): Promise<Resource> {
  const now = new Date().toISOString()
  const id = `res-${Date.now()}`
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const newResource: Resource = {
    id,
    organisationId: input.organisationId,
    organisationName: 'MIT Nanotech Core Lab',
    organisationSlug: 'mit-nanotech',
    isOrgVerified: true,
    orgVerificationStatus: 'approved',
    title: input.title,
    slug,
    description: input.description,
    category: input.category,
    resourceType: input.resourceType,
    images: input.images && input.images.length > 0 ? input.images : [
      'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1200&q=80',
    ],
    location: input.location,
    capacity: input.capacity,
    isAccessible: input.isAccessible ?? true,
    availabilityStatus: 'available',
    accessLevel: input.accessLevel ?? 'open',
    rate: input.rate,
    usageRules: input.usageRules ?? [],
    requiredCredentials: input.requiredCredentials ?? [],
    bookingConditions: input.bookingConditions ?? [],
    specifications: input.specifications ?? {},
    operatingHours: input.operatingHours,
    createdAt: now,
    updatedAt: now,
  }

  const store = getStoredResources()
  store[id] = newResource
  saveStoredResources(store)

  return newResource
}

export async function updateResource(
  id: string,
  input: ResourceUpdateInput
): Promise<Resource> {
  const store = getStoredResources()
  const existing = store[id]
  if (!existing) {
    throw new Error(`Resource with ID "${id}" not found.`)
  }

  const updated: Resource = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    category: input.category ?? existing.category,
    resourceType: input.resourceType ?? existing.resourceType,
    images: input.images ?? existing.images,
    location: input.location ?? existing.location,
    capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
    isAccessible: input.isAccessible !== undefined ? input.isAccessible : existing.isAccessible,
    availabilityStatus: input.availabilityStatus ?? existing.availabilityStatus,
    accessLevel: input.accessLevel ?? existing.accessLevel,
    rate: input.rate ?? existing.rate,
    usageRules: input.usageRules ?? existing.usageRules,
    requiredCredentials: input.requiredCredentials ?? existing.requiredCredentials,
    bookingConditions: input.bookingConditions ?? existing.bookingConditions,
    specifications: input.specifications ?? existing.specifications,
    operatingHours: input.operatingHours ?? existing.operatingHours,
    updatedAt: new Date().toISOString(),
  }

  store[id] = updated
  saveStoredResources(store)
  return updated
}

export async function deleteResource(id: string): Promise<boolean> {
  const store = getStoredResources()
  if (!store[id]) return false
  delete store[id]
  saveStoredResources(store)
  return true
}

export async function getResourceCategories(): Promise<{ category: ResourceCategory; count: number }[]> {
  const store = getStoredResources()
  const counts: Record<string, number> = {}

  for (const res of Object.values(store)) {
    counts[res.category] = (counts[res.category] || 0) + 1
  }

  const categories: ResourceCategory[] = [
    'Laboratories',
    'Computers & High-Compute',
    'Fabrication & 3D Printing',
    'Cameras & Imaging',
    'Testing & Measurement',
    'Meeting & Event Spaces',
    'Chemical & Bio Processing',
  ]

  return categories.map((cat) => ({
    category: cat,
    count: counts[cat] || 0,
  }))
}
