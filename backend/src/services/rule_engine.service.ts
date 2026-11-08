/**
 * JobGuard AI - Deterministic Rule & Heuristic Analysis Engine
 * Module: backend.src.services.rule_engine.service
 * Purpose: Evaluates deterministic recruitment fraud warning signs and produces
 *          the rule evidence score (H) for the consensus risk fusion formula.
 * Taxonomy: 18 high-precision heuristic indicators covering advance fees, credential
 *           harvesting, psychological urgency, communication redirection, and financial vectors.
 */

import { MatchedRule, ExtractedEntities } from '../types/index.js';

interface RuleDefinition {
  id: string;
  category: string;
  phrase: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
  pattern: RegExp;
  explanation: string;
}

const FRAUD_RULES: RuleDefinition[] = [
  // ----------------------------------------------------------------------------
  // 1. Advance-Fee & Upfront Cost Demands (Severity: CRITICAL, Weight: 0.35 - 0.40)
  // ----------------------------------------------------------------------------
  {
    id: 'rule_reg_fee',
    category: 'Advance Fee',
    phrase: 'Registration / Enrollment Fee',
    severity: 'CRITICAL',
    weight: 0.40,
    pattern: /\b(?:registration|enrollment|onboarding|induction|admittance|form|application)\s+fees?\b/i,
    explanation: 'Legitimate employers never charge candidates a registration or onboarding fee to apply or receive an offer.',
  },
  {
    id: 'rule_sec_deposit',
    category: 'Advance Fee',
    phrase: 'Refundable Security Deposit',
    severity: 'CRITICAL',
    weight: 0.35,
    pattern: /\b(?:security|refundable|mandatory|caution)\s+deposits?\b/i,
    explanation: 'Demanding upfront security deposits for equipment, ID cards, or interview scheduling is a classic advance-fee fraud vector.',
  },
  {
    id: 'rule_proc_fee',
    category: 'Advance Fee',
    phrase: 'Processing / Background Check Fee',
    severity: 'CRITICAL',
    weight: 0.35,
    pattern: /\b(?:processing|background\s*check|verification|file\s+charge|screening|documentation)\s+fees?\b/i,
    explanation: 'Legitimate organizations cover their own administrative hiring costs and do not bill candidates for background checks.',
  },
  {
    id: 'rule_training_kit',
    category: 'Advance Fee',
    phrase: 'Training Kit / Software License Charge',
    severity: 'HIGH',
    weight: 0.30,
    pattern: /\b(?:training|kit|module|certification|software\s+license|courier\s*charge)\s+(?:charges?|fees?|cost|payment)\b/i,
    explanation: 'Mandatory payments for training modules or work kits indicate commercial marketing or fraudulent solicitation.',
  },
  {
    id: 'rule_check_cashing',
    category: 'Financial Channel',
    phrase: 'Check Deposit / Equipment Wire Refund',
    severity: 'CRITICAL',
    weight: 0.45,
    pattern: /\b(?:send\s+you\s+a\s+check|deposit\s+the\s+check|cashier'?s\s+check|wire\s+back|send\s+remaining\s+balance|buy\s+supplies\s+from\s+our\s+vendor)\b/i,
    explanation: 'Fake check scams send fraudulent checks and instruct candidates to wire funds to a fake "equipment vendor".',
  },

  // ----------------------------------------------------------------------------
  // 2. Suspicious Payment Channels & Credential Harvesting
  // ----------------------------------------------------------------------------
  {
    id: 'rule_upi_wallet',
    category: 'Financial Channel',
    phrase: 'UPI / Personal Wallet Transfer',
    severity: 'CRITICAL',
    weight: 0.40,
    pattern: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|cash\s*app|venmo|zelle|qr\s*code\s*scan)\b.*?\b(?:pay|send|transfer|deposit)\b|\b(?:pay|send|transfer)\b.*?\b(?:upi|gpay|google\s*pay|phonepe|paytm|cash\s*app|venmo|zelle)\b/i,
    explanation: 'Soliciting fee transfers via personal peer-to-peer payment apps bypasses corporate financial controls.',
  },
  {
    id: 'rule_crypto',
    category: 'Financial Channel',
    phrase: 'Cryptocurrency / USDT Remittance',
    severity: 'CRITICAL',
    weight: 0.40,
    pattern: /\b(?:usdt|bitcoin|crypto|cryptocurrency|trc20|erc20|binance|trust\s*wallet)\b/i,
    explanation: 'Standard corporate hiring never conducts candidate transactions through irreversible cryptocurrency transfers.',
  },
  {
    id: 'rule_credentials_harvest',
    category: 'Identity Compromise',
    phrase: 'Banking Password / OTP Solicitations',
    severity: 'CRITICAL',
    weight: 0.45,
    pattern: /\b(?:otp|one\s*time\s*password|cvv|atm\s*pin|net\s*banking\s*password|bank\s*login|two\s*factor\s*code)\b/i,
    explanation: 'Employers never require your banking passwords, card PINs, or SMS OTPs during application.',
  },

  // ----------------------------------------------------------------------------
  // 3. Off-Platform Redirection & Unofficial Communications
  // ----------------------------------------------------------------------------
  {
    id: 'rule_telegram_redirect',
    category: 'Communication Redirection',
    phrase: 'Telegram Recruitment Redirection',
    severity: 'HIGH',
    weight: 0.25,
    pattern: /\b(?:t\.me\/|telegram(?:\s*channel|\s*group|\s*handle|\s*id|\s*username)?|@[\w_]+bot)\b/i,
    explanation: 'Redirecting applicants to private Telegram channels avoids formal audit trails and facilitates task scams.',
  },
  {
    id: 'rule_whatsapp_redirect',
    category: 'Communication Redirection',
    phrase: 'Direct WhatsApp Interview / Task Request',
    severity: 'MEDIUM',
    weight: 0.20,
    pattern: /\b(?:wa\.me\/|whatsapp(?:\s*group|\s*chat|\s*number)?)\b/i,
    explanation: 'Conducting entire hiring processes solely over personal WhatsApp messages is a prevalent scam marker.',
  },
  {
    id: 'rule_free_webmail',
    category: 'Recruiter Domain',
    phrase: 'Recruitment Contact via Free Webmail',
    severity: 'HIGH',
    weight: 0.25,
    pattern: /\b[a-zA-Z0-9._%+-]+@(?:gmail|yahoo|hotmail|outlook|yopmail|protonmail|aol)\.com\b/i,
    explanation: 'Enterprise organizations contact candidates from corporate domains, not personal free webmail services.',
  },

  // ----------------------------------------------------------------------------
  // 4. Unrealistic Guarantees & Manufactured Urgency
  // ----------------------------------------------------------------------------
  {
    id: 'rule_instant_hire',
    category: 'Unrealistic Guarantee',
    phrase: 'Immediate Offer Without Technical Evaluation',
    severity: 'HIGH',
    weight: 0.25,
    pattern: /\b(?:instant|immediate|direct|same\s*day)\s+(?:job|selection|appointment|offer\s*letter)\s*(?:without|no)\s*(?:interview|skills?|exam|test|experience)?\b/i,
    explanation: 'Guarantees of employment without technical evaluation or interview are typical markers of deceptive recruiting.',
  },
  {
    id: 'rule_unrealistic_daily',
    category: 'Unrealistic Guarantee',
    phrase: 'Exorbitant Daily Earning Claims',
    severity: 'HIGH',
    weight: 0.25,
    pattern: /\b(?:earn|income|payout)\s*(?:of|up\s+to|between)?\s*(?:rs\.?|inr|\$)?\s*[0-9,]{3,}\s*(?:daily|per\s+day|per\s+hour)\b/i,
    explanation: 'Promises of excessive daily or hourly compensation for basic, low-skill tasks represent predatory lure patterns.',
  },
  {
    id: 'rule_urgency_pressure',
    category: 'Psychological Coercion',
    phrase: 'High-Pressure Urgency Tactics',
    severity: 'MEDIUM',
    weight: 0.20,
    pattern: /\b(?:hurry\s+up|limited\s+slots?\s+left|offer\s+expires\s+in\s+[0-9]+\s*(?:hours?|mins?)|act\s+now|immediate\s+transfer\s+required)\b/i,
    explanation: 'Artificial deadlines and high-pressure psychological urgency are engineered to induce hasty financial compliance.',
  },
  {
    id: 'rule_no_interview_needed',
    category: 'Unrealistic Guarantee',
    phrase: 'No Experience / 100% Guaranteed Placement',
    severity: 'MEDIUM',
    weight: 0.15,
    pattern: /\b(?:100%\s+placement\s+guaranteed|no\s+skills?\s+required|anyone\s+can\s+do|work\s+10\s+mins\s+daily)\b/i,
    explanation: 'Unconditional placement guarantees for zero-skill roles are typical of task fraud or review farm schemes.',
  },
  {
    id: 'rule_package_forwarding',
    category: 'Reshipping Scam',
    phrase: 'Package Forwarding / Mystery Shopping Task',
    severity: 'CRITICAL',
    weight: 0.35,
    pattern: /\b(?:package\s+inspector|re-?shipping\s+agent|package\s+forwarding|mystery\s+shopper\s+task)\b/i,
    explanation: 'Reshipping and package forwarding schemes use candidates as unwitting "money mules" for stolen goods.',
  },
];

