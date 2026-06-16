import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_INPUT = "pasted-text.txt";
const DEFAULT_OUTPUT = "security_plus_sy0_701_transcript_preview.json";
const PRODUCTION_OUTPUT = resolve("security_plus_sy0_701_advanced_questions.json");
const TARGET_COUNT = 1000;
const optionIds = ["A", "B", "C", "D"];
const skippedBlocks = [];

const fillerPatterns = [
  /\bAnd if you guys need some more time\b[\s\S]*?\bif you need some more time\b/gi,
  /\bI feel like there are some softballs\b[\s\S]*?\bthroughout the entire thing\b/gi,
  /\bI was trying to give you the answer\b[\s\S]*?\bevery word in there\b/gi,
  /\bSo, a lot of people see the videos\b[\s\S]*?\bWin\./gi,
  /\bAnd that is it\b[\s\S]*$/i
];

const trailingTopicPattern = /\s+in\s+(?:kerros authentication|securing user privileges|software development|telefanany|business risk management|email protocols|telecommunications|network routing|wireless security|networking cables|networking|digital certificates|cyber security monitoring|endpoint security|risk management|corporate context|certificate management|encryption methods|authentication methods|billing and energy management|hardware security|malware terminology|web security|organizational security policy|continuity planning|device management strategies|office equipment terminology|reliability engineering|industrial cyber security|power management|financial analysis|programming|cloud computing|unix based systems|computer hardware|information security|file system management|biometric security|cryptography)\s*$/i;

const sectionSignals = [
  {
    domain: "1.0 General Security Concepts",
    objective: "General security concepts from video transcript",
    terms: ["cia triad", "aaa model", "authentication", "authorization", "zero trust", "non-repudiation", "managerial", "operational", "technical", "physical", "control"]
  },
  {
    domain: "2.0 Threats, Vulnerabilities, and Mitigations",
    objective: "Threats, vulnerabilities, and mitigations from video transcript",
    terms: ["malware", "phishing", "ransomware", "vulnerability", "threat", "attack", "injection", "xss", "csrf", "social engineering", "exploit", "mitigation"]
  },
  {
    domain: "3.0 Security Architecture",
    objective: "Security architecture from video transcript",
    terms: ["architecture", "cloud", "segmentation", "subnet", "firewall", "waf", "vpn", "vpc", "container", "virtual", "resilience", "backup", "network"]
  },
  {
    domain: "4.0 Security Operations",
    objective: "Security operations from video transcript",
    terms: ["incident", "siem", "log", "edr", "detection", "monitoring", "forensic", "vulnerability scan", "patch", "identity", "access", "iam", "mfa"]
  },
  {
    domain: "5.0 Security Program Management and Oversight",
    objective: "Security program management and oversight from video transcript",
    terms: ["risk", "audit", "compliance", "policy", "vendor", "third party", "privacy", "governance", "training", "awareness", "sla", "nda"]
  }
];

const answerFamilies = [
  {
    match: /\bfirewall\b/i,
    distractors: ["Network segmentation appliance", "Host intrusion monitoring service", "Application allow-listing policy"]
  },
  {
    match: /\bpolicy|policies|risk assessment|governance|audit|compliance\b/i,
    distractors: ["Security governance standard", "Operational compliance procedure", "Risk documentation workflow"]
  },
  {
    match: /\bauthentication|identity|certificate|biometric|mfa|multifactor\b/i,
    distractors: ["Federated identity validation", "Context-based access approval", "Privileged session authorization"]
  },
  {
    match: /\bauthorization|access control|rbac|mac|dac|abac\b/i,
    distractors: ["Role-scoped entitlement review", "Policy-based session validation", "Attribute-driven identity proofing"]
  },
  {
    match: /\bencryption|hash|certificate|key|pki|cipher|cryptographic\b/i,
    distractors: ["Authenticated key exchange", "Integrity validation digest", "Certificate-backed data protection"]
  },
  {
    match: /\bmalware|virus|worm|trojan|ransomware|rootkit|spyware\b/i,
    distractors: ["Credential-harvesting payload", "Persistence-focused exploit chain", "Fileless command execution"]
  },
  {
    match: /\bphishing|vishing|smishing|social engineering|impersonation\b/i,
    distractors: ["Credential pretexting campaign", "Targeted identity fraud attempt", "Business email compromise workflow"]
  },
  {
    match: /\bsiem|edr|xdr|ids|ips|waf|dlp|casb\b/i,
    distractors: ["Centralized telemetry correlation", "Endpoint behavior enforcement", "Application-layer policy inspection"]
  },
  {
    match: /\bcloud|vpc|virtual|vm|container|serverless\b/i,
    distractors: ["Isolated cloud network boundary", "Managed workload execution layer", "Virtualized resource protection"]
  },
  {
    match: /\bbackup|rto|rpo|resilience|recovery|continuity\b/i,
    distractors: ["Immutable recovery objective", "Continuity validation process", "Resilient restoration workflow"]
  },
  {
    match: /\bwireless|wi-fi|wpa|wep|wap|wids|wips\b/i,
    distractors: ["Enterprise wireless access control", "Wireless intrusion monitoring", "Protected access configuration"]
  },
  {
    match: /\bsubnet|vlan|vpn|dns|dhcp|tcp|udp|ip|port\b/i,
    distractors: ["Network-layer isolation method", "Secure routing control plane", "Authenticated tunnel configuration"]
  }
];

const replacementDistractorPools = {
  identity: [
    "OAuth authorization grant", "SAML federation", "RADIUS authentication", "Kerberos ticketing", "Privileged access management",
    "Mandatory access control", "Discretionary access control", "Attribute-based access control", "Identity proofing", "Passwordless authentication",
    "Just-in-time privilege", "Single sign-on", "FIDO2 authenticator", "Access recertification", "Session timeout"
  ],
  network: [
    "Stateful firewall", "Next-generation firewall", "Web application firewall", "Network access control", "DNS filtering",
    "VLAN segmentation", "IPsec tunnel", "TLS inspection", "Secure web gateway", "Proxy auto-configuration",
    "Jump server", "Bastion host", "Route filtering", "Network address translation", "802.1X enforcement"
  ],
  crypto: [
    "Key escrow", "Certificate revocation list", "Online certificate status protocol", "Hardware security module", "Digital signature",
    "Message authentication code", "Password-based key derivation", "Elliptic curve cryptography", "Certificate pinning", "Symmetric encryption",
    "Asymmetric encryption", "Key stretching", "Salted hash", "Trusted platform module", "Public key infrastructure"
  ],
  threats: [
    "Credential stuffing", "Replay attack", "On-path attack", "DNS poisoning", "Cross-site scripting",
    "SQL injection", "Buffer overflow", "Privilege escalation", "Directory traversal", "Watering hole attack",
    "Business email compromise", "Typosquatting", "Malicious update", "Rootkit", "Logic bomb"
  ],
  operations: [
    "Endpoint detection and response", "Security information and event management", "Vulnerability scanning", "Patch management",
    "Configuration baseline", "Change approval", "Backout plan", "Tabletop exercise", "Forensic imaging",
    "Containment phase", "Eradication phase", "Lessons learned report", "Log aggregation", "Threat hunting", "Incident playbook"
  ],
  grc: [
    "Business impact analysis", "Risk acceptance", "Risk transfer", "Vendor assessment", "Right-to-audit clause",
    "Service level agreement", "Memorandum of understanding", "Data processing agreement", "Acceptable use policy",
    "Security awareness training", "Compliance reporting", "Audit evidence", "Exception approval", "Risk register", "Third-party attestation"
  ],
  architecture: [
    "Secure enclave", "Container isolation", "Microsegmentation", "Serverless function", "Immutable backup",
    "Hot site", "Warm site", "Cold site", "High availability cluster", "Load balancer",
    "Virtual private cloud", "Software-defined networking", "Infrastructure as code", "Zero trust policy engine", "Cloud access security broker"
  ],
  general: [
    "Compensating control", "Detective control", "Preventive control", "Corrective control", "Directive control",
    "Non-repudiation", "Least privilege", "Separation of duties", "Defense in depth", "Secure by design",
    "Asset inventory", "Data classification", "Secure disposal", "Physical access control", "Environmental sensor"
  ]
};

const lengthBalancedDistractorPools = {
  identity: [
    "Granting access after password entry without checking device posture or session risk",
    "Assigning broad shared accounts to users so permissions are easier to administer",
    "Approving privileged access permanently instead of using time-bound elevation",
    "Relying only on security questions when stronger authentication is available",
    "Synchronizing identities without reviewing stale accounts or group membership",
    "Allowing all authenticated users to reach sensitive resources by default",
    "Using a single local administrator account across systems for convenience",
    "Bypassing periodic access reviews after an employee changes job functions",
    "Storing reusable credentials in scripts rather than using managed secrets",
    "Treating successful initial login as sufficient authorization for every resource"
  ],
  network: [
    "Allowing all east-west traffic after traffic passes the perimeter firewall",
    "Placing public web servers and database servers in the same unrestricted subnet",
    "Permitting remote access without tunneling, logging, or device compliance checks",
    "Trusting DNS responses without validation when redirecting users to services",
    "Leaving management interfaces reachable from general user network segments",
    "Using open wireless authentication because encryption is handled elsewhere",
    "Relying on port numbers alone to decide whether application traffic is safe",
    "Routing sensitive traffic through unmonitored network paths for convenience",
    "Disabling segmentation so troubleshooting between departments is easier",
    "Allowing inbound administrative protocols from untrusted external networks"
  ],
  crypto: [
    "Storing encryption keys with protected data to simplify operational recovery",
    "Using reversible encoding when confidentiality requires cryptographic protection",
    "Disabling certificate validation because users already authenticated successfully",
    "Reusing the same symmetric key across unrelated systems and data classifications",
    "Publishing private keys internally so support teams can decrypt user traffic",
    "Selecting short key lengths to reduce processing overhead on endpoint devices",
    "Treating hashing as encryption for data that must later be decrypted",
    "Accepting expired certificates when the application connection still succeeds",
    "Skipping revocation checks because the certificate chain appears trusted",
    "Using unsigned software packages when the download source is familiar"
  ],
  threats: [
    "Waiting to remediate vulnerabilities until exploitation is confirmed in production",
    "Treating suspicious messages as harmless when they do not contain attachments",
    "Ignoring repeated failed logins if the account eventually authenticates",
    "Assuming malware is removed because the visible process is no longer running",
    "Classifying every social engineering attempt as spam without further analysis",
    "Allowing users to install unverified software when business need is stated",
    "Trusting caller ID as proof that a voice request came from an executive",
    "Treating a redirected website as legitimate because the page branding looks correct",
    "Delaying containment until all forensic analysis has been completed",
    "Assuming encrypted traffic cannot contain command-and-control activity"
  ],
  operations: [
    "Relying on manual log review without centralized correlation or alerting",
    "Closing an incident ticket before containment and eradication are confirmed",
    "Applying patches directly to production without rollback or validation planning",
    "Restoring systems from backup without checking whether the backup is clean",
    "Disabling endpoint monitoring to reduce alert volume during an investigation",
    "Changing firewall rules without documenting approval or business justification",
    "Preserving evidence without recording who handled it and when custody changed",
    "Scanning only once and assuming remediation succeeded without verification",
    "Prioritizing vulnerabilities by discovery order instead of risk and exploitability",
    "Collecting volatile evidence after powering down the affected system"
  ],
  grc: [
    "Using informal approvals instead of documented policies and audit evidence",
    "Accepting vendor claims without reviewing contractual security responsibilities",
    "Treating compliance reports as proof that all operational risks are eliminated",
    "Skipping risk ownership because the issue is tracked by the security team",
    "Using one global policy without considering local regulatory requirements",
    "Measuring risk only by asset cost while ignoring likelihood and business impact",
    "Approving exceptions indefinitely without expiration or compensating controls",
    "Replacing security awareness with a signed policy acknowledgement only",
    "Defining service expectations without measurable targets or escalation terms",
    "Classifying all information the same way to simplify handling procedures"
  ],
  architecture: [
    "Deploying redundant infrastructure without validating failover procedures or access controls",
    "Running container workloads with host-level privileges for easier administration",
    "Placing workloads in a shared environment without tenant isolation controls",
    "Using immutable backups without testing restoration or access restrictions",
    "Building cloud resources manually without configuration review or drift detection",
    "Assuming on-premises systems inherit cloud provider security controls automatically",
    "Connecting embedded devices directly to production networks for easier monitoring",
    "Prioritizing performance over authentication and update capability in embedded systems",
    "Using a single availability zone while claiming full disaster recovery coverage",
    "Leaving management planes exposed because application traffic is encrypted"
  ],
  general: [
    "Applying a physical or administrative control when a targeted technical safeguard is required",
    "Choosing a convenience-focused process that leaves the primary risk untreated",
    "Documenting the issue without assigning ownership, priority, or remediation criteria",
    "Trusting default settings because the system was recently installed by a vendor",
    "Assuming user training alone can replace required technical enforcement controls",
    "Prioritizing operational speed while leaving the stated security objective unresolved",
    "Treating monitoring as prevention when the question requires active enforcement",
    "Accepting a control that addresses availability when confidentiality is the main concern",
    "Selecting a broad governance activity instead of the specific scenario control",
    "Using a compensating measure without validating that it reduces the identified risk"
  ]
};

const lengthBalancedTailPhrases = [
  "during normal operations",
  "for administrative convenience",
  "without additional validation",
  "before risk ownership is assigned",
  "while preserving the existing workflow",
  "even when the asset is high value"
];

const replacementModifiers = [
  "Endpoint", "Network", "Identity", "Cloud", "Data", "Application", "Wireless", "Vendor", "Incident", "Policy",
  "Certificate", "Privileged", "Container", "Database", "Backup", "Remote access", "Threat", "Log", "Asset", "Mobile"
];

const replacementConcepts = [
  "hardening", "monitoring", "segmentation", "baseline", "attestation", "allow list", "audit", "classification",
  "tokenization", "isolation", "validation", "filtering", "enrollment", "rotation", "retention", "revocation",
  "scanning", "containment", "approval", "inventory", "federation", "inspection", "escrow", "recovery", "decommissioning"
];

const lengthBalanceQualifiers = [
  "with documented change approval and rollback criteria",
  "validated through logs before incident closure",
  "applied to high-value assets after risk review",
  "scoped to production systems with owner approval",
  "tested against baseline configurations before release",
  "monitored through centralized telemetry and alerts",
  "reviewed during audit evidence collection",
  "mapped to business impact and recovery objectives",
  "enforced through conditional access and logging",
  "approved as a compensating control during remediation",
  "tracked in the risk register with assigned ownership",
  "configured with least privilege and periodic review",
  "documented in the incident playbook for response teams",
  "validated during tabletop exercises and follow-up testing",
  "restricted to authorized administrators and service accounts",
  "reviewed against data classification and retention rules",
  "applied after vulnerability prioritization and patch testing",
  "monitored for anomalous behavior across protected workloads",
  "implemented with segmentation and continuous verification",
  "measured against contractual service expectations"
];

