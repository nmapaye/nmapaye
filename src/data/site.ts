/**
 * ============================================================================
 *  SITE CONTENT — edit everything here.
 * ----------------------------------------------------------------------------
 *  This is the single source of truth for all text/links on the site.
 *  Change copy, add/remove projects, reorder experience, etc. — no need to
 *  touch any component markup. Visual styling lives in src/styles/tokens.css.
 * ============================================================================
 */

export interface NavItem {
  label: string;
  href: string; // in-page anchor, e.g. "/#work"
}

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface ProjectFocus {
  problem: string;
  systemDesign: string;
  evidence: string;
  outcome: string;
}

export interface Project {
  index: string;
  name: string;
  tagline: string;
  description: string;
  facts: string[];
  focus: ProjectFocus;
  metrics?: ProjectMetric[];
  featured?: boolean;
  period?: string;
  stack: string[];
  links?: { label: string; href: string }[];
}

export interface ExperienceItem {
  role: string;
  org: string;
  period: string;
  location?: string;
  bullets: string[];
  tools?: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
  location?: string;
  details?: string[];
}

/* ---------------------------------------------------------------- profile -- */
export const profile = {
  name: 'Nathaniel Mapaye',
  fullName: 'Nathaniel Fransiscus Mapaye',
  canonicalUrl: 'https://nmapaye.com/',
  title: 'Systems Engineer, C++23 & Embedded Software',
  location: 'Santa Cruz, CA',
  description:
    'Bay Area systems and embedded software engineer building C++23 concurrency libraries, FreeRTOS telemetry, application security tools, and AI evaluations.',
  summary:
    'Bay Area systems and embedded software engineer building C++23 concurrency libraries, FreeRTOS telemetry, application security tools, and dependable product interfaces.',
  tagline: 'Going from java to Java.',
  // Square photo lives at public/profile.jpg. Replace that file (keep the name)
  // to swap your picture, or change this path to a new filename.
  image: 'profile.jpg',
  // Replace public/resume.pdf with your latest resume.
  resume: 'resume.pdf',
  sameAs: [
    'https://www.linkedin.com/in/nmapaye',
    'https://github.com/nmapaye',
  ],
};

/* ------------------------------------------------------------------- nav -- */
export const nav: NavItem[] = [
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/about/' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Notes', href: '/writing/' },
  { label: 'Contact', href: '/#contact' },
];

export const featuredSkills = [
  'C++23',
  'FreeRTOS',
  'ESP32 / STM32',
  'Swift / iOS',
  'React Native',
  'TypeScript / JavaScript',
  'SQLite',
  'REST / MQTT',
  'Linux',
  'CMake / CTest',
  'Burp Suite',
  'Nessus',
  'OWASP TG / ASVS',
  'Ghidra',
  'Docker / Kubernetes',
  'GitHub Actions',
];

/* ------------------------------------------------------------------ links -- */
export const links = {
  email: 'nmapaye@ucsc.edu',
  linkedin: 'https://www.linkedin.com/in/nmapaye',
  github: 'https://github.com/nmapaye',
  aurora: 'https://nmapaye.github.io/aurora',
};

/* -------------------------------------------------------------- education -- */
export const education: EducationItem[] = [
  {
    school: 'University of California, Santa Cruz',
    degree: 'B.S., Technology & Information Management (TIM)',
    period: 'Expected Jun 2027',
    location: 'Santa Cruz, CA',
    details: [
      'Undergraduate Dean’s Scholarship Award',
      'Bilingual International Baccalaureate Diploma',
    ],
  },
];

/* --------------------------------------------------------------- projects -- */
export const projects: Project[] = [
  {
    index: '01',
    name: 'EmbNode',
    tagline: 'C++23 FreeRTOS embedded telemetry node',
    period: 'Aug 2025 — Sep 2025',
    featured: true,
    description:
      'A C++23 FreeRTOS telemetry node for ESP32 and STM32 with deterministic DMA sampling, resilient MQTT/HTTP delivery, and low-power scheduling.',
    facts: [
      'Three-stage pipeline for sampling, aggregation, and MQTT/HTTP delivery',
      'OTA and watchdog recovery for resilient low-power operation',
      'CRC16-CCITT and telemetry decode validated in a 0.47-second host simulation',
      '0.15 mA modeled average current with a 15-second sleep schedule',
    ],
    focus: {
      problem: 'Intermittent networks and low-power constraints make telemetry delivery unreliable.',
      systemDesign: 'C++23 FreeRTOS pipeline separates DMA sampling, aggregation, and delivery.',
      evidence: 'CRC and decode checks run in a 0.47-second host simulation; modeled average current is 0.15 mA.',
      outcome: 'MQTT/HTTP telemetry has watchdog and OTA recovery paths for unattended operation.',
    },
    metrics: [
      { value: '0.47 sec', label: 'Host simulation' },
      { value: '0.15 mA', label: 'Modeled average current' },
      { value: 'C++23', label: 'FreeRTOS node' },
    ],
    stack: [
      'C++23',
      'FreeRTOS',
      'ESP32 / STM32',
      'MQTT / HTTP',
      'OTA / Watchdog',
      'CMake / CTest',
    ],
    links: [{ label: 'View EmbNode source', href: 'https://github.com/nmapaye/embnode' }],
  },
  {
    index: '02',
    name: 'SysLib',
    tagline: 'C++23 lock-free concurrency library',
    description:
      'Lock-free queues and memory-reclamation experiments measured and verified as a focused systems library.',
    facts: [
      '26.9M SPSC operations per second on Apple M-class',
      'ThreadSanitizer and linearizability checks',
    ],
    focus: {
      problem: 'Concurrent data-structure experiments need a small surface that makes correctness work explicit.',
      systemDesign: 'Header-only C++23 SPSC queues and memory-reclamation experiments isolate atomic operations.',
      evidence: '26.9M SPSC operations per second on Apple M-class, with TSan and linearizability checks.',
      outcome: 'A focused library for testing queue and reclamation designs before product use.',
    },
    stack: [
      'C++23',
      'Atomics',
      'Lock-free',
      'TSan',
    ],
    links: [{ label: 'View SysLib source', href: 'https://github.com/nmapaye/syslib' }],
  },
  {
    index: '03',
    name: 'GitOps',
    tagline: 'Go Kubernetes canary operator',
    description:
      'A Go Kubernetes operator that turns service-level signals into automated canary decisions.',
    facts: [
      'Prometheus and Gatekeeper policy checks',
      'Automated rollback in under 30 seconds on p95 regression',
    ],
    focus: {
      problem: 'Canary releases need a clear decision path when service health changes.',
      systemDesign: 'A Go Kubernetes operator combines Prometheus SLO signals with Gatekeeper policy checks.',
      evidence: 'The rollback path triggers in under 30 seconds on a p95 regression.',
      outcome: 'Release decisions become repeatable rather than dependent on manual monitoring.',
    },
    stack: ['Go', 'Kubernetes', 'Prometheus', 'ArgoCD'],
    links: [{ label: 'View GitOps source', href: 'https://github.com/nmapaye/gitops' }],
  },
  {
    index: '04',
    name: 'AURORA',
    tagline: 'Private React Native iOS caffeine and sleep tracker',
    period: 'Aug 2025 — Present',
    description:
      'A React Native iOS app unifying caffeine logging, intake dashboards, and psychomotor-vigilance testing through optional read-only Apple Health access and local-first storage.',
    facts: [
      'Three workflows: caffeine logging, intake dashboards, and vigilance testing',
      'AsyncStorage and SQLite provide two-layer local-first persistence',
      'Normalized caffeine inputs across automatic and manual logging paths',
    ],
    focus: {
      problem: 'Personal health signals need useful feedback without exporting sensitive data by default.',
      systemDesign: 'React Native and Swift connect a local data model, optional read-only HealthKit access, and SQLite persistence.',
      evidence: 'Caffeine logging, intake dashboards, and a 60-second vigilance test share normalized local inputs.',
      outcome: 'A private iOS and iPad experience turns low-level data choices into a clear daily workflow.',
    },
    metrics: [
      { value: '60 sec', label: 'Vigilance test' },
      { value: 'Read-only', label: 'Apple Health access' },
      { value: 'iOS + iPad', label: 'Product surface' },
    ],
    stack: [
      'React Native',
      'TypeScript',
      'Swift',
      'Apple HealthKit',
      'AsyncStorage',
      'SQLite',
    ],
    links: [
      { label: 'Read AURORA case study', href: '/writing/aurora-private-caffeine-tracking/' },
      { label: 'View AURORA demo', href: 'https://nmapaye.github.io/aurora' },
    ],
  },
];

