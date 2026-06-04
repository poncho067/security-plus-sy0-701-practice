import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GENERATED_ON = "2026-06-03";
const OUTPUT_FILE = "security_plus_sy0_701_advanced_questions.json";

const organizations = [
  "A regional hospital",
  "A payment processor",
  "A university research lab",
  "A manufacturing company with OT networks",
  "A SaaS provider",
  "A municipal government agency",
  "A financial services firm",
  "A logistics company",
  "A retail chain",
  "A cloud-native startup",
  "An energy utility",
  "A legal services company",
  "A managed service provider",
  "A defense contractor",
  "A telehealth platform",
  "A multinational manufacturer"
];

const constraints = [
  "The recommendation must minimize downtime and preserve auditability.",
  "The business owner wants the least disruptive control that still reduces material risk.",
  "The environment contains regulated data and a hybrid mix of cloud and on-premises systems.",
  "The team has a small staff and needs a repeatable operational process.",
  "The current architecture has legacy systems that cannot be immediately replaced.",
  "The change must be defensible during an external assessment.",
  "The security team needs a short-term containment step and a durable long-term fix.",
  "The solution must avoid creating a new single point of failure.",
  "The control must work for remote users and branch locations.",
  "The organization is under a strict maintenance window and needs a rollback path."
];

const details = [
  "Analysts have only partial telemetry, so the decision has to rely on the strongest available indicator.",
  "Executives want evidence that the control addresses root cause rather than only the visible symptom.",
  "A previous quick fix increased alert volume without reducing exposure.",
  "The service owner is concerned about user impact but accepts compensating controls when justified.",
  "The security architect must balance confidentiality, integrity, and availability.",
  "The implementation will become part of a standard operating procedure after validation.",
  "The security team must document ownership, test results, and acceptance criteria.",
  "The environment recently moved several workloads to cloud-hosted services.",
  "The next action should support incident response, compliance, and future monitoring.",
  "The team must distinguish between prevention, detection, response, and governance activities."
];

const optionIds = ["A", "B", "C", "D", "E", "F"];

const difficultyProfiles = [
  {
    id: "easy",
    label: "Easy",
    ordinal: 0,
    multiModulo: 7,
    stemClauses: [
      "The team needs the most direct control for the stated risk.",
      "The priority is choosing the core concept without overengineering the response.",
      "The service owner wants a practical first step that matches the security objective."
    ],
    distractorClosers: [
      "but without enforcing the needed control",
      "while leaving the root exposure unchanged",
      "without proving that the risk is reduced",
      "but only after the issue becomes visible again"
    ],
    lengthBalancers: [
      "which can look reasonable in a policy review but does not address the operational failure",
      "which may reduce friction for users but leaves the same attack path available",
      "which creates documentation without changing the security outcome"
    ],
    tags: ["foundation", "direct-control"]
  },
  {
    id: "normal",
    label: "Normal",
    ordinal: 1,
    multiModulo: 5,
    stemClauses: [
      "A previous fix addressed symptoms but not the underlying control gap.",
      "The decision has to balance business impact with defensible risk reduction.",
      "The team wants a response that can be repeated in similar incidents."
    ],
    distractorClosers: [
      "while deferring the technical control until a later review",
      "and rely on manual oversight to catch failures after the fact",
      "while keeping the current access path or exposure mostly unchanged",
      "and treat documentation as the primary mitigation"
    ],
    lengthBalancers: [
      "which makes the option sound auditable but still leaves prevention or validation incomplete",
      "which reduces short-term disruption but preserves the condition that enabled the finding",
      "which is administratively convenient but weaker than addressing the control gap directly"
    ],
    tags: ["applied", "control-selection"]
  },
  {
    id: "hard",
    label: "Hard",
    ordinal: 2,
    multiModulo: 4,
    stemClauses: [
      "One stakeholder is pushing for the fastest visible fix, while another needs evidence that the fix will survive audit.",
      "The organization has limited telemetry, and the next move should improve both response and future detection.",
      "The technical team must avoid confusing a compensating control with complete remediation."
    ],
    distractorClosers: [
      "while documenting the decision as an exception that can be revisited after the next audit cycle",
      "and pair it with monitoring even though the initiating weakness remains possible",
      "because it appears to reduce immediate noise while avoiding a disruptive architecture change",
      "while using approval records to show due diligence instead of removing the exposure"
    ],
    lengthBalancers: [
      "which is a tempting governance-heavy answer but does not close the primary attack path in the scenario",
      "which sounds operationally cautious but relies on detection after the risky condition is still allowed",
      "which may be acceptable as a temporary exception but is not the best response when a direct control is available"
    ],
    tags: ["advanced", "best-answer", "near-miss-distractors"]
  },
  {
    id: "extra-hard",
    label: "Extra hard",
    ordinal: 3,
    multiModulo: 3,
    stemClauses: [
      "Two answers would partially improve the situation, but only one best aligns containment, evidence, and long-term control.",
      "The wrong answers each solve a neighboring problem, but they miss the priority created by the scenario.",
      "Assume the organization will accept a temporary control only if the permanent remediation path is explicit."
    ],
    distractorClosers: [
      "and justify it with a risk memo even though the main security decision is pushed outside the response window",
      "while preserving uptime at the cost of leaving the same trust assumption or exposure in place",
      "and add compensating monitoring that would detect recurrence but not prevent the scenario from repeating",
      "because it is easier to deploy quickly even though it addresses a secondary symptom first"
    ],
    lengthBalancers: [
      "which is deliberately plausible because it improves process maturity while failing to satisfy the highest-risk requirement",
      "which could be a follow-up task, but selecting it first would leave the most important exposure unresolved",
      "which has useful audit value but is weaker than the option that changes enforcement or containment immediately"
    ],
    tags: ["expert", "pbq-style", "priority-analysis", "tricky-distractors"]
  }
];

const correctQualifiers = [
  "then validate the result with logs or testing",
  "and document the owner, approval, and verification evidence",
  "while preserving the evidence needed to prove effectiveness",
  "with monitoring, ownership, and rollback expectations defined",
  "then confirm that the original exposure or control gap is closed"
];

function topic(objective, title, scenario, correct, secondary, distractors, explanation, tags) {
  return { objective, title, scenario, correct, secondary, distractors, explanation, tags };
}

function rotate(items, seed) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (seed + i * 7 + copy[i].length) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function trimSentence(text) {
  return String(text).trim().replace(/[\s.;,]+$/g, "");
}

function compactCorrect(text, profile, seed) {
  let value = trimSentence(text)
    .replace(/\bimmediately, /g, "")
    .replace(/\bbefore production use\b/g, "pre-production")
    .replace(/\bbefore deployment\b/g, "pre-deployment")
    .replace(/\bwhere approved\b/g, "when authorized")
    .replace(/\bwhere applicable\b/g, "when needed");

  if (profile.id === "easy") {
    value = value
      .replace(/\bcentralized /g, "")
      .replace(/\benhanced /g, "")
      .replace(/\bmanaged /g, "");
  }

  if ((profile.ordinal + seed) % 5 === 0) {
    value = value.replace(/\baccording to\b/g, "per");
  }

  if ((seed + profile.ordinal) % 3 === 0) {
    const qualifier = correctQualifiers[(seed + profile.ordinal) % correctQualifiers.length];
    value = `${value}, ${qualifier}`;
  }

  return `${value}.`;
}

function refineDistractorCore(text) {
  const value = trimSentence(text);
  const exact = new Map([
    ["Ask managers to manually approve every endpoint connection by email", "Create a manual manager approval workflow for endpoint access outside the NAC enforcement path"],
    ["Delete the honeyfile because it created a false positive", "Remove the honeyfile and rely on endpoint alerts before investigating the workstation"],
    ["Assume the event proves data exfiltration completed", "Treat the deception alert as proof of completed exfiltration and begin breach notification before scoping"],
    ["Disable logging to reduce overhead on the legacy server", "Reduce logging on the legacy server to preserve performance during the exception period"],
    ["Disable all administrator accounts until the next maintenance cycle", "Suspend broad administrator access until the next maintenance cycle without first validating the change path"],
    ["Disable MFA for users who connect from headquarters", "Trust headquarters network location as the primary factor for privileged access decisions"],
    ["Disable email for all users for a week", "Block all email access during the investigation without first scoping affected mailboxes"],
    ["Disable TLS certificate validation on clients", "Temporarily allow users to bypass certificate warnings while the wireless issue is investigated"],
    ["Disable DNS logging to improve performance", "Reduce DNS telemetry collection to improve resolver performance during the investigation"],
    ["Disable endpoint logging to reduce lateral movement noise", "Reduce endpoint telemetry during containment to lower alert volume"],
    ["Disable DLP because false positives occurred", "Move DLP into monitor-only mode indefinitely after the first false-positive spike"],
    ["Disable SSO so SaaS activity is harder to correlate", "Use local SaaS accounts to isolate provider activity from the corporate identity platform"],
    ["Disable function logs to hide accidental secret exposure", "Reduce function logging to avoid capturing sensitive values while leaving secret storage unchanged"],
    ["Disable baseline checks during all incidents", "Pause baseline checks during active incidents to reduce alert fatigue"],
    ["Delete verbose logs to reduce storage during the attack", "Lower verbose logging during the attack to preserve storage for critical systems"],
    ["Delete evidence that shows missed control operation", "Retain only summarized control evidence and remove detailed records that show failures"],
    ["Delete risks after the first mitigation task is created", "Close risk entries as soon as a mitigation task is assigned to an owner"],
    ["Delete files and put the drives in regular trash", "Use normal file deletion and standard disposal because the drives are leaving production"],
    ["Tell users to delete all security emails", "Send broad guidance telling users to delete suspicious messages without a reporting path"],
    ["Forward the malicious link as a live clickable URL to everyone", "Send the original lure to users for recognition without defanging links or adding reporting steps"],
    ["Disable MFA because customers may be inconvenienced", "Reduce step-up authentication for affected customers until the suspicious login pattern decreases"],
    ["Disable all account lockouts permanently", "Loosen account lockout controls to reduce help desk calls while monitoring login failures"],
    ["Make the troubleshooting configuration the new standard without review", "Promote emergency troubleshooting settings into the baseline before formal review"],
    ["Scan only once per year during audit season", "Move baseline validation to the next annual audit cycle after the emergency change period"],
    ["Run aggressive credentialed vulnerability scans weekly", "Use frequent active scanning against the controller to prove the unsupported OS risk is visible"],
    ["Install consumer antivirus on the controller", "Install a general-purpose endpoint agent on the controller without vendor validation"],
    ["Use a shorter URL expiration without changing public permissions", "Shorten generated URLs while leaving the bucket policy publicly readable"],
    ["Move the bucket to another region only", "Move the exposed bucket to a different region without changing object permissions"],
    ["Move the finance application to a less visible DNS name", "Move the finance application to a less obvious DNS name while keeping access rules unchanged"],
    ["Move the interface to a new DNS alias", "Move the administrative interface to a new DNS alias without disabling legacy protocols"],
    ["Move databases to a different hostname on the same subnet", "Move databases to a different hostname while preserving the same flat network path"],
    ["Rename the bucket to a random string", "Rename the bucket to a random string while leaving public object access enabled"],
    ["Whitelist the destination to reduce alerts", "Add a temporary allow-list entry for the rare destination to suppress recurring alerts"],
    ["Whitelist the workstation because the file was intentionally planted", "Exclude the workstation from deception alerts because the honeyfile was intentionally planted"],
    ["Keep all rules because removing any rule may cause outages", "Retain unused firewall rules until every dependency owner signs off, without expiration or least-privilege review"],
    ["Use a private IP address as the only protection", "Rely on private addressing as the primary management-plane protection"],
    ["Use only verbal permission from a developer", "Begin testing using informal developer approval before written authorization is complete"],
    ["Use only vulnerability scan results", "Base the communication timeline on vulnerability scan output instead of connection telemetry"],
    ["Use screenshots as the source of truth for infrastructure state", "Use console screenshots as the authoritative record of infrastructure state"],
    ["Use security questions as the only second factor", "Replace push fatigue controls with knowledge-based questions for high-risk users"],
    ["Use SNMP community strings as administrator passwords", "Use shared management strings as a lightweight administrator authentication method"],
    ["Use one shared API key for every function", "Use one shared API key across functions to simplify deployment and rotation"],
    ["Use one shared secret for development and production", "Reuse the same deployment secret across environments to reduce pipeline complexity"],
    ["Trust any device that connects from a corporate IP range", "Trust corporate network location as the primary authorization signal"],
    ["Trust the device if it has a corporate sticker", "Treat visible corporate asset tags as enough evidence for network trust"]
  ]);

  if (exact.has(value)) return exact.get(value);

  const patterns = [
    [/^Disable (.+)$/i, (_, rest) => `Pause ${rest.toLowerCase()} during the response window to reduce disruption`],
    [/^Delete (.+)$/i, (_, rest) => `Remove ${rest.toLowerCase()} after capturing a summary for later review`],
    [/^Ignore (.+)$/i, (_, rest) => `Defer action on ${rest.toLowerCase()} until additional evidence is available`],
    [/^Assume (.+)$/i, (_, rest) => `Treat it as if ${rest.toLowerCase()} without further validation`],
    [/^Wait (.+)$/i, (_, rest) => `Schedule follow-up ${rest.toLowerCase()} rather than changing the active control`],
    [/^Ask users (.+)$/i, (_, rest) => `Rely on users ${rest.toLowerCase()} through awareness guidance`],
    [/^Ask (.+)$/i, (_, rest) => `Use a manual workflow where ${rest.toLowerCase()}`],
    [/^Tell users (.+)$/i, (_, rest) => `Send user guidance that tells users ${rest.toLowerCase()}`],
    [/^Move (.+)$/i, (_, rest) => `Relocate ${rest.toLowerCase()} without changing the core control`],
    [/^Rename (.+)$/i, (_, rest) => `Rename or obscure ${rest.toLowerCase()} without changing authorization`],
    [/^Keep (.+)$/i, (_, rest) => `Keep ${rest.toLowerCase()} as the primary control path`],
    [/^Allow (.+)$/i, (_, rest) => `Allow ${rest.toLowerCase()} temporarily under a documented exception`],
    [/^Trust (.+)$/i, (_, rest) => `Trust ${rest.toLowerCase()} as the main decision point`]
  ];

  for (const [pattern, replacement] of patterns) {
    const match = value.match(pattern);
    if (match) return replacement(...match);
  }

  return value;
}

