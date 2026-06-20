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
  href: string; // in-page anchor, e.g. "#projects"
}

export interface Project {
  name: string;
  tagline: string;
  description: string;
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

export interface SkillGroup {
  category: string;
  items: string[];
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
  name: 'Nathaniel Fransiscus Mapaye',
  shortName: 'Nathaniel Mapaye',
  title: 'Systems-leaning Software Engineer',
  location: 'Santa Cruz, CA',
  tagline:
    'Building reliable systems across C++ concurrency, embedded FreeRTOS, and React Native UX.',
  // Replace public/profile.svg with your own photo (square works best, e.g.
  // profile.jpg) and update this path to match the new filename.
  photo: 'profile.svg',
  // Replace public/resume.pdf with your latest resume.
  resume: 'resume.pdf',
};

/* ------------------------------------------------------------------ about -- */
export const about = [
  'I’m a Technology & Information Management student at UC Santa Cruz who likes building things close to the metal and shipping them all the way to a clean UI.',
  'My work spans low-level C++ concurrency and embedded FreeRTOS firmware up through cross-platform React Native apps — with a recurring detour into security testing and remediation.',
];

/* ------------------------------------------------------------------- nav -- */
export const nav: NavItem[] = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Education', href: '#education' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
];

/* ------------------------------------------------------------------ links -- */
export const links = {
  email: 'nmapaye@ucsc.edu',
  phone: '(831)-227-4349',
  linkedin: 'https://linkedin.com/in/nmapaye',
  github: 'https://github.com/nmapaye',
  aurora: 'https://nmapaye.github.io/aurora',
};

/* -------------------------------------------------------------- education -- */
export const education: EducationItem[] = [
  {
    school: 'University of California, Santa Cruz',
    degree: 'B.S., Technology & Information Management (TIM) — GPA 3.67 / 4.0',
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
    name: 'AURORA',
    tagline: 'React Native Caffeine Tracker',
    period: 'Aug 2025 — Present',
    description:
      'Featured by Handshake in OpenAI’s Codex Competition. A mobile app integrating native AI-based features with Apple HealthKit to autonomously monitor caffeine intake; tracking dashboards and psycho-vigilance tests visualize consumption patterns and measure alertness. HealthKit read/write with permission flows; offline-first state (AsyncStorage/SQLite) with unit normalization for accurate mg totals.',
    stack: ['React Native', 'TypeScript', 'HealthKit', 'SQLite', 'EAS'],
    links: [{ label: 'Live demo', href: 'https://nmapaye.github.io/aurora' }],
  },
  {
    name: 'EmbNode',
    tagline: 'FreeRTOS Telemetry Node (ESP32/STM32)',
    period: 'Aug 2025 — Sep 2025',
    description:
      'DMA sampling pipeline with a high-priority sampler, aggregator, MQTT/HTTP comms, OTA, watchdog, and deep-sleep scheduling; host-sim via CMake/CTest. CRC16-CCITT reference pass and telemetry decode; modeled avg current 0.15 mA with 15 s sleep; 100% tests passing.',
    stack: ['C++23', 'FreeRTOS', 'ESP32/STM32', 'MQTT', 'CMake/CTest'],
    links: [{ label: 'Repo', href: 'https://github.com/nmapaye/embnode' }],
  },
  {
    name: 'GitOps',
    tagline: 'SLO-driven Canary Operator',
    description:
      'Go-based Kubernetes Operator for SLO-driven canaries; integrated Prometheus + Gatekeeper policies; automated rollback in <30s on p95 regression.',
    stack: ['Go', 'Kubernetes', 'Prometheus', 'ArgoCD'],
    links: [{ label: 'Repo', href: 'https://github.com/nmapaye/gitops' }],
  },
  {
    name: 'SysLib',
    tagline: 'Header-only C++23 concurrency library',
    description:
      'SPSC at 26,987,335 ops/s on Apple M-class (~37 ns/op p99). Lock-free MPMC (Michael–Scott + epoch reclamation); verified with ThreadSanitizer and linearizability checks.',
    stack: ['C++23', 'Atomics', 'Lock-free', 'TSan'],
    links: [{ label: 'Repo', href: 'https://github.com/nmapaye/syslib' }],
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

/* ------------------------------------------------------------------ skills -- */
export const skills: SkillGroup[] = [
  {
    category: 'Languages',
    items: ['C++23', 'Go', 'TypeScript / JavaScript', 'Python', 'Java', 'Lua'],
  },
  {
    category: 'Systems & Embedded',
    items: ['FreeRTOS', 'ESP32 / STM32', 'Atomics', 'Lock-free structures', 'Linux'],
  },
  {
    category: 'Infra & DevOps',
    items: [
      'Docker',
      'Kubernetes',
      'ArgoCD',
      'Helm',
      'Kustomize',
      'Prometheus',
      'GitHub Actions',
      'REST',
    ],
  },
  {
    category: 'Security & Testing',
    items: [
      'Burp Suite',
      'Nessus',
      'OWASP TG',
      'ASVS mapping',
      'CVSS triage',
      'CMake/CTest',
      'k6',
      'envtest',
      'kind',
    ],
  },
];
