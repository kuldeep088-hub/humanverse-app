// Humanverse seed script — creates demo users + content in a real Supabase project.
//
// Usage:
//   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings → API).
//   2. Run:  node supabase/seed.mjs
//
// Requires the schema from supabase-schema.sql to be applied first.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

const users = [
  { email: 'priya@humanverse.fun', password: 'humanverse-demo', display_name: 'Priya R.', professional_context: 'Product designer' },
  { email: 'daejung@humanverse.fun', password: 'humanverse-demo', display_name: 'Dae-jung P.', professional_context: 'Data scientist' },
  { email: 'marcus@humanverse.fun', password: 'humanverse-demo', display_name: 'Marcus B.', professional_context: 'Former founder' },
  { email: 'senior@humanverse.fun', password: 'humanverse-demo', display_name: 'Senior engineer', professional_context: 'Senior engineer' },
]

const threads = [
  { slug: 'rejectedagain', name: '#RejectedAgain', description: 'The rejection emails, collected.' },
  { slug: 'shippedit', name: '#ShippedIt', description: 'The work itself, for once.' },
  { slug: 'laidoff', name: '#LaidOff', description: 'Day one to day ninety.' },
  { slug: 'moneytalk', name: '#MoneyTalk', description: 'Real numbers. What people earn, and what they turned down.' },
  { slug: 'careerpivot', name: '#CareerPivot', description: 'Starting over at 34. Or 51.' },
  { slug: 'smallwins', name: '#SmallWins', description: 'The ones nobody clapped for.' },
  { slug: 'gotitwrong', name: '#GotItWrong', description: 'Mistakes, with the cause left in.' },
  { slug: 'firstjob', name: '#FirstJob', description: 'Nobody warned me about this part.' },
  { slug: 'unpopularopinion', name: '#UnpopularOpinion', description: 'What your industry pretends not to think.' },
  { slug: 'badmanager', name: '#BadManager', description: 'What it does to a good team.' },
  { slug: 'burnedout', name: '#BurnedOut', description: 'Before it got bad, and after.' },
  { slug: 'impostersyndrome', name: '#ImposterSyndrome', description: 'Still waiting to be found out.' },
]

const posts = [
  {
    thread: 'laidoff', authorIndex: 0,
    content: 'Ninety-four applications. Seven months. I stopped counting the rejections around forty because it was making me worse, not better. Signed an offer this morning for less money than I made in 2022, and I am genuinely fine with that.',
    visibility: 'public', hours: 2,
  },
  {
    thread: 'smallwins', authorIndex: 1,
    content: 'Third attempt at the same certification. Passed. It took me fourteen months longer than the people I started with and I have stopped caring about that part.',
    visibility: 'public', hours: 6,
  },
  {
    thread: 'unpopularopinion', authorIndex: 3,
    content: 'We have shipped nothing in fourteen months and everyone above me knows it. I cannot say that under my own name, in this industry, at this point in my career.',
    visibility: 'pseudonymous', hours: 9,
  },
  {
    thread: 'gotitwrong', authorIndex: 2,
    content: 'Full post-mortem, real numbers. We raised $2.1M, burned $1.87M, and the thing that killed us was not the market. It was that I refused to fire a friend for eleven months.',
    visibility: 'public', hours: 24,
  },
]

const reactionsByType = ['been_there', 'oof', 'respect', 'needed_this']

async function main() {
  const userIds = {}
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`)
    userIds[i] = data.user.id
    await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: u.display_name,
      professional_context: u.professional_context,
    })
    console.log(`created ${u.email} (${u.display_name})`)
  }

  const threadIds = {}
  for (const t of threads) {
    const { data, error } = await supabase.from('threads').insert(t).select('id').single()
    if (error) throw new Error(`thread ${t.slug}: ${error.message}`)
    threadIds[t.slug] = data.id
  }
  console.log(`created ${threads.length} threads`)

  const { data: pseudo, error: pseudoError } = await supabase.from('pseudonyms').insert({
    user_id: userIds[3],
    display_name: 'Anonymous',
  }).select('id').single()
  if (pseudoError) throw new Error(`pseudonym: ${pseudoError.message}`)

  const postIds = []
  for (const p of posts) {
    const { data, error } = await supabase.from('posts').insert({
      author_id: userIds[p.authorIndex],
      pseudonym_id: p.visibility === 'pseudonymous' ? pseudo.id : null,
      thread_id: threadIds[p.thread],
      content: p.content,
      visibility: p.visibility,
      created_at: hoursAgo(p.hours),
    }).select('id').single()
    if (error) throw new Error(`post: ${error.message}`)
    postIds.push(data.id)
  }
  console.log(`created ${posts.length} posts`)

  // Reactions: every other user reacts to each post with a different type
  for (let i = 0; i < postIds.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (j === posts[i].authorIndex) continue
      const { error } = await supabase.from('reactions').insert({
        user_id: userIds[j],
        post_id: postIds[i],
        type: reactionsByType[(i + j) % reactionsByType.length],
      })
      if (error) throw new Error(`reaction: ${error.message}`)
    }
  }
  console.log('created reactions')

  // A couple of replies for depth
  const { data: reply1, error: r1e } = await supabase.from('replies').insert({
    post_id: postIds[0],
    author_id: userIds[2],
    content: 'The "less money than 2022" part is the part everyone will quietly understand. Congratulations.',
  }).select('id').single()
  if (r1e) throw new Error(`reply: ${r1e.message}`)

  await supabase.from('replies').insert({
    post_id: postIds[0],
    author_id: userIds[1],
    content: 'Seven months is a long time to keep going. Good for you.',
  })
  await supabase.from('reactions').insert({
    user_id: userIds[0],
    reply_id: reply1.id,
    type: 'respect',
  })
  console.log('created replies')

  console.log('\nDone. Sign in with any demo account: priya@ / daejung@ / marcus@ / senior@humanverse.fun (password: humanverse-demo)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})