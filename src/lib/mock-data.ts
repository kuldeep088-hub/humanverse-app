/* eslint-disable @typescript-eslint/no-explicit-any */

// In-memory mock database powering the app whenever no real Supabase session exists.
// Seeded with the demo content from humanverse.fun. On the client the database is
// persisted to localStorage so posts survive navigation within the session.
// This entire layer is replaced by real Supabase once auth is added.

export type Row = Record<string, any>

const STORAGE_KEY = 'humanverse-mock-db'

export const MOCK_USER_ID = 'dev-user-1'
export const MOCK_USER_EMAIL = 'dev@humanverse.fun'

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

interface SeedDatabase {
  profiles: Row[]
  pseudonyms: Row[]
  threads: Row[]
  circles: Row[]
  circle_members: Row[]
  posts: Row[]
  replies: Row[]
  reactions: Row[]
  notifications: Row[]
  reports: Row[]
  drafts: Row[]
  polls: Row[]
  poll_options: Row[]
  poll_votes: Row[]
  conversations: Row[]
  conversation_participants: Row[]
  direct_messages: Row[]
  career_milestones: Row[]
}

function createSeed(): SeedDatabase {
  const profiles: Row[] = [
    {
      id: MOCK_USER_ID,
      display_name: 'Humanverse',
      professional_context: 'A professional network for the parts of working life that don\'t fit on a professional profile.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces&q=80',
      open_to_help: true,
      help_topics: ['Resume Review', 'Career Pivots', 'Layoff Recovery'],
      created_at: hoursAgo(24 * 60),
      updated_at: hoursAgo(24 * 60),
    },
    {
      id: 'u-priya',
      display_name: 'Priya R.',
      professional_context: 'Product designer',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces&q=80',
      open_to_help: true,
      help_topics: ['Design Portfolio', 'Job Hunting Strategy', 'Offer Negotiation'],
      created_at: hoursAgo(24 * 90),
      updated_at: hoursAgo(24 * 90),
    },
    {
      id: 'u-daejung',
      display_name: 'Dae-jung P.',
      professional_context: 'Data scientist',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces&q=80',
      open_to_help: false,
      help_topics: [],
      created_at: hoursAgo(24 * 200),
      updated_at: hoursAgo(24 * 200),
    },
    {
      id: 'u-marcus',
      display_name: 'Marcus B.',
      professional_context: 'Former founder',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces&q=80',
      open_to_help: true,
      help_topics: ['Founder Burnout', 'Early Stage Lessons', 'Pivot Advice'],
      created_at: hoursAgo(24 * 400),
      updated_at: hoursAgo(24 * 400),
    },
    {
      id: 'u-senior',
      display_name: 'Senior engineer',
      professional_context: 'Senior engineer',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&h=256&fit=crop&crop=faces&q=80',
      open_to_help: false,
      help_topics: [],
      created_at: hoursAgo(24 * 300),
      updated_at: hoursAgo(24 * 300),
    },
  ]

  const pseudonyms: Row[] = [
    { id: 'pseudo-anon', user_id: 'u-senior', display_name: 'Anonymous', avatar_url: null, created_at: hoursAgo(24 * 300) },
  ]

  const threads: Row[] = [
    { id: 't-rejectedagain', slug: 'rejectedagain', name: '#RejectedAgain', description: 'The rejection emails, collected.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-shippedit', slug: 'shippedit', name: '#ShippedIt', description: 'The work itself, for once.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-laidoff', slug: 'laidoff', name: '#LaidOff', description: 'Day one to day ninety.', post_count: 1, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(2) },
    { id: 't-moneytalk', slug: 'moneytalk', name: '#MoneyTalk', description: 'Real numbers. What people earn, and what they turned down.', post_count: 1, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(4) },
    { id: 't-careerpivot', slug: 'careerpivot', name: '#CareerPivot', description: 'Starting over at 34. Or 51.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-smallwins', slug: 'smallwins', name: '#SmallWins', description: 'The ones nobody clapped for.', post_count: 1, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(6) },
    { id: 't-gotitwrong', slug: 'gotitwrong', name: '#GotItWrong', description: 'Mistakes, with the cause left in.', post_count: 1, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24) },
    { id: 't-firstjob', slug: 'firstjob', name: '#FirstJob', description: 'Nobody warned me about this part.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-unpopularopinion', slug: 'unpopularopinion', name: '#UnpopularOpinion', description: 'What your industry pretends not to think.', post_count: 1, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(9) },
    { id: 't-badmanager', slug: 'badmanager', name: '#BadManager', description: 'What it does to a good team.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-burnedout', slug: 'burnedout', name: '#BurnedOut', description: 'Before it got bad, and after.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
    { id: 't-impostersyndrome', slug: 'impostersyndrome', name: '#ImposterSyndrome', description: 'Still waiting to be found out.', post_count: 0, created_at: hoursAgo(24 * 400), updated_at: hoursAgo(24 * 400) },
  ]

  const circles: Row[] = [
    { id: 'c-design', name: 'Design team', owner_id: MOCK_USER_ID, created_at: hoursAgo(24 * 20), updated_at: hoursAgo(24 * 20) },
    { id: 'c-quiet', name: 'The quiet room', owner_id: 'u-daejung', created_at: hoursAgo(24 * 10), updated_at: hoursAgo(24 * 10) },
  ]

  const circle_members: Row[] = [
    { id: 'cm-1', circle_id: 'c-design', user_id: MOCK_USER_ID, joined_at: hoursAgo(24 * 20) },
    { id: 'cm-2', circle_id: 'c-design', user_id: 'u-priya', joined_at: hoursAgo(24 * 18) },
    { id: 'cm-3', circle_id: 'c-quiet', user_id: 'u-daejung', joined_at: hoursAgo(24 * 10) },
    { id: 'cm-4', circle_id: 'c-quiet', user_id: MOCK_USER_ID, joined_at: hoursAgo(24 * 9) },
  ]

  const posts: Row[] = [
    {
      id: 'p-liadoff-priya', author_id: 'u-priya', pseudonym_id: null, thread_id: 't-laidoff', circle_id: null,
      content: 'Ninety-four applications. Seven months. I stopped counting the rejections around forty because it was making me worse, not better. Signed an offer this morning for less money than I made in 2022, and I am genuinely fine with that.',
      visibility: 'public', help_type: 'offering_help', created_at: hoursAgo(2), updated_at: hoursAgo(2),
    },
    {
      id: 'p-poll-moneytalk', author_id: 'u-marcus', pseudonym_id: null, thread_id: 't-moneytalk', circle_id: null,
      content: 'Let\'s talk real numbers candidly. When your company last restructured or offered a severance package, how many months of pay did you receive? #MoneyTalk',
      visibility: 'public', help_type: null, created_at: hoursAgo(4), updated_at: hoursAgo(4),
    },
    {
      id: 'p-smallwins-daejung', author_id: 'u-daejung', pseudonym_id: null, thread_id: 't-smallwins', circle_id: 'c-quiet',
      content: 'Third attempt at the same certification. Passed. It took me fourteen months longer than the people I started with and I have stopped caring about that part.',
      visibility: 'circle', help_type: null, created_at: hoursAgo(6), updated_at: hoursAgo(6),
    },
    {
      id: 'p-unpopular-anon', author_id: 'u-senior', pseudonym_id: 'pseudo-anon', thread_id: 't-unpopularopinion', circle_id: null,
      content: 'We have shipped nothing in fourteen months and everyone above me knows it. I cannot say that under my own name, in this industry, at this point in my career.',
      visibility: 'pseudonymous', help_type: null, created_at: hoursAgo(9), updated_at: hoursAgo(9),
    },
    {
      id: 'p-gotitwrong-marcus', author_id: 'u-marcus', pseudonym_id: null, thread_id: 't-gotitwrong', circle_id: null,
      content: 'Full post-mortem, real numbers. We raised $2.1M, burned $1.87M, and the thing that killed us was not the market. It was that I refused to fire a friend for eleven months.',
      visibility: 'public', help_type: 'seeking_advice', created_at: hoursAgo(24), updated_at: hoursAgo(24),
    },
  ]

  const polls: Row[] = [
    {
      id: 'poll-1',
      post_id: 'p-poll-moneytalk',
      question: 'How many months of severance / runway were you offered during tech layoffs?',
      created_at: hoursAgo(4),
      expires_at: null,
    },
  ]

  const poll_options: Row[] = [
    { id: 'opt-1', poll_id: 'poll-1', text: '< 1 month (or none)', vote_count: 8, created_at: hoursAgo(4) },
    { id: 'opt-2', poll_id: 'poll-1', text: '2 - 3 months', vote_count: 24, created_at: hoursAgo(4) },
    { id: 'opt-3', poll_id: 'poll-1', text: '4 - 6 months', vote_count: 14, created_at: hoursAgo(4) },
    { id: 'opt-4', poll_id: 'poll-1', text: '6+ months (Golden parachute)', vote_count: 3, created_at: hoursAgo(4) },
  ]

  const poll_votes: Row[] = [
    { id: 'pv-1', poll_id: 'poll-1', option_id: 'opt-2', user_id: 'u-priya', created_at: hoursAgo(3) },
  ]

  const replies: Row[] = []

  const reactions: Row[] = [
    { id: 'r-1', user_id: 'u-daejung', post_id: 'p-liadoff-priya', reply_id: null, type: 'been_there', created_at: hoursAgo(1) },
    { id: 'r-2', user_id: 'u-marcus', post_id: 'p-liadoff-priya', reply_id: null, type: 'respect', created_at: hoursAgo(1) },
    { id: 'r-3', user_id: 'u-priya', post_id: 'p-smallwins-daejung', reply_id: null, type: 'respect', created_at: hoursAgo(5) },
    { id: 'r-4', user_id: 'u-senior', post_id: 'p-smallwins-daejung', reply_id: null, type: 'been_there', created_at: hoursAgo(5) },
    { id: 'r-5', user_id: 'u-daejung', post_id: 'p-unpopular-anon', reply_id: null, type: 'been_there', created_at: hoursAgo(8) },
    { id: 'r-6', user_id: 'u-priya', post_id: 'p-unpopular-anon', reply_id: null, type: 'oof', created_at: hoursAgo(8) },
    { id: 'r-7', user_id: 'u-daejung', post_id: 'p-gotitwrong-marcus', reply_id: null, type: 'oof', created_at: hoursAgo(20) },
    { id: 'r-8', user_id: 'u-senior', post_id: 'p-gotitwrong-marcus', reply_id: null, type: 'respect', created_at: hoursAgo(20) },
  ]

  const notifications: Row[] = [
    {
      id: 'n-1', user_id: MOCK_USER_ID, type: 'circle_join', title: 'Priya R. joined your circle',
      message: 'Priya R. joined Design team.', reference_id: 'c-design', reference_type: 'circle', read: false,
      created_at: hoursAgo(3),
    },
    {
      id: 'n-2', user_id: MOCK_USER_ID, type: 'circle_invite', title: 'You were added to The quiet room',
      message: 'Dae-jung P. added you to The quiet room.', reference_id: 'c-quiet', reference_type: 'circle', read: false,
      created_at: hoursAgo(8),
    },
  ]

  return {
    profiles,
    pseudonyms,
    threads,
    circles,
    circle_members,
    posts,
    replies,
    reactions,
    notifications,
    reports: [],
    drafts: [],
    polls,
    poll_options,
    poll_votes,
    conversations: [],
    conversation_participants: [],
    direct_messages: [],
    career_milestones: [],
  }
}