function strengthenDistractor(text, profile, seed) {
  const value = refineDistractorCore(text);
  if ((seed + profile.ordinal) % 3 === 0) {
    return `${value}.`;
  }

  const closer = profile.distractorClosers[(seed + value.length) % profile.distractorClosers.length];
  return `${value}, ${closer}.`;
}

function balanceChoiceLengths(choiceTexts, correctTexts, profile, seed) {
  const correctSet = new Set(correctTexts);
  const allowCorrectLongest = (seed + profile.ordinal) % 5 === 0;
  if (allowCorrectLongest) return choiceTexts;

  const maxCorrectLength = Math.max(...choiceTexts
    .filter((text) => correctSet.has(text))
    .map((text) => text.length));
  const distractorIndexes = choiceTexts
    .map((text, index) => ({ text, index }))
    .filter((item) => !correctSet.has(item.text));
  let longestDistractor = Math.max(...distractorIndexes.map((item) => item.text.length));

  if (longestDistractor > maxCorrectLength + 4) {
    return choiceTexts;
  }

  const chosen = distractorIndexes[(seed + profile.ordinal) % distractorIndexes.length].index;
  let updated = trimSentence(choiceTexts[chosen]);
  let guard = 0;
  while (updated.length <= maxCorrectLength + 4 && guard < profile.lengthBalancers.length + 2) {
    const extra = profile.lengthBalancers[(seed + guard) % profile.lengthBalancers.length];
    updated = `${updated}, ${extra}`;
    guard++;
  }

  const next = [...choiceTexts];
  next[chosen] = `${updated}.`;
  return next;
}

function makeQuestion(domain, topicItem, globalNumber, localNumber, variant, topicIndex, profile) {
  const org = organizations[(globalNumber + topicIndex + variant + profile.ordinal) % organizations.length];
  const detail = details[(globalNumber * 3 + topicIndex + variant + profile.ordinal) % details.length];
  const constraint = constraints[(globalNumber * 5 + topicIndex + variant + profile.ordinal) % constraints.length];
  const stemClause = profile.stemClauses[(globalNumber + topicIndex + variant) % profile.stemClauses.length];
  const hasSecondary = Boolean(topicItem.secondary);
  const isMultiple = hasSecondary && (variant + topicIndex + profile.ordinal) % profile.multiModulo === 1;
  const instruction = isMultiple
    ? "Which TWO responses BEST address the situation?"
    : "Which response is the BEST choice?";
  const stem = `${org} ${topicItem.scenario} ${detail} ${constraint} ${stemClause} ${instruction}`;

  const rawCorrects = isMultiple ? [topicItem.correct, topicItem.secondary] : [topicItem.correct];
  const correctTexts = rawCorrects.map((text, index) => compactCorrect(text, profile, globalNumber + index + topicIndex));
  const selectedDistractors = rotate(topicItem.distractors, globalNumber + topicIndex + variant + profile.ordinal)
    .slice(0, 3)
    .map((text, index) => strengthenDistractor(text, profile, globalNumber + index + topicIndex + variant));
  const rawChoiceTexts = rotate([...correctTexts, ...selectedDistractors], globalNumber + variant + topicIndex + profile.ordinal);
  const choiceTexts = balanceChoiceLengths(rawChoiceTexts, correctTexts, profile, globalNumber + topicIndex + variant);
  const choices = choiceTexts.map((text, index) => ({ id: optionIds[index], text }));
  const correctAnswers = choices
    .filter((choice) => correctTexts.includes(choice.text))
    .map((choice) => choice.id);

  return {
    id: `SY0-701-${profile.id.toUpperCase().replace(/-/g, "")}-D${domain.number[0]}-Q${String(localNumber).padStart(3, "0")}`,
    global_id: `SY0-701-Q${String(globalNumber).padStart(4, "0")}`,
    exam_code: "SY0-701",
    domain: `${domain.number} ${domain.name}`,
    domain_weight: domain.weight,
    objective: topicItem.objective,
    topic: topicItem.title,
    difficulty: profile.id,
    complexity_tags: ["scenario-based", "best-answer", "tradeoff-analysis", ...profile.tags, ...topicItem.tags],
    question_type: isMultiple ? "multiple_response" : "multiple_choice",
    stem,
    choices,
    correct_answers: correctAnswers,
    explanation: `${topicItem.explanation} The distractors are near misses: they may improve process, monitoring, convenience, or documentation, but they do not best satisfy the priority in the scenario.`,
    source_alignment: [`CompTIA Security+ SY0-701 ${topicItem.objective}`],
    copyright_note: "Original practice item generated from objective alignment; not copied from a question bank or exam dump."
  };
}