const distractorExpansionTails = [
  "as the primary control for the stated scenario",
  "without addressing the underlying security requirement",
  "as a substitute for the control that directly addresses the risk",
  "while leaving the main confidentiality, integrity, or availability concern unresolved",
  "instead of applying the required access control or monitoring safeguard",
  "as a general administrative action rather than a targeted technical control",
  "without validating whether the specific threat or business impact is reduced",
  "as the main remediation step before confirming the affected security objective"
];

const manualSalvageItems = [
  {
    stem: "Which term refers to individuals or groups who have an interest in security decisions and outcomes?",
    optionsText: "Backout plan, stakeholders, standard operating procedure, or approval process",
    answer: "stakeholders"
  },
  {
    stem: "Which document provides step-by-step guidance on performing security related tasks consistently?",
    optionsText: "Standard operating procedure, stakeholder agreement, impact analysis report, or approval process documentation",
    answer: "standard operating procedure"
  },
  {
    stem: "Which device is specifically designed to manage and protect cryptographic keys in high security environments?",
    optionsText: "Trusted platform module, secure enclave, hardware security module, or key exchange protocol",
    answer: "hardware security module"
  },
  {
    stem: "Why is resource reuse a security concern in virtualization?",
    optionsText: "It prevents the execution of malicious processes, it automatically encrypts all stored data, residual data from previous virtual machines may be accessible, or it improves virtualization performance",
    answer: "residual data from previous virtual machines may be accessible"
  },
  {
    stem: "What is a primary risk when relying on third-party service providers?",
    optionsText: "A security breach in the provider system can impact client data, the provider enforces multifactor authentication on all client accounts, the provider guarantees protection against all cyber threats, or all provider data is automatically encrypted",
    answer: "a security breach in the provider system can impact client data"
  },
  {
    stem: "What is the security risk of sideloading applications on a mobile device?",
    optionsText: "The device is automatically encrypted upon installation, sideloading ensures that only verified apps are installed, it prevents unauthorized applications from being installed, or malicious or unverified applications can be installed",
    answer: "malicious or unverified applications can be installed"
  },
  {
    stem: "Which of the following is a security risk associated with real-time operating systems or RTOS?",
    optionsText: "RTOS systems often prioritize performance over security making them vulnerable to attacks, RTOS systems cannot be compromised due to their design, RTOS systems use encryption by default, or RTOS systems automatically patch vulnerabilities",
    answer: "RTOS systems often prioritize performance over security making them vulnerable to attacks"
  },
  {
    stem: "Which authentication framework is used to support multiple authentication methods including smart cards and biometrics?",
    optionsText: "Extensible authentication protocol, 802.1X, layer 7 firewall, or web application firewall",
    answer: "extensible authentication protocol"
  },
  {
    stem: "Which term refers to legally protected creations such as patents, trademarks, and copyrights?",
    optionsText: "Regulated data, trade secret, intellectual property, or financial information",
    answer: "intellectual property"
  },
  {
    stem: "What is the main function of a security information and event management or SIEM system?",
    optionsText: "To encrypt all network traffic to ensure secure communications, to limit access to sensitive data by restricting user login attempts, to collect correlate and analyze security data to identify threats, or to block malware automatically on endpoints",
    answer: "to collect correlate and analyze security data to identify threats"
  },
  {
    stem: "Which action is typically performed during the detection phase of an incident response?",
    optionsText: "Identify the root cause of the incident, analyze system logs and alerts, contain the spread of the incident, or restore systems to their normal state",
    answer: "analyze system logs and alerts"
  },
  {
    stem: "What is an independent assessment in security management?",
    optionsText: "A security assessment conducted by the internal IT department, an internal evaluation by the organization's security team, a penetration test performed by the vendor security team, or a security review performed by an external third-party auditor",
    answer: "a security review performed by an external third-party auditor"
  },
  {
    stem: "What does XML stand for in data interchange?",
    optionsText: "Extensible markup link, exchange markup language, extended markup language, or extensible markup language",
    answer: "extensible markup language"
  },
  {
    stem: "Which of the following is a characteristic of a private key in asymmetric encryption?",
    optionsText: "It is shared publicly to allow data encryption, it can be used to verify digital signatures only, it is kept secret and used to decrypt messages encrypted with the public key, or it is stored in a key escrow for public access",
    answer: "it is kept secret and used to decrypt messages encrypted with the public key"
  },
  {
    stem: "What is the purpose of key escrow in encryption?",
    optionsText: "To generate encryption keys for data encryption, to store encryption keys for recovery under authorized conditions, to publish private keys for all users, or to disable cryptographic protections during recovery",
    answer: "to store encryption keys for recovery under authorized conditions"
  },
  {
    stem: "What is a common security risk associated with hardware providers in the supply chain?",
    optionsText: "Hardware providers always implement the latest security updates, hardware providers enforce multifactor authentication by default, hardware components may contain vulnerabilities or malicious modifications, or hardware providers remove all firmware risks",
    answer: "hardware components may contain vulnerabilities or malicious modifications"
  },
  {
    stem: "Which attack amplifies the amount of traffic sent to a target by leveraging misconfigured third-party servers?",
    optionsText: "Amplified attack, on-path attack, DNS poisoning, or credential replay attack",
    answer: "amplified attack"
  },
  {
    stem: "A cyber criminal sends a request to multiple open servers, which then respond by sending large amounts of traffic to the victim. What type of attack is this?",
    optionsText: "Brute force attack, RFID cloning, reflected attack, or credential replay attack",
    answer: "reflected attack"
  },
  {
    stem: "What is the primary purpose of training in security operations?",
    optionsText: "To test the effectiveness of security policies, to ensure employees understand their role in security, to create new security technologies, or to improve response time during all incidents automatically",
    answer: "to ensure employees understand their role in security"
  },
  {
    stem: "What is a false positive in vulnerability scanning?",
    optionsText: "When a vulnerability is identified correctly but ignored, when a vulnerability is incorrectly identified as present when it is not, when a system is reported as secure but is actually vulnerable, or when a vulnerability is correctly identified but not fixed in time",
    answer: "when a vulnerability is incorrectly identified as present when it is not"
  },
  {
    stem: "What does a false negative refer to in vulnerability scanning?",
    optionsText: "When a vulnerability is missed or incorrectly marked as not present, when a vulnerability is falsely detected as being present, when a scan detects the wrong vulnerability on a system, or when a system is incorrectly marked as patched",
    answer: "when a vulnerability is missed or incorrectly marked as not present"
  },
  {
    stem: "What is the purpose of prioritizing vulnerabilities in a security environment?",
    optionsText: "To address every vulnerability equally regardless of severity, to focus on critical vulnerabilities based on risk and impact, to delay all remediation until every scan is complete, or to remove vulnerability ownership from asset owners",
    answer: "to focus on critical vulnerabilities based on risk and impact"
  },
  {
    stem: "Which deception tool consists of a network of decoy systems to detect unauthorized access attempts?",
    optionsText: "Honey file, honeypot, honeynet, or honey token",
    answer: "honeynet"
  },
  {
    stem: "Which physical security measure is designed to prevent vehicle-based attacks on buildings and pedestrian areas?",
    optionsText: "Bollards, access control vestibule, fencing, or lighting",
    answer: "bollards"
  },
  {
    stem: "Which technology maintains a decentralized tamper-resistant ledger for transactions?",
    optionsText: "Digital signatures, certificate authorities, blockchain, or key stretching",
    answer: "blockchain"
  },
  {
    stem: "What is the purpose of a certificate revocation list or CRL?",
    optionsText: "To verify certificate validity in real time, to list certificates revoked by the issuing certificate authority, to store private keys for users, or to encrypt all network traffic",
    answer: "to list certificates revoked by the issuing certificate authority"
  },
  {
    stem: "In the data plane of zero trust architecture, what is a subject system?",
    optionsText: "An entity such as a user or device requesting access to a resource, a tool used to enforce access policies, a mechanism for analyzing security events, or a database that stores access control rules",
    answer: "an entity such as a user or device requesting access to a resource"
  },
  {
    stem: "What component in zero trust architecture is responsible for enforcing security decisions at the resource level?",
    optionsText: "Policy engine, data plane, policy enforcement point, or implicit trust zone",
    answer: "policy enforcement point"
  },
  {
    stem: "Which type of deception technology is designed to attract attackers by simulating a vulnerable system?",
    optionsText: "Honey file, honeynet, honeypot, or honey token",
    answer: "honeypot"
  },
  {
    stem: "Which term describes a planned period when a security change can be implemented with reduced business impact?",
    optionsText: "Maintenance window, backout plan, stakeholder register, or standard operating procedure",
    answer: "maintenance window"
  },
  {
    stem: "Which protocol provides port-based network access control using authentication mechanisms?",
    optionsText: "802.1X, extensible authentication protocol, layer 7 firewall, or web application firewall",
    answer: "802.1X"
  },
  {
    stem: "An attacker modifies a file between its initial verification and execution leading to unauthorized actions. What type of attack is this?",
    optionsText: "Time of use attack, memory injection, race condition, or SQL injection",
    answer: "race condition"
  },
  {
    stem: "Which change management artifact defines the steps to restore the previous state if an implementation fails?",
    optionsText: "Backout plan, maintenance window, stakeholder register, or impact analysis",
    answer: "backout plan"
  },
  {
    stem: "What is the purpose of supply chain analysis in security management?",
    optionsText: "To evaluate supplier and contractor security risks, to replace all vendor contracts automatically, to remove the need for third-party monitoring, or to guarantee suppliers have no vulnerabilities",
    answer: "to evaluate supplier and contractor security risks"
  }
];