let db: SeedDatabase | null = null

function loadDb(): SeedDatabase {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SeedDatabase
        if (parsed && Array.isArray(parsed.posts)) {
          // ensure new tables exist
          if (!parsed.polls) parsed.polls = []
          if (!parsed.poll_options) parsed.poll_options = []
          if (!parsed.poll_votes) parsed.poll_votes = []
          if (!parsed.conversations) parsed.conversations = []
          if (!parsed.conversation_participants) parsed.conversation_participants = []
          if (!parsed.direct_messages) parsed.direct_messages = []
          if (!parsed.career_milestones) parsed.career_milestones = []
          return parsed
        }
      }
    } catch {
      // corrupted storage; fall through to seed
    }
  }
  return createSeed()
}

function getDb(): SeedDatabase {
  if (!db) db = loadDb()
  return db
}

function saveDb() {
  if (typeof window === 'undefined' || !db) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // storage quota or availability; in-memory state still works this session
  }
}

function resetDb() {
  db = createSeed()
  saveDb()
}

// --- Filter parsing (subset of the PostgREST syntax the app uses) ---

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function evalOp(row: Row, col: string, op: string, rawValue: string): boolean {
  const value = row[col]
  switch (op) {
    case 'eq':
      return value === rawValue
    case 'neq':
      return value !== rawValue
    case 'ilike': {
      const pattern = new RegExp(`^${escapeRegex(rawValue).replace(/%/g, '.*')}$`, 'i')
      return pattern.test(String(value ?? ''))
    }
    case 'in': {
      if (rawValue.startsWith('select ')) {
        const list = evalSubquery(rawValue)
        return list.includes(value)
      }
      return rawValue.split(',').includes(value)
    }
    case 'is':
      return value === null || value === rawValue
    default:
      return false
  }
}