const domainSpecs = [
  {
    number: "1.0",
    name: "General Security Concepts",
    weight: "12%",
    target: 60,
    topics: [
      topic("1.1 Security controls", "Preventive technical control selection", "needs to stop unmanaged endpoints from reaching an internal finance application after several policy reminders failed.", "Require device posture checks through NAC before allowing access to the finance network segment.", "Add monitoring that records failed NAC posture checks and sends events to the SIEM.", ["Publish a stronger acceptable use policy without technical enforcement.", "Create a quarterly report showing which users connected from unmanaged devices.", "Move the finance application to a less visible DNS name.", "Ask managers to manually approve every endpoint connection by email."], "NAC with posture checking is a technical preventive control that blocks noncompliant devices before access. Monitoring complements it, while policy-only or obscurity-based approaches do not enforce access.", ["controls", "nac", "preventive"]),
      topic("1.1 Security controls", "Compensating control for unsupported systems", "has an unsupported but mission-critical records system that cannot be patched for six months because the vendor is out of business.", "Place the system in a tightly segmented network with allow-listed flows and enhanced monitoring.", "Document the risk exception, owner approval, and expiration date for the compensating control.", ["Expose the service only during business hours and rely on user vigilance.", "Disable logging to reduce overhead on the legacy server.", "Delay all mitigation until the replacement project is complete.", "Grant local administrator rights only to senior users."], "When remediation is not immediately possible, segmentation, allow-listing, and monitoring reduce exposure as compensating controls. A formal exception keeps ownership and review visible.", ["controls", "compensating", "legacy"]),
      topic("1.1 Security controls", "Detective versus corrective controls", "found that unauthorized firewall rule changes were made during overnight maintenance.", "Enable configuration change alerts and compare firewall state against an approved baseline.", "Use an approved rollback procedure to restore the last known good configuration after validation.", ["Disable all administrator accounts until the next maintenance cycle.", "Replace the firewall with a web application firewall.", "Increase password complexity for standard users only.", "Move the firewall logs to cold storage immediately."], "Detective controls identify unauthorized changes, and corrective controls restore the approved state. The other choices do not directly detect or correct the firewall configuration drift.", ["controls", "detective", "corrective"]),
      topic("1.2 Fundamental security concepts", "Zero Trust policy enforcement", "is replacing broad VPN access after users on trusted subnets repeatedly reached systems outside their job duties.", "Deploy policy enforcement points that evaluate identity, device posture, and context for each resource request.", "Reduce implicit trust zones by segmenting applications and requiring explicit authorization per session.", ["Keep VPN access but rename the internal subnets to hide sensitive systems.", "Use a single shared jump-box account for all privileged users.", "Trust any device that connects from a corporate IP range.", "Disable MFA for users who connect from headquarters."], "Zero Trust reduces implicit trust and makes access decisions based on identity, device state, policy, and context. Network location alone should not grant broad access.", ["zero-trust", "aaa", "least-privilege"]),
      topic("1.2 Fundamental security concepts", "Non-repudiation for approvals", "needs proof that a specific executive approved high-value wire transfers after several disputes about email-based authorization.", "Use digital signatures tied to individual certificates for transfer approvals.", "Retain timestamped approval records in an immutable audit log.", ["Encrypt all transfer emails with a shared team password.", "Allow assistants to approve transfers from a shared mailbox.", "Hash the transfer amount but discard signer identity.", "Use a VPN so approvals originate from internal IP space."], "Digital signatures provide integrity, authentication, and non-repudiation when tied to individual identities. Immutable logs strengthen evidence. Shared secrets and shared mailboxes weaken attribution.", ["non-repudiation", "pki", "digital-signature"]),
      topic("1.2 Fundamental security concepts", "AAA accounting evidence", "must investigate whether privileged database access followed an approved emergency process.", "Review centralized accounting logs that tie the administrator identity, time, command, and target database together.", "Correlate the access record with the approved emergency ticket and session recording.", ["Ask the administrator whether the access was appropriate.", "Check only whether the password met complexity requirements.", "Verify that the database server had disk encryption enabled.", "Rotate all user passwords before reviewing the access record."], "Accounting records prove what authenticated and authorized users did. Correlating logs with tickets and recordings supports accountability for privileged actions.", ["aaa", "accounting", "privileged-access"]),
      topic("1.2 Fundamental security concepts", "Deception technology signal quality", "sees outbound connections from a workstation to a file path that should never be opened by normal users.", "Investigate the workstation because access to a honeyfile is a high-confidence deception alert.", "Use the honeyfile event to enrich threat hunting for related lateral movement.", ["Delete the honeyfile because it created a false positive.", "Whitelist the workstation because the file was intentionally planted.", "Assume the event proves data exfiltration completed.", "Replace endpoint protection with a perimeter firewall only."], "Honeyfiles and honeytokens are designed to create high-signal alerts when touched. They indicate suspicious activity that warrants investigation, not automatic proof of full exfiltration.", ["deception", "honeyfile", "threat-hunting"]),
      topic("1.3 Change management", "Backout planning for security changes", "plans to enforce a new deny-by-default egress rule set for production servers.", "Approve the change only with tested allow-list rules, stakeholder signoff, a maintenance window, and a rollback plan.", "Run the change first in a staging environment that mirrors production dependencies.", ["Apply the rule immediately because deny-by-default is always safer.", "Skip stakeholder review because firewall changes are purely technical.", "Disable all outbound traffic permanently and wait for service owners to complain.", "Document the change after implementation if no outage occurs."], "Security changes can create outages. Proper change management includes testing, ownership, impact analysis, maintenance windows, and a backout plan.", ["change-management", "egress-filtering", "rollback"]),
      topic("1.3 Change management", "Dependency analysis for legacy applications", "wants to restart an authentication service during a certificate update but several legacy applications use undocumented dependencies.", "Perform impact analysis and dependency mapping before scheduling the certificate change.", "Create a maintenance-window communication and rollback procedure for affected applications.", ["Restart the service immediately because certificate updates improve security.", "Disable certificate validation in the legacy applications.", "Move the change to Friday evening without notifying stakeholders.", "Replace the certificate with a self-signed certificate and skip testing."], "Dependency mapping and impact analysis reduce the risk of security changes breaking legacy applications. Disabling validation or skipping communication creates avoidable risk.", ["change-management", "dependencies", "certificates"]),
      topic("1.4 Cryptographic solutions", "Mutual TLS for service authentication", "needs strong authentication between internal microservices after an attacker used a stolen API key from one service to query another.", "Use mutual TLS with service-specific certificates issued by an internal CA.", "Store private keys in a managed secret store or HSM-backed key management system.", ["Place all services behind the same shared API key.", "Encode the API key with Base64 before storing it.", "Allow any service in the subnet to call any other service.", "Replace TLS with a checksum in each request header."], "mTLS authenticates both parties and protects service-to-service communication. Managed key storage reduces key exposure. Shared keys and network trust alone are weaker.", ["pki", "mtls", "service-authentication"]),
      topic("1.4 Cryptographic solutions", "Hashing versus encryption", "must verify that downloaded deployment artifacts were not modified while still allowing anyone to validate integrity.", "Publish a cryptographic hash and a digital signature for each artifact.", "Keep signing keys protected and rotate them according to key management policy.", ["Encrypt the artifact with a shared password and email the password to all users.", "Compress the artifact to reduce the chance of tampering.", "Store the artifact in a hidden directory without validation metadata.", "Use reversible encoding so users can compare the encoded output."], "Hashes support integrity checks, while digital signatures bind the hash to a trusted signer. Encryption alone does not provide public integrity validation.", ["hashing", "digital-signature", "integrity"]),
      topic("1.4 Cryptographic solutions", "Key management and HSM use", "is deploying database field-level encryption for sensitive records and wants to reduce the chance that application administrators can extract keys.", "Use a centralized key management system with HSM-backed key protection and separation of duties.", "Define key rotation, revocation, and access logging requirements before production use.", ["Store encryption keys in the same database table as the encrypted data.", "Hard-code keys in the application repository with restricted branch access.", "Use one permanent key for all environments to simplify support.", "Let database administrators export keys for troubleshooting."], "A KMS backed by HSMs protects key material and supports rotation, audit, and separation of duties. Co-locating or hard-coding keys undermines encryption.", ["kms", "hsm", "encryption"])
    ]
  },
  {
    number: "2.0",
    name: "Threats, Vulnerabilities, and Mitigations",
    weight: "22%",
    target: 110,
    topics: [
      topic("2.1 Threat actors and motivations", "APT behavior recognition", "observes low-and-slow credential harvesting, custom malware, and persistence targeting sensitive research over several months.", "Treat the activity as a likely advanced persistent threat and prioritize containment, threat hunting, and intelligence sharing.", "Preserve forensic evidence and search for long-term persistence across identity, endpoint, and network layers.", ["Classify the activity as an unskilled attacker because there is no immediate ransom note.", "Assume the attacker is only motivated by notoriety.", "Close the case after blocking one IP address.", "Focus only on employee security awareness posters."], "Long duration, custom tooling, persistence, and sensitive targeting align with APT behavior. Blocking a single indicator is not enough for a persistent adversary.", ["apt", "threat-actor", "persistence"]),
      topic("2.1 Threat actors and motivations", "Insider threat indicators", "notices a departing employee bulk downloading design files outside normal hours after receiving a negative performance review.", "Escalate as a potential insider threat and coordinate HR, legal, and security monitoring under policy.", "Disable unnecessary access and preserve access logs for investigation.", ["Publish a company-wide memo naming the employee.", "Ignore the activity because the employee has valid credentials.", "Wait until the employee leaves before reviewing access.", "Delete the employee account immediately without preserving logs."], "Insider threats often use valid access. Coordinated, policy-driven response preserves evidence and reduces unnecessary exposure.", ["insider-threat", "data-exfiltration", "legal"]),
      topic("2.1 Threat actors and motivations", "Shadow IT risk", "discovers a business unit using an unsanctioned file-sharing service to collaborate with contractors on customer data.", "Assess the shadow IT service, classify exposed data, and migrate collaboration to an approved controlled platform.", "Update governance and technical controls so future unsanctioned services are detected quickly.", ["Block all cloud services without telling business units.", "Allow the service because productivity increased.", "Ask users to delete files manually without verifying exposure.", "Treat the issue only as a malware incident."], "Shadow IT creates governance, data handling, and monitoring gaps. The right response manages the data exposure and provides a sanctioned path.", ["shadow-it", "governance", "data-exposure"]),
      topic("2.1 Threat actors and motivations", "Organized crime extortion", "receives a ransom demand that includes proof of stolen customer records and threats to publish the data.", "Handle the event as financially motivated extortion involving both ransomware and data exfiltration risk.", "Activate incident response, legal, communications, and breach notification decision processes.", ["Assume restoring from backup eliminates all reporting obligations.", "Classify the event as hacktivism because publication was threatened.", "Pay immediately before validating the scope of compromise.", "Only reimage encrypted workstations and close the incident."], "Modern extortion often combines encryption with data theft. Restoration alone does not address disclosure, legal, or scope-of-compromise requirements.", ["ransomware", "extortion", "data-breach"]),
      topic("2.2 Threat vectors and attack surfaces", "OAuth consent phishing", "finds that several users granted a third-party OAuth application mailbox and file permissions after a fake productivity prompt.", "Revoke the malicious OAuth grants and restrict user consent to approved or verified applications.", "Review mailbox rules and cloud audit logs for data access by the unauthorized application.", ["Force password resets only and assume tokens are invalidated.", "Block the sender domain but leave granted application permissions active.", "Disable email for all users for a week.", "Train users to identify bad spelling as the only mitigation."], "OAuth consent phishing can persist through granted tokens even after passwords change. Revoking grants and controlling app consent directly addresses the vector.", ["oauth", "phishing", "cloud"]),
      topic("2.2 Threat vectors and attack surfaces", "Supply chain compromise", "identifies that a trusted software update package contains a malicious post-install script signed by a vendor account.", "Suspend deployment, validate package integrity through an out-of-band vendor channel, and hunt for affected hosts.", "Add software supply chain controls such as dependency pinning, package allow-listing, and update verification.", ["Install the update because the package is signed.", "Block all vendor updates permanently.", "Delete local logs to prevent script re-execution.", "Replace endpoint detection with user awareness training."], "A signed package can still be malicious if the vendor pipeline or signing account is compromised. Verification, containment, and supply chain controls are required.", ["supply-chain", "signed-malware", "update-security"]),
      topic("2.2 Threat vectors and attack surfaces", "Evil twin wireless attack", "detects employees connecting to a wireless network that mimics the corporate SSID but presents an untrusted certificate.", "Use certificate-based enterprise Wi-Fi validation and educate users not to bypass certificate warnings.", "Monitor for rogue access points and deauthenticate or physically locate unauthorized devices where permitted.", ["Switch the SSID to a more complex name.", "Use a captive portal password shared by all employees.", "Disable TLS certificate validation on clients.", "Increase DHCP lease time on the real wireless network."], "Evil twin attacks exploit users connecting to fake access points. Enterprise authentication with certificate validation prevents credential capture.", ["wireless", "evil-twin", "certificates"]),
      topic("2.2 Threat vectors and attack surfaces", "Voice and callback phishing", "reports that help desk staff reset MFA after callers spoof executive phone numbers and claim urgent travel lockout.", "Require identity-proofing procedures for high-risk help desk actions and block caller ID as a sole authenticator.", "Add out-of-band approval or manager verification for MFA reset requests.", ["Train staff to trust calls from known phone numbers.", "Disable MFA for executives to reduce help desk calls.", "Publish the help desk phone number on the public website.", "Allow resets if the caller knows the employee title."], "Vishing and caller ID spoofing defeat weak help desk processes. Strong identity proofing and out-of-band verification reduce social engineering risk.", ["vishing", "social-engineering", "mfa-reset"]),
      topic("2.2 Threat vectors and attack surfaces", "Removable media vector", "finds a workstation infected after a contractor inserted a promotional USB drive received at a conference.", "Disable unauthorized removable media and use device control with malware scanning for approved exceptions.", "Provide controlled file exchange methods for contractors so business needs do not bypass policy.", ["Tell users to avoid unknown USB drives but allow unrestricted use.", "Format all USB drives after use without scanning endpoints.", "Disable the workstation firewall because the attack was physical.", "Assume encryption at rest prevents USB malware execution."], "Removable media is a threat vector that needs technical device control, scanning, and safe alternatives. Awareness alone is not sufficient.", ["removable-media", "device-control", "malware"]),
      topic("2.3 Vulnerabilities", "Insecure API authorization", "learns that users can change an account ID in an API request and retrieve another customer's invoice.", "Fix broken object-level authorization on the server side and test access checks for each object request.", "Add API gateway logging and negative authorization tests to the release pipeline.", ["Hide account IDs in the web interface only.", "Require users to clear browser cache.", "Base64-encode invoice IDs in the URL.", "Increase TLS key length for API traffic."], "Object-level authorization must be enforced server side. Obfuscating IDs or hiding fields does not prevent direct API calls.", ["api-security", "authorization", "bola"]),
      topic("2.3 Vulnerabilities", "Container image vulnerability", "finds production containers built from an image with critical vulnerabilities and packages not needed by the application.", "Rebuild from a minimal trusted base image, patch dependencies, and redeploy through the approved pipeline.", "Add image scanning and signed image enforcement before deployment.", ["Patch the running container manually and skip rebuilding the image.", "Disable container logs to reduce attack visibility.", "Run containers as root so patching is easier.", "Expose the container runtime socket to the application."], "Containers should be rebuilt from patched, minimal images and deployed immutably. Image scanning and signing reduce supply chain and drift risk.", ["containers", "image-scanning", "hardening"]),
      topic("2.3 Vulnerabilities", "Cloud storage misconfiguration", "finds a storage bucket containing customer exports readable by anyone with the URL.", "Remove public access, review object access logs, and enforce bucket policies that block public exposure.", "Apply data classification and DLP monitoring to detect future public sharing of sensitive exports.", ["Rename the bucket to a random string.", "Compress files to make them harder to inspect.", "Use a shorter URL expiration without changing public permissions.", "Move the bucket to another region only."], "Public cloud storage exposure is a misconfiguration. Access policies, logging review, and preventive guardrails address both exposure and recurrence.", ["cloud", "misconfiguration", "data-exposure"]),
      topic("2.3 Vulnerabilities", "Legacy OT vulnerability", "must protect a programmable controller running an unsupported OS that cannot tolerate active scanning or endpoint agents.", "Use network segmentation, passive monitoring, strict allow-lists, and controlled jump-host access.", "Schedule vendor-approved maintenance for firmware updates and compensating control review.", ["Run aggressive credentialed vulnerability scans weekly.", "Install consumer antivirus on the controller.", "Connect the controller directly to the corporate Wi-Fi.", "Grant remote desktop access to all engineers."], "OT and ICS devices often require passive monitoring and strong segmentation because active scans or agents can disrupt operations.", ["ot", "ics", "segmentation"]),
      topic("2.3 Vulnerabilities", "Weak protocol exposure", "detects that an administrative interface still accepts Telnet and legacy TLS ciphers on a management subnet.", "Disable insecure protocols and require SSH or TLS with approved cipher suites.", "Update configuration baselines so drift from secure protocol standards is detected.", ["Keep Telnet but restrict it to a shorter password.", "Use a private IP address as the only protection.", "Document that administrators prefer legacy ciphers.", "Move the interface to a new DNS alias."], "Weak protocols expose credentials and sessions. Secure baselines should disable Telnet and legacy ciphers in favor of encrypted, approved protocols.", ["protocols", "hardening", "secure-baseline"]),
      topic("2.3 Vulnerabilities", "Server-side request forgery", "sees a web application fetch user-supplied URLs and access cloud instance metadata credentials.", "Block metadata service access from the application path and validate outbound fetch destinations with allow-lists.", "Rotate exposed cloud credentials and search logs for abuse of temporary tokens.", ["Increase web server thread count.", "Disable TLS for outbound requests.", "Trust URLs that resolve to private IP addresses.", "Store metadata credentials in browser cookies."], "SSRF can force servers to access internal services such as metadata endpoints. Egress allow-lists and metadata protections limit impact.", ["ssrf", "cloud", "metadata"]),
      topic("2.4 Malicious activity", "Ransomware containment", "receives alerts that file shares are being renamed rapidly and endpoint agents show suspicious encryption behavior.", "Isolate affected endpoints and disable compromised accounts before starting eradication and recovery.", "Preserve logs and identify initial access so restored systems are not reinfected.", ["Restore backups immediately onto the same network.", "Run a full vulnerability scan before containment.", "Notify users to stop using file shares but keep endpoints online.", "Delete ransom notes as the first step."], "Containment limits spread before eradication and recovery. Restoring before containment can reintroduce encryption activity.", ["ransomware", "incident-response", "containment"]),
      topic("2.4 Malicious activity", "Password spraying", "observes many failed logins across thousands of accounts with one or two common passwords per account.", "Treat the pattern as password spraying and enforce MFA, lockout tuning, and detection for distributed attempts.", "Block offending sources where feasible and identify any accounts with successful authentication after the spray.", ["Classify the activity as brute force against one account.", "Disable all account lockouts permanently.", "Assume no issue exists because each account has few failures.", "Tell users to change passwords only after the next annual cycle."], "Password spraying uses low attempt counts across many accounts to avoid lockouts. MFA and spray-specific detection reduce risk.", ["password-spraying", "identity", "mfa"]),
      topic("2.4 Malicious activity", "Credential stuffing", "sees successful logins to customer accounts from many residential proxies shortly after a breach at an unrelated website.", "Detect and rate-limit reused credential attempts, require step-up authentication, and check for account takeover indicators.", "Notify affected users and force password resets for accounts with suspicious successful logins.", ["Increase password expiration frequency for employees only.", "Block one country at the firewall and close the case.", "Assume the company database was breached without evidence.", "Disable MFA because customers may be inconvenienced."], "Credential stuffing uses reused credentials from other breaches. Controls include rate limiting, anomaly detection, step-up authentication, and targeted resets.", ["credential-stuffing", "account-takeover", "rate-limiting"]),
      topic("2.4 Malicious activity", "DNS tunneling exfiltration", "detects endpoints making thousands of long, random-looking DNS queries to a newly registered domain.", "Investigate possible DNS tunneling and block or sinkhole the domain while preserving DNS logs.", "Add DNS analytics that detect high-entropy subdomains and unusual query volume.", ["Increase the recursive resolver cache size.", "Disable DNS logging to improve performance.", "Allow the domain because DNS is required for business.", "Replace endpoint disks without network investigation."], "Long high-entropy subdomains and high query volume can indicate DNS tunneling. DNS logs are essential for scoping exfiltration.", ["dns-tunneling", "exfiltration", "logs"]),
      topic("2.4 Malicious activity", "Command-and-control beaconing", "finds a workstation making periodic encrypted outbound connections to rare infrastructure every five minutes.", "Treat the pattern as potential C2 beaconing and collect endpoint, proxy, and DNS telemetry for containment.", "Use EDR isolation or firewall controls to stop outbound communication while preserving evidence.", ["Ignore the traffic because it uses TLS.", "Whitelist the destination to reduce alerts.", "Only clear the browser cache.", "Reboot the workstation repeatedly until traffic stops."], "Regular periodic outbound traffic to rare destinations can indicate beaconing. TLS does not make the activity benign.", ["c2", "beaconing", "edr"]),
      topic("2.5 Mitigation techniques", "Segmentation after compromise", "needs to prevent a compromised workstation from reaching database servers after malware used flat network access for lateral movement.", "Implement segmentation with restrictive east-west access controls between user, server, and database zones.", "Add monitoring for denied lateral movement attempts to validate the segmentation policy.", ["Put all systems behind the same perimeter firewall only.", "Increase user password length without network controls.", "Move databases to a different hostname on the same subnet.", "Disable endpoint logging to reduce lateral movement noise."], "Segmentation limits lateral movement by controlling east-west traffic. Perimeter-only controls do not stop internal spread.", ["segmentation", "lateral-movement", "mitigation"]),
      topic("2.5 Mitigation techniques", "Configuration enforcement", "has repeated findings for local administrator rights, disabled host firewalls, and unapproved services across endpoints.", "Use configuration enforcement and secure baselines to continuously remediate endpoint drift.", "Report exceptions with owners, expiration dates, and compensating controls.", ["Manually email users asking them to change settings.", "Wait for the next annual audit to verify fixes.", "Allow each department to define its own baseline.", "Remove all endpoint monitoring because findings are repetitive."], "Configuration enforcement keeps systems aligned to approved baselines and reduces recurring drift. Exceptions should be explicit and time-bound.", ["configuration-enforcement", "baselines", "endpoint-hardening"])
    ]
  },
  {
    number: "3.0",
    name: "Security Architecture",
    weight: "18%",
    target: 90,
    topics: [
      topic("3.1 Architecture models", "Cloud shared responsibility", "is migrating a database to a managed cloud service and assumes the provider will handle all access control decisions.", "Map each control to the shared responsibility model and keep identity, data access, and configuration ownership with the customer where applicable.", "Enable cloud audit logging and least-privilege IAM for database administration.", ["Stop reviewing permissions because managed services remove customer responsibility.", "Give all developers provider administrator roles for troubleshooting.", "Disable encryption because the provider owns the data center.", "Treat the migration as a physical security project only."], "Cloud providers manage portions of the stack, but customers usually remain responsible for identity, data, configuration, and workload access.", ["cloud", "shared-responsibility", "iam"]),
      topic("3.1 Architecture models", "Serverless secrets", "is moving event-driven functions to a serverless platform and developers want to store API keys in environment variables visible to many operators.", "Use managed secrets with least-privilege function access and rotate exposed values before deployment.", "Add deployment pipeline checks that detect secrets and overly broad function permissions.", ["Commit secrets into the function code because runtime is ephemeral.", "Use one shared API key for every function.", "Disable function logs to hide accidental secret exposure.", "Make all functions public to simplify invocation."], "Serverless reduces server management but not secret and permission risk. Managed secrets and least privilege are still required.", ["serverless", "secrets", "least-privilege"]),
      topic("3.1 Architecture models", "Containerized microservices segmentation", "runs microservices in containers and wants to stop one compromised service account from querying every internal API.", "Apply network policies and service-level authorization between microservices.", "Use separate identities and narrowly scoped permissions for each service.", ["Put every service in the same namespace with a shared token.", "Expose the cluster control plane to the internet for easier management.", "Rely only on image names to determine trust.", "Disable mutual authentication because traffic stays inside the cluster."], "Microservices need segmentation and service identity. A flat cluster network or shared token increases blast radius.", ["containers", "microservices", "segmentation"]),
      topic("3.1 Architecture models", "Infrastructure as code guardrails", "uses infrastructure as code and accidentally deployed public administrative ports during a rushed release.", "Add policy-as-code checks to block risky configurations before deployment.", "Require peer review and signed pipeline approvals for production infrastructure changes.", ["Rely on manual console review after deployment.", "Give developers permanent emergency access to production.", "Disable version control because IaC changes too quickly.", "Use screenshots as the source of truth for infrastructure state."], "IaC should be controlled with versioning, review, and automated guardrails that catch insecure configurations before they reach production.", ["iac", "policy-as-code", "guardrails"]),
      topic("3.1 Architecture models", "ICS isolation", "connects production manufacturing equipment to enterprise reporting systems and wants to reduce risk of business-network compromise affecting safety controllers.", "Use industrial network segmentation with controlled conduits and monitored jump hosts between IT and OT.", "Prefer passive monitoring and vendor-approved change windows for OT systems.", ["Join controllers directly to the corporate domain.", "Use the same Wi-Fi network for visitors and controllers.", "Run internet browsing software on engineering workstations.", "Replace safety monitoring with email alerts only."], "ICS environments need strong segmentation, controlled access paths, and careful monitoring because availability and safety requirements differ from IT systems.", ["ics", "ot", "segmentation"]),
      topic("3.1 Architecture models", "Centralized versus decentralized control", "has business units independently managing security tools, causing inconsistent policy enforcement and slow incident correlation.", "Centralize policy governance and telemetry aggregation while allowing local operational ownership where justified.", "Define common baselines and escalation paths for decentralized teams.", ["Let each unit define unrelated incident severity levels.", "Remove local administrators from all systems without an exception process.", "Buy separate SIEM platforms for every office.", "Stop collecting logs because ownership is unclear."], "A hybrid operating model can centralize governance and visibility while preserving local execution. Uncoordinated decentralization impairs detection and response.", ["governance", "architecture", "centralization"]),
      topic("3.2 Enterprise infrastructure", "Zero Trust enterprise access", "wants remote contractors to access one internal application without broad network access.", "Use identity-aware access with device posture checks and application-level authorization.", "Place the application behind a proxy or policy enforcement point that logs each access decision.", ["Issue a full-tunnel VPN profile with access to all internal subnets.", "Share one contractor account to simplify offboarding.", "Allow access from any unmanaged personal device.", "Whitelist the contractor's current home IP forever."], "Zero Trust access should be scoped to the application and based on identity, device, and context rather than broad network reachability.", ["zero-trust", "remote-access", "contractors"]),
      topic("3.2 Enterprise infrastructure", "SASE and branch security", "has many branch offices sending internet traffic directly to cloud applications without consistent web filtering or DLP.", "Use SASE or cloud-delivered secure web gateway controls with identity-aware policy enforcement.", "Integrate branch traffic logs with central monitoring for investigation.", ["Backhaul all traffic through one overloaded headquarters firewall without resilience.", "Let every branch pick its own filtering policy.", "Disable TLS inspection everywhere without risk analysis.", "Rely on endpoint users to classify every connection manually."], "SASE and cloud SWG models can provide consistent policy for distributed users and branches while supporting cloud access patterns.", ["sase", "swg", "branch-security"]),
      topic("3.2 Enterprise infrastructure", "CASB for SaaS visibility", "uses many SaaS platforms and needs to detect risky sharing of regulated files outside the company.", "Deploy CASB capabilities to discover SaaS use, enforce sharing policy, and monitor data movement.", "Tie SaaS access to identity provider logs and data classification labels.", ["Block all SaaS services at the perimeter and ignore mobile access.", "Ask users to self-report external sharing quarterly.", "Move regulated files to personal drives.", "Disable SSO so SaaS activity is harder to correlate."], "A CASB helps discover and control SaaS usage, sharing, and data movement. Integration with identity and classification improves policy decisions.", ["casb", "saas", "dlp"]),
      topic("3.2 Enterprise infrastructure", "WAF and API gateway placement", "runs public APIs that receive malformed requests and injection attempts before traffic reaches application servers.", "Place a WAF or API gateway in front of the service to enforce request validation and rate limits.", "Keep application-side input validation because edge controls are not a complete substitute.", ["Use a network firewall rule that allows all HTTPS and performs no application inspection.", "Move the API to a different URL path.", "Disable error logging to avoid revealing stack traces.", "Rely only on database encryption at rest."], "A WAF or API gateway can inspect application-layer traffic and enforce controls before requests hit the application, while secure coding remains necessary.", ["waf", "api-gateway", "application-security"]),
      topic("3.2 Enterprise infrastructure", "Network access control", "needs to keep unmanaged devices off sensitive VLANs while still allowing guest internet access.", "Use NAC to place devices into appropriate network segments based on identity and posture.", "Create a guest network with internet-only access and monitoring.", ["Give guests the same pre-shared key as employees.", "Allow unknown devices until a monthly manual review.", "Disable DHCP to stop unmanaged endpoints.", "Rely on a warning banner as the primary control."], "NAC enforces access decisions based on device identity and posture and can place guests into a restricted segment.", ["nac", "segmentation", "guest-network"]),
      topic("3.2 Enterprise infrastructure", "Secure administrative protocols", "finds administrators using plaintext protocols for router management across several sites.", "Require SSH, HTTPS with valid certificates, and centralized administrative authentication.", "Disable legacy management protocols through the secure configuration baseline.", ["Keep Telnet but use longer usernames.", "Only hide router IP addresses in DNS.", "Allow management from the internet during emergencies.", "Use SNMP community strings as administrator passwords."], "Administrative access should use encrypted protocols and centralized authentication. Plaintext management protocols expose credentials.", ["ssh", "secure-protocols", "administration"]),
      topic("3.3 Data protection", "Data classification driven controls", "must decide which documents need encryption, DLP monitoring, and restricted sharing.", "Classify data by sensitivity and regulatory impact before assigning protection controls.", "Apply labels that drive access, retention, and DLP policies.", ["Apply the same public label to all documents.", "Encrypt only files larger than 10 MB.", "Let users decide retention with no classification guidance.", "Disable labels because they create audit evidence."], "Classification determines appropriate handling requirements such as encryption, sharing, retention, and DLP.", ["data-classification", "dlp", "governance"]),
      topic("3.3 Data protection", "Tokenization versus encryption", "wants analysts to run reports on payment transactions without exposing primary account numbers.", "Tokenize payment card numbers and restrict access to the token vault.", "Use encryption for storage and transport where card data must remain recoverable by authorized systems.", ["Store full card numbers in report exports and rely on folder permissions.", "Hash card numbers when the original value must be recovered.", "Mask only the last four digits in the database while keeping full values in logs.", "Email encrypted spreadsheets to analysts with the password in the same thread."], "Tokenization replaces sensitive values with non-sensitive tokens for analytics. Encryption protects data when recovery is required by authorized systems.", ["tokenization", "encryption", "pci"]),
      topic("3.3 Data protection", "DLP tuning", "sees regulated data leaving through email attachments but initial DLP rules created many false positives from test data.", "Tune DLP rules using classification labels, context, and exact data matching where appropriate.", "Create response workflows for confirmed DLP events, including user coaching and escalation.", ["Disable DLP because false positives occurred.", "Block all outbound email indefinitely.", "Rely only on manual manager review of attachments.", "Move sensitive data to unmonitored file shares."], "Effective DLP needs tuning with context and data classification to reduce false positives while protecting sensitive data.", ["dlp", "classification", "email-security"]),
      topic("3.4 Resilience and recovery", "Backup strategy for ransomware", "wants backups that can survive ransomware encrypting production file shares and administrative credentials.", "Maintain immutable or offline backups with separate administrative credentials and tested restores.", "Document RPO and RTO requirements to choose backup frequency and recovery design.", ["Keep backups mounted read-write on the same domain with shared admin credentials.", "Assume snapshots are safe without testing restore.", "Store the only backup copy on the production file server.", "Encrypt backups using keys stored only on infected servers."], "Ransomware-resilient backups need separation, immutability or offline storage, and tested restoration against RPO/RTO needs.", ["backups", "ransomware", "resilience"]),
      topic("3.4 Resilience and recovery", "Site resiliency", "needs continued operations if the primary data center loses power and network connectivity.", "Use a secondary site or cloud failover design matched to business RTO and RPO requirements.", "Test failover regularly and include DNS, identity, and application dependencies.", ["Buy larger UPS units and ignore regional outage scenarios.", "Create backups but no restoration runbook.", "Replicate only application servers and skip databases.", "Declare the risk accepted without business approval."], "Resilience design must match recovery requirements and include dependencies. Power protection alone may not handle site-level outages.", ["disaster-recovery", "rto", "rpo"]),
      topic("3.4 Resilience and recovery", "Platform diversity", "relies on a single vendor stack for identity, endpoint management, email, and backup authentication.", "Evaluate whether platform diversity or out-of-band recovery access is needed for critical security functions.", "Create break-glass recovery processes protected by strong controls and tested periodically.", ["Use the same administrator account and password for all platforms.", "Remove offline recovery documentation because it may be stolen.", "Disable backups to reduce dependency complexity.", "Trust that one vendor outage cannot affect multiple controls."], "Concentration risk can affect multiple security functions at once. Diversity, out-of-band access, and tested break-glass processes improve resilience.", ["resilience", "platform-diversity", "break-glass"])
    ]
  },
  {
    number: "4.0",
    name: "Security Operations",
    weight: "28%",
    target: 140,
    topics: [
      topic("4.1 Computing resource security", "Secure baseline drift", "finds servers drifting from the approved hardening baseline after emergency troubleshooting changes.", "Use configuration management to enforce the baseline and alert on unauthorized drift.", "Tie emergency changes to tickets with expiration dates and rollback steps.", ["Ask administrators to remember to undo changes.", "Disable baseline checks during all incidents.", "Make the troubleshooting configuration the new standard without review.", "Scan only once per year during audit season."], "Secure operations require continuous baseline enforcement and controlled exceptions, especially after emergency changes.", ["hardening", "baseline", "configuration-management"]),
      topic("4.1 Computing resource security", "EDR response", "receives an EDR alert for credential dumping behavior on a domain-joined workstation.", "Isolate the endpoint, collect triage artifacts, and investigate potential credential compromise.", "Reset or rotate credentials that may have been exposed after scoping the incident.", ["Immediately wipe the host without collecting evidence.", "Ignore the alert if antivirus did not quarantine a file.", "Disable EDR because it interfered with the process.", "Only ask the user whether they noticed slowness."], "Credential dumping requires quick containment and evidence collection. EDR telemetry should guide scoping and credential response.", ["edr", "credential-dumping", "containment"]),
      topic("4.1 Computing resource security", "Mobile device management", "has employees accessing regulated email from unmanaged phones with no screen lock or remote wipe capability.", "Require MDM or MAM controls before mobile access to regulated mail.", "Enforce device encryption, screen lock, and remote wipe for approved mobile devices.", ["Allow access if users sign a one-time agreement.", "Forward regulated email to personal accounts.", "Disable mailbox logging to protect privacy.", "Use SMS as the only control for lost phones."], "MDM/MAM enforces mobile security posture and data protection controls for corporate access.", ["mdm", "mobile-security", "regulated-data"]),
      topic("4.1 Computing resource security", "Enterprise wireless authentication", "uses a shared WPA2 personal passphrase across multiple offices and cannot identify which device caused suspicious traffic.", "Move to WPA3-Enterprise or WPA2-Enterprise with individual credentials and certificate validation.", "Integrate wireless authentication logs with central monitoring.", ["Change the shared passphrase once per year.", "Post the passphrase in a private chat channel.", "Hide the SSID as the primary security control.", "Disable wireless logging to improve performance."], "Enterprise wireless authentication provides per-user or per-device accountability and stronger access control than shared passphrases.", ["wireless", "wpa-enterprise", "accountability"]),
      topic("4.1 Computing resource security", "Sandboxing suspicious files", "receives attachments that evade static signature checks but behave suspiciously when opened by users.", "Detonate suspicious files in a sandbox and use behavior indicators to update controls.", "Combine sandbox results with email filtering, endpoint detection, and user reporting.", ["Open the files on an analyst workstation to observe behavior.", "Allow the files if hashes are unknown to threat intelligence.", "Forward samples to all users for awareness.", "Disable macro warnings so analysts can test faster."], "Sandboxing safely observes file behavior and can reveal malicious activity that static checks miss.", ["sandboxing", "malware-analysis", "email-security"]),
      topic("4.2 Asset management", "Asset inventory coverage", "cannot patch several exposed systems because teams disagree about ownership and asset criticality.", "Build an authoritative asset inventory with owners, business criticality, and network exposure.", "Use discovery and reconciliation to find unmanaged hardware and software assets.", ["Patch only systems with easy-to-find owners.", "Wait for owners to self-report assets.", "Delete vulnerability findings with unknown ownership.", "Assume cloud assets are tracked by finance invoices only."], "Asset management is foundational for vulnerability management, ownership, and prioritization.", ["asset-management", "inventory", "ownership"]),
      topic("4.2 Asset management", "End-of-life software risk", "discovers production systems running software that no longer receives security updates.", "Document the EOL risk, prioritize replacement or isolation, and define compensating controls until migration.", "Update procurement and lifecycle processes to prevent unsupported software from remaining unnoticed.", ["Accept the risk permanently because the software still runs.", "Disable vulnerability scanning for the software.", "Give the system more CPU resources.", "Move the software to a hidden subnet with no monitoring."], "EOL software lacks vendor fixes and needs migration planning, isolation, monitoring, or other compensating controls.", ["eol", "lifecycle", "risk"]),
      topic("4.2 Asset management", "Media sanitization", "is decommissioning drives that stored regulated data and must prevent data recovery after disposal.", "Sanitize or destroy media according to data classification and retain disposal evidence.", "Update asset records to show custody, sanitization method, and final disposition.", ["Delete files and put the drives in regular trash.", "Format drives quickly and sell them without records.", "Store retired drives in an unlocked closet indefinitely.", "Trust the recycling vendor without any disposal evidence."], "Secure disposal requires sanitization or destruction matched to data sensitivity, plus asset and chain-of-custody records.", ["media-sanitization", "asset-disposal", "regulated-data"]),
      topic("4.3 Vulnerability management", "Credentialed scanning value", "runs unauthenticated scans that miss missing patches on internal servers.", "Use credentialed scans where approved to get accurate software and configuration findings.", "Protect scanner credentials with least privilege and monitor their use.", ["Increase scan speed without credentials.", "Scan only from outside the firewall.", "Disable host firewalls during every scan.", "Replace vulnerability scanning with annual penetration tests only."], "Credentialed scans provide deeper visibility into patch and configuration state. Scanner credentials must be controlled.", ["vulnerability-scanning", "credentialed-scan", "least-privilege"]),
      topic("4.3 Vulnerability management", "Risk-based prioritization", "has thousands of vulnerabilities and limited patch windows, including one medium CVSS issue actively exploited on an internet-facing host.", "Prioritize remediation using exploitability, exposure, asset criticality, and compensating controls, not CVSS alone.", "Patch or mitigate the internet-facing actively exploited issue before lower-risk internal findings.", ["Sort only by CVSS base score and patch in descending order.", "Patch only the easiest systems first.", "Ignore medium findings because only critical findings matter.", "Delay remediation until all assets have perfect inventory data."], "Risk-based vulnerability management considers context such as active exploitation and exposure, not only numeric severity.", ["vulnerability-management", "cvss", "risk-prioritization"]),
      topic("4.3 Vulnerability management", "Patch validation", "deploys emergency patches for a critical vulnerability but later scans still report exposure on some systems.", "Validate remediation with follow-up scanning and compare against deployment records.", "Investigate failed patch installations or compensating controls for systems that remain vulnerable.", ["Assume the patch succeeded because the deployment job was started.", "Close all tickets after the first maintenance window.", "Disable the scanner signature to remove noise.", "Wait until next quarter to verify."], "Remediation is not complete until validated. Deployment attempts can fail or miss assets.", ["patching", "validation", "vulnerability-management"]),
      topic("4.3 Vulnerability management", "Compensating controls for patch delay", "cannot patch a critical internet-facing application for two weeks because the vendor patch breaks a required integration.", "Use temporary compensating controls such as WAF rules, access restrictions, and enhanced monitoring while testing the patch.", "Record the exception, owner, expiration, and validation plan.", ["Ignore the finding until the vendor releases another patch.", "Disable logs to reduce attack attempts.", "Tell users not to access the application.", "Move the application to a new hostname only."], "When patching is delayed, compensating controls reduce exposure and must be tracked with ownership and expiration.", ["compensating-controls", "patching", "waf"]),
      topic("4.4 Alerting and monitoring", "SIEM correlation", "receives separate alerts for impossible travel, mailbox forwarding rule creation, and OAuth consent by the same user.", "Correlate identity, email, and cloud application logs in the SIEM as a likely account compromise.", "Disable suspicious sessions and revoke unauthorized tokens after validating the activity.", ["Handle each alert as unrelated noise.", "Reset only the user's workstation password.", "Whitelist the OAuth application because the user clicked approve.", "Delete mailbox audit logs after closing the alert."], "Correlation across log sources reveals compromise patterns that single alerts may not show.", ["siem", "correlation", "account-compromise"]),
      topic("4.4 Alerting and monitoring", "IDS versus IPS placement", "wants to detect suspicious traffic between internal segments but is worried an inline device might disrupt a latency-sensitive application.", "Deploy IDS monitoring first to baseline traffic, then evaluate IPS enforcement for high-confidence signatures.", "Place prevention controls where latency and false-positive impact are acceptable.", ["Put IPS inline everywhere immediately with all signatures blocking.", "Use only endpoint antivirus for network-layer attacks.", "Disable monitoring because prevention may cause disruption.", "Install a WAF between two non-HTTP network segments."], "IDS can provide passive visibility where inline IPS risk is unacceptable. IPS is best used where prevention benefits outweigh disruption risk.", ["ids", "ips", "monitoring"]),
      topic("4.4 Alerting and monitoring", "UEBA anomaly detection", "needs to detect compromised accounts that use valid passwords but behave differently from normal user patterns.", "Use user and entity behavior analytics to flag abnormal access, location, and data movement patterns.", "Combine UEBA alerts with identity controls such as step-up authentication.", ["Rely only on signature-based malware detection.", "Disable audit logs for privacy reasons.", "Assume valid passwords mean activity is authorized.", "Use static firewall rules as the only account-compromise control."], "UEBA helps detect anomalous behavior from valid accounts, especially when credentials are compromised.", ["ueba", "identity", "anomaly-detection"]),
      topic("4.5 Enterprise security capabilities", "Firewall rule cleanup", "has years of accumulated firewall rules, including broad any-any permits added during outages.", "Review rule usage, remove stale permits, and replace broad rules with least-privilege access.", "Require future emergency firewall rules to expire automatically unless renewed.", ["Keep all rules because removing any rule may cause outages.", "Add a second any-any rule for redundancy.", "Rename broad rules to indicate they are temporary.", "Disable firewall logging to improve throughput."], "Firewall rules need lifecycle management. Least privilege and expiration for emergency rules reduce long-term exposure.", ["firewall", "least-privilege", "rule-review"]),
      topic("4.5 Enterprise security capabilities", "DNS filtering", "sees users reaching newly registered domains linked to phishing and malware staging.", "Use DNS filtering to block known malicious and newly suspicious domains before connection.", "Log DNS requests centrally to support investigation and threat hunting.", ["Block only IP addresses found in yesterday's firewall logs.", "Disable DNS resolution for all users.", "Let users decide whether domains look suspicious.", "Move DNS servers to unmanaged endpoints."], "DNS filtering can prevent access to malicious domains and provides useful telemetry for investigations.", ["dns-filtering", "threat-prevention", "logging"]),
      topic("4.5 Enterprise security capabilities", "DLP response", "detects an employee attempting to upload source code and customer data to a personal cloud account.", "Block or quarantine the transfer according to DLP policy and escalate for investigation.", "Use classification labels and identity context to tune future DLP enforcement.", ["Allow the upload and ask the user to delete it later.", "Disable DLP for developers because they move many files.", "Only encrypt the user's laptop drive.", "Assume the upload is approved because the user is authenticated."], "DLP should enforce policy on sensitive data movement and trigger investigation when behavior is risky.", ["dlp", "data-exfiltration", "cloud-storage"]),
      topic("4.6 Identity and access management", "Joiner-mover-leaver process", "discovers employees retaining access to systems from previous roles after internal transfers.", "Automate access reviews and role changes tied to HR joiner-mover-leaver events.", "Remove stale entitlements and require owner approval for exceptions.", ["Wait for users to request removal of their own access.", "Create one broad role for all employees.", "Disable access reviews to reduce manager workload.", "Let old access remain because it may be useful later."], "IAM operations must update access as people join, move, and leave. Stale access violates least privilege.", ["iam", "lifecycle", "least-privilege"]),
      topic("4.6 Identity and access management", "Federation protocol choice", "needs SSO to a SaaS provider and wants assertions from the corporate identity provider rather than separate passwords.", "Use federated SSO with SAML or OIDC from the corporate identity provider.", "Require conditional access and MFA for sensitive SaaS roles.", ["Create local SaaS passwords for every user.", "Share one SaaS administrator account across the team.", "Disable IdP logging because SaaS logs are enough.", "Use LDAP directly over the public internet without protection."], "Federated SSO reduces password sprawl and centralizes authentication policy, especially when paired with conditional access.", ["sso", "saml", "oidc"]),
      topic("4.6 Identity and access management", "Phishing-resistant MFA", "has attackers bypassing push-based MFA through fatigue prompts and help desk resets.", "Move high-risk users to phishing-resistant MFA such as FIDO2 security keys or certificate-based authentication.", "Harden MFA reset workflows with stronger identity proofing and approval.", ["Send more push prompts until users approve faster.", "Disable MFA for users who travel often.", "Use security questions as the only second factor.", "Trust caller ID for all MFA reset requests."], "Phishing-resistant MFA and hardened reset processes reduce push fatigue and social engineering attacks.", ["mfa", "fido2", "phishing-resistant"]),
      topic("4.6 Identity and access management", "Privileged access management", "has administrators using standing domain admin privileges for routine troubleshooting.", "Use PAM with just-in-time elevation, approval workflows, and session recording.", "Store privileged credentials in a vault with rotation and access logging.", ["Give every administrator permanent domain admin rights.", "Share one emergency admin password in a spreadsheet.", "Disable session logging for privacy.", "Use local admin rights as a substitute for privilege management."], "PAM reduces standing privilege and increases accountability for administrative sessions.", ["pam", "jit", "password-vault"]),
      topic("4.6 Identity and access management", "Ephemeral credentials", "wants automation jobs to deploy cloud resources without long-lived access keys in build variables.", "Use short-lived federated or ephemeral credentials issued to the pipeline at runtime.", "Constrain the pipeline identity with least-privilege policies and audit logs.", ["Store permanent administrator keys in the CI system.", "Email keys to developers when deployments fail.", "Use the same secret for development and production.", "Disable audit logs to hide deployment noise."], "Ephemeral credentials reduce the blast radius of leaked secrets and are appropriate for automation pipelines.", ["ephemeral-credentials", "ci-cd", "cloud-iam"]),
      topic("4.7 Automation and orchestration", "SOAR containment playbook", "has analysts manually blocking confirmed phishing infrastructure after every case, causing slow and inconsistent response.", "Create a SOAR playbook that enriches indicators, opens a ticket, blocks confirmed indicators, and records approvals.", "Include guardrails so automation requires confidence thresholds and rollback steps.", ["Automate blocking of every reported URL without validation.", "Keep all response steps manual forever.", "Let each analyst write private scripts with no review.", "Disable ticketing to make automation faster."], "SOAR improves speed and consistency when playbooks include validation, approval, logging, and rollback guardrails.", ["soar", "automation", "guardrails"]),
      topic("4.8 Incident response", "Containment before eradication", "is responding to malware on several hosts and business leaders ask to wipe systems immediately.", "Contain affected systems and preserve evidence before eradication when it is safe to do so.", "Document actions taken so recovery and lessons learned are defensible.", ["Start rebuilding every host before collecting volatile data.", "Announce root cause before analysis is complete.", "Skip containment because recovery is faster.", "Delete suspicious files manually on all systems without tracking."], "IR generally moves from detection and analysis to containment, eradication, and recovery. Evidence preservation supports scoping and root cause analysis.", ["incident-response", "containment", "forensics"]),
      topic("4.8 Incident response", "Chain of custody", "needs to provide disk images from an employee laptop to legal counsel after suspected data theft.", "Maintain chain-of-custody records and create forensic images using approved tools.", "Preserve original evidence and document who handled it, when, and why.", ["Let the employee continue using the laptop until trial.", "Copy selected files to a USB drive without hashing.", "Ask the manager to inspect the laptop personally.", "Reimage the laptop before legal review."], "Digital forensics requires preservation, acquisition, hashing, and chain-of-custody documentation to support admissibility and integrity.", ["forensics", "chain-of-custody", "legal-hold"]),
      topic("4.9 Investigation data sources", "NetFlow versus packet capture", "needs to determine whether a server communicated with a suspicious host over time but does not need full payload contents initially.", "Use NetFlow or flow logs to identify source, destination, ports, timing, and volume patterns.", "Escalate to packet capture if payload-level analysis is required and legally approved.", ["Start with memory acquisition from every server.", "Use only vulnerability scan results.", "Disable flow logging to reduce storage.", "Assume firewall denies prove no communication occurred."], "Flow data is efficient for connection metadata and scoping. Packet capture is heavier and used when payload detail is needed.", ["netflow", "pcap", "investigation"]),
      topic("4.9 Investigation data sources", "Web log investigation", "is investigating suspected SQL injection against a public application.", "Review web server and application logs for suspicious parameters, error codes, and request patterns.", "Correlate WAF alerts with database and authentication logs to assess impact.", ["Review only physical access badge logs.", "Start with DNS zone transfer records.", "Ignore HTTP logs because traffic used TLS.", "Delete verbose logs to reduce storage during the attack."], "Web and application logs are primary sources for application-layer attack analysis, and correlation helps determine impact.", ["web-logs", "sql-injection", "waf"])
    ]
  },
  {
    number: "5.0",
    name: "Security Program Management and Oversight",
    weight: "20%",
    target: 100,
    topics: [
      topic("5.1 Security governance", "Policies standards and procedures", "has teams treating security guidance as optional because documents use inconsistent terminology.", "Define policies for intent, standards for mandatory requirements, and procedures for step-by-step execution.", "Map ownership and review cadence for each governance document.", ["Put all guidance in one informal chat thread.", "Use guidelines as mandatory audit requirements without approval.", "Let each team define its own policy names.", "Delete procedures because policies should be enough."], "Effective governance distinguishes policies, standards, procedures, and guidelines so teams know what is mandatory and how to comply.", ["governance", "policy", "standards"]),
      topic("5.1 Security governance", "RACI and accountability", "struggles to complete access reviews because application owners, data owners, and security analysts disagree about decision authority.", "Create a RACI or similar responsibility model that defines who is accountable for access decisions.", "Tie review evidence to named control owners and due dates.", ["Let security analysts approve all business access permanently.", "Skip access reviews when ownership is unclear.", "Make every participant equally accountable for every decision.", "Ask auditors to decide who should own each application."], "Governance requires clear roles and accountability. Access decisions usually need business or data owner accountability, with security facilitating controls.", ["raci", "accountability", "access-review"]),
      topic("5.1 Security governance", "Exception management", "needs to allow a temporary deviation from passwordless authentication for a legacy application.", "Record a time-bound exception with risk acceptance, owner approval, compensating controls, and review date.", "Track exception expiration so the legacy dependency is remediated or reapproved.", ["Ignore the deviation because the legacy system is important.", "Make the exception permanent to reduce paperwork.", "Disable passwordless authentication for all applications.", "Let users decide whether to follow the standard."], "Exceptions should be documented, owned, time-bound, and supported by compensating controls.", ["exceptions", "governance", "risk-acceptance"]),
      topic("5.2 Risk management", "Risk register usage", "has recurring security risks discussed in meetings but no consistent owner, status, or treatment decision.", "Maintain a risk register with owners, likelihood, impact, treatment plans, and review dates.", "Report risks against defined appetite and tolerance thresholds.", ["Track risks only in meeting recordings.", "Delete risks after the first mitigation task is created.", "Use one generic owner for every risk.", "Avoid impact ratings because they may concern executives."], "A risk register keeps risk decisions visible, owned, prioritized, and reviewable.", ["risk-register", "risk-management", "governance"]),
      topic("5.2 Risk management", "Quantitative risk calculation", "evaluates a control for an event with an asset value of 400000 USD, exposure factor of 25 percent, and annualized rate of occurrence of 0.2.", "Calculate SLE as 100000 USD and ALE as 20000 USD before comparing control cost.", "Use the calculation as one input alongside qualitative and compliance factors.", ["Calculate ALE as 400000 USD because asset value equals annual loss.", "Ignore ARO because exposure factor already includes frequency.", "Buy any control that costs less than the full asset value.", "Use RTO as the annualized loss expectancy."], "SLE equals asset value times exposure factor, and ALE equals SLE times ARO. Here, 400000 x 0.25 = 100000; 100000 x 0.2 = 20000.", ["ale", "sle", "quantitative-risk"]),
      topic("5.2 Risk management", "BIA recovery metrics", "must decide how quickly a claims-processing system should be restored and how much transaction data loss is tolerable.", "Use BIA-defined RTO for restoration time and RPO for acceptable data loss.", "Ensure MTD is not exceeded when selecting recovery strategies.", ["Use CVSS to define acceptable data loss.", "Set RPO equal to the number of open incidents.", "Let IT choose recovery targets without business input.", "Use password policy age as the recovery metric."], "BIA establishes business-driven recovery metrics. RTO is time to restore, RPO is tolerable data loss, and MTD is maximum tolerable downtime.", ["bia", "rto", "rpo"]),
      topic("5.2 Risk management", "Risk treatment selection", "faces high risk from an obsolete public service that is no longer needed by the business.", "Avoid the risk by retiring the public service if the business confirms it is unnecessary.", "Document the decision and verify that related DNS, firewall, and monitoring entries are cleaned up.", ["Transfer the risk by buying insurance while keeping the service exposed.", "Accept the risk informally because no one uses the service.", "Mitigate by adding a banner but leaving the vulnerable service online.", "Ignore the risk until exploitation occurs."], "If a risky activity is not needed, retiring it avoids the risk. The decision should be documented and technically verified.", ["risk-treatment", "avoidance", "decommissioning"]),
      topic("5.3 Third-party risk management", "Vendor due diligence", "is selecting a payroll provider that will process employee tax and bank data.", "Assess the vendor's security controls, compliance posture, data handling, and incident notification commitments before onboarding.", "Require evidence such as audit reports, security questionnaires, and contract terms aligned to data sensitivity.", ["Choose the lowest-cost vendor and review security after go-live.", "Assume all payroll vendors have identical controls.", "Share production data during the sales demo.", "Skip legal review because the vendor has a security webpage."], "Third-party risk assessment must happen before onboarding and should match vendor access and data sensitivity.", ["third-party-risk", "vendor-assessment", "data-protection"]),
      topic("5.3 Third-party risk management", "Contract security terms", "needs a vendor agreement that defines deliverables, security obligations, confidentiality, and service availability.", "Use appropriate documents such as SOW or work order for deliverables, NDA for confidentiality, and SLA for measurable service commitments.", "Include breach notification, audit rights, data return, and termination requirements where applicable.", ["Rely only on verbal assurances from the vendor.", "Use an NDA as the only operational service commitment.", "Avoid SLAs because they create measurable obligations.", "Let the vendor define all security requirements after signing."], "Different agreements serve different purposes. Security terms should be explicit before sensitive data or services are entrusted to a vendor.", ["contracts", "sla", "nda"]),
      topic("5.3 Third-party risk management", "Vendor monitoring", "has a critical SaaS vendor whose security posture changed after acquisition by another company.", "Reassess the vendor and increase monitoring based on material business and control changes.", "Review updated audit reports, subprocessors, data locations, and incident history.", ["Wait until contract renewal in three years.", "Assume acquisition improves security automatically.", "Stop monitoring because the vendor was approved previously.", "Move more sensitive data to the vendor without review."], "Vendor risk is not one-time. Material changes such as acquisition, new subprocessors, or control changes trigger reassessment.", ["vendor-monitoring", "third-party-risk", "due-diligence"]),
      topic("5.3 Third-party risk management", "Penetration test rules of engagement", "hires a third party to test a production application that supports customer transactions.", "Define rules of engagement, scope, testing windows, communication paths, and prohibited actions before testing.", "Obtain written authorization and emergency stop procedures.", ["Let testers choose any target at any time.", "Start testing before business owners know.", "Prohibit all logging during testing.", "Use only verbal permission from a developer."], "Penetration testing needs written authorization, defined scope, ROE, and safety procedures to avoid operational and legal issues.", ["penetration-testing", "roe", "authorization"]),
      topic("5.4 Security compliance", "Privacy compliance reporting", "must demonstrate how personal data is collected, processed, retained, and deleted under applicable privacy obligations.", "Maintain data inventories, processing records, retention schedules, and evidence of privacy control operation.", "Align breach notification and data subject request procedures to legal requirements.", ["Keep personal data indefinitely because storage is cheap.", "Store privacy decisions only in developer comments.", "Avoid documenting processing so auditors have less to review.", "Treat privacy as only an encryption problem."], "Privacy compliance requires governance over data lifecycle and evidence, not just technical encryption.", ["privacy", "compliance", "data-lifecycle"]),
      topic("5.4 Security compliance", "PCI DSS scope reduction", "wants to reduce compliance burden for payment processing systems.", "Segment cardholder data environments and use tokenization or validated payment services to reduce scope.", "Validate that segmentation controls are tested and documented.", ["Store card numbers in every analytics database.", "Share production card data with all developers.", "Disable logging in payment systems.", "Assume encryption alone removes all PCI obligations."], "Scope reduction uses segmentation, tokenization, and validated services, but controls must be tested and documented.", ["pci", "scope-reduction", "tokenization"]),
      topic("5.4 Security compliance", "Consequences of noncompliance", "is deciding whether to delay remediation of a control gap tied to regulatory reporting.", "Evaluate legal, financial, operational, and reputational consequences of noncompliance before accepting the delay.", "Obtain formal risk acceptance from the appropriate authority if delay remains necessary.", ["Let the technical team accept regulatory risk alone.", "Assume no penalty exists unless a breach occurs.", "Hide the gap from compliance reports.", "Delete evidence that shows missed control operation."], "Compliance gaps can create legal and business consequences. Risk acceptance must come from accountable leadership with accurate evidence.", ["compliance", "risk-acceptance", "reporting"]),
      topic("5.5 Audits and assessments", "Internal versus external audit", "wants independent assurance for customers but currently relies only on self-assessments by control owners.", "Use an external audit or independent assessment when third-party assurance is required.", "Continue internal assessments for readiness and continuous improvement.", ["Ask control owners to attest anonymously.", "Replace all internal monitoring with one annual external audit.", "Skip evidence collection because the auditor is independent.", "Use penetration testing as the only proof of governance."], "External audits provide independent assurance, while internal assessments support readiness and control improvement.", ["audit", "assessment", "assurance"]),
      topic("5.5 Audits and assessments", "Control evidence quality", "prepares for an audit and has screenshots without timestamps, owners, or linkage to control requirements.", "Collect evidence that is complete, dated, attributable, and mapped to specific control requirements.", "Use repeatable evidence collection where possible to reduce manual errors.", ["Submit unlabeled screenshots because they show the screen.", "Ask auditors to infer control operation from architecture diagrams only.", "Change control wording to match available evidence after the fact.", "Avoid retaining evidence to reduce discovery risk."], "Audit evidence must prove control design or operation for a defined period and be traceable to requirements.", ["audit-evidence", "controls", "compliance"]),
      topic("5.6 Security awareness", "Phishing training metrics", "runs phishing simulations but only reports click rates without measuring reporting or credential submission.", "Track reporting rate, credential submission, repeat clickers, and time to report in addition to click rate.", "Provide targeted coaching based on roles and observed behavior.", ["Punish every user who clicks once.", "Stop simulations after one successful campaign.", "Report only the number of emails sent.", "Tell users that all phishing emails are obvious."], "Awareness metrics should measure risky actions and positive behaviors, not only clicks.", ["security-awareness", "phishing", "metrics"]),
      topic("5.6 Security awareness", "Anomalous behavior reporting", "wants employees to report unusual coworker behavior and suspicious access requests without creating harassment or rumor channels.", "Provide clear reporting channels, examples, and privacy-respecting escalation procedures.", "Train staff to report observable behaviors and security concerns rather than personal judgments.", ["Ask employees to publicly accuse coworkers in team chats.", "Discourage reporting unless proof is absolute.", "Share all reports with the entire department.", "Treat every report as confirmed malicious activity."], "Awareness programs should make reporting easy, factual, and appropriately handled, while protecting privacy and due process.", ["awareness", "insider-threat", "reporting"]),
      topic("5.6 Security awareness", "Role-based training", "needs developers, executives, and help desk staff to reduce different types of security risk.", "Use role-based training tailored to job duties, such as secure coding, executive phishing resistance, and help desk identity proofing.", "Measure training outcomes with role-relevant exercises and incident trends.", ["Give everyone the same generic annual slide deck only.", "Train developers on physical badge policy instead of secure coding.", "Skip executive training because executives are too busy.", "Assume policy acknowledgment proves behavior changed."], "Role-based awareness is more effective because risks and decisions differ by function.", ["role-based-training", "awareness", "secure-coding"]),
      topic("5.6 Security awareness", "User guidance during incident", "has users receiving active phishing emails during an incident and needs to stop further credential submissions.", "Send clear, timely guidance with reporting instructions and examples of the active lure.", "Coordinate communications with incident response so user reports feed triage.", ["Send a vague warning weeks later.", "Tell users to delete all security emails.", "Ask users to investigate headers themselves.", "Forward the malicious link as a live clickable URL to everyone."], "Timely user guidance can reduce ongoing compromise and improve reporting during active campaigns.", ["incident-communications", "phishing", "awareness"])
    ]
  }
];