export class RuleEngineService {
  /**
   * Checks if a pattern match is preceded by negation or scam warning context
   * within the preceding ~60 characters on the same clause.
   */
  private static isNegatedMatch(text: string, matchIndex: number): boolean {
    const windowStart = Math.max(0, matchIndex - 60);
    const precedingText = text.substring(windowStart, matchIndex).toLowerCase();

    // Check for negation words in the preceding window
    // e.g. "no", "not", "never", "without", "zero", "free of", "neither", "nor", "don't", "doesn't", "caution", "beware", "warn"
    const negationRegex = /\b(?:no|not|never|without|zero|free\s+of|neither|nor|don'?t|doesn'?t|didn'?t|beware(?:\s+of)?|warn(?:ing)?|caution|avoid|scam|fraud(?:ulent)?)\b(?:\s+[\w',]+){0,6}\s*$/i;

    return negationRegex.test(precedingText);
  }

  /**
   * Evaluates normalized job description and metadata against deterministic threat signatures.
   */
  public static evaluate(text: string, applicationUrl?: string | null): {
    score: number;
    matchedRules: MatchedRule[];
    extractedEntities: ExtractedEntities;
    hasCriticalAdvanceFee: boolean;
  } {
    const matchedRules: MatchedRule[] = [];
    let cumulativeWeight = 0.0;
    let hasCriticalAdvanceFee = false;

    // Check each deterministic rule against text with negation awareness
    for (const rule of FRAUD_RULES) {
      const globalRegex = new RegExp(
        rule.pattern.source,
        rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g'
      );
      let match: RegExpExecArray | null;
      let hasUnnegatedMatch = false;

      while ((match = globalRegex.exec(text)) !== null) {
        if (!this.isNegatedMatch(text, match.index)) {
          hasUnnegatedMatch = true;
          break;
        }
      }

      if (hasUnnegatedMatch) {
        matchedRules.push({
          id: rule.id,
          category: rule.category,
          phrase: rule.phrase,
          severity: rule.severity,
          weight: rule.weight,
          explanation: rule.explanation,
        });
        cumulativeWeight += rule.weight;
        if (rule.severity === 'CRITICAL' && rule.category === 'Advance Fee') {
          hasCriticalAdvanceFee = true;
        }
      }
    }

    // Extract key entities for dossier auditing
    const extractedEntities: ExtractedEntities = {
      companyNames: this.extractCompanyNames(text, applicationUrl),
      jobTitles: this.extractJobTitles(text),
      locations: this.extractLocations(text),
      jobIds: this.extractJobIds(text),
      salaryClaims: this.extractSalaries(text),
      contactEmails: this.extractEmails(text),
      contactPhones: this.extractPhones(text),
      messagingHandles: this.extractMessagingHandles(text),
      urls: this.extractUrls(text, applicationUrl),
      suspiciousKeywords: matchedRules.map((r) => r.phrase),
    };

    // Calibrate rule evidence score H between 0.00 and 1.00
    const normalizedScore = Math.min(1.0, Math.round(cumulativeWeight * 100) / 100);

    return {
      score: normalizedScore,
      matchedRules,
      extractedEntities,
      hasCriticalAdvanceFee,
    };
  }

  public static extractCompanyNames(text: string, applicationUrl?: string | null): string[] {
    const names: string[] = [];

    const addName = (raw: string | undefined | null) => {
      if (!raw) return;
      const clean = raw.trim().replace(/^['"“]+|['"”]+$/g, '');
      if (
        clean.length >= 2 &&
        clean.length <= 50 &&
        !/^the$/i.test(clean) &&
        !/^(?:job|career|position|company|employer|location|requirements?|benefits?|responsibilities|description|overview|about\s+us|summary|unspecified\s+employer)$/i.test(clean) &&
        !/^(?:apply\s+at|apply\s+with|visit|click|send|email|contact)\b/i.test(clean) &&
        !/(?:engineer|developer|manager|analyst|specialist|designer|administrator|intern|internship)$/i.test(clean) &&
        !names.some((n) => n.toLowerCase() === clean.toLowerCase())
      ) {
        names.push(clean);
      }
    };

    // 1. Explicit enterprise name matchers (high priority)
    const knownEnterprises: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\b(?:tata\s+consultancy\s+services|tcs)\b/i, name: 'Tata Consultancy Services (TCS)' },
      { pattern: /\binfosys(?:\s+limited|\s+technologies)?\b/i, name: 'Infosys' },
      { pattern: /\bwipro(?:\s+limited|\s+technologies)?\b/i, name: 'Wipro' },
      { pattern: /\bcognizant(?:\s+technology\s+solutions)?\b/i, name: 'Cognizant' },
      { pattern: /\baccenture\b/i, name: 'Accenture' },
      { pattern: /\btech\s+mahindra\b/i, name: 'Tech Mahindra' },
      { pattern: /\bhcl(?:\s+technologies)?\b/i, name: 'HCL Technologies' },
      { pattern: /\bcapgemini\b/i, name: 'Capgemini' },
      { pattern: /\bibm(?:\s+corporation)?\b/i, name: 'IBM' },
      { pattern: /\bmicrosoft(?:\s+corporation)?\b/i, name: 'Microsoft Corporation' },
      { pattern: /\bgoogle(?:\s+llc)?\b/i, name: 'Google LLC' },
      { pattern: /\bamazon(?:\s+web\s+services|\s+development\s+centre)?\b/i, name: 'Amazon' },
      { pattern: /\bapple(?:\s+inc\.?)?\b/i, name: 'Apple Inc.' },
      { pattern: /\bmeta\s+platforms\b|\bmeta\b/i, name: 'Meta' },
      { pattern: /\boracle(?:\s+corporation)?\b/i, name: 'Oracle' },
      { pattern: /\bcisco(?:\s+systems)?\b/i, name: 'Cisco Systems' },
      { pattern: /\bintel(?:\s+corporation)?\b/i, name: 'Intel Corporation' },
      { pattern: /\bdeloitte\b/i, name: 'Deloitte' },
      { pattern: /\bpwc\b|\bpricewaterhousecoopers\b/i, name: 'PwC' },
      { pattern: /\bernst\s*&\s*young\b|\bey\b/i, name: 'EY (Ernst & Young)' },
      { pattern: /\bkpmg\b/i, name: 'KPMG' },
      { pattern: /\bnorthstar\s+digital\b/i, name: 'Northstar Digital' },
      { pattern: /\blarsen\s*&\s*toubro\b|\bl&t\b/i, name: 'Larsen & Toubro' },
      { pattern: /\breliance\s+industries\b|\bjio\b/i, name: 'Reliance Industries / Jio' },
    ];

    for (const ent of knownEnterprises) {
      if (ent.pattern.test(text)) {
        addName(ent.name);
      }
    }

    // 2. Structured field patterns
    const patterns = [
      /(?:company|organization|employer|client|hiring\s+organization)[:\s]+([^\n\r,;]{2,45})/gi,
      /(?:about|at|join|welcome\s+to)\s+([A-Z][A-Za-z0-9&.,\s-]{2,40}?(?:\s+(?:Inc\.?|Corp\.?|LLC|Ltd\.?|Corporation|Technologies|Solutions|Group|Services|Digital|Software|Labs|Systems)))\b/g,
      /\b([A-Z][A-Za-z0-9&.,\s-]{2,35})\s+is\s+(?:hiring|looking\s+for|seeking)\b/g,
    ];
    for (const pat of patterns) {
      let match;
      while ((match = pat.exec(text)) !== null) {
        addName(match[1]);
      }
    }

    // 3. Inspect header / first 3 non-empty lines of text
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (
        line.length >= 3 &&
        line.length <= 40 &&
        !/[:?]/.test(line) &&
        !/\b(?:job|description|requirements|duties|overview|summary|responsibilities|qualifications|engineer|developer|manager|analyst|specialist|designer|intern|internship)\b/i.test(line)
      ) {
        if (/^[A-Z0-9\s&.-]+$/.test(line)) {
          const titleCased = line
            .toLowerCase()
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          addName(titleCased);
        } else if (/^[A-Z][A-Za-z0-9\s&.-]+$/.test(line)) {
          addName(line);
        }
      }
    }

    // 4. Infer from recruiter email domain if present
    const emails = text.match(/[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    if (emails) {
      for (const email of emails) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (
          domain &&
          !/(?:gmail|yahoo|hotmail|outlook|yopmail|protonmail|aol|icloud|mail)\.com$/i.test(domain)
        ) {
          const base = domain.split('.')[0];
          if (base && base.length >= 3) {
            const matchingKnown = knownEnterprises.find((e) => e.pattern.test(base));
            if (matchingKnown) {
              addName(matchingKnown.name);
            } else {
              const formatted = base.charAt(0).toUpperCase() + base.slice(1);
              addName(formatted);
            }
          }
        }
      }
    }

    // 5. Infer from application URL if provided
    if (applicationUrl) {
      try {
        const parsed = new URL(applicationUrl.startsWith('http') ? applicationUrl : `https://${applicationUrl}`);
        const host = parsed.hostname.toLowerCase();
        for (const ent of knownEnterprises) {
          if (ent.pattern.test(host)) {
            addName(ent.name);
          }
        }
      } catch {}
    }

    return names.slice(0, 3);
  }

  public static extractJobTitles(text: string): string[] {
    const titles: string[] = [];

    const addTitle = (raw: string | undefined | null) => {
      if (!raw) return;
      const clean = raw.trim().replace(/^['"“]+|['"”]+$/g, '');
      if (
        clean.length >= 3 &&
        clean.length <= 50 &&
        !titles.some((t) => t.toLowerCase() === clean.toLowerCase())
      ) {
        titles.push(clean);
      }
    };

    // 1. Structured patterns
    const pat = /(?:position|role|job\s*title|title|opening|looking\s+for\s+an?|hiring\s+an?)[:\s]+([^\n\r,;]{3,45}?)(?:\s+(?:at|for|with)\s+|$|\n)/gi;
    let match;
    while ((match = pat.exec(text)) !== null) {
      addTitle(match[1]);
    }

    // 2. Common role regex
    const commonRolesPat = /\b(?:Senior\s+|Junior\s+|Lead\s+|Associate\s+|Principal\s+)?(?:Software\s+Engineer|Frontend\s+Developer|Backend\s+Developer|Full\s*Stack\s+Developer|Web\s+Developer|Data\s+Analyst|Data\s+Scientist|Product\s+Manager|QA\s+Engineer|DevOps\s+Engineer|UI\/UX\s+Designer|Business\s+Analyst|System\s+Administrator|Cloud\s+Architect|Security\s+Analyst|Machine\s+Learning\s+Engineer)\b/gi;
    const roleMatches = text.match(commonRolesPat);
    if (roleMatches) {
      for (const rm of roleMatches) {
        addTitle(rm);
      }
    }

    // 3. Inspect top 3 lines
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (
        line.length >= 5 &&
        line.length <= 50 &&
        /(?:developer|engineer|manager|analyst|specialist|consultant|associate|lead|officer|designer|administrator)/i.test(line) &&
        !/[:?]/.test(line)
      ) {
        addTitle(line);
      }
    }

    return titles.slice(0, 3);
  }

  private static extractLocations(text: string): string[] {
    const locs: string[] = [];
    const pat = /(?:location|work arrangement|based in|office|site)[:\s]+([^\n\r,;]{2,35})/gi;
    let match;
    while ((match = pat.exec(text)) !== null) {
      const val = match[1]?.trim();
      if (val && !locs.includes(val)) {
        locs.push(val);
      }
    }
    // Also detect common workplace modes if present
    const workModes = text.match(/\b(?:remote|hybrid|work\s+from\s+home|on-?site|wfh)\b/gi);
    if (workModes) {
      for (const m of workModes) {
        const formatted = m.trim().toLowerCase();
        if (!locs.some((l) => l.toLowerCase() === formatted)) {
          locs.push(formatted.charAt(0).toUpperCase() + formatted.slice(1));
        }
      }
    }
    return locs.slice(0, 5);
  }

  private static extractJobIds(text: string): string[] {
    const ids: string[] = [];
    const pat = /(?:req(?:uisition)?\s*(?:id|#|no\.?)?|job\s*(?:id|#|no\.?)|reference\s*(?:code|no\.?|#)?)[:\s#]*([A-Za-z0-9_-]{3,20})/gi;
    let match;
    while ((match = pat.exec(text)) !== null) {
      const val = match[1]?.trim();
      if (val && !ids.includes(val)) {
        ids.push(val);
      }
    }
    return ids.slice(0, 5);
  }

  private static extractSalaries(text: string): string[] {
    const matches = text.match(/(?:rs\.?|inr|\$|usd|eur|£)\s*[0-9,]+(?:\s*-\s*(?:rs\.?|inr|\$|usd|eur|£)?\s*[0-9,]+)?(?:\s*(?:k|lac|lakh|pm|per\s*month|pa|per\s*annum|daily|per\s*day|\/\s*year|\/\s*yr|yr|year|annually|hourly|\/\s*hr|lpa))?/gi);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 5) : [];
  }

  private static extractEmails(text: string): string[] {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim().toLowerCase()))).slice(0, 5) : [];
  }

  private static extractPhones(text: string): string[] {
    const matches = text.match(/(?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 5) : [];
  }

  private static extractMessagingHandles(text: string): string[] {
    const handles: string[] = [];
    const tgMatches = text.match(/(?:t\.me\/|@)[a-zA-Z0-9_]{4,}/g);
    if (tgMatches) handles.push(...tgMatches);
    return Array.from(new Set(handles)).slice(0, 5);
  }

  private static extractUrls(text: string, applicationUrl?: string | null): string[] {
    const urls: string[] = [];
    if (applicationUrl) urls.push(applicationUrl.trim());
    const textUrls = text.match(/https?:\/\/[^\s"'<>]+/gi);
    if (textUrls) urls.push(...textUrls);
    return Array.from(new Set(urls)).slice(0, 5);
  }
}