function evalSubquery(expr: string): any[] {
  // Handles: select <col> from <table> where <col> = '<value>'
  const match = expr.match(/select\s+([a-z_]+)\s+from\s+([a-z_]+)(?:\s+where\s+([a-z_]+)\s*=\s*'([^']*)')?/i)
  if (!match) return []
  const [, col, table, whereCol, whereValue] = match
  let rows = getDb()[table as keyof SeedDatabase] as Row[]
  if (whereCol) {
    rows = rows.filter(r => r[whereCol] === whereValue)
  }
  return rows.map(r => r[col])
}

function splitTopLevel(input: string, sep = ','): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === sep && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts
}

function evalClause(clause: string, row: Row): boolean {
  const firstDot = clause.indexOf('.')
  const secondDot = clause.indexOf('.', firstDot + 1)
  if (firstDot === -1 || secondDot === -1) return false
  const col = clause.slice(0, firstDot)
  const op = clause.slice(firstDot + 1, secondDot)
  let value = clause.slice(secondDot + 1)
  if (value.startsWith('(') && value.endsWith(')')) value = value.slice(1, -1)
  return evalOp(row, col, op, value)
}

function parseOr(expr: string): (row: Row) => boolean {
  const parts = splitTopLevel(expr)
  return (row: Row) => {
    return parts.some(part => {
      if (part.startsWith('and(') && part.endsWith(')')) {
        return splitTopLevel(part.slice(4, -1)).every(clause => evalClause(clause, row))
      }
      if (part.startsWith('or(') && part.endsWith(')')) {
        return splitTopLevel(part.slice(3, -1)).some(clause => evalClause(clause, row))
      }
      return evalClause(part, row)
    })
  }
}