function cleanTranscript(text) {
  let value = text
    .replace(/^#.*$/gm, " ")
    .replace(/\b\d{2}:\d{2}:\d{2}\.\d{3}\b/g, " ")
    .replace(/\b\d{2}:\d{2}:\d{2}\b/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\bSYO71\b/gi, "SY0-701")
    .replace(/\bmultiffactor\b/gi, "multifactor")
    .replace(/\brulebased\b/gi, "rule-based")
    .replace(/\brolebased\b/gi, "role-based")
    .replace(/\bpolicydriven\b/gi, "policy-driven")
    .replace(/\bcrossite\b/gi, "cross-site")
    .replace(/\b(?:the\s+)?correct answer of\b[^.?!]{0,160}?\bis\b/gi, "Correct answer is")
    .replace(/\b(?:the\s+)?correct answer\s+and\b[^.?!]{0,180}?\bis\b/gi, "Correct answer is")
    .replace(/\bcorrect answer\.\s+I\b[^.?!]{0,180}?\bto\b/gi, "Correct answer is to")
    .replace(/\bcorrect answer\.\s+And\b[^.?!]{0,220}?\bSo,\s+it\s+is\b/gi, "Correct answer is")
    .replace(/\b(?:the\s+)?correct answer\.\s+/gi, "Correct answer is ")
    .replace(/\s+/g, " ")
    .trim();

  for (const pattern of fillerPatterns) {
    value = value.replace(pattern, " ");
  }

  return value.replace(/\s+/g, " ").trim();
}

function findQuestionStart(text) {
  const pattern = /\b(?:Which|What|During|After|How|Why|If|For|Your|In\s+(?:a|an|the|zero|cloud|wireless|computing|facilities|data|secure|mobile|subnetting|virtualization|cryptographic|security|network|endpoint|risk|corporate|certificate|encryption|authentication|billing|hardware|malware|web|organizational|continuity|device|office|reliability|industrial|power|financial|programming)|A company|An organization|A user|An employee|An administrator|An attacker|An adversary|A threat actor|A cyber ?criminal|Cyber criminals|Cyber attacks|A CEO|A customer|A victim|A visitor|A developer|A server|A system|A program|A social|A distributed|Caller ID|Stenography|Steganography|A security|A security analyst)\b/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const candidate = text.slice(match.index, match.index + 80).toLowerCase();
    if (/\b(?:you guys|some more time|familiar with|pause the video|jumping the gun|softballs|outside of the box|common sense|time to go to bed|all over the place)\b/.test(candidate)) continue;
    if (/^for\b[^?]{0,80}\.\s+(?:which|what|how|why)\b/.test(candidate)) continue;
    if (/^for security\./.test(candidate)) continue;
    if (/^for one of the easiest\b/.test(candidate)) continue;
    if (/^an organization's security posture\./.test(candidate)) continue;
    if (/^stenography\./.test(candidate)) continue;
    if (/\b(?:gimmies|those are called|feels very similar)\b/.test(candidate)) continue;
    if (/^which\s+(?:is|are|was|were|then|can|will|would|has|have|should|could|also)\b/.test(candidate)) continue;
    const questionMark = text.indexOf("?", match.index);
    if (questionMark !== -1 && questionMark - match.index <= 520) return match.index;
  }
  return -1;
}

function getAnswerStartOffset(text) {
  const patterns = [
    /^not to improve productivity\.?\s*Sorry\.?\s*/i,
    /^they say it right in the question\.?\s*/i,
    /^it is in the name\.?\s*/i,
    /^actually outside of the button is\s*/i,
    /^and we\b[\s\S]{0,180}?\bis\s+(?=it is kept secret)/i,
    /^and we already know\b[\s\S]{0,260}?\bso,\s+it\s+is\s+/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[0].length;
  }

  return 0;
}

function findAnswerBoundary(text) {
  const questionStart = findQuestionStart(text);
  const sentenceBoundary = /[.]\s+(?=(?:Which|What|How|Why|During|After|For|Your|In\b|A\b|An\b|Cyber\b|Attackers\b|Caller ID\b|Stenography\b|Steganography\b|Also\b|Uh\b|I\b|This\b|The\b))/i.exec(text);
  const sentenceIndex = sentenceBoundary ? sentenceBoundary.index + 1 : -1;

  if (questionStart > 0 && sentenceIndex > 0) return Math.min(questionStart, sentenceIndex);
  if (questionStart > 0) return questionStart;
  if (sentenceIndex > 0) return sentenceIndex;
  return -1;
}

function splitAnswerAndNext(segment) {
  const trimmed = segment.trim();
  const answerOffset = getAnswerStartOffset(trimmed);
  const scoped = trimmed.slice(answerOffset).trim();
  const boundary = findAnswerBoundary(scoped);

  if (boundary === -1) {
    return {
      answer: cleanAnswer(scoped),
      nextQuestion: ""
    };
  }

  return {
    answer: cleanAnswer(scoped.slice(0, boundary)),
    nextQuestion: scoped.slice(boundary).replace(/^[.\s]+/, "").replace(/^(?:uh|so|and)\b[\s,]*/i, "").trim()
  };
}

function cleanAnswer(text) {
  return text
    .replace(/\bCorrect answer is\b/gi, " ")
    .replace(/\bCorrect answer\b/gi, " ")
    .replace(/\bSo the answer is\b/gi, " ")
    .replace(/\bAnd that is it\b[\s\S]*$/i, " ")
    .replace(/^actually outside of the button is\s*/i, " ")
    .replace(/^and we\b[\s\S]{0,180}?\bis\s+(?=it is kept secret)/i, " ")
    .replace(/^and we already know\b[\s\S]{0,260}?\bso,\s+it\s+is\s+/i, " ")
    .replace(/^NGFW or next generation firewall includes\b/i, "NGFW includes")
    .replace(/\s+backup plan reverting changes\b/i, " ")
    .replace(/\s+like the little smart cards\b[\s\S]*$/i, " ")
    .replace(/\.\s+And this is another thing\b[\s\S]*$/i, " ")
    .replace(/\.\s+(?:First question|Question two)\b[\s\S]*$/i, " ")
    .replace(/\.\s+There was actually\b[\s\S]*$/i, " ")
    .replace(/\.\s+Could you imagine\b[\s\S]*$/i, " ")
    .replace(/\.\s+And I actually should have given\b[\s\S]*$/i, " ")
    .replace(trailingTopicPattern, " ")
    .replace(/\s+was the (?:main )?purpose\b[\s\S]*$/i, " ")
    .replace(/\b(?:Also, if|I feel like|I don't know|Android users|Shocking, I know|This is 2025|Everyone knows|Time to go to bed|Are we)\b[\s\S]*$/i, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:,-]+|[\s:,-]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .trim();
}

function sentenceCase(text) {
  const value = text.trim();
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeSecurityTerms(text) {
  return String(text)
    .replace(/\bBallards\b/gi, "bollards")
    .replace(/\bHoneyet\b/gi, "honeynet")
    .replace(/\bHoney Net\b/gi, "honeynet")
    .replace(/\bHoney Pot\b/gi, "honeypot")
    .replace(/\bHoney Token\b/gi, "honey token")
    .replace(/\bObfiscation\b/gi, "obfuscation")
    .replace(/\bStenography\b/gi, "steganography")
    .replace(/\bstenography\b/g, "steganography")
    .replace(/\bFishing\b/g, "phishing")
    .replace(/\bfishing\b/g, "phishing")
    .replace(/\bWhailing\b/gi, "whaling")
    .replace(/\bSpyw wear\b/gi, "spyware")
    .replace(/\bGalloy counter mode\b/gi, "Galois/Counter Mode")
    .replace(/\bGalloid counter mode\b/gi, "Galois/Counter Mode")
    .replace(/\bKerros\b/gi, "Kerberos")
    .replace(/\bHIPPA\b/g, "HIPAA")
    .replace(/\bhard torelicate\b/gi, "hard-to-replicate")
    .replace(/\bhardto-relicate\b/gi, "hard-to-replicate")
    .replace(/\bsoftwaredefined\b/gi, "software-defined")
    .replace(/\btimebased\b/gi, "time-based")
    .replace(/\bpasswordbased\b/gi, "password-based")
    .replace(/\bprivatebased\b/gi, "private-based")
    .replace(/\bHMACbased\b/g, "HMAC-based")
    .replace(/\bhostbased\b/gi, "host-based")
    .replace(/\bendof life\b/gi, "end-of-life")
    .replace(/\bdialin\b/gi, "dial-in")
    .replace(/\bonetime\b/gi, "one-time")
    .replace(/\bpointto-point\b/gi, "point-to-point")
    .replace(/\bpacketto packet\b/gi, "packet-to-packet")
    .replace(/\brealtime\b/gi, "real-time")
    .replace(/\bprivacyenhanced\b/gi, "privacy-enhanced")
    .replace(/\bDiffy Helman\b/gi, "Diffie-Hellman")
    .replace(/\bDiffie Helman\b/gi, "Diffie-Hellman")
    .replace(/\bEncapsulated security payload\b/gi, "Encapsulating Security Payload")
    .replace(/\bAnti virus\b/gi, "Antivirus")
    .replace(/\bCorporateowned\b/gi, "Corporate-owned")
    .replace(/\bthirdparty\b/gi, "third-party")
    .replace(/\bauthent authenticity\b/gi, "authenticity")
    .replace(/\bblockchaining\b/gi, "block chaining")
    .replace(/\btacax\b/gi, "TACACS")
    .replace(/\bFilebased\b/gi, "File-based")
    .replace(/\bfilebased\b/gi, "file-based")
    .replace(/\bBlue snarfing\b/gi, "Bluesnarfing")
    .replace(/\bblue snarfing\b/gi, "bluesnarfing")
    .replace(/\bTypos squatting\b/gi, "Typosquatting")
    .replace(/\btypos squatting\b/gi, "typosquatting")
    .replace(/\bCross-sight\b/gi, "Cross-site")
    .replace(/\bcross-sight\b/gi, "cross-site")
    .replace(/\bZeroday\b/gi, "Zero-day")
    .replace(/\bzeroday\b/gi, "zero-day")
    .replace(/\bSide loading\b/gi, "Sideloading")
    .replace(/\bside loading\b/gi, "sideloading")
    .replace(/\btime ofuse\b/gi, "time-of-use")
    .replace(/\bOOTH\b/g, "OAuth")
    .replace(/\bO aut\b/gi, "OAuth")
    .replace(/\barbback\b/gi, "RBAC")
    .replace(/\bARRO\b/g, "ARO");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFlexibleIndex(text, needle) {
  const tokens = normalizeComparable(needle)
    .split(" ")
    .filter((token) => token.length > 1);

  if (!tokens.length) return -1;

  const pattern = tokens.map(escapeRegExp).join("\\W+");
  const match = new RegExp(pattern, "i").exec(text);
  return match ? match.index : -1;
}

function normalizeOption(text) {
  let value = String(text)
    .replace(/\b(?:uh|um)\b/gi, " ")
    .replace(/\b(?:you guys|pause the video|earlier questions|extra questions)\b[\s\S]*$/gi, " ")
    .replace(/\b(?:I feel like|Do we even need|Don't worry|Are we I feel like|Shocking, I know|Android users|Correct answer)\b[\s\S]*$/gi, " ")
    .replace(/\.\s+(?=(?:Which|What|How|Why|In\b|Issuing\b|Dividing\b|Caller ID\b|Concurrent\b|What actions\b|The function\b|to secure\b|responsible for\b|password\b))[\s\S]*$/i, "")
    .replace(trailingTopicPattern, "")
    .replace(/\?.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (value.length > 140) {
    const sentence = value.split(/[.;]/)[0];
    value = sentence.length >= 8 && sentence.length <= 140 ? sentence : value.split(" ").slice(0, 22).join(" ");
  }

  return normalizeSecurityTerms(sentenceCase(value))
    .replace(/\bwi fi\b/gi, "Wi-Fi")
    .replace(/\btcp\b/gi, "TCP")
    .replace(/\budp\b/gi, "UDP")
    .replace(/\bdns\b/gi, "DNS")
    .replace(/\bdhcp\b/gi, "DHCP")
    .replace(/\bip\b/gi, "IP")
    .replace(/\bcia\b/gi, "CIA")
    .replace(/\baaa\b/gi, "AAA")
    .replace(/\bsiem\b/gi, "SIEM")
    .replace(/\bedr\b/gi, "EDR")
    .replace(/\bxdr\b/gi, "XDR")
    .replace(/\bwaf\b/gi, "WAF")
    .replace(/\bvpn\b/gi, "VPN")
    .replace(/\bvpc\b/gi, "VPC")
    .replace(/\bxml\b/gi, "XML")
    .replace(/\bxss\b/gi, "XSS")
    .replace(/\bxsrf\b/gi, "XSRF")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .trim();
}

function cleanStemText(text) {
  let value = String(text)
    .replace(/^\s*(?:so,\s*)?(?:uh,\s*)?/i, "")
    .replace(/\b(which entity)\s+\1\b/gi, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([?.,])/g, "$1")
    .trim();

  const introMatches = [...value.matchAll(/\b(?:Which|What|Why|How)\b/gi)];
  const badLeadPattern = /\b(?:wrote the code|infrastructure and ensure accurate|if needed|for security|time to go to bed|all over the place|one of the easiest)\b/i;
  if (introMatches.length > 0) {
    const lastIntro = introMatches[introMatches.length - 1];
    if (badLeadPattern.test(value.slice(0, lastIntro.index))) {
      value = value.slice(lastIntro.index).trim();
    }
  }

  return normalizeSecurityTerms(sentenceCase(value));
}

function cleanOptionsTail(text) {
  return String(text)
    .replace(/\b(?:Correct answer|I feel like|Do we even need|Don't worry|The beautiful thing|Are we I feel like|This bothers me|Half the time|There's a major security risk|I say that|Shocking, I know|Android users)\b[\s\S]*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitStemAndOptions(scoped, answer) {
  const answerIndex = findFlexibleIndex(scoped, answer);
  let stemEnd = -1;
  let optionsStart = -1;

  if (answerIndex >= 0) {
    const beforeAnswer = scoped.slice(0, answerIndex);
    const lastQuestion = beforeAnswer.lastIndexOf("?");
    const lastSentence = Math.max(beforeAnswer.lastIndexOf("."), beforeAnswer.lastIndexOf("!"));
    const lastComma = beforeAnswer.lastIndexOf(",");

    if (lastQuestion >= 10 && answerIndex - lastQuestion <= 520) {
      stemEnd = lastQuestion + 1;
      optionsStart = stemEnd;
    } else if (lastComma >= 25 && answerIndex - lastComma <= 220) {
      const priorComma = beforeAnswer.lastIndexOf(",", lastComma - 1);
      if (priorComma >= 25 && lastComma - priorComma <= 100) {
        stemEnd = priorComma;
        optionsStart = priorComma + 1;
      } else {
        stemEnd = lastComma;
        optionsStart = lastComma + 1;
      }
    } else if (lastSentence >= 25 && answerIndex - lastSentence <= 280) {
      stemEnd = lastSentence + 1;
      optionsStart = stemEnd;
    }
  }

  if (stemEnd < 0) {
    const questionMark = scoped.indexOf("?");
    if (questionMark < 10) return null;
    stemEnd = questionMark + 1;
    optionsStart = stemEnd;
  }

  let stemStart = 0;
  const currentQuestionMark = stemEnd > 0 ? scoped.lastIndexOf("?", stemEnd - 1) : -1;
  const previousQuestionMark = currentQuestionMark > 0 ? scoped.lastIndexOf("?", currentQuestionMark - 1) : -1;
  if (previousQuestionMark >= 0) {
    const local = scoped.slice(previousQuestionMark + 1, stemEnd);
    const localStart = findQuestionStart(local);
    if (localStart >= 0) {
      stemStart = previousQuestionMark + 1 + localStart;
    } else {
      stemEnd = previousQuestionMark + 1;
      optionsStart = stemEnd;
    }
  }

  let stem = scoped.slice(stemStart, stemEnd).replace(/\s+/g, " ").trim();
  let optionsText = scoped.slice(optionsStart).trim();

  if (!stem.endsWith("?")) {
    stem = `${stem.replace(/[,:;.\s]+$/g, "")}?`;
  }

  return {
    stem: cleanStemText(stem),
    optionsText: cleanOptionsTail(optionsText)
  };
}

function parseQuestionBlock(block, answer) {
  const cleaned = block
    .replace(/\bCorrect answer is\b[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const start = findQuestionStart(cleaned);
  const scoped = start >= 0 ? cleaned.slice(start).trim() : cleaned;

  return splitStemAndOptions(scoped, answer);
}

function splitOptions(optionsText, answer) {
  const answerNorm = normalizeComparable(answer);
  let text = optionsText
    .replace(/\bCorrect answer is\b[\s\S]*$/i, "")
    .replace(/\b(?:Correct answer|Cannot deny taking an action|Key function of authentication|Authenticate systems rather than users)\b[\s\S]*$/i, "")
    .replace(/\.\s+(?=(?:They|It|This|The|A|An|To|Enforce|Enforcing|Implement|Implementing|Audit|Auditing|Monitor|Monitoring|Encrypt|Encrypting|Prevent|Preventing|Allow|Allowing|Restrict|Restricting|Identify|Identifying|Verify|Verifying|Ensure|Ensuring|Collect|Collecting|Block|Blocking|Store|Storing|Reduce|Reducing|Increase|Increasing|Issue|Issuing|Divide|Dividing|Caller ID|Concurrent|What|Which|In)\b)/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return [];

  const parts = text
    .replace(/\s+or\s+/gi, ", ")
    .split(/\s*,\s*/)
    .map(normalizeOption)
    .filter((item) => item.length >= 2)
    .filter((item) => !/^(?:i feel like|there'?s|which|what|why|how|is it|do we)\b/i.test(item));

  const candidates = [];
  for (const part of parts) {
    if (part.length > 140) continue;
    if (!candidates.some((existing) => normalizeComparable(existing) === normalizeComparable(part))) {
      candidates.push(part);
    }
  }

  const answerIndex = candidates.findIndex((candidate) =>
    normalizeComparable(candidate) === answerNorm ||
    normalizeComparable(candidate).includes(answerNorm) ||
    answerNorm.includes(normalizeComparable(candidate))
  );

  if (answerIndex >= 0) {
    const selected = [candidates[answerIndex]];
    for (const candidate of candidates) {
      if (selected.length >= 4) break;
      if (normalizeComparable(candidate) !== normalizeComparable(selected[0])) selected.push(candidate);
    }
    return selected.slice(0, 4);
  }

  return candidates.slice(0, 4);
}

function normalizeComparable(text) {
  return String(text)
    .toLowerCase()
    .replace(/\bsoftwaredefined\b/g, "software defined")
    .replace(/\bpasswordbased\b/g, "password based")
    .replace(/\bprivatebased\b/g, "private based")
    .replace(/\btimebased\b/g, "time based")
    .replace(/\bhmacbased\b/g, "hmac based")
    .replace(/\bdialin\b/g, "dial in")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|to|of|and|or|for|in|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optionTokens(text) {
  return normalizeComparable(text)
    .split(" ")
    .filter((token) => token.length > 2);
}

function isNearDuplicateOption(left, right) {
  const leftTokens = new Set(optionTokens(left));
  const rightTokens = new Set(optionTokens(right));
  const smallerSize = Math.min(leftTokens.size, rightTokens.size);
  if (smallerSize < 4) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap++;
  }

  return overlap / smallerSize >= 0.8;
}

function isContainedDuplicateOption(left, right) {
  const leftNorm = normalizeComparable(left);
  const rightNorm = normalizeComparable(right);
  return leftNorm === rightNorm ||
    (leftNorm.length > 20 && rightNorm.length > 20 && (leftNorm.includes(rightNorm) || rightNorm.includes(leftNorm)));
}

function conflictsWithUsedOptions(text, usedTexts) {
  for (const usedText of usedTexts) {
    if (isContainedDuplicateOption(text, usedText) || isNearDuplicateOption(text, usedText)) return true;
  }

  return false;
}

function conflictsWithinQuestion(question, text, ignoredChoiceId) {
  return question.choices.some((choice) =>
    choice.id !== ignoredChoiceId &&
    (isContainedDuplicateOption(text, choice.text) || isNearDuplicateOption(text, choice.text))
  );
}

function distractorContainsShortCorrectAnswer(correctText, distractorText) {
  const correctTokens = optionTokens(correctText).filter((token) => token.length > 3);
  if (!correctTokens.length || correctTokens.length > 2) return false;

  const distractorTokens = new Set(optionTokens(distractorText));
  return correctTokens.every((token) => distractorTokens.has(token));
}

function choiceCopiesStem(stem, choiceText) {
  const stemNorm = normalizeComparable(stem);
  const choiceNorm = normalizeComparable(choiceText);
  if (choiceNorm.length > 12 && stemNorm.includes(choiceNorm)) return true;

  const stemJoined = stemNorm.split(" ").filter((token) => token.length > 3).join(" ");
  const choiceTokens = choiceNorm.split(" ").filter((token) => token.length > 3);
  if (choiceTokens.length < 4) return false;

  for (let index = 0; index <= choiceTokens.length - 4; index++) {
    if (stemJoined.includes(choiceTokens.slice(index, index + 4).join(" "))) return true;
  }

  return false;
}

function poolForQuestion(stem, answer) {
  const text = `${stem} ${answer}`.toLowerCase();
  if (/\b(identity|authentication|authorization|access|password|privilege|mfa|saml|oauth|radius|kerberos)\b/.test(text)) return replacementDistractorPools.identity;
  if (/\b(firewall|network|vpn|dns|dhcp|tcp|udp|ip|wireless|vlan|subnet|router|proxy|port)\b/.test(text)) return replacementDistractorPools.network;
  if (/\b(encryption|hash|certificate|key|pki|cipher|crypto|signature|token|salt)\b/.test(text)) return replacementDistractorPools.crypto;
  if (/\b(attack|malware|phishing|threat|vulnerability|exploit|ransomware|injection|spoofing)\b/.test(text)) return replacementDistractorPools.threats;
  if (/\b(incident|log|siem|edr|forensic|patch|scan|response|containment|recovery|monitoring)\b/.test(text)) return replacementDistractorPools.operations;
  if (/\b(risk|audit|compliance|policy|vendor|privacy|agreement|regulation|governance|training)\b/.test(text)) return replacementDistractorPools.grc;
  if (/\b(cloud|virtual|container|serverless|architecture|backup|resilience|site|zero trust|infrastructure)\b/.test(text)) return replacementDistractorPools.architecture;
  return replacementDistractorPools.general;
}

function lengthPoolForQuestion(stem, answer) {
  const text = `${stem} ${answer}`.toLowerCase();
  if (/\b(identity|authentication|authorization|access|password|privilege|mfa|saml|oauth|radius|kerberos)\b/.test(text)) return lengthBalancedDistractorPools.identity;
  if (/\b(firewall|network|vpn|dns|dhcp|tcp|udp|ip|wireless|vlan|subnet|router|proxy|port)\b/.test(text)) return lengthBalancedDistractorPools.network;
  if (/\b(encryption|hash|certificate|key|pki|cipher|crypto|signature|token|salt)\b/.test(text)) return lengthBalancedDistractorPools.crypto;
  if (/\b(attack|malware|phishing|threat|vulnerability|exploit|ransomware|injection|spoofing)\b/.test(text)) return lengthBalancedDistractorPools.threats;
  if (/\b(incident|log|siem|edr|forensic|patch|scan|response|containment|recovery|monitoring)\b/.test(text)) return lengthBalancedDistractorPools.operations;
  if (/\b(risk|audit|compliance|policy|vendor|privacy|agreement|regulation|governance|training)\b/.test(text)) return lengthBalancedDistractorPools.grc;
  if (/\b(cloud|virtual|container|serverless|architecture|backup|resilience|site|zero trust|infrastructure)\b/.test(text)) return lengthBalancedDistractorPools.architecture;
  return lengthBalancedDistractorPools.general;
}

function curatedFallbackPoolsForQuestion(stem, answer) {
  return [
    lengthPoolForQuestion(stem, answer),
    lengthBalancedDistractorPools.general,
    lengthBalancedDistractorPools.identity,
    lengthBalancedDistractorPools.network,
    lengthBalancedDistractorPools.crypto,
    lengthBalancedDistractorPools.threats,
    lengthBalancedDistractorPools.operations,
    lengthBalancedDistractorPools.grc,
    lengthBalancedDistractorPools.architecture,
    replacementDistractorPools.general,
    replacementDistractorPools.identity,
    replacementDistractorPools.network,
    replacementDistractorPools.crypto,
    replacementDistractorPools.threats,
    replacementDistractorPools.operations,
    replacementDistractorPools.grc,
    replacementDistractorPools.architecture
  ];
}

function pickCuratedFallbackDistractor(stem, answer, usedTexts, seed, minLength = 2) {
  const used = new Set([...usedTexts].map(normalizeComparable));
  const correctNorm = normalizeComparable(answer);

  for (const pool of curatedFallbackPoolsForQuestion(stem, answer)) {
    for (const candidate of rotate(pool, seed)) {
      const text = normalizeOption(candidate);
      const norm = normalizeComparable(text);
      if (text.length < minLength || text.length > 180) continue;
      if (used.has(norm)) continue;
      if (conflictsWithUsedOptions(text, usedTexts)) continue;
      if (norm === correctNorm || norm.includes(correctNorm) || correctNorm.includes(norm)) continue;
      if (choiceCopiesStem(stem, text)) continue;
      if (distractorContainsShortCorrectAnswer(answer, text)) continue;
      if (isNearDuplicateOption(text, answer)) continue;
      usedTexts.add(text);
      return text;
    }
  }

  return null;
}

function pickReplacementDistractor(stem, answer, usedTexts, seed) {
  const pools = [
    poolForQuestion(stem, answer),
    replacementDistractorPools.general,
    replacementDistractorPools.network,
    replacementDistractorPools.identity,
    replacementDistractorPools.crypto,
    replacementDistractorPools.threats,
    replacementDistractorPools.operations,
    replacementDistractorPools.grc,
    replacementDistractorPools.architecture
  ];
  const used = new Set([...usedTexts].map(normalizeComparable));
  const correctNorm = normalizeComparable(answer);

  for (const pool of pools) {
    for (const candidate of rotate(pool, seed)) {
      const text = normalizeOption(candidate);
      const norm = normalizeComparable(text);
      if (used.has(norm)) continue;
      if (conflictsWithUsedOptions(text, usedTexts)) continue;
      if (norm === correctNorm || norm.includes(correctNorm) || correctNorm.includes(norm)) continue;
      if (choiceCopiesStem(stem, text)) continue;
      if (isNearDuplicateOption(text, answer)) continue;
      usedTexts.add(text);
      return text;
    }
  }

  const curatedFallback = pickCuratedFallbackDistractor(stem, answer, usedTexts, seed);
  if (curatedFallback) return curatedFallback;

  const fallback = normalizeOption(`Security review alternative ${seed}`);
  usedTexts.add(fallback);
  return fallback;
}

function pickUniqueFallbackDistractor(stem, answer, usedTexts, seed) {
  const curatedFallback = pickCuratedFallbackDistractor(stem, answer, usedTexts, seed);
  if (curatedFallback) return curatedFallback;

  const fallback = normalizeOption(`Security review alternative ${seed}`);
  usedTexts.add(fallback);
  return fallback;
}

function pickLengthBalancedDistractor(question, correctText, usedTexts, seed, minLength) {
  const used = new Set([...usedTexts].map(normalizeComparable));
  const correctNorm = normalizeComparable(correctText);
  const pools = [
    lengthPoolForQuestion(question.stem, correctText),
    lengthBalancedDistractorPools.general,
    lengthBalancedDistractorPools.identity,
    lengthBalancedDistractorPools.network,
    lengthBalancedDistractorPools.crypto,
    lengthBalancedDistractorPools.threats,
    lengthBalancedDistractorPools.operations,
    lengthBalancedDistractorPools.grc,
    lengthBalancedDistractorPools.architecture
  ];

  for (const pool of pools) {
    for (const candidate of rotate(pool, seed)) {
      const patterns = [candidate];

      for (const pattern of patterns) {
        const text = normalizeOption(pattern);
        const norm = normalizeComparable(text);
        if (text.length < minLength || text.length > 180) continue;
        if (used.has(norm)) continue;
        if (norm === correctNorm || norm.includes(correctNorm) || correctNorm.includes(norm)) continue;
        if (choiceCopiesStem(question.stem, text)) continue;
        if (distractorContainsShortCorrectAnswer(correctText, text)) continue;
        if (isNearDuplicateOption(text, correctText)) continue;
        usedTexts.add(text);
        return text;
      }
    }
  }

  return null;
}

function pickDistractors(stem, answer, seed) {
  const answerNorm = normalizeComparable(answer);
  const family = answerFamilies.find((item) => item.match.test(`${stem} ${answer}`));
  const pool = family ? [...family.distractors, ...poolForQuestion(stem, answer)] : poolForQuestion(stem, answer);

  const rotated = rotate(pool, seed)
    .map(normalizeOption)
    .filter((item) => normalizeComparable(item) !== answerNorm)
    .filter((item) => !choiceCopiesStem(stem, item));

  return rotated.slice(0, 8);
}

function rotate(items, seed) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (seed + i * 11 + copy[i].length) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function balanceOptionLength(option, answer, stem, seed) {
  let value = normalizeOption(option);
  return normalizeOption(value);
}

function buildChoices(stem, parsedOptions, answer, seed) {
  const correct = normalizeOption(answer);
  const correctNorm = normalizeComparable(correct);
  let distractors = parsedOptions
    .map(normalizeOption)
    .filter((item) => {
      const itemNorm = normalizeComparable(item);
      return itemNorm !== correctNorm &&
        !itemNorm.includes(correctNorm) &&
        !correctNorm.includes(itemNorm) &&
        !isNearDuplicateOption(item, correct) &&
        !choiceCopiesStem(stem, item) &&
        !/^(?:an entire storage unit|the primary function|responsible for|issuing and managing)\b/i.test(item);
    });
  const usedTexts = new Set([correct, ...distractors]);

  for (const generated of pickDistractors(stem, correct, seed)) {
    if (distractors.length >= 3) break;
    if (!distractors.some((item) => normalizeComparable(item) === normalizeComparable(generated)) && !choiceCopiesStem(stem, generated)) {
      distractors.push(generated);
      usedTexts.add(generated);
    }
  }

  distractors = distractors
    .slice(0, 3)
    .map((item, index) => balanceOptionLength(item, correct, stem, seed + index));

  while (distractors.length < 3) {
    const fallback = balanceOptionLength(pickReplacementDistractor(stem, correct, usedTexts, seed + distractors.length), correct, stem, seed + distractors.length);
    distractors.push(fallback);
  }

  const ordered = rotate([correct, ...distractors], seed);
  const choices = ordered.map((text, index) => ({ id: optionIds[index], text }));
  const correctChoice = choices.find((choice) => normalizeComparable(choice.text) === normalizeComparable(correct));
  if (!correctChoice) {
    choices[0].text = correct;
    return { choices, correct_answers: ["A"] };
  }

  return { choices, correct_answers: [correctChoice.id] };
}

function inferDomain(stem, answer, index) {
  const text = `${stem} ${answer}`.toLowerCase();
  let best = sectionSignals[index < 200 ? 0 : index < 430 ? 1 : index < 620 ? 2 : index < 850 ? 3 : 4];
  let bestScore = -1;

  for (const section of sectionSignals) {
    const score = section.terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }

  return best;
}

function inferDifficulty(stem, index) {
  const text = stem.toLowerCase();
  if (/\bbest\b|\bmost\b|\bleast\b|\bfirst\b|\bscenario\b|\bincident\b|\borganization\b/.test(text)) return "hard";
  if (index > 850) return "easy";
  if (/\bwhat does\b|\bstand for\b|\bdefines\b/.test(text)) return "normal";
  return "normal";
}

function extractQuestions(text) {
  const normalized = cleanTranscript(text);
  const segments = normalized.split(/\bCorrect answer is\b/i);
  let questionBlock = segments.shift() || "";
  const extracted = [];

  for (const segment of segments) {
    const { answer, nextQuestion } = splitAnswerAndNext(segment);
    const parsed = parseQuestionBlock(questionBlock, answer);
    if (parsed && answer) {
      const parsedOptions = splitOptions(parsed.optionsText, answer);
      const seed = extracted.length + parsed.stem.length + answer.length;
      const { choices, correct_answers } = buildChoices(parsed.stem, parsedOptions, answer, seed);
      const section = inferDomain(parsed.stem, answer, extracted.length);
      extracted.push({
        id: `SY0-701-MFA-Q${String(extracted.length + 1).padStart(4, "0")}`,
        global_id: `SY0-701-MYFREEACADEMY-Q${String(extracted.length + 1).padStart(4, "0")}`,
        exam_code: "SY0-701",
        source: "User-provided Tactiq transcript for MyFreeAcademy YouTube practice video",
        source_question_number: extracted.length + 1,
        domain: section.domain,
        domain_weight: "",
        objective: section.objective,
        topic: classifyTopic(parsed.stem, answer),
        difficulty: inferDifficulty(parsed.stem, extracted.length),
        question_type: "multiple_choice",
        stem: parsed.stem,
        choices,
        correct_answers,
        explanation: `The transcript states the correct answer as: ${normalizeOption(answer)}.`,
        extracted_correct_answer: normalizeOption(answer),
        original_options_text: parsed.optionsText,
        option_edit_note: "Distractors may be normalized or length-balanced from the transcript wording to reduce visual answer-length bias while keeping a four-option multiple-choice structure.",
        copyright_note: "Extracted and transformed from a user-provided transcript file for local study use."
      });
    } else {
      skippedBlocks.push({
        reason: parsed ? "missing-answer" : "missing-question",
        answer: answer.slice(0, 180),
        questionBlock: questionBlock.slice(0, 360),
        nextQuestion: nextQuestion.slice(0, 240)
      });
    }
    questionBlock = nextQuestion;
  }

  return extracted;
}

function appendManualSalvage(questions) {
  const existingStems = new Set(questions.map((question) => normalizeComparable(question.stem)));

  for (const item of manualSalvageItems) {
    if (questions.length >= TARGET_COUNT) break;
    if (existingStems.has(normalizeComparable(item.stem))) continue;

    const seed = questions.length + item.stem.length + item.answer.length;
    const parsedOptions = splitOptions(item.optionsText, item.answer);
    const { choices, correct_answers } = buildChoices(item.stem, parsedOptions, item.answer, seed);
    const section = inferDomain(item.stem, item.answer, questions.length);
    questions.push({
      id: `SY0-701-MFA-Q${String(questions.length + 1).padStart(4, "0")}`,
      global_id: `SY0-701-MYFREEACADEMY-Q${String(questions.length + 1).padStart(4, "0")}`,
      exam_code: "SY0-701",
      source: "User-provided Tactiq transcript for MyFreeAcademy YouTube practice video",
      source_question_number: `salvaged-${questions.length + 1}`,
      domain: section.domain,
      domain_weight: "",
      objective: section.objective,
      topic: classifyTopic(item.stem, item.answer),
      difficulty: inferDifficulty(item.stem, questions.length),
      question_type: "multiple_choice",
      stem: item.stem,
      choices,
      correct_answers,
      explanation: `The transcript fragment supports the correct answer: ${normalizeOption(item.answer)}.`,
      extracted_correct_answer: normalizeOption(item.answer),
      original_options_text: item.optionsText,
      option_edit_note: "Question recovered from a malformed transcript boundary; distractors may be normalized or length-balanced to reduce visual answer-length bias.",
      copyright_note: "Extracted and transformed from a user-provided transcript file for local study use."
    });
    existingStems.add(normalizeComparable(item.stem));
  }
}

const manualCorrections = {
  "SY0-701-MFA-Q0036": {
    stem: "Which document provides step-by-step guidance on performing security related tasks consistently?",
    choices: ["Standard operating procedure", "Stakeholder agreement", "Impact analysis report", "Approval process documentation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0038": {
    stem: "Which of the following is a potential security risk when using legacy applications?",
    choices: ["They often lack support for modern security updates and patches", "They require additional server capacity", "They do not support multiple authentication methods", "They automatically update without administrator approval"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0047": {
    stem: "What is the purpose of key escrow in encryption?",
    choices: ["To generate encryption keys for data encryption", "To store encryption keys securely for retrieval by authorized parties", "To distribute public keys among users", "To convert data into an unreadable format to protect confidentiality"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0063": {
    stem: "Which security feature creates an isolated execution environment within a processor to protect sensitive data?",
    choices: ["Hardware security module", "Key management system", "Trusted platform module", "Secure enclave"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0147": {
    stem: "Why is software supply chain security critical?",
    choices: ["Compromised software updates can introduce malware into systems", "Software providers always enforce strict security measures", "Software vulnerabilities do not impact modern security models", "All software is pre-validated against security threats before installation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0141": {
    stem: "What is a major security concern with end-of-life hardware?",
    choices: ["It automatically integrates with the latest security protocols", "It enforces multifactor authentication by default", "It no longer receives security patches, increasing vulnerability to attacks", "It ensures that all network traffic is encrypted"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0198": {
    stem: "What is the process of securely removing outdated systems and hardware to prevent unauthorized access to sensitive data?",
    choices: ["Monitoring", "Configuration enforcement", "Decommissioning", "Hardening techniques"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0206": {
    stem: "Which of the following is a security concern when using cloud computing?",
    choices: ["Data exposure due to shared infrastructure and multitenancy", "Automatic elimination of all access control requirements", "Complete removal of compliance obligations", "Guaranteed immunity from insider threats"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0216": {
    stem: "Logical segmentation in a network is primarily used to do which of the following?",
    choices: ["Physically separate systems in a data center", "Prevent power failures from affecting connected devices", "Restrict access between different departments or user groups", "Ensure all data is stored on local devices only"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0218": {
    stem: "Which of the following is a key security consideration for on-premises infrastructure?",
    choices: ["On-premises infrastructure eliminates the need for network firewalls", "Cloud security controls automatically apply to all on-premises environments", "On-premises environments do not require physical security controls", "Organizations are fully responsible for securing their hardware and data"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0225": {
    stem: "Why are embedded systems considered a security risk?",
    choices: ["They enforce strict multifactor authentication by default", "They often have limited security controls and cannot be easily updated", "They are automatically protected from all network threats", "They are isolated from all external connections by default"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0237": {
    stem: "What is a major security risk of an inability to patch a system?",
    choices: ["The system becomes immune to malware and cyber attacks", "It increases the processing power of network devices", "The system remains vulnerable to known exploits and attacks", "It eliminates the need for monitoring and logging"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0257": {
    stem: "Which type of firewall operates at both layer 4 and layer 7 of the OSI model for advanced traffic filtering?",
    choices: ["Packet-filtering firewall", "802.1X", "Next-generation firewall", "Extensible authentication protocol"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0258": {
    stem: "What is the primary function of a virtual private network or VPN in secure communications?",
    choices: ["To encrypt data traffic over public and private networks for secure remote access", "To physically isolate devices from external threats", "To authenticate users without encryption", "To eliminate the need for firewalls in enterprise environments"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0250": {
    stem: "What is the key difference between an intrusion detection system or IDS and an intrusion prevention system or IPS?",
    choices: ["An IDS monitors and alerts on suspicious activity while an IPS actively blocks threats", "An IDS blocks unauthorized access to applications while an IPS does not", "An IDS performs encryption while an IPS only detects malware", "An IPS passively observes traffic while an IDS actively mitigates attacks"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0265": {
    stem: "Which type of data is subject to government or industry regulations such as GDPR or HIPAA?",
    choices: ["Intellectual property", "Regulated data", "Human-readable data", "Trade secret"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0293": {
    stem: "What is the purpose of permission restrictions in data security?",
    choices: ["To encrypt all stored data by default", "To segment network traffic for improved performance", "To allow unrestricted access to sensitive data for efficiency", "To enforce access controls based on user roles and responsibilities"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0307": {
    stem: "What does a failover test evaluate in an IT environment?",
    choices: ["The security of data stored on external devices", "The effectiveness of user authentication policies", "The encryption strength of data in transit", "The ability of a system to switch to a backup or redundant system during a failure"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0340": {
    stem: "Which mobile device deployment model allows employees to select from a list of company-approved devices?",
    choices: ["Choose your own device or CYOD", "Bring your own device or BYOD", "Corporate-owned, personally enabled or COPE", "Mobile device management or MDM"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0468": {
    stem: "What is the primary advantage of using biometrics for authentication?",
    choices: ["Biometrics provide unique, hard-to-replicate verification using physical traits", "Biometrics are easy to reset if compromised", "Biometrics are mainly used to monitor employee productivity", "Biometrics require no training for users to operate"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0514": {
    stem: "What is the goal of the eradication phase in incident response?",
    choices: ["To recover critical business operations", "To remove malicious code and vulnerabilities", "To document lessons learned", "To restore affected systems to normal operations"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0525": {
    stem: "What is the main purpose of reporting in digital forensics?",
    choices: ["To detail how evidence was acquired and analyzed", "To present the evidence in a court of law", "To prevent evidence tampering during investigations", "To summarize the legal hold process"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0561": {
    stem: "What does industry-specific regulation ensure in a security program?",
    choices: ["It aligns the security program with the specific needs of a particular industry", "It establishes mandatory schedules for software updates", "It sets requirements for general employee training", "It determines the IT department structure"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0572": {
    stem: "What is the responsibility of controllers in a security program?",
    choices: ["They determine how data can be accessed and who can access it", "They ensure that data is securely stored and transmitted", "They conduct incident response activities after a breach", "They decide when security patches are installed"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0603": {
    stem: "What is an exemption in risk management?",
    choices: ["The formal process of shifting risk responsibility to an external provider", "The intentional removal of a risk from the organization's risk profile", "The exclusion of a particular risk or requirement due to specific circumstances", "A policy that allows all identified risks to be accepted without review"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0611": {
    stem: "What does mean time to repair or MTTR measure in system recovery?",
    choices: ["The average time it takes to detect a failure and initiate recovery efforts", "The average time it takes to fully restore a system after a failure", "The average time between system failures", "The total downtime caused by system failures"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0626": {
    stem: "What is a service level agreement or SLA used for?",
    choices: ["To formally define business partner roles and obligations", "To outline agreed service performance metrics, quality levels, and expectations", "To guarantee confidentiality for proprietary information", "To provide a framework for resolving employee disputes"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0656": {
    stem: "What is the main goal of integrated penetration testing in an organization?",
    choices: ["To evaluate how multiple security layers respond to coordinated attack scenarios", "To develop internal policies for managing cybersecurity risk", "To monitor network performance metrics", "To implement employee security awareness training"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0683": {
    stem: "What is represented by AES-256 in encryption standards?",
    choices: ["Authenticated encryption standard 256-bit", "Advanced encryption scheme 256-bit", "Advanced encryption standard with a 256-bit key", "Asymmetric encryption standard 256-bit"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0679": {
    stem: "What does execution of a security awareness program primarily involve?",
    choices: ["Delivering training sessions and applying policies to daily operations", "Removing all security policies from employee workflows", "Replacing awareness activities with technical controls only", "Outsourcing every security decision to a third party"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0699": {
    stem: "What is the full form of BGP in network routing?",
    choices: ["Basic gateway protocol", "Border Gateway Protocol", "Broadband gateway procedure", "Balanced gateway process"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0704": {
    stem: "What does BYOD mean in modern workplace policies?",
    choices: ["Build your own device", "Bring your own device", "Bring your office device", "Bring your own data"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0706": {
    stem: "What does CAPTCHA stand for in cybersecurity?",
    choices: ["Computer automated password Turing challenge", "Completely automated public Turing test to tell computers and humans apart", "Compulsory automated program to test computers", "Completely automated program to test computer algorithms"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0733": {
    stem: "What does CYOD mean in the context of device management policies?",
    choices: ["Choose your own desktop", "Choose your own device", "Choose your own data", "Customize your own device"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0738": {
    stem: "Which of the following is the correct full form of DES?",
    choices: ["Data Encryption Standard", "Digital encoding standard", "Dual encryption system", "Digital encryption standard"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0787": {
    stem: "What does IaaS stand for in cloud computing?",
    choices: ["Infrastructure as a service", "Integrated as a service", "Information as a service", "Internet as a service"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0792": {
    stem: "Which option correctly expands IDEA in encryption algorithms?",
    choices: ["International Data Encryption Algorithm", "Integrated data encryption algorithm", "Internal digital encryption application", "Internet data exchange algorithm"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0798": {
    stem: "What does IM stand for when referring to text-based real-time communication?",
    choices: ["Instant messaging", "Internal monitoring", "Integrated mail", "Identity management"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0828": {
    stem: "Which option is the correct expansion for MFD in IT devices?",
    choices: ["Multi-function device", "Modular file device", "Multiple file display", "Multifunctional data"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0834": {
    stem: "What does MPLS stand for in networking?",
    choices: ["Multiple protocol link service", "Multiprotocol Label Switching", "Modular protocol label system", "Multiplatform label switching"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0866": {
    stem: "Which option correctly expands PAC in proxy configurations?",
    choices: ["Proxy access code", "Preconfigured access control", "Proxy auto-configuration", "Public access control"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0871": {
    stem: "What does PBKDF2 stand for in cryptographic key derivation?",
    choices: ["Public binary key derivation format 2", "Private-based key distribution function 2", "Password binary key derivation format 2", "Password-based key derivation function 2"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0878": {
    stem: "What does PEM stand for in secure email formats?",
    choices: ["Personal electronic mail", "Privacy-enhanced mail", "Public encrypted mail", "Protocol encrypted message"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0885": {
    stem: "What does PKI stand for in cybersecurity?",
    choices: ["Public key infrastructure", "Private key identification", "Public key integration", "Private key infrastructure"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0888": {
    stem: "Which protocol is defined as PPP?",
    choices: ["Point-to-point protocol", "Packet-to-packet protocol", "Private top to private protocol", "Peer-to-peer protocol"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0897": {
    stem: "What does RADIUS stand for in network authentication services?",
    choices: ["Remote access dial-in user service", "Remote authentication dial-in user service", "Remote access data user interface service", "Remote authorization directory user system"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0917": {
    stem: "What does SAML stand for in federated identity management?",
    choices: ["Secure assertion markup language", "Simple assertion markup language", "Secure access markup language", "Security Assertion Markup Language"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0918": {
    stem: "In data storage, what does SAN refer to?",
    choices: ["Secure access node", "Storage area network", "System archive namespace", "Segmented access network"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0919": {
    stem: "In digital certificates, what does SAN stand for?",
    choices: ["Storage area name", "Subject Alternative Name", "Secure attribute name", "Secondary authorization name"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0920": {
    stem: "What does SASE stand for in network security architecture?",
    choices: ["Secure access service environment", "Secure Access Service Edge", "Secure application service edge", "Security and access service edge"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0923": {
    stem: "In certificate management, what does SCEP stand for?",
    choices: ["Simple certificate enrollment process", "Simple Certificate Enrollment Protocol", "Secure certificate enrollment protocol", "Standard certificate enrollment procedure"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0924": {
    stem: "What does SD-WAN represent in modern networking?",
    choices: ["Software-defined wide area network", "Software-driven wide area network", "Secure data wireless access network", "Segmented digital wide area node"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0931": {
    stem: "In programming, what does SEH stand for?",
    choices: ["Standard exception handler", "Structured Exception Handling", "Systematic error handler", "Structured error handler"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0934": {
    stem: "What does HTTPS stand for in web communications?",
    choices: ["Simple hypertext transfer protocol", "Standard Hypertext Transfer Protocol", "Hypertext Transfer Protocol Secure", "Safe Hypertext Transfer Protocol"],
    answerIndex: 2
  },
  "SY0-701-MFA-Q0944": {
    stem: "What does SOAR stand for in cybersecurity operations?",
    choices: ["Security Orchestration, Automation, and Response", "Secure operations and response", "System orchestration and automated response", "Security optimization and automated response"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0952": {
    stem: "What does SRTP stand for in secure media transmission?",
    choices: ["Secure Real-time Transport Protocol", "Standard real-time protocol", "Secure real-time processing", "Secure real-time protection"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0961": {
    stem: "What does TCP/IP stand for in networking?",
    choices: ["Transfer communication protocol/interconnect protocol", "Transmission Control Protocol/Internet Protocol", "Authenticated tunnel configuration protocol", "Transfer control protocol/interface process"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0966": {
    stem: "What does TOTP stand for in authentication mechanisms?",
    choices: ["Temporary one-time password", "Time-based one-time password", "Timed one-time passcode", "Timed operator password"],
    answerIndex: 1
  },
  "SY0-701-MFA-Q0970": {
    stem: "In DNS security, what does TSIG stand for?",
    choices: ["Time signature", "Transmission signal", "Terminal signal", "Transaction Signature"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0989": {
    stem: "What does VoIP stand for in telecommunications?",
    choices: ["Voice over Internet Protocol", "Virtualization over internet protocol", "Voice over integration protocol", "Virtualization of internet protocol"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0995": {
    stem: "What is the meaning of WEP in wireless security?",
    choices: ["Wireless encryption protocol", "Wired equivalent protection", "Wireless equivalent protection", "Wired Equivalent Privacy"],
    answerIndex: 3
  },
  "SY0-701-MFA-Q0168": {
    stem: "Which type of attack involves intercepting communication between two parties to steal or modify data?",
    choices: ["On-path attack", "DNS poisoning attack", "Brute force attack", "Amplified attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0173": {
    stem: "Which attack captures and retransmits valid authentication data to gain unauthorized access to a system?",
    choices: ["Replay attack", "Privilege escalation", "Buffer overflow", "Injection attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0001": {
    stem: "Which of the following is considered a technical security control?",
    choices: ["Firewall", "Security awareness training", "Acceptable use policy", "CCTV surveillance"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0013": {
    stem: "Which of the following is a key function of authentication in the AAA model?",
    choices: ["Verifying a user's claimed identity", "Enforcing authorization policies", "Encrypting stored data", "Tracking user accounting activity"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0014": {
    stem: "Which method is commonly used to authenticate systems rather than users?",
    choices: ["Digital certificates", "Multifactor authentication prompts", "Biometric authentication", "Security questions"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0082": {
    stem: "What type of threat actor is motivated by political or ideological beliefs and uses cyber attacks to promote their cause?",
    choices: ["Hacktivist", "Nation-state actor", "Organized crime group", "Insider threat"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0096": {
    stem: "Which attacker motivation is based on retaliation for a perceived wrong?",
    choices: ["Revenge", "Financial gain", "Espionage", "War"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0120": {
    stem: "Why should default credentials be changed immediately after installing a new device or system?",
    choices: ["Default usernames and passwords are widely known and can be exploited by attackers", "They prevent brute force attacks by enforcing strong password policies", "They improve network performance by optimizing authentication", "They replace the need for device hardening"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0125": {
    stem: "What type of social engineering attack uses voice calls to manipulate individuals into divulging confidential information?",
    choices: ["Vishing", "Phishing", "Smishing", "Pretexting"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0127": {
    stem: "Which of the following describes the intentional spread of false information to manipulate public perception?",
    choices: ["Misinformation", "Impersonation", "Pretexting", "Watering hole attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0129": {
    stem: "Which social engineering technique involves creating a fabricated scenario to convince a victim to reveal information?",
    choices: ["Pretexting", "Brand impersonation", "Vishing", "Business email compromise"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0132": {
    stem: "An attacker registers a domain name similar to a legitimate website hoping users will mistype the URL and enter sensitive information. What is this attack called?",
    choices: ["Typosquatting", "Business email compromise", "Watering hole attack", "Brand impersonation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0135": {
    stem: "A program fails to properly allocate memory, allowing an attacker to overwrite adjacent memory locations. What type of attack is this?",
    choices: ["Buffer overflow", "Race condition", "Cross-site scripting", "Time-of-check/time-of-use attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0136": {
    stem: "An attacker modifies a file between its initial verification and execution, leading to unauthorized actions. What type of attack is this?",
    choices: ["Time-of-check/time-of-use attack", "Memory injection", "Race condition", "Buffer overflow"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0138": {
    stem: "Which type of vulnerability primarily targets operating system processes and security mechanisms?",
    choices: ["Operating system-based attack", "SQL injection", "Web-based attack", "Cross-site scripting"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0139": {
    stem: "Which web security vulnerability allows attackers to inject scripts into web pages viewed by other users?",
    choices: ["Cross-site scripting", "Buffer overflow", "Time-of-check attack", "Malicious update"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0156": {
    stem: "Which type of malware is designed to secretly monitor a user's activity and collect personal information?",
    choices: ["Spyware", "Trojan", "Virus", "Bloatware"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0166": {
    stem: "Which type of attack manipulates DNS records to redirect users to malicious websites?",
    choices: ["DNS poisoning", "Wireless hijacking", "Amplified attack", "Credential replay attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0174": {
    stem: "Which application attack tricks a system into performing an action by forging a request from a trusted user?",
    choices: ["Cross-site request forgery", "Replay attack", "Buffer overflow", "Privilege escalation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0017": {
    stem: "In zero trust architecture, what does threat scope reduction aim to achieve?",
    choices: ["Minimizing the attack surface by restricting lateral movement within the network", "Auditing user access logs for anomalies after access has already been granted", "Expanding access to shared network segments after a user completes initial authentication", "Implementing multifactor authentication for all users"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0073": {
    stem: "What is the purpose of a certificate revocation list or CRL?",
    choices: ["To list certificates that have been revoked by the issuing certificate authority", "To check the validity of a certificate in real time", "To store public keys for encrypting data", "To generate a new certificate signing request"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0075": {
    stem: "What is a self-signed certificate?",
    choices: ["A certificate generated and signed by its owner rather than a trusted certificate authority", "A certificate issued by a trusted external certificate authority after identity validation", "A certificate used only to encrypt traffic without establishing identity trust", "A certificate that has been revoked by the issuing certificate authority"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0204": {
    stem: "Why should default passwords on devices and applications be changed immediately after installation?",
    choices: ["Default credentials are widely known and could be exploited by attackers", "Default passwords enforce stronger authentication than custom passwords", "Default credentials automatically expire after the device joins the network", "Changing credentials replaces the need for hardening and patching"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0215": {
    stem: "Which security measure completely disconnects a system from external networks to prevent cyber threats?",
    choices: ["Air gap", "Logical segmentation", "On-premises hosting", "Software-defined networking"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0217": {
    stem: "How does software-defined networking or SDN improve network security?",
    choices: ["It centralizes network control, making security policies easier to manage", "It guarantees complete immunity to network-based attacks", "It eliminates the need for security monitoring and logging", "It ensures that all physical network devices are disconnected"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0220": {
    stem: "Which security advantage does containerization provide?",
    choices: ["It isolates applications to limit the impact of security breaches", "It ensures that all applications run on the same physical server", "It eliminates the need for encryption in cloud environments", "It applies patches directly to production without rollback planning"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0221": {
    stem: "Which security risk is commonly associated with virtualization?",
    choices: ["Virtual machine escape", "Snapshot rollback", "Resource pooling", "Compliance reporting"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0233": {
    stem: "Why is ease of deployment an important consideration when implementing security solutions?",
    choices: ["Security solutions should be easy to configure and integrate without disrupting business operations", "Selecting the most complex platform available because difficult deployment always indicates stronger long-term security", "Delaying deployment until every optional feature can be enabled", "Avoiding documentation so implementation teams can move faster"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0238": {
    stem: "What is a security concern related to compute resources in an organization?",
    choices: ["Insufficient compute power can hinder security tools like encryption and monitoring", "Increasing processing capacity without validating whether security tools are deployed and tuned correctly", "Additional memory removes the need for endpoint monitoring", "Faster processors automatically enforce encryption policies"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0278": {
    stem: "Which of the following is a key consideration when handling data securely?",
    choices: ["Ensuring proper encryption and access controls are applied based on data sensitivity", "Avoiding data backups to reduce storage costs", "Classifying all data as public to simplify handling and avoid encryption or access review requirements", "Allowing unrestricted access to reduce operational delays"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0387": {
    stem: "What does industry or organizational impact refer to in risk management?",
    choices: ["The potential consequences a risk event can have on the organization", "The cost of replacing every vulnerable system", "The number of vulnerabilities detected in a scan", "The frequency with which a risk event occurs"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0389": {
    stem: "What is the primary goal of vulnerability response and remediation?",
    choices: ["To identify, prioritize, and fix vulnerabilities to reduce risk exposure", "To document vulnerabilities without corrective action", "To defer all vulnerabilities until the next audit cycle", "To transfer every vulnerability to a third party"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0396": {
    stem: "What does rescanning involve in vulnerability management?",
    choices: ["Scanning again after remediation to verify the vulnerability has been resolved", "Accepting the vulnerability without further review", "Removing all scan records after patching", "Disabling the affected service permanently"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0461": {
    stem: "What does role-based access control or RBAC rely on for assigning permissions?",
    choices: ["User roles and job responsibilities", "Time of day and user activity only", "Random permission assignment to avoid overprivileging", "Users freely assigning permissions to other users"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0526": {
    stem: "What does preservation of digital evidence ensure in digital forensics?",
    choices: ["The integrity and authenticity of evidence over time", "The destruction of sensitive data during investigations", "The transfer of evidence to an external party", "The immediate reporting of evidence to law enforcement"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0535": {
    stem: "What does metadata in security logs provide information about?",
    choices: ["Context such as who, what, when, and where for an event", "The full contents of the accessed data", "The encryption key used by the application", "The physical location of every network cable"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0542": {
    stem: "What does an acceptable use policy define?",
    choices: ["Appropriate and inappropriate uses of organizational systems and resources", "Detailed procedures for incident detection and containment", "Permissions for remote access into corporate networks", "Technical encryption settings for all databases"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0584": {
    stem: "What does single loss expectancy or SLE measure in risk management?",
    choices: ["The potential financial loss from a single occurrence of a risk event", "The annual cost of protecting against a specific risk", "The likelihood that a specific risk will occur", "The number of times a risk is expected to occur each year"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0595": {
    stem: "What is meant by risk tolerance?",
    choices: ["The level of risk an organization is willing to accept before taking action", "The total cost of implementing all required safeguards", "The process of transferring every risk to an insurer", "The number of controls required to eliminate a risk"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0596": {
    stem: "What does risk appetite refer to in an organization's security program?",
    choices: ["The organization's willingness to accept risk in pursuit of business objectives", "The threshold beyond which risk is never considered tolerable", "The complete elimination of all identified risk", "The amount of risk transferred to a third party"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0705": {
    stem: "In the context of IT security, what does CA stand for?",
    choices: ["Certificate authority", "Certificate analyzer", "Critical authority", "Computer access"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0734": {
    stem: "In access control, what does DAC stand for?",
    choices: ["Discretionary access control", "Distributed access control", "Digital access check", "Direct authorization control"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0041": {
    stem: "Which of the following is a reason to update network diagrams regularly?",
    choices: ["To reflect changes in topology, devices, and connections", "To comply with software licensing agreements", "To improve outdated application performance", "To optimize database indexing"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0048": {
    stem: "Which term refers to the scope at which encryption is applied to a system or storage device?",
    choices: ["Encryption level", "Key escrow", "Public key infrastructure", "Certificate authority"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0049": {
    stem: "Which type of encryption ensures that an entire hard drive's data is protected?",
    choices: ["Full disk encryption", "Partition encryption", "File encryption", "Public key encryption"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0078": {
    stem: "What is the purpose of generating a certificate signing request or CSR?",
    choices: ["To request a digital certificate from a certificate authority", "To revoke an existing certificate", "To publish a private key for recovery", "To validate a certificate in real time"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0103": {
    stem: "Which attack vector involves hiding malware within seemingly harmless documents such as PDFs or word processing files?",
    choices: ["File-based attacks", "Voice call spoofing", "Social engineering", "Phishing emails"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0118": {
    stem: "Which type of attack exploits insecure Bluetooth connections to access information from a device?",
    choices: ["Bluesnarfing", "SQL injection", "DNS poisoning", "Phishing"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0126": {
    stem: "A cyber criminal sends a fake text message claiming to be from a bank and urging the recipient to verify account details. What type of attack is this?",
    choices: ["Smishing", "Vishing", "Typosquatting", "Business email compromise"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0134": {
    stem: "Which attack technique involves injecting malicious code into a process's memory to execute unauthorized commands?",
    choices: ["Memory injection", "Cross-site scripting", "Time-of-use attack", "Race condition"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0151": {
    stem: "Which term describes removing manufacturer restrictions on a mobile device, potentially exposing it to security risks?",
    choices: ["Jailbreaking", "Sideloading", "Zero-day attack", "Misconfiguration"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0152": {
    stem: "What type of attack exploits a previously unknown software vulnerability before a fix is available?",
    choices: ["Zero-day attack", "Sideloading", "Jailbreaking", "Misconfiguration"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0179": {
    stem: "Which password attack attempts to gain access by testing a few commonly used passwords across many accounts?",
    choices: ["Password spraying", "Dictionary attack", "Credential stuffing", "Brute force attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0254": {
    stem: "Which type of firewall is specifically designed to protect web applications from threats like SQL injection and cross-site scripting?",
    choices: ["Web application firewall", "Layer 4 firewall", "Unified threat management", "Next-generation firewall"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0350": {
    stem: "What is the purpose of secure cookies in web application security?",
    choices: ["To protect session data by using secure attributes and limiting unauthorized access", "To enable cross-site scripting for better user experience", "To store passwords in browser-readable plain text", "To bypass authentication for trusted devices"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0380": {
    stem: "What does a false negative refer to in vulnerability scanning?",
    choices: ["When a vulnerability is missed or incorrectly marked as not present", "When a secure system is incorrectly reported as vulnerable", "When a vulnerability is correctly identified but ignored", "When a scan finds every known vulnerability"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0455": {
    stem: "What does OAuth provide in access management?",
    choices: ["It lets third-party applications access user resources without sharing passwords", "It encrypts email messages to ensure confidentiality during transmission", "It authenticates users only through hardware biometrics", "It stores encrypted user credentials for every application"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0458": {
    stem: "What is the purpose of attestation in security?",
    choices: ["To verify system integrity and confirm it has not been altered or tampered with", "To store audit logs for all incidents without review", "To monitor users without validating device state", "To enforce encryption policies for data in transit only"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0464": {
    stem: "What is the function of time-of-day restrictions in access control?",
    choices: ["To limit access to systems or resources based on approved hours", "To allow unrestricted access during business hours", "To encrypt data only during nonbusiness hours", "To replace role-based access control with a schedule"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0495": {
    stem: "What does enabling or disabling services and access mean in security operations?",
    choices: ["Granting or revoking access to services based on policies and roles", "Resetting every user password manually", "Encrypting sensitive data before storage", "Disabling all services after a security event"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0586": {
    stem: "What does annualized rate of occurrence or ARO represent in risk analysis?",
    choices: ["The number of times a specific risk event is expected to occur annually", "The projected financial loss from a single risk event", "The total annual cost of protecting against a risk", "The maximum amount of risk the organization will accept"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0590": {
    stem: "What does impact refer to in risk management?",
    choices: ["The potential consequences or severity of a risk event on the organization", "The likelihood that a specific risk event may occur", "The projected cost of deploying all required safeguards", "The number of times a risk event occurs annually"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0691": {
    stem: "What does ARO mean in the context of risk management?",
    choices: ["Annualized rate of occurrence", "Average rate of occurrence", "Annualized return on operation", "Automated rate of occurrence"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0727": {
    stem: "Which term defines CSRF in web application security?",
    choices: ["Cross-site request forgery", "Client-side request forgery", "Cross-system request framework", "Cross-site resource function"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0754": {
    stem: "What is the full form of ECC in modern cryptography?",
    choices: ["Elliptic curve cryptography", "Encrypted curve calculation", "Elliptic cipher computing", "Ephemeral certificate chain"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0854": {
    stem: "What does OAuth stand for in authorization frameworks?",
    choices: ["Open authorization", "Open authentication", "Online authorization", "Organized authorization"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0901": {
    stem: "What does RBAC stand for in access control models?",
    choices: ["Role-based access control", "Resource-based access control", "Record-based access control", "Region-based access control"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0902": {
    stem: "What is another definition for RBAC in access control models?",
    choices: ["Rule-based access control", "Role-based access control", "Registration-based access control", "Resource-based access control"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0980": {
    stem: "What does USB OTG stand for in mobile device connectivity?",
    choices: ["USB On-The-Go", "Universal system bus on the go", "User storage bridge over target gateway", "Universal service backup on the go"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0643": {
    stem: "What is the purpose of due diligence in security management?",
    choices: ["To assess potential risks associated with third-party vendors before establishing a formal relationship", "To provide employees with required professional training and technical certifications", "To encrypt financial records before they are transferred to long-term storage", "To approve all vendor access requests without additional risk review"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0998": {
    stem: "In facilities and maintenance, what does WO typically mean?",
    choices: ["Work order", "Work operation", "Work overview", "Workflow objective"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0092": {
    stem: "Which cyber attack motivation involves threatening to release sensitive information unless a ransom or demand is met?",
    choices: ["Blackmail or extortion", "Ethical hacking", "Service disruption", "Espionage"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0119": {
    stem: "Why are open service ports considered a security risk?",
    choices: ["They can be exploited by attackers to gain unauthorized access to exposed services", "They automatically encrypt all incoming and outgoing data", "They prevent unauthorized users from connecting to the network", "They disable unnecessary services on network devices"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0229": {
    stem: "What is a primary goal of resilience in cybersecurity?",
    choices: ["To ensure systems can recover quickly from disruptions or attacks", "To eliminate all security vulnerabilities in an organization", "To reduce the cost of deploying security tools", "To prevent unauthorized access through physical isolation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0291": {
    stem: "What is the primary goal of obfuscation in cybersecurity?",
    choices: ["To make data or code difficult to understand while maintaining functionality", "To completely remove sensitive information from a system", "To apply geographic restrictions to data access", "To segment network traffic based on security needs"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0311": {
    stem: "Why is backup frequency an important consideration in data protection?",
    choices: ["More frequent backups reduce potential data loss after failures or attacks", "A single backup is always sufficient for long-term data security", "Frequent backups should be avoided because they always weaken security", "Backup frequency determines which users are allowed to restore data"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0313": {
    stem: "What is a snapshot in the context of data backups?",
    choices: ["A point-in-time copy of data or system state", "A long-term archival backup stored offsite for disaster recovery", "A log file that records all system changes for compliance tracking", "A backup method that permanently deletes older restore points"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0330": {
    stem: "How can embedded systems be hardened against security threats?",
    choices: ["Disable unnecessary functions and apply firmware updates", "Allow all devices to communicate without authentication", "Remove monitoring because embedded systems cannot be attacked", "Enable default credentials to simplify administration"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0412": {
    stem: "What is the difference between agent-based and agentless security monitoring?",
    choices: ["Agent-based monitoring requires software on the system; agentless monitoring does not", "Agentless monitoring is always more secure than agent-based monitoring", "Agent-based monitoring cannot collect endpoint telemetry", "Agentless monitoring requires an endpoint detection agent"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0436": {
    stem: "What is an important consideration when selecting a port for network communication?",
    choices: ["Whether the port is commonly targeted and appropriate for the required service", "The color of the network cables used with the port", "The physical location of the server rack only", "The amount of data the port can transmit per second"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0513": {
    stem: "During the containment phase of incident response, which action is performed?",
    choices: ["Isolate affected systems to prevent further damage", "Restore backup systems and data to normal operation", "Document lessons learned after the incident closes", "Erase all evidence before forensic review"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0520": {
    stem: "What is the purpose of root cause analysis in incident response?",
    choices: ["To identify the underlying source of the incident", "To conduct real-time penetration testing", "To recover lost data without investigation", "To analyze only the financial consequences of an attack"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0557": {
    stem: "What is the purpose of a playbook in a security program?",
    choices: ["To document detailed procedures to follow during specific incidents or workflows", "To outline employee conduct policies unrelated to incident response", "To replace all technical controls with written instructions", "To store forensic images collected during an investigation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0571": {
    stem: "Which of the following describes the role of owners in a security program?",
    choices: ["Individuals responsible for setting direction and protecting assigned assets or data", "Individuals who only perform daily technical maintenance", "Individuals who approve every firewall rule change", "Individuals who replace custodians for all operational tasks"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0577": {
    stem: "Which of the following best describes ad hoc risk management?",
    choices: ["Risk management performed in response to immediate unplanned needs or unexpected situations", "A structured framework applied consistently over extended periods", "A predefined series of documents used only for recurring risks", "An ongoing daily process that never responds to urgent events"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0593": {
    stem: "What is the role of a risk owner?",
    choices: ["To be responsible for managing and mitigating specific assigned risks", "To design the organization's entire risk management framework", "To transfer every risk to a third-party insurer", "To approve security awareness training content only"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0670": {
    stem: "Why is insider threat awareness training important for an organization?",
    choices: ["It helps staff understand insider threat indicators and reporting expectations", "It trains employees to monitor real-time network security incidents", "It replaces technical controls used to detect insider activity", "It authorizes staff to enforce compliance policies without oversight"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0711": {
    stem: "What is the full form of CCTV as used in security systems?",
    choices: ["Closed-circuit television", "Centralized control television", "Computerized camera television", "Comprehensive control television"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0717": {
    stem: "Which term best describes CIRT in cybersecurity incident management?",
    choices: ["Computer incident response team", "Computer investigation response team", "Critical incident recovery team", "Cybersecurity incident recovery tool"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0722": {
    stem: "What does CRC stand for when discussing error checking methods?",
    choices: ["Cyclic redundancy check", "Continuous redundancy code", "Coded redundancy check", "Certificate revocation cache"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0736": {
    stem: "What does DDoS stand for in cybersecurity?",
    choices: ["Distributed denial of service", "Digital denial of service", "Dynamic denial of service", "Distributed data over systems"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0741": {
    stem: "Which of the following is the correct expansion for DKIM?",
    choices: ["DomainKeys Identified Mail", "Domain key internet mail", "Data keys in mail", "Dynamic key integrity monitoring"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0744": {
    stem: "What does DMARC stand for in email authentication?",
    choices: ["Domain-based Message Authentication, Reporting, and Conformance", "Domain message access routing control", "Digital mail authentication relay certificate", "Distributed message archive and reporting control"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0766": {
    stem: "What does FRR represent in biometric authentication?",
    choices: ["False rejection rate", "False recognition ratio", "Failed recognition rate", "Federated registration request"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0770": {
    stem: "What does GDPR stand for in data protection?",
    choices: ["General Data Protection Regulation", "General Data Privacy Regulation", "Global Data Protection Regulation", "General Digital Protection Regulation"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0775": {
    stem: "What does GRE represent in networking?",
    choices: ["Generic Routing Encapsulation", "General routing encapsulation", "Global routing exchange", "Gateway routing extension"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0780": {
    stem: "Which option correctly expands HMAC in cryptography?",
    choices: ["Hash-based Message Authentication Code", "Hybrid message authentication check", "Hashed message access control", "Host message authorization channel"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0818": {
    stem: "What does MaaS stand for in cloud services?",
    choices: ["Monitoring as a service", "Maintenance as a service", "Mobile as a service", "Management as a service"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0822": {
    stem: "What does MAN stand for in networking?",
    choices: ["Metropolitan area network", "Main area network", "Mobile area network", "Multi-region area network"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0836": {
    stem: "In network authentication, what does MS-CHAP stand for?",
    choices: ["Microsoft Challenge Handshake Authentication Protocol", "Mutual secure challenge authentication protocol", "Mandatory system challenge authentication process", "Microsoft certificate handshake access protocol"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0839": {
    stem: "In reliability engineering, what does MTBF stand for?",
    choices: ["Mean time between failures", "Maximum time between failures", "Mean time before failover", "Measured time before failure"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0841": {
    stem: "What does MTR stand for in IT service management?",
    choices: ["Mean time to recover", "Mean time to repair", "Maximum time to respond", "Measured ticket resolution"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0844": {
    stem: "Which of the following correctly defines NAT in networking?",
    choices: ["Network address translation", "Network access transmission", "Network allocation table", "National access terminal"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0852": {
    stem: "What does NTLM stand for in Microsoft authentication protocols?",
    choices: ["New Technology LAN Manager", "Network token login manager", "New terminal link manager", "Named transport layer module"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0867": {
    stem: "What does PAM stand for in access management?",
    choices: ["Privileged access management", "Protected account management", "Private access method", "Privileged authentication mechanism"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0876": {
    stem: "What does PEAP stand for in wireless authentication protocols?",
    choices: ["Protected Extensible Authentication Protocol", "Private extensible authentication protocol", "Password extensible authentication protocol", "Public extensible authentication protocol"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0880": {
    stem: "What is the full form of PGP in data encryption?",
    choices: ["Pretty Good Privacy", "Private good protection", "Public general privacy", "Personal gateway protocol"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0903": {
    stem: "What does RC4 refer to in encryption algorithms?",
    choices: ["Rivest Cipher 4", "Rivest Code 4", "Reliable cipher 4", "Random cryptographic code 4"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0906": {
    stem: "What does RIPEMD stand for in hash functions?",
    choices: ["RACE Integrity Primitives Evaluation Message Digest", "Reliable integrity primitives encrypted message digest", "Randomized integrity protocol evaluation message digest", "Recursive integrity processing encoded message digest"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0909": {
    stem: "What does RSA stand for in public key cryptography?",
    choices: ["Rivest, Shamir, and Adleman", "Reliable security algorithm", "Rivest, Smith, and Anderson", "Random secure authentication"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0916": {
    stem: "In authentication methods, what does SAE stand for?",
    choices: ["Simultaneous Authentication of Equals", "Secure authentication exchange", "Server-assisted encryption", "Simple authentication element"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0928": {
    stem: "What does SDN stand for in modern networking?",
    choices: ["Software-defined networking", "Secure data networking", "Systematic data network", "Software-driven network"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0929": {
    stem: "What does SELinux stand for?",
    choices: ["Security-Enhanced Linux", "System-enhanced Linux", "Secure enterprise Linux", "Session-enforced Linux"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0959": {
    stem: "What does TACACS+ stand for in network access control?",
    choices: ["Terminal Access Controller Access-Control System Plus", "Telecom access control and security", "Trusted access certificate accounting control service", "Terminal authentication control and accounting service"],
    answerIndex: 0
  },
  "SY0-701-MFA-Q0960": {
    stem: "What does TAXII stand for in threat intelligence exchange?",
    choices: ["Trusted Automated Exchange of Intelligence Information", "Trusted automated exchange of indicator information", "Threat analysis extensible intelligence interface", "Tactical automated exchange of incident indicators"],
    answerIndex: 0
  }
};

function applyManualCorrections(questions) {
  for (const question of questions) {
    const correction = manualCorrections[question.id];
    if (!correction) continue;

    const choices = correction.choices.map(normalizeOption);
    question.stem = cleanStemText(correction.stem);
    question.choices = choices.map((text, index) => ({ id: optionIds[index], text }));
    question.correct_answers = [optionIds[correction.answerIndex]];
    question.extracted_correct_answer = choices[correction.answerIndex];
    question.original_options_text = choices.join(", ");
    question.explanation = `The corrected answer is ${choices[correction.answerIndex]} because it best matches the concept tested by the question.`;
    question.topic = classifyTopic(question.stem, choices[correction.answerIndex]);
    question.difficulty = inferDifficulty(question.stem, question.source_question_number - 1);
    question.option_edit_note = "Corrected during council review to remove transcript artifacts and restore the intended Security+ answer.";
  }
}

const badGenericDistractors = new Set([
  "Layered defense mechanism",
  "Administrative enforcement workflow",
  "Policy-based security control",
  "Operational monitoring process",
  "Risk-based access decision",
  "Continuity validation process",
  "Risk documentation workflow",
  "Immutable recovery objective",
  "Resilient restoration workflow",
  "Operational compliance procedure",
  "Context-aware protection method",
  "Security governance standard",
  "Certificate-backed data protection",
  "Integrity validation digest",
  "Authenticated key exchange",
  "Role-scoped entitlement review",
  "Federated identity validation",
  "Attribute-driven identity proofing",
  "Context-based access approval",
  "Policy-based session validation",
  "Privileged session authorization",
  "Secure routing control plane"
]);

const generatedArtifactPattern = /\b(?:validated during tabletop exercises|measured against contractual service expectations|applied after vulnerability prioritization|documented in the incident playbook|tested against baseline configurations|reviewed during audit evidence collection|mapped to business impact and recovery objectives|tracked in the risk register|reviewed against data classification|approved as a compensating control|monitored for anomalous behavior|configured with least privilege and periodic review)\b/i;
const syntheticGeneratedPattern = new RegExp(`^(?:${replacementModifiers.map(escapeRegExp).join("|")}) (?:${replacementConcepts.map(escapeRegExp).join("|")})$`, "i");

function normalizeDistractorBase(text) {
  return normalizeOption(String(text || "").replace(/^(?:or|and)\s+/i, ""));
}

function shouldReplaceDistractor(question, choice, correct) {
  const text = choice.text || "";
  const hasDuplicate = question.choices.some((other) =>
    other.id !== choice.id && isContainedDuplicateOption(choice.text, other.text)
  );

  return badGenericDistractors.has(text) ||
    generatedArtifactPattern.test(text) ||
    syntheticGeneratedPattern.test(text) ||
    choiceCopiesStem(question.stem, text) ||
    hasDuplicate ||
    distractorContainsShortCorrectAnswer(correct.text, text) ||
    /^(?:the function of|a primary security risk|captures and retransmits|is a replay attack|technical security control)$/i.test(text);
}

function expandExistingDistractor(question, choice, correctText, usedTexts, seed, minLength) {
  const base = normalizeDistractorBase(choice.text);
  if (base.length < 8 || generatedArtifactPattern.test(base)) return null;
  if (distractorContainsShortCorrectAnswer(correctText, base)) return null;

  for (const tail of rotate(distractorExpansionTails, seed)) {
    const text = normalizeOption(`${base} ${tail}`);
    if (text.length < minLength || text.length > 180) continue;
    if (conflictsWithUsedOptions(text, usedTexts)) continue;
    if (conflictsWithinQuestion(question, text, choice.id)) continue;
    if (choiceCopiesStem(question.stem, text)) continue;
    if (isContainedDuplicateOption(text, correctText) || isNearDuplicateOption(text, correctText)) continue;
    usedTexts.add(text);
    return text;
  }

  return null;
}

function replaceDistractor(question, choice, seed, extraUsedTexts = []) {
  const correct = question.choices.find((candidate) => question.correct_answers.includes(candidate.id));
  if (!correct) return;

  const used = new Set(question.choices.filter((candidate) => candidate.id !== choice.id).map((candidate) => candidate.text));
  for (const text of extraUsedTexts) used.add(text);
  choice.text = pickReplacementDistractor(question.stem, correct.text, used, seed);
}

function sanitizeDistractorQuality(questions) {
  for (const question of questions) {
    const correct = question.choices.find((candidate) => question.correct_answers.includes(candidate.id));
    if (!correct) continue;
    const distractors = question.choices.filter((choice) => !question.correct_answers.includes(choice.id));
    for (const choice of distractors) {
      if (shouldReplaceDistractor(question, choice, correct)) {
        replaceDistractor(question, choice, question.source_question_number + choice.id.charCodeAt(0));
      }
    }
  }

  for (let pass = 0; pass < 30; pass++) {
    const counts = new Map();
    const correctCounts = new Map();
    const occurrences = new Map();
    for (const question of questions) {
      for (const choice of question.choices) {
        const key = choice.text;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!occurrences.has(key)) occurrences.set(key, []);
        occurrences.get(key).push({ question, choice });
        if (question.correct_answers.includes(choice.id)) {
          correctCounts.set(key, (correctCounts.get(key) || 0) + 1);
        }
      }
    }

    const overused = new Set(
      [...counts]
        .filter(([text, count]) => count > 4 && !(correctCounts.get(text) || 0))
        .map(([text]) => text)
    );
    if (!overused.size) break;

    let changed = false;
    const newTexts = new Set();
    for (const [text, count] of counts) {
      const correctCount = correctCounts.get(text) || 0;
      if (correctCount > 0) continue;
      const allowed = badGenericDistractors.has(text) ? 0 : 4;
      if (count <= allowed) continue;

      for (const item of occurrences.get(text).slice(allowed)) {
        const correct = item.question.choices.find((choice) => item.question.correct_answers.includes(choice.id));
        if (!correct) continue;
        const used = new Set(item.question.choices.filter((choice) => choice.id !== item.choice.id).map((choice) => choice.text));
        for (const usedText of overused) used.add(usedText);
        for (const usedText of newTexts) used.add(usedText);
        item.choice.text = pickUniqueFallbackDistractor(item.question.stem, correct.text, used, item.question.source_question_number + item.choice.id.charCodeAt(0) + count + pass);
        newTexts.add(item.choice.text);
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function balanceAnswerLengthCues(questions) {
  const globalUsed = new Set(questions.flatMap((question) => question.choices.map((choice) => choice.text)));

  for (const question of questions) {
    const correct = question.choices.find((choice) => question.correct_answers.includes(choice.id));
    if (!correct) continue;

    const distractors = question.choices.filter((choice) => !question.correct_answers.includes(choice.id));
    const maxDistractorLength = Math.max(...distractors.map((choice) => choice.text.length));
    if (correct.text.length <= maxDistractorLength + 6) continue;

    let replacement = null;
    let replacementTarget = null;
    const targetCandidates = [...distractors].sort((left, right) => left.text.length - right.text.length);

    for (const candidateTarget of targetCandidates) {
      const localUsed = new Set([
        ...globalUsed,
        ...question.choices.filter((choice) => choice.id !== candidateTarget.id).map((choice) => choice.text)
      ]);
      localUsed.delete(candidateTarget.text);
      const seed = question.source_question_number + correct.text.length + candidateTarget.id.charCodeAt(0);
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = pickLengthBalancedDistractor(
          question,
          correct.text,
          localUsed,
          seed + attempt * 997,
          Math.min(178, correct.text.length + 1)
        );
        if (!candidate) continue;
        if (conflictsWithinQuestion(question, candidate, candidateTarget.id)) continue;
        replacement = candidate;
        replacementTarget = candidateTarget;
        break;
      }
      if (replacement) break;
    }
    if (!replacement) continue;

    globalUsed.delete(replacementTarget.text);
    replacementTarget.text = replacement;
    globalUsed.add(replacement);
  }
}

function classifyTopic(stem, answer) {
  const text = `${stem} ${answer}`.toLowerCase();
  if (/\bwhat does\b|\bstand for\b|\bdefines\b/.test(text)) return "Acronym and terminology recognition";
  if (/\bcontrol\b/.test(text)) return "Security controls";
  if (/\bzero trust|identity|authentication|authorization|mfa|access\b/.test(text)) return "Identity and access";
  if (/\bcloud|virtual|container|network|subnet|firewall|waf|vpn\b/.test(text)) return "Architecture and network security";
  if (/\battack|malware|phishing|vulnerability|threat\b/.test(text)) return "Threats and vulnerabilities";
  if (/\brisk|audit|policy|compliance|privacy|vendor\b/.test(text)) return "Governance, risk, and compliance";
  return "Security+ SY0-701 practice";
}

function validateBank(questions) {
  const issues = [];
  const ids = new Set();
  const stems = new Set();
  const single = [];
  const fillerPattern = /\b(?:you guys|pause the video|earlier questions|extra questions|jumping the gun|the beautiful thing|if you're new to the industry|broking things|things are broken|I feel like|I was trying|softballs)\b/i;
  const genericShellPattern = /\bas (?:a|an) (?:policy option|technical safeguard|security mechanism|monitoring approach|control process|access method|related security mechanism|comparable control process|similar access method|neighboring monitoring approach)\b/i;
  const answerLeakPattern = /[.!]\s+(?:Which|What|How|Why|In\s|A\s|An\s|Cyber|Stenography|Steganography)|\bwas the main purpose\b/i;
  const badStemPattern = /\b(?:gimmies|everyone knows|grandma|time to go to bed|one of the easiest|feels very similar|if the answer is in the question|all over the place|wrote the code|little smart cards)\b/i;
  let longChoiceCount = 0;
  let fillerIssueCount = 0;
  let genericShellCount = 0;
  let answerLeakCount = 0;
  let badStemCount = 0;
  let nearDuplicateChoiceCount = 0;
  let trailingTopicAnswerCount = 0;
  let stemCopyChoiceCount = 0;
  let repeatedNeverCorrectChoiceCount = 0;
  const choiceCounts = new Map();
  const choiceCorrectCounts = new Map();

  for (const question of questions) {
    if (ids.has(question.id)) issues.push(`Duplicate id ${question.id}`);
    ids.add(question.id);
    const stemKey = normalizeComparable(question.stem);
    if (stems.has(stemKey)) issues.push(`Duplicate stem ${question.id}`);
    stems.add(stemKey);
    if (!question.stem || question.stem.length < 12) issues.push(`Bad stem ${question.id}`);
    if ((question.stem.match(/\?/g) || []).length > 1 || question.stem.length > 520 || badStemPattern.test(question.stem)) {
      badStemCount++;
      issues.push(`Malformed stem ${question.id}`);
    }
    if (!question.explanation || question.explanation.length < 20) issues.push(`Missing explanation ${question.id}`);
    if (answerLeakPattern.test(question.extracted_correct_answer || "")) {
      answerLeakCount++;
      issues.push(`Leaked next prompt in answer ${question.id}`);
    }
    if (trailingTopicPattern.test(question.extracted_correct_answer || "")) {
      trailingTopicAnswerCount++;
      issues.push(`Trailing next-topic text in answer ${question.id}`);
    }
    if (fillerPattern.test(question.stem)) {
      fillerIssueCount++;
      issues.push(`Transcript filler in stem ${question.id}`);
    }
    if (!Array.isArray(question.choices) || question.choices.length !== 4) issues.push(`Bad choices ${question.id}`);
    if (!Array.isArray(question.correct_answers) || question.correct_answers.length !== 1) issues.push(`Bad correct answer ${question.id}`);
    const choiceIds = new Set(question.choices.map((choice) => choice.id));
    if (!question.correct_answers.every((answer) => choiceIds.has(answer))) issues.push(`Missing answer ref ${question.id}`);
    const texts = new Set(question.choices.map((choice) => normalizeComparable(choice.text)));
    if (texts.size !== question.choices.length) issues.push(`Duplicate choices ${question.id}`);
    for (let left = 0; left < question.choices.length; left++) {
      for (let right = left + 1; right < question.choices.length; right++) {
        if (isContainedDuplicateOption(question.choices[left].text, question.choices[right].text)) {
          nearDuplicateChoiceCount++;
          issues.push(`Near duplicate choices ${question.id}`);
        }
      }
    }
    for (const choice of question.choices) {
      choiceCounts.set(choice.text, (choiceCounts.get(choice.text) || 0) + 1);
      if (question.correct_answers.includes(choice.id)) {
        choiceCorrectCounts.set(choice.text, (choiceCorrectCounts.get(choice.text) || 0) + 1);
      }
      if (!choice.text || choice.text.length < 2) issues.push(`Bad choice text ${question.id}`);
      if (choice.text.length > 180) {
        longChoiceCount++;
        issues.push(`Choice too long ${question.id}`);
      }
      if (fillerPattern.test(choice.text)) {
        fillerIssueCount++;
        issues.push(`Transcript filler in choice ${question.id}`);
      }
      if (genericShellPattern.test(choice.text)) {
        genericShellCount++;
        issues.push(`Generic shell distractor ${question.id}`);
      }
      if (!question.correct_answers.includes(choice.id) && choiceCopiesStem(question.stem, choice.text)) {
        stemCopyChoiceCount++;
        issues.push(`Stem copied into distractor ${question.id}`);
      }
    }

    const correct = question.choices.find((choice) => question.correct_answers.includes(choice.id));
    if (!correct) {
      issues.push(`Correct choice object missing ${question.id}`);
      continue;
    }
    const distractors = question.choices.filter((choice) => !question.correct_answers.includes(choice.id));
    single.push({
      id: question.id,
      answer: correct.id,
      correctLength: correct.text.length,
      distractorMean: distractors.reduce((sum, choice) => sum + choice.text.length, 0) / distractors.length,
      uniqueLongest: distractors.every((choice) => correct.text.length > choice.text.length),
      uniqueShortest: distractors.every((choice) => correct.text.length < choice.text.length)
    });
  }

  const positionCounts = single.reduce((counts, item) => {
    counts[item.answer] = (counts[item.answer] || 0) + 1;
    return counts;
  }, {});
  const uniqueLongest = single.filter((item) => item.uniqueLongest).length;
  const uniqueShortest = single.filter((item) => item.uniqueShortest).length;
  const anyUniqueLongest = questions.filter((question) => {
    const lengths = question.choices.map((choice) => choice.text.length);
    const max = Math.max(...lengths);
    return lengths.filter((length) => length === max).length === 1;
  }).length;
  const uniqueLongestCorrectRate = uniqueLongest / Math.max(1, anyUniqueLongest);
  const correctMean = single.reduce((sum, item) => sum + item.correctLength, 0) / Math.max(1, single.length);
  const distractorMean = single.reduce((sum, item) => sum + item.distractorMean, 0) / Math.max(1, single.length);
  const maxPositionRate = Math.max(...Object.values(positionCounts)) / Math.max(1, single.length);
  const answerSequence = single.map((item) => item.answer).join("");
  const abcdCycle = "ABCD".repeat(Math.ceil(single.length / 4)).slice(0, single.length);
  let cycleRun = 0;
  let maxCycleRun = 0;
  for (let index = 4; index < answerSequence.length; index++) {
    if (answerSequence[index] === answerSequence[index - 4]) {
      cycleRun++;
      maxCycleRun = Math.max(maxCycleRun, cycleRun);
    } else {
      cycleRun = 0;
    }
  }

  if (uniqueLongest / Math.max(1, single.length) > 0.5) issues.push("Correct answer is too often uniquely longest");
  if (uniqueLongestCorrectRate > 0.5) issues.push("Choosing the unique longest option is too predictive");
  if (uniqueShortest / Math.max(1, single.length) > 0.5) issues.push("Correct answer is too often uniquely shortest");
  if (maxPositionRate > 0.35) issues.push("Correct answer position is too predictable");
  if (answerSequence === abcdCycle) issues.push("Correct answer position follows an ABCD cycle");
  if (maxCycleRun > 40) issues.push("Correct answer position has a repeated four-choice cycle");
  for (const [text, count] of choiceCounts) {
    if (count > 4 && !(choiceCorrectCounts.get(text) || 0)) {
      repeatedNeverCorrectChoiceCount++;
      issues.push(`Repeated never-correct choice "${text}"`);
    }
  }

  return {
    issues,
    stats: {
      question_count: questions.length,
      unique_longest_correct: uniqueLongest,
      unique_longest_correct_rate: Math.round((uniqueLongest / Math.max(1, single.length)) * 1000) / 10,
      unique_longest_any: anyUniqueLongest,
      unique_longest_correct_when_unique_rate: Math.round(uniqueLongestCorrectRate * 1000) / 10,
      unique_shortest_correct: uniqueShortest,
      unique_shortest_correct_rate: Math.round((uniqueShortest / Math.max(1, single.length)) * 1000) / 10,
      correct_position_counts: positionCounts,
      max_correct_position_rate: Math.round(maxPositionRate * 1000) / 10,
      max_four_cycle_run: maxCycleRun,
      mean_correct_length: Math.round(correctMean * 10) / 10,
      mean_distractor_length: Math.round(distractorMean * 10) / 10,
      long_choice_count: longChoiceCount,
      filler_issue_count: fillerIssueCount,
      generic_shell_count: genericShellCount,
      answer_leak_count: answerLeakCount,
      bad_stem_count: badStemCount,
      near_duplicate_choice_count: nearDuplicateChoiceCount,
      trailing_topic_answer_count: trailingTopicAnswerCount,
      stem_copy_choice_count: stemCopyChoiceCount,
      repeated_never_correct_choice_count: repeatedNeverCorrectChoiceCount
    }
  };
}

function rebalanceCorrectAnswerPositions(questions) {
  const targets = [];
  for (let index = 0; index < questions.length; index++) {
    targets.push(optionIds[index % optionIds.length]);
  }

  let state = 0x7012026;
  const nextRandom = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };

  for (let index = targets.length - 1; index > 0; index--) {
    const swapIndex = nextRandom() % (index + 1);
    [targets[index], targets[swapIndex]] = [targets[swapIndex], targets[index]];
  }

  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    const targetId = targets[index];
    const currentCorrectId = question.correct_answers[0];
    if (currentCorrectId === targetId) continue;

    const targetIndex = optionIds.indexOf(targetId);
    const currentIndex = question.choices.findIndex((choice) => choice.id === currentCorrectId);
    if (targetIndex < 0 || currentIndex < 0) continue;

    const reordered = [...question.choices];
    [reordered[targetIndex], reordered[currentIndex]] = [reordered[currentIndex], reordered[targetIndex]];
    question.choices = reordered.map((choice, choiceIndex) => ({
      ...choice,
      id: optionIds[choiceIndex]
    }));
    question.correct_answers = [targetId];
  }
}

const input = process.argv[2] || DEFAULT_INPUT;
const output = process.argv[3] || DEFAULT_OUTPUT;
const resolvedOutput = resolve(output);

if (resolvedOutput === PRODUCTION_OUTPUT && process.env.ALLOW_PRODUCTION_BANK_WRITE !== "1") {
  throw new Error("Refusing to write the production question bank without ALLOW_PRODUCTION_BANK_WRITE=1.");
}
const transcript = readFileSync(input, "utf8");
const allExtracted = extractQuestions(transcript);
appendManualSalvage(allExtracted);
const questions = allExtracted.slice(0, TARGET_COUNT);
applyManualCorrections(questions);
sanitizeDistractorQuality(questions);
balanceAnswerLengthCues(questions);
rebalanceCorrectAnswerPositions(questions);
const validation = validateBank(questions);

if (process.env.DEBUG_EXTRACT) {
  writeFileSync(resolve("transcript_extraction_debug.json"), `${JSON.stringify({
    extracted: allExtracted.length,
    questions,
    validation,
    skipped: skippedBlocks.length,
    skippedBlocks: skippedBlocks.slice(0, 200)
  }, null, 2)}\n`, "utf8");
}

if (questions.length !== TARGET_COUNT) {
  validation.issues.push(`Expected ${TARGET_COUNT} questions, extracted ${questions.length}`);
}

if (validation.issues.length) {
  throw new Error(`Extraction validation failed:\n${validation.issues.slice(0, 25).join("\n")}`);
}

const difficultyDistribution = questions.reduce((counts, question) => {
  counts[question.difficulty] = (counts[question.difficulty] || 0) + 1;
  return counts;
}, {});
const domainDistribution = questions.reduce((counts, question) => {
  counts[question.domain] = (counts[question.domain] || 0) + 1;
  return counts;
}, {});
const topicDistribution = questions.reduce((counts, question) => {
  counts[question.topic] = (counts[question.topic] || 0) + 1;
  return counts;
}, {});

const bank = {
  metadata: {
    title: "CompTIA Security+ SY0-701 practice questions extracted from user-provided transcript",
    exam_code: "SY0-701",
    generated_on: new Date().toISOString().slice(0, 10),
    question_count: questions.length,
    source_file: "user-provided Tactiq transcript attachment",
    extraction_method: "Parsed user-provided Tactiq transcript by Correct answer markers, kept question stems, extracted stated correct answers, and normalized/balanced four-option choices for local study use.",
    validation: validation.stats,
    schema: {
      correct_answers: "Array containing the correct choice ID.",
      extracted_correct_answer: "The transcript's stated correct answer after normalization.",
      original_options_text: "Raw transcript text after the question mark before normalization."
    }
  },
  difficulty_distribution: difficultyDistribution,
  domain_distribution: domainDistribution,
  topic_distribution: topicDistribution,
  questions
};

writeFileSync(resolvedOutput, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Extracted ${questions.length} questions to ${output}`);
console.log(JSON.stringify(validation.stats, null, 2));