/* ------------------------------------------------------------- experience -- */
export const experience: ExperienceItem[] = [
  {
    role: 'LLM Specialist',
    org: 'Frontier AI Lab',
    period: 'Jun 2026 - Aug 2026',
    location: 'San Francisco, CA / Contract',
    bullets: [
      'Evaluated 520+ frontier AI outputs across software engineering and technical reasoning against correctness, instruction following, and edge-case criteria, producing reproducible evidence for model-improvement workflows.',
      'Diagnosed 70+ recurring failure patterns and wrote evidence-backed annotations; 89% of reviewed cases could be rerun with the same behavior.',
    ],
    tools: ['AI Evaluation', 'Software Analysis', 'Python', 'C++', 'Structured Rubrics'],
  },
  {
    role: 'Cyber Security AI Red-Teamer Intern',
    org: 'CFX Indonesia',
    period: 'Jun 2026 - Present',
    location: 'Jakarta, Indonesia',
    bullets: [
      'Assessed 30+ assets across web, network, and control workflows in three workstreams: risk analysis, control documentation, and vulnerability remediation.',
      'Analyzed and triaged 27+ vulnerabilities in OJK-regulated digital-asset infrastructure, tracking each finding through remediation with a clear evidence trail.',
    ],
    tools: [
      'Burp Suite',
      'OWASP ASVS',
      'Risk Analysis',
      'Vulnerability Triage',
      'Control Documentation',
    ],
  },
  {
    role: 'Subject Matter Expert (SME), AI Alignment',
    org: 'Handshake',
    period: 'Apr 2026 — Present',
    location: 'Remote / Contract',
    bullets: [
      'Audited 8+ repository-level software tasks across code, diffs, tests, and requirements to determine whether proposed changes satisfied task requirements.',
      'Documented reproducible failure modes and implementation gaps under structured rubrics for AI-alignment review.',
    ],
    tools: ['Git', 'GitHub', 'Python', 'C++', 'AI Evaluation Rubrics'],
  },
  {
    role: 'Linear Algebra Tutor',
    org: 'UCSC ACE',
    period: 'Jan 2026 — Apr 2026',
    location: 'Santa Cruz, CA / Hybrid',
    bullets: [
      'Tutored students in linear algebra through guided problem-solving — systems of equations, matrix operations, vector spaces, linear transformations, eigenvalues, and diagonalization.',
      'Led collaborative review and practice sessions focused on exam prep, homework strategy, and conceptual gaps; helped students move from memorized procedures toward step-by-step reasoning.',
      'Adapted explanations to different skill levels and encouraged consistent study habits in a seasonal academic role.',
    ],
    tools: ['MATLAB', 'LaTeX', 'Python'],
  },
  {
    role: 'Data Center Engineering Intern',
    org: 'Bitera D.C',
    period: 'Aug 2025 — Sep 2025',
    location: 'Jakarta, Indonesia',
    bullets: [
      'Verified 16+ high-severity web findings through authenticated testing and retesting, producing actionable remediation evidence.',
      'Supported five live data-center domains across Linux, networks, power, cooling, and alarms while documenting repeatable operational checks.',
    ],
    tools: ['Burp Suite', 'Linux', 'Git', 'LibreNMS', 'Markdown SOPs'],
  },
  {
    role: 'Cyber Security Analyst Intern',
    org: 'Xapiens Teknologi Indonesia',
    period: 'Jul 2024 — Sep 2024',
    location: 'Tangerang, Indonesia',
    bullets: [
      'Executed authenticated scans and manual web tests on 50+ endpoints, validated exploitability, and produced proof-of-concept reports for several CVSS 8.0+ findings.',
      'Prioritized remediation and documented retest evidence so client teams could track high-risk findings through closure.',
    ],
    tools: ['Nessus', 'Burp Suite', 'OWASP Testing Guide', 'TCP/IP', 'Jira'],
  },
];