// --- Select parsing (embedded relations + aggregates) ---

interface RelationSpec {
  alias: string
  table: string
  parentCol: string
  childCol: string
  cols: string[]
  aggregate: 'count' | 'single' | 'list'
}

interface SelectSpec {
  allColumns: boolean
  columns: string[]
  relations: RelationSpec[]
}

function parseSelect(expr: string | undefined, parentTable: string): SelectSpec {
  const spec: SelectSpec = { allColumns: false, columns: [], relations: [] }
  const expression = expr?.trim()
  if (!expression) {
    spec.allColumns = true
    return spec
  }
  for (const part of splitTopLevel(expression)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const aliasMatch = trimmed.match(/^([a-z_]+):([a-z_]+)(?:!([a-z_]+))?\(([^)]*)\)$/)
    if (aliasMatch) {
      const [, alias, table, fk, colsStr] = aliasMatch
      const parentCol = fk
        ? fk.replace(/_fkey$/, '').replace(new RegExp(`^${parentTable}_`), '')
        : `${table.replace(/s$/, '')}_id`
      spec.relations.push({
        alias,
        table,
        parentCol,
        childCol: 'id',
        cols: colsStr.split(',').map(c => c.trim()).filter(Boolean),
        aggregate: listContainsString(colsStr, 'count') ? 'count' : 'single',
      })
      continue
    }
    const childMatch = trimmed.match(/^([a-z_]+)\(([^)]*)\)$/)
    if (childMatch) {
      const [, table, colsStr] = childMatch
      spec.relations.push({
        alias: table,
        table,
        parentCol: 'id',
        childCol: `${parentTable.replace(/s$/, '')}_id`,
        cols: colsStr.split(',').map(c => c.trim()).filter(Boolean),
        aggregate: listContainsString(colsStr, 'count') ? 'count' : 'list',
      })
      continue
    }
    if (trimmed === '*') {
      spec.allColumns = true
    } else {
      spec.columns.push(trimmed)
    }
  }
  return spec
}

