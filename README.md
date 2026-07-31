# Nathaniel Mapaye

Software Engineer building reliable systems, developer tools, and privacy-conscious mobile products.

![C++](https://img.shields.io/badge/C%2B%2B-23-informational)
![Go](https://img.shields.io/badge/Go-informational)
![FreeRTOS](https://img.shields.io/badge/RTOS-FreeRTOS-informational)
![React%20Native](https://img.shields.io/badge/React-Native-informational)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-informational)

**Focus:** C++ concurrency • Embedded FreeRTOS • React Native UX

## Selected Work

- **GitOps (SLO-driven Canary Operator):** Go-based Kubernetes Operator for SLO-driven canaries; integrated Prometheus + Gatekeeper policies; automated rollback in <30s on p95 regression. [Repo](https://github.com/nmapaye/gitops) 
- **SysLib (C++23):** header-only concurrency library — SPSC **26,987,335 ops/s** on Apple M-class (~**37 ns/op** p99). Lock-free MPMC (Michael–Scott + epoch reclamation); verified with ThreadSanitizer and linearizability checks. [Repo](https://github.com/nmapaye/syslib) 
- **Embedded Telemetry Node (ESP32/STM32, FreeRTOS):** DMA sampling, task graph (sampler/aggregator/comms), OTA, watchdog, deep-sleep scheduling — modeled avg current **0.15 mA** at **15 s** sleep; host-sim tests pass. [Repo](https://github.com/nmapaye/embnode)
- **AURORA (React Native, TypeScript, HealthKit, MMKV):** private on-device caffeine logging, optional read-only sleep import, and a 60-second vigilance test for iPhone and iPad. [Repo](https://github.com/nmapaye/aurora) · [Case study](https://nmapaye.com/writing/aurora-private-caffeine-tracking/)

## Showcased Skills

C++23 (RAII, atomics, TMP) • FreeRTOS/ESP32 • React Native/TypeScript • CMake/CTest • GitHub Actions • ZAP/Burp

## Experience

- **Bitera DC — Data Center Engineering Intern:** incident postmortems/SOPs, uptime checks, privately reported three high-severity web vulns.
- **Xapiens Teknologi Indonesia — Cybersecurity Analyst Intern:** authenticated scanning, CVSS ≥8.0 triage, PoC-backed remediation + retests.

## Contact

nmapaye@ucsc.edu • [LinkedIn](https://www.linkedin.com/in/nmapaye) • [Website](https://nmapaye.com)

## Site development

```sh
npm ci
python3 -m pip install -r requirements-test.txt
python3 scripts/build-resume.py public/resume.pdf
npm test
python3 scripts/test-resume.py
```

To verify the OpenAI Sites distribution (including its packaged worker and real
static assets), run:

```sh
npm run test:sites
```

The generated one-page résumé is committed at `public/resume.pdf`. Rebuild and
test it after changing its source content.
