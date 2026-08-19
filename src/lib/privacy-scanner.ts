export type RiskSeverity = 'low' | 'medium' | 'high'

export type RiskCategory =
  | 'company_employer'
  | 'names_people'
  | 'specific_titles_teams'
  | 'compensation_numbers'
  | 'contact_links'
  | 'specific_dates'

export interface DetectedRisk {
  category: RiskCategory
  label: string
  matchedText: string
  suggestion: string
  severity: RiskSeverity
  index: number
}

export interface PrivacyScanResult {
  score: number // 0 to 100 (100 = completely safe/abstracted)
  status: 'safe' | 'warning' | 'danger'
  risks: DetectedRisk[]
}

const KNOWN_COMPANIES = [
  'Google', 'Alphabet', 'Apple', 'Meta', 'Facebook', 'Amazon', 'AWS', 'Microsoft', 'Netflix',
  'Stripe', 'Uber', 'Airbnb', 'ByteDance', 'TikTok', 'Coinbase', 'Salesforce', 'Oracle',
  'Cisco', 'Intel', 'Nvidia', 'Tesla', 'Twitter', 'X Corp', 'Snowflake', 'Databricks',
  'Palantir', 'Spotify', 'Figma', 'Canva', 'Notion', 'DoorDash', 'Instacart', 'Robinhood',
  'Square', 'Block', 'Snap', 'Snapchat', 'Pinterest', 'Reddit', 'Zoom', 'Atlassian', 'Twilio',
  'Shopify', 'HubSpot', 'GitLab', 'GitHub', 'OpenAI', 'Anthropic', 'DeepMind', 'Plaid',
  'Brex', 'Ramp', 'Dropbox', 'Box', 'Lyft', 'Scale AI', 'Brex', 'Checkout.com', 'Klarna',
  'Revolut', 'Monzo', 'Wise', 'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'McKinsey',
  'Bain', 'BCG', 'Deloitte', 'PwC', 'EY', 'KPMG', 'Accenture'
]

const COMPANY_SUFFIX_REGEX = /\b([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*\s+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Technologies|Systems|Solutions|Enterprises|Holdings|Capital|Ventures))\b/g
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const URL_REGEX = /https?:\/\/[^\s]+|(?:www\.)[^\s]+/gi
const LEVEL_TITLE_REGEX = /\b(?:L[3-9]|E[3-9]|IC[3-9]|M[1-8]|VP|SVP|EVP|Director|Head of|Lead|Staff|Principal)\s+(?:of\s+)?[A-Z][a-zA-Z\s]{2,20}\b/g
const COMP_REGEX = /\$\s?\d{2,3}(?:,\d{3})*(?:\s?[kK]|(?:\s?million|\s?M))?\b|\b\d{2,3}[kK]\s+(?:base|tc|total comp|bonus|rsu|equity|package)\b/gi
const MANAGER_CALLOUT_REGEX = /\b(?:my manager|my boss|our director|our VP|our CEO|my skip|my lead|my coworker|my colleague)\s+([A-Z][a-z]+)\b/gi
const SPECIFIC_DATE_REGEX = /\b(?:on\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?,?\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4})?\b/gi

export function scanPrivacy(text: string): PrivacyScanResult {
  if (!text || text.trim().length === 0) {
    return { score: 100, status: 'safe', risks: [] }
  }

  const risks: DetectedRisk[] = []

  // 1. Check known major companies
  for (const company of KNOWN_COMPANIES) {
    const regex = new RegExp(`\\b${company}\\b`, 'gi')
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      risks.push({
        category: 'company_employer',
        label: `Direct Company Name (${match[0]})`,
        matchedText: match[0],
        suggestion: 'Replace with "a large tech company" or "a tier-1 firm"',
        severity: 'high',
        index: match.index,
      })
    }
  }

  // 2. Check corporate entities with suffixes (e.g. Acme Corp)
  let suffixMatch: RegExpExecArray | null
  while ((suffixMatch = COMPANY_SUFFIX_REGEX.exec(text)) !== null) {
    if (!risks.some(r => r.matchedText.toLowerCase() === suffixMatch![1].toLowerCase())) {
      risks.push({
        category: 'company_employer',
        label: `Company Reference (${suffixMatch[1]})`,
        matchedText: suffixMatch[1],
        suggestion: 'Replace with a general industry description (e.g. "a B2B SaaS startup")',
        severity: 'high',
        index: suffixMatch.index,
      })
    }
  }

  // 3. Emails
  let emailMatch: RegExpExecArray | null
  while ((emailMatch = EMAIL_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'contact_links',
      label: `Email Address (${emailMatch[0]})`,
      matchedText: emailMatch[0],
      suggestion: 'Remove email address',
      severity: 'high',
      index: emailMatch.index,
    })
  }

  // 4. Phone numbers
  let phoneMatch: RegExpExecArray | null
  while ((phoneMatch = PHONE_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'contact_links',
      label: `Phone Number (${phoneMatch[0]})`,
      matchedText: phoneMatch[0],
      suggestion: 'Remove phone number',
      severity: 'high',
      index: phoneMatch.index,
    })
  }

  // 5. URLs
  let urlMatch: RegExpExecArray | null
  while ((urlMatch = URL_REGEX.exec(text)) !== null) {
    if (!urlMatch[0].includes('supabase.co') && !urlMatch[0].includes('post-attachments')) {
      risks.push({
        category: 'contact_links',
        label: `External URL / Profile Link`,
        matchedText: urlMatch[0],
        suggestion: 'Redact link to protect anonymity',
        severity: 'medium',
        index: urlMatch.index,
      })
    }
  }

  // 6. Specific Titles & Internal Ladder Levels
  let levelMatch: RegExpExecArray | null
  while ((levelMatch = LEVEL_TITLE_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'specific_titles_teams',
      label: `Specific Level / Title (${levelMatch[0]})`,
      matchedText: levelMatch[0],
      suggestion: 'Replace with "senior team member" or "engineering lead"',
      severity: 'medium',
      index: levelMatch.index,
    })
  }

  // 7. Exact Compensation & Numbers
  let compMatch: RegExpExecArray | null
  while ((compMatch = COMP_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'compensation_numbers',
      label: `Exact Compensation / Numbers (${compMatch[0]})`,
      matchedText: compMatch[0],
      suggestion: 'Use general ranges (e.g. "around market rate" or "mid 6-figures")',
      severity: 'low',
      index: compMatch.index,
    })
  }

  // 8. Colleague / Manager first-name callouts
  let managerMatch: RegExpExecArray | null
  while ((managerMatch = MANAGER_CALLOUT_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'names_people',
      label: `Colleague/Manager Name (${managerMatch[0]})`,
      matchedText: managerMatch[0],
      suggestion: 'Replace with "my manager" or "a colleague"',
      severity: 'high',
      index: managerMatch.index,
    })
  }

  // 9. Specific Dates & Times
  let dateMatch: RegExpExecArray | null
  while ((dateMatch = SPECIFIC_DATE_REGEX.exec(text)) !== null) {
    risks.push({
      category: 'specific_dates',
      label: `Specific Date (${dateMatch[0]})`,
      matchedText: dateMatch[0],
      suggestion: 'Use relative time (e.g. "a few weeks ago" or "recently")',
      severity: 'low',
      index: dateMatch.index,
    })
  }

  // Calculate score
  let penalty = 0
  for (const risk of risks) {
    if (risk.severity === 'high') penalty += 35
    else if (risk.severity === 'medium') penalty += 20
    else penalty += 10
  }

  const score = Math.max(0, 100 - penalty)
  const status = score >= 80 ? 'safe' : score >= 50 ? 'warning' : 'danger'

  return {
    score,
    status,
    risks,
  }
}

export function anonymizeContent(text: string): { sanitizedText: string; changesCount: number } {
  let sanitized = text
  let changesCount = 0

  // 1. Replace emails
  sanitized = sanitized.replace(EMAIL_REGEX, () => {
    changesCount++
    return '[contact email]'
  })

  // 2. Replace phone numbers
  sanitized = sanitized.replace(PHONE_REGEX, () => {
    changesCount++
    return '[phone number]'
  })

  // 3. Replace manager / colleague named callouts
  sanitized = sanitized.replace(MANAGER_CALLOUT_REGEX, (match, name) => {
    changesCount++
    return match.replace(new RegExp(`\\s+${name}$`), '')
  })

  // 4. Replace company names
  for (const company of KNOWN_COMPANIES) {
    const regex = new RegExp(`\\b${company}\\b`, 'gi')
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, 'a tech firm')
      changesCount++
    }
  }

  // 5. Replace company suffixes
  sanitized = sanitized.replace(COMPANY_SUFFIX_REGEX, () => {
    changesCount++
    return 'a company'
  })

  // 6. Replace specific internal levels like L6 / E5
  sanitized = sanitized.replace(/\b(?:L[3-9]|E[3-9]|IC[3-9])\b/g, () => {
    changesCount++
    return 'senior role'
  })

  return {
    sanitizedText: sanitized,
    changesCount,
  }
}