function listContainsString(list: string, needle: string) {
  return list.split(',').some(c => c.trim() === needle)
}

function projectRow(row: Row, spec: SelectSpec): Row {
  const result: Row = {}
  if (spec.allColumns) {
    Object.assign(result, row)
  }
  for (const col of spec.columns) {
    result[col] = row[col]
  }
  for (const rel of spec.relations) {
    const tableRows = getDb()[rel.table as keyof SeedDatabase] as Row[]
    if (rel.aggregate === 'count') {
      result[rel.alias] = [{ count: tableRows.filter(child =>
        child[rel.childCol] === row[rel.parentCol] || child[rel.parentCol] === row[rel.childCol]
      ).length }]
      continue
    }
    if (rel.aggregate === 'list') {
      result[rel.alias] = tableRows
        .filter(child => child[rel.parentCol] === row[rel.childCol] || child[rel.childCol] === row[rel.parentCol])
        .map(child => pick(child, rel.cols))
      continue
    }
    // single object relation (author, pseudonym, thread, circle)
    const child = tableRows.find(c => c[rel.childCol] === row[rel.parentCol])
    result[rel.alias] = child ? pick(child, rel.cols) : null
  }
  return result
}

function pick(row: Row, cols: string[]): Row {
  const out: Row = {}
  if (cols.includes('*')) return { ...row }
  for (const col of cols) {
    if (col in row) out[col] = row[col]
  }
  return out
}

// --- Query builder ---

type MockResult = { data: Row[] | Row | null; error: { message: string } | null }

class MockQuery {
  private table: keyof SeedDatabase
  private selectExpr = '*'
  private filters: ((row: Row) => boolean)[] = []
  private sortCol: string | null = null
  private sortAscending = true
  private limitN: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private values: Row | Row[] = {}
  private upsertKey: string | null = null

  constructor(table: string) {
    this.table = table as keyof SeedDatabase
  }

  select(expr?: string) {
    this.selectExpr = expr || '*'
    return this
  }

  eq(col: string, value: unknown) {
    this.filters.push(row => row[col] === value)
    return this
  }

  ilike(col: string, pattern: string) {
    const re = new RegExp(`^${escapeRegex(pattern).replace(/%/g, '.*')}$`, 'i')
    this.filters.push(row => re.test(String(row[col] ?? '')))
    return this
  }

  or(expr: string) {
    this.filters.push(parseOr(expr))
    return this
  }

