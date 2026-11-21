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

export interface Announcement {
  title: string;
  cta: string;
  href: string;
  expiresAt: string;
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
  focus?: ProjectFocus;
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
  title: 'Systems and Embedded Engineer',
  location: 'Santa Cruz, CA',
  description:
    'Bay Area systems and embedded software engineer building C++ concurrency libraries, FreeRTOS telemetry prototypes, application security tools, and AI evaluations.',
  summary:
    'Bay Area systems and embedded software engineer building C++ concurrency libraries, FreeRTOS telemetry prototypes, application security tools, and iOS apps.',
  biography: 'Nathaniel Mapaye is a systems and embedded engineer based in Santa Cruz, California. He develops SysLib, a C++20 systems library with an SPSC ring buffer and a blocking MPMC queue, and EmbNode, a C++17 telemetry prototype with FreeRTOS task scaffolding and host-tested packet, power-accounting, and OTA coordination code. He is pursuing a B.S. in Technology & Information Management at the University of California, Santa Cruz, with graduation expected in June 2027.',
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

export const announcement: Announcement = {
  title: 'What TikTok Sees',
  cta: 'Try the demo',
  href: '/tools/tiktok-face/',
  expiresAt: '2026-12-03T17:00:00Z',
};

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
  aurora: 'https://aurora.nmapaye.com',
  auroraSource: 'https://github.com/nmapaye/aurora',
};

/* ----------------------------------------------------------------- social -- */
/**
 * Profiles shown in the footer. An entry renders only when `href` is set.
 * Add a URL only after the account exists and Nathan has confirmed it's his.
 */
export interface SocialLink {
  label: string;
  href?: string;
}

export const social: SocialLink[] = [
  { label: 'LinkedIn', href: links.linkedin },
  { label: 'GitHub', href: links.github },
  { label: 'TikTok' },
  { label: 'YouTube' },
  { label: 'Instagram' },
  { label: 'X' },
];

export const visibleSocial = social.filter(
  (item): item is Required<SocialLink> => Boolean(item.href),
);

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
    tagline: 'C++17 FreeRTOS telemetry prototype',
    period: 'Aug 2025 – Sep 2025',
    featured: true,
    description:
      'Embedded telemetry firmware for ESP32 and STM32 boards, written in C++17 on FreeRTOS. Sampling, batching, and sending each run as their own task, and the packet format, OTA update logic, and power accounting are tested on a laptop before any hardware is involved.',
    facts: [
      'Sampler, aggregator, and communications task scaffolding',
      'DMA and hardware transport integration remain platform work',
      'Host tests cover CRC, malformed frames, power accounting, and OTA failures',
      'Power calculations are modeled, not physical current measurements',
    ],
    focus: {
      problem: 'A battery-powered sensor on an unreliable network has to keep sampling on schedule when sends fail, and an OTA update cannot leave the device in an unknown state.',
      systemDesign: 'Sampler, aggregator, and communications tasks hand data off through FreeRTOS queues. Communications tries MQTT first and falls back to HTTP.',
      evidence: 'Host tests feed in truncated frames, bad CRCs, and OTA backends that fail or commit after the deadline, with a fake clock so timing is repeatable.',
      outcome: 'The packet and OTA logic pass those tests. DMA sampling, delivery retries, and battery measurements on a real board are still to do, and a full queue currently drops samples without counting them.',
    },
    metrics: [
      { value: 'CRC16', label: 'Frame checksum' },
      { value: '3', label: 'FreeRTOS tasks' },
      { value: 'MQTT, HTTP', label: 'Send path with fallback' },
    ],
    stack: [
      'C++17',
      'FreeRTOS',
      'ESP32 / STM32',
      'MQTT / HTTP',
      'OTA / Watchdog',
      'CMake / CTest',
    ],
    links: [
      { label: 'View EmbNode source', href: 'https://github.com/nmapaye/embnode' },
      { label: 'Read the telemetry design', href: '/writing/embnode-telemetry-design/' },
    ],
  },
  {
    index: '02',
    name: 'SysLib',
    tagline: 'C++20 systems and concurrency library',
    description:
      'A header-only C++20 library with two queues. The SPSC ring is lock-free and hands values from one producer to one consumer with acquire/release atomics. The MPMC queue is a deque behind a mutex and condition variable, so waiting consumers sleep instead of spinning.',
    facts: [
      'Ring capacity rounds up to a power of two, so index wraparound is a bit mask',
      'If moving a value out throws, the queue wakes the next consumer so the item is not stranded',
      'Tests run four producers and four consumers and check that every value arrives exactly once',
      'Optional ThreadSanitizer build',
    ],
    stack: [
      'C++20',
      'Atomics',
      'Lock-free',
      'TSan',
    ],
    links: [
      { label: 'View SysLib source', href: 'https://github.com/nmapaye/syslib' },
      { label: 'Read the concurrency design', href: '/writing/syslib-concurrency-design/' },
    ],
  },
  {
    index: '03',
    name: 'GitOps',
    tagline: 'Go Kubernetes canary operator',
    description:
      'A Kubernetes operator in Go that watches a canary release. It reads p95 latency from Prometheus, runs Gatekeeper policy checks, and rolls the canary back when latency regresses.',
    facts: [
      'Rollback finished in under 30 seconds after a p95 regression, measured in a test cluster',
    ],
    stack: ['Go', 'Kubernetes', 'Prometheus', 'ArgoCD'],
    links: [{ label: 'View GitOps source', href: 'https://github.com/nmapaye/gitops' }],
  },
  {
    index: '04',
    name: 'AURORA',
    tagline: 'Native SwiftUI iOS caffeine and sleep tracker',
    period: 'Aug 2025 – Present',
    description:
      'An iPhone and iPad app for logging caffeine and sleep, with a short reaction test that records reaction times. Apple Health access is optional, and logs stay on the device. The code is public.',
    facts: [
      'Native SwiftUI app on a shared Swift core package',
      'Optional, read-only Apple Health sleep and caffeine import',
      'No account and no analytics SDK',
    ],
    focus: {
      problem: 'I wanted to keep track of caffeine and sleep without sending either to a server.',
      systemDesign: 'A native SwiftUI app on a Swift core package. It started in React Native and was rebuilt natively in October 2026. Sleep samples are cleaned up (reversed intervals and duplicates dropped) before the rest of the app reads them.',
      evidence: 'Tests cover Health access granted, denied, unavailable, and empty, plus malformed and duplicate sleep samples.',
      outcome: 'The app works fully with Health access denied. It is heading to a free TestFlight beta.',
    },
    metrics: [
      { value: 'SwiftUI', label: 'Native app' },
      { value: 'Read-only', label: 'Apple Health access' },
      { value: 'iOS + iPad', label: 'Product surface' },
    ],
    stack: [
      'Swift',
      'SwiftUI',
      'Apple HealthKit',
      'Swift Package Manager',
    ],
    links: [
      { label: 'Visit aurora.nmapaye.com', href: 'https://aurora.nmapaye.com' },
      { label: 'View AURORA source', href: 'https://github.com/nmapaye/aurora' },
      { label: 'Read the AURORA case study', href: '/writing/aurora-private-caffeine-tracking/' },
    ],
  },
];

/* ------------------------------------------------------------- experience -- */
export const experience: ExperienceItem[] = [
  {
    role: 'LLM Specialist',
    org: 'Frontier AI Lab',
    period: 'Jun 2026 – Aug 2026',
    location: 'San Francisco, CA / Contract',
    bullets: [
      'Graded frontier model responses to software engineering and technical reasoning prompts for correctness, instruction following, and edge cases.',
      'Wrote annotations for recurring failure patterns, with the steps needed to reproduce each one.',
    ],
    tools: ['AI Evaluation', 'Software Analysis', 'Python', 'C++', 'Structured Rubrics'],
  },
  {
    role: 'Cyber Security AI Red-Teamer Intern',
    org: 'CFX Indonesia',
    period: 'Jun 2026 – Present',
    location: 'Jakarta, Indonesia',
    bullets: [
      'Assessed 30+ web, network, and control assets for risk analysis, control documentation, and vulnerability remediation.',
      'Triaged 27+ vulnerabilities in OJK-regulated digital-asset infrastructure and followed each one until it was fixed.',
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
    period: 'Apr 2026 – Present',
    location: 'Remote / Contract',
    bullets: [
      'Audited 8+ repository-level software tasks, checking code, diffs, and tests against what each task required.',
      'Wrote up where implementations fell short, scored against structured rubrics for AI-alignment review.',
    ],
    tools: ['Git', 'GitHub', 'Python', 'C++', 'AI Evaluation Rubrics'],
  },
  {
    role: 'Linear Algebra Tutor',
    org: 'UCSC ACE',
    period: 'Jan 2026 – Apr 2026',
    location: 'Santa Cruz, CA / Hybrid',
    bullets: [
      'Tutored linear algebra: systems of equations, matrix operations, vector spaces, linear transformations, eigenvalues, and diagonalization.',
      'Ran exam review and practice sessions, working through problems step by step so students could reason through them instead of memorizing procedures.',
    ],
    tools: ['MATLAB', 'LaTeX', 'Python'],
  },
  {
    role: 'Data Center Engineering Intern',
    org: 'Bitera D.C',
    period: 'Aug 2025 – Sep 2025',
    location: 'Jakarta, Indonesia',
    bullets: [
      'Verified 16+ high-severity web findings with authenticated testing, then retested them after fixes.',
      'Supported five live data-center domains (Linux, networking, power, cooling, and alarms) and wrote SOPs for routine checks.',
    ],
    tools: ['Burp Suite', 'Linux', 'Git', 'LibreNMS', 'Markdown SOPs'],
  },
  {
    role: 'Cyber Security Analyst Intern',
    org: 'Xapiens Teknologi Indonesia',
    period: 'Jul 2024 – Sep 2024',
    location: 'Tangerang, Indonesia',
    bullets: [
      'Ran authenticated scans and manual tests on 50+ web endpoints, confirmed which findings were exploitable, and wrote proof-of-concept reports for several CVSS 8.0+ issues.',
      'Ranked findings for clients to fix first and retested them after each fix.',
    ],
    tools: ['Nessus', 'Burp Suite', 'OWASP Testing Guide', 'TCP/IP', 'Jira'],
  },
];