for (const domain of domainSpecs) {
  if (domain.topics.length * 5 !== domain.target) {
    throw new Error(`${domain.number} expected ${domain.target / 5} topics, got ${domain.topics.length}`);
  }
}

function normalizeDifficulty(value) {
  const normalized = String(value || "hard").toLowerCase().trim().replace(/[\s_]+/g, "-");
  if (["easy", "basic", "beginner", "foundational"].includes(normalized)) return "easy";
  if (["normal", "medium", "moderate", "intermediate", "standard"].includes(normalized)) return "normal";
  if (["hard", "advanced", "difficult"].includes(normalized)) return "hard";
  if (["extra-hard", "expert", "very-hard", "extreme"].includes(normalized)) return "extra-hard";
  return normalized;
}

function buildQuestions() {
  const questions = [];
  const domainDistribution = {};
  const difficultyDistribution = {};
  const domainDifficultyDistribution = {};
  let globalNumber = 1;

  for (const profile of difficultyProfiles) {
    difficultyDistribution[profile.id] = 0;
    for (const domain of domainSpecs) {
      const domainKey = `${domain.number} ${domain.name}`;
      domainDistribution[domainKey] = domainDistribution[domainKey] || 0;
      domainDifficultyDistribution[domainKey] = domainDifficultyDistribution[domainKey] || {};
      domainDifficultyDistribution[domainKey][profile.id] = 0;
      let localNumber = 1;

      for (let variant = 0; variant < 5; variant++) {
        for (let topicIndex = 0; topicIndex < domain.topics.length; topicIndex++) {
          const question = makeQuestion(domain, domain.topics[topicIndex], globalNumber, localNumber, variant, topicIndex, profile);
          questions.push(question);
          domainDistribution[domainKey]++;
          difficultyDistribution[profile.id]++;
          domainDifficultyDistribution[domainKey][profile.id]++;
          globalNumber++;
          localNumber++;
        }
      }
    }
  }

  return { questions, domainDistribution, difficultyDistribution, domainDifficultyDistribution };
}

function validateQuestions(questions) {
  const supportedDifficulties = new Set(difficultyProfiles.map((profile) => profile.id));
  const ids = new Set();
  const stems = new Set();
  const issues = [];
  const singleAnswerQuestions = [];
  let correctTiedForLongest = 0;
  let singleCorrectUniquelyLongest = 0;
  let singleCorrectUniquelyShortest = 0;
  let correctTiedForShortest = 0;
  let singleCorrectMean = 0;
  let singleDistractorMean = 0;

  for (const question of questions) {
    if (ids.has(question.id)) issues.push(`Duplicate id ${question.id}`);
    ids.add(question.id);
    if (stems.has(question.stem)) issues.push(`Duplicate stem ${question.global_id}`);
    stems.add(question.stem);
    if (!supportedDifficulties.has(normalizeDifficulty(question.difficulty))) {
      issues.push(`Unsupported difficulty ${question.difficulty} on ${question.global_id}`);
    }
    if (!question.objective || !question.topic || !question.stem || !question.explanation) {
      issues.push(`Missing required display text on ${question.global_id}`);
    }
    if (!Array.isArray(question.choices) || question.choices.length < 4) {
      issues.push(`Too few choices on ${question.global_id}`);
      continue;
    }

    const choiceIds = new Set(question.choices.map((choice) => choice.id));
    const choiceTexts = new Set(question.choices.map((choice) => choice.text));
    if (choiceIds.size !== question.choices.length) issues.push(`Duplicate choice id on ${question.global_id}`);
    if (choiceTexts.size !== question.choices.length) issues.push(`Duplicate choice text on ${question.global_id}`);
    if (!Array.isArray(question.correct_answers) || question.correct_answers.length === 0) {
      issues.push(`Missing correct_answers on ${question.global_id}`);
      continue;
    }
    for (const answer of question.correct_answers) {
      if (!choiceIds.has(answer)) issues.push(`Correct answer ${answer} missing from choices on ${question.global_id}`);
    }
    if (question.question_type === "multiple_choice" && question.correct_answers.length !== 1) {
      issues.push(`multiple_choice answer count mismatch on ${question.global_id}`);
    }
    if (question.question_type === "multiple_response" && question.correct_answers.length < 2) {
      issues.push(`multiple_response answer count mismatch on ${question.global_id}`);
    }

    const maxLength = Math.max(...question.choices.map((choice) => choice.text.length));
    const correctChoices = question.choices.filter((choice) => question.correct_answers.includes(choice.id));
    const distractorChoices = question.choices.filter((choice) => !question.correct_answers.includes(choice.id));
    if (correctChoices.some((choice) => choice.text.length === maxLength)) correctTiedForLongest++;

    if (question.correct_answers.length === 1) {
      singleAnswerQuestions.push(question);
      const correctChoice = correctChoices[0];
      const longerDistractors = distractorChoices.filter((choice) => choice.text.length > correctChoice.text.length);
      const equalDistractors = distractorChoices.filter((choice) => choice.text.length === correctChoice.text.length);
      const shorterDistractors = distractorChoices.filter((choice) => choice.text.length < correctChoice.text.length);
      if (longerDistractors.length === 0 && equalDistractors.length === 0) singleCorrectUniquelyLongest++;
      if (shorterDistractors.length === 0 && equalDistractors.length === 0) singleCorrectUniquelyShortest++;
      if (correctChoice.text.length === Math.min(...question.choices.map((choice) => choice.text.length))) {
        correctTiedForShortest++;
      }
      singleCorrectMean += correctChoice.text.length;
      singleDistractorMean += distractorChoices.reduce((sum, choice) => sum + choice.text.length, 0) / distractorChoices.length;
    }
  }

  const singleLongestRate = singleCorrectUniquelyLongest / Math.max(1, singleAnswerQuestions.length);
  const anyLongestRate = correctTiedForLongest / Math.max(1, questions.length);
  singleCorrectMean = Math.round((singleCorrectMean / Math.max(1, singleAnswerQuestions.length)) * 10) / 10;
  singleDistractorMean = Math.round((singleDistractorMean / Math.max(1, singleAnswerQuestions.length)) * 10) / 10;

  if (singleLongestRate > 0.35) {
    issues.push(`Correct answer is uniquely longest on ${(singleLongestRate * 100).toFixed(1)}% of single-answer questions`);
  }
  const singleShortestRate = singleCorrectUniquelyShortest / Math.max(1, singleAnswerQuestions.length);
  const anyShortestRate = correctTiedForShortest / Math.max(1, singleAnswerQuestions.length);
  if (singleShortestRate > 0.40) {
    issues.push(`Correct answer is uniquely shortest on ${(singleShortestRate * 100).toFixed(1)}% of single-answer questions`);
  }
  if (anyShortestRate > 0.48) {
    issues.push(`Correct answer is tied for shortest on ${(anyShortestRate * 100).toFixed(1)}% of single-answer questions`);
  }
  if (anyLongestRate > 0.45) {
    issues.push(`A correct answer is tied for longest on ${(anyLongestRate * 100).toFixed(1)}% of all questions`);
  }
  if (singleCorrectMean > singleDistractorMean * 1.08) {
    issues.push(`Correct answer mean length ${singleCorrectMean} exceeds distractor mean ${singleDistractorMean} by too much`);
  }
  if (singleCorrectMean < singleDistractorMean * 0.82) {
    issues.push(`Correct answer mean length ${singleCorrectMean} is too far below distractor mean ${singleDistractorMean}`);
  }

  if (issues.length) {
    throw new Error(`Validation failed:\n${issues.slice(0, 20).join("\n")}${issues.length > 20 ? `\n...and ${issues.length - 20} more` : ""}`);
  }

  return {
    single_answer_questions: singleAnswerQuestions.length,
    correct_uniquely_longest_single_answer: singleCorrectUniquelyLongest,
    correct_uniquely_longest_single_answer_rate: Math.round(singleLongestRate * 1000) / 10,
    correct_uniquely_shortest_single_answer: singleCorrectUniquelyShortest,
    correct_uniquely_shortest_single_answer_rate: Math.round(singleShortestRate * 1000) / 10,
    correct_tied_for_shortest_single_answer: correctTiedForShortest,
    correct_tied_for_shortest_single_answer_rate: Math.round(anyShortestRate * 1000) / 10,
    correct_tied_for_longest_all_questions: correctTiedForLongest,
    correct_tied_for_longest_all_questions_rate: Math.round(anyLongestRate * 1000) / 10,
    single_correct_mean_length: singleCorrectMean,
    single_distractor_mean_length: singleDistractorMean
  };
}

const {
  questions,
  domainDistribution,
  difficultyDistribution,
  domainDifficultyDistribution
} = buildQuestions();

const expectedTotal = 500 * difficultyProfiles.length;
if (questions.length !== expectedTotal) {
  throw new Error(`Expected ${expectedTotal} questions, got ${questions.length}`);
}

const validation = validateQuestions(questions);

const bank = {
  metadata: {
    title: "Original multi-difficulty CompTIA Security+ SY0-701 practice question bank",
    exam_code: "SY0-701",
    exam_version: "Security+ V7",
    generated_on: GENERATED_ON,
    question_count: questions.length,
    difficulty_profile: "500 questions each for easy, normal, hard, and extra-hard. Higher tiers add PBQ-style pressure, tradeoff language, and near-miss distractors.",
    creation_method: "Original questions generated from public objective alignment and current exam details; no practice-bank questions, exam dumps, or proprietary items were copied. Answer options are balanced so length is not a reliable clue.",
    validation,
    sources_used: [
      {
        title: "CompTIA Security+ certification page",
        url: "https://www.comptia.org/en-us/certifications/security/",
        used_for: "Current exam code, exam details, domain weights, and official objective summary."
      },
      {
        title: "CompTIA Performance-Based Questions overview",
        url: "https://www.comptia.org/en-gb/resources/test-policies/exam-development/performance-based-questions-explained/",
        used_for: "PBQ-style real-world scenario framing and multiple possible response paths."
      }
    ],
    schema: {
      correct_answers: "Array of choice IDs. Single-answer and multiple-response questions both use arrays.",
      source_alignment: "Objective-level alignment, not a copied source question.",
      copyright_note: "Every item is original practice content generated for study use."
    }
  },
  difficulty_distribution: difficultyDistribution,
  domain_distribution: domainDistribution,
  domain_difficulty_distribution: domainDifficultyDistribution,
  questions
};

writeFileSync(resolve(OUTPUT_FILE), `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Wrote ${questions.length} questions to ${OUTPUT_FILE}`);