  match(values: Row) {
    for (const [col, value] of Object.entries(values)) {
      this.eq(col, value)
    }
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col
    this.sortAscending = opts?.ascending !== false
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  single() {
    return this.executeSingle()
  }

  insert(values: Row | Row[]) {
    this.mode = 'insert'
    this.values = values
    return this
  }

  upsert(values: Row, key?: string) {
    this.mode = 'upsert'
    this.values = values
    this.upsertKey = key || null
    return this
  }

  update(values: Row) {
    this.mode = 'update'
    this.values = values
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
  ): Promise<TResult1 | TResult2> {
    const result = this.execute()
    const settled: unknown = onfulfilled ? onfulfilled(result) : result
    return Promise.resolve(settled) as unknown as Promise<TResult1 | TResult2>
  }

  private filteredRows(): Row[] {
    let rows = getDb()[this.table].slice()
    for (const filter of this.filters) {
      rows = rows.filter(filter)
    }
    return rows
  }

  private sortRows(rows: Row[]) {
    if (!this.sortCol) return rows
    const col = this.sortCol
    return rows.sort((a, b) => {
      const av = a[col]
      const bv = b[col]
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return this.sortAscending ? cmp : -cmp
    })
  }

  private project(rows: Row[]): Row[] {
    const spec = parseSelect(this.selectExpr, String(this.table))
    return rows.map(row => projectRow(row, spec))
  }

  private execute(): MockResult {
    const tableName = String(this.table)
    switch (this.mode) {
      case 'select': {
        let rows = this.filteredRows()
        rows = this.sortRows(rows)
        if (this.limitN !== null) rows = rows.slice(0, this.limitN)
        return { data: this.project(rows), error: null }
      }
      case 'insert': {
        const inserted = this.applyInsert()
        return { data: this.selectExpr ? this.project(inserted) : inserted, error: null }
      }
      case 'upsert': {
        const inserted = this.applyUpsert()
        return { data: this.selectExpr ? this.project(inserted) : inserted, error: null }
      }
      case 'update': {
        const rows = this.filteredRows()
        const now = new Date().toISOString()
        for (const row of rows) {
          Object.assign(row, this.values, { updated_at: now })
        }
        saveDb()
        return { data: this.selectExpr ? this.project(rows) : rows, error: null }
      }
      case 'delete': {
        const rows = this.filteredRows()
        const table = getDb()[tableName as keyof SeedDatabase] as Row[]
        for (const row of rows) {
          const index = table.findIndex(r => r.id === row.id)
          if (index !== -1) table.splice(index, 1)
        }
        saveDb()
        return { data: null, error: null }
      }
      default:
        return { data: null, error: { message: `Unknown mode: ${this.mode}` } }
    }
  }

  private executeSingle(): Promise<MockResult> {
    let rows: Row[]
    if (this.mode === 'insert') {
      rows = this.applyInsert()
    } else if (this.mode === 'upsert') {
      rows = this.applyUpsert()
    } else if (this.mode === 'update') {
      rows = this.filteredRows()
      const now = new Date().toISOString()
      for (const row of rows) {
        Object.assign(row, this.values, { updated_at: now })
      }
      saveDb()
    } else {
      rows = this.filteredRows()
      if (this.limitN !== null) rows = rows.slice(0, this.limitN)
    }
    const projected = this.selectExpr ? this.project(rows) : rows
    const first = projected[0]
    if (!first) {
      return Promise.resolve({ data: null, error: { message: 'No rows found' } })
    }
    return Promise.resolve({ data: first, error: null })
  }

  private applyInsert(): Row[] {
    const table = getDb()[this.table] as Row[]
    const now = new Date().toISOString()
    const list = Array.isArray(this.values) ? this.values : [this.values]
    const inserted: Row[] = []
    for (const raw of list) {
      const row: Row = {
        id: raw.id || makeId(String(this.table).replace(/_/g, '-')),
        created_at: now,
        updated_at: now,
        ...raw,
      }
      if (this.table === 'posts' && !row.author_id) {
        row.author_id = MOCK_USER_ID
      }
      if (this.table === 'replies' && !row.author_id) {
        row.author_id = MOCK_USER_ID
      }
      if (this.table === 'replies' && row.post_id) {
        const post = (getDb().posts as Row[]).find(p => p.id === row.post_id)
        if (post && post.author_id !== row.author_id && !row.pseudonym_id) {
          const author = (getDb().profiles as Row[]).find(p => p.id === row.author_id)
          ;(getDb().notifications as Row[]).push({
            id: makeId('n'),
            user_id: post.author_id,
            type: 'reply',
            title: `${author?.display_name || 'Someone'} replied to your post`,
            message: `"${String(row.content).slice(0, 140)}${String(row.content).length > 140 ? '…' : ''}"`,
            reference_id: post.id,
            reference_type: 'post',
            read: false,
            created_at: now,
          })
        }
      }
      if (this.table === 'reactions' && row.post_id && !row.reply_id) {
        const post = (getDb().posts as Row[]).find(p => p.id === row.post_id)
        if (post && post.author_id !== row.user_id) {
          const reactor = (getDb().profiles as Row[]).find(p => p.id === row.user_id)
          ;(getDb().notifications as Row[]).push({
            id: makeId('n'),
            user_id: post.author_id,
            type: 'reply',
            title: `${reactor?.display_name || 'Someone'} reacted to your post`,
            message: `Reacted with ${row.type.replace(/_/g, ' ')}`,
            reference_id: post.id,
            reference_type: 'post',
            read: false,
            created_at: now,
          })
        }
      }
      if (this.table === 'posts' && row.thread_id) {
        const thread = (getDb().threads as Row[]).find(t => t.id === row.thread_id)
        if (thread) thread.post_count = (thread.post_count || 0) + 1
      }
      if (this.table === 'reactions') {
        // enforce UNIQUE(user_id, post_id, type) / UNIQUE(user_id, reply_id, type)
        for (let i = table.length - 1; i >= 0; i--) {
          const existing = table[i]
          if (existing.user_id === row.user_id && existing.type === row.type &&
            existing.post_id === row.post_id && existing.reply_id === row.reply_id) {
            table.splice(i, 1)
          }
        }
      }
      table.push(row)
      inserted.push(row)
    }
    saveDb()
    return inserted
  }

  private applyUpsert(): Row[] {
    const values = this.values as Row
    const table = getDb()[this.table] as Row[]
    const now = new Date().toISOString()
    const key = this.upsertKey ||
      (this.table === 'drafts' ? 'user_id' :
        this.table === 'profiles' ? 'id' :
          this.table === 'pseudonyms' ? 'user_id' : 'id')
    const existing = table.find(row =>
      Object.entries(values).some(([col]) => col === key && row[key] === values[key])
    )
    if (existing) {
      Object.assign(existing, { ...values, updated_at: now })
      return [existing]
    }
    return this.applyInsert()
  }
}

// --- Public mock client ---

export function createMockClient() {
  return {
    isMock: true,
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: MOCK_USER_ID, email: MOCK_USER_EMAIL } },
        error: null,
      }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signInWithOtp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      exchangeCodeForSession: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      updateUser: () => Promise.resolve({ data: { user: { id: MOCK_USER_ID, email: MOCK_USER_EMAIL } }, error: null }),
    },
    from(table: string) {
      return new MockQuery(table)
    },
    channel(name: string) {
      const channelObj = {
        name,
        on(_type: string, _filter: Record<string, any>, _callback: (payload: any) => void) {
          void _type
          void _filter
          void _callback
          return channelObj
        },
        subscribe(callback?: (status: string) => void) {
          if (callback) setTimeout(() => callback('SUBSCRIBED'), 10)
          return channelObj
        },
        unsubscribe() {
          return Promise.resolve('ok')
        },
      }
      return channelObj
    },
    removeChannel(_channel: any) {
      void _channel
      return Promise.resolve('ok')
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null, data: { path: `avatars/${MOCK_USER_ID}/avatar.png` } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}

export function isMockDb() {
  getDb()
  return true
}

export function __mockReset() {
  resetDb()
}