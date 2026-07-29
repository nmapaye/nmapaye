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

export interface Project {
  index: string;
  name: string;
  tagline: string;
  description: string;
  facts: string[];
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
  title: 'Software Engineer',
  location: 'Santa Cruz, CA',
  description:
    'Software engineer building from low-level systems and security to polished products.',
  tagline:
    'Software engineer building from low-level systems to polished products.',
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
  { label: 'Experience', href: '/#experience' },
  { label: 'Notes', href: '/writing/' },
  { label: 'Contact', href: '/#contact' },
];

export const featuredSkills = [
  'C++23',
  'FreeRTOS',
  'ESP32 / STM32',
  'Linux',
  'Burp Suite',
  'Nessus',
  'OWASP TG',
  'CVSS triage',
  'React Native',
  'TypeScript / JavaScript',
  'Docker',
  'Kubernetes',
  'Prometheus',
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
    period: 'Jul 2023 — Jun 2027',
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
    name: 'AURORA',
    tagline: 'Private caffeine, sleep, and alertness tracking',
    period: 'Aug 2025 — Present',
    featured: true,
    description:
      'An iPhone and iPad app connecting caffeine timing, sleep, and alertness through optional read-only Apple Health access and private on-device persistence.',
    facts: [
      'Optional, read-only Apple Health sleep import',
      'Private on-device insights persisted with MMKV',
      'Manual logging and a one-minute vigilance test',
    ],
    metrics: [
      { value: '60 sec', label: 'Vigilance test' },
      { value: 'Read-only', label: 'Apple Health access' },
      { value: 'iOS + iPad', label: 'Product surface' },
    ],
    stack: ['React Native', 'TypeScript', 'HealthKit', 'MMKV', 'Zustand'],
    links: [
      { label: 'Case study', href: '/writing/aurora-private-caffeine-tracking/' },
      { label: 'Live demo', href: 'https://nmapaye.github.io/aurora' },
    ],
  },
  {
    index: '02',
    name: 'EmbNode',
    tagline: 'FreeRTOS telemetry node',
    period: 'Aug 2025 — Sep 2025',
    description:
      'An ESP32 and STM32 telemetry pipeline built around deterministic sampling, resilient communications, and deep-sleep scheduling.',
    facts: [
      'DMA sampling with prioritized FreeRTOS tasks',
      'CRC16-CCITT reference pass and telemetry decode',
      '0.15 mA modeled average current with 15-second sleep',
    ],
    stack: ['C++23', 'FreeRTOS', 'ESP32 / STM32', 'MQTT', 'CMake / CTest'],
    links: [{ label: 'Repository', href: 'https://github.com/nmapaye/embnode' }],
  },
  {
    index: '03',
    name: 'GitOps',
    tagline: 'SLO-driven canary operator',
    description:
      'A Go Kubernetes operator that turns service-level signals into automated canary decisions.',
    facts: [
      'Prometheus and Gatekeeper policy checks',
      'Automated rollback in under 30 seconds on p95 regression',
    ],
    stack: ['Go', 'Kubernetes', 'Prometheus', 'ArgoCD'],
    links: [{ label: 'Repository', href: 'https://github.com/nmapaye/gitops' }],
  },
  {
    index: '04',
    name: 'SysLib',
    tagline: 'Header-only C++23 concurrency library',
    description:
      'Lock-free queues and memory-reclamation experiments measured and verified as a focused systems library.',
    facts: [
      '26.9M SPSC operations per second on Apple M-class',
      'ThreadSanitizer and linearizability checks',
    ],
    stack: ['C++23', 'Atomics', 'Lock-free', 'TSan'],
    links: [{ label: 'Repository', href: 'https://github.com/nmapaye/syslib' }],
  },
];

/* ------------------------------------------------------------- experience -- */
export const experience: ExperienceItem[] = [
  {
    role: 'AI Fellow',
    org: 'Handshake',
    period: 'Apr 2026 — Present',
    location: 'Remote / Contract',
    bullets: [
      'Evaluate paired AI responses for correctness, completeness, clarity, and usefulness; produce structured grading rationales identifying concrete strengths, failure modes, and edge-case issues.',
      'Review complex software-codebase tasks by inspecting repository behavior, diffs, tests, and implementation logic; help refine bug fixes and validate whether proposed changes match task requirements.',
      'Work across AI evaluation and software analysis workflows requiring careful judgment, technical reading, and concise documentation under task-specific rubrics.',
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
      'Closed high-severity web vulns on public/client portals via authenticated testing and coordinated fixes, eliminating open CVSS ≥ 9 exposures within SLA windows; filed advisories and verification steps.',
      'Authored incident postmortems and SOPs adopted by ops, cutting handoff time and tightening audit readiness; standardized runbooks across power/cooling/network checks.',
      'Performed rack/stack, power, cooling, cabling, and alarm clearing to protect SLA uptime across sites.',
    ],
    tools: ['Burp Suite', 'Linux', 'Git', 'LibreNMS', 'Markdown SOPs'],
  },
  {
    role: 'Cyber Security Analyst Intern',
    org: 'Xapiens Teknologi Indonesia',
    period: 'Jul 2024 — Sep 2024',
    location: 'Tangerang, Indonesia',
    bullets: [
      'Ran authenticated scans and manual tests; verified exploitability and drove remediation on prioritized CVSS ≥ 8 findings across client estates.',
      'Produced PoC-backed remediation reports with status tracking through implementation; improved closure rates and reduced re-open defects.',
    ],
    tools: ['Nessus', 'Burp Suite', 'OWASP Testing Guide', 'TCP/IP', 'Jira'],
  },
];
