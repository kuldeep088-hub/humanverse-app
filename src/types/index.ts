export type Visibility = 'public' | 'circle' | 'pseudonymous'

export type ReactionType = 'been_there' | 'oof' | 'respect' | 'needed_this'

export interface Profile {
  id: string
  display_name: string
  professional_context: string | null
  avatar_url: string | null
  banner_url?: string | null
  bio?: string | null
  open_to_help?: boolean | null
  help_topics?: string[] | null
  created_at: string
  updated_at: string
}

export interface ProfileMinimal {
  id: string
  display_name: string
  professional_context: string | null
  avatar_url: string | null
  banner_url?: string | null
  open_to_help?: boolean | null
  help_topics?: string[] | null
}

export interface Pseudonym {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  created_at?: string
}

export interface Thread {
  id: string
  slug: string
  name: string
  description: string | null
  post_count: number
  created_at: string
  updated_at: string
}

export interface ThreadMinimal {
  id: string
  slug: string
  name: string
  description?: string | null
  post_count?: number
  created_at?: string
  updated_at?: string
}

export interface Circle {
  id: string
  name: string
  owner_id: string
  passcode?: string | null
  announcement?: string | null
  created_at: string
  updated_at: string
}

export interface CircleMinimal {
  id: string
  name: string
  owner_id?: string
  passcode?: string | null
  announcement?: string | null
  created_at?: string
  updated_at?: string
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  joined_at: string
}

export interface PollOption {
  id: string
  poll_id?: string
  text: string
  vote_count: number
}

export interface Poll {
  id: string
  post_id: string
  question: string
  options: PollOption[]
  total_votes: number
  user_voted_option_id?: string | null
  expires_at?: string | null
  created_at: string
}

export interface PollVote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  created_at: string
}

export type HelpType = 'seeking_advice' | 'offering_help' | 'resume_review' | 'mock_interview' | 'layoff_support'

export interface Post {
  id: string
  author_id: string
  pseudonym_id: string | null
  thread_id: string | null
  circle_id: string | null
  content: string
  visibility: Visibility
  help_type?: HelpType | null
  poll?: Poll | null
  created_at: string
  updated_at: string
  author?: ProfileMinimal | null
  pseudonym?: Pseudonym | null
  thread?: ThreadMinimal | null
  circle?: CircleMinimal | null
  reaction_counts?: Record<ReactionType, number>
  user_reaction?: ReactionType | null
  reply_count?: number
}

export interface Reply {
  id: string
  post_id: string
  author_id: string
  pseudonym_id: string | null
  parent_reply_id: string | null
  content: string
  created_at: string
  updated_at: string
  author?: ProfileMinimal | null
  pseudonym?: Pseudonym | null
  reaction_counts?: Record<ReactionType, number>
  user_reaction?: ReactionType | null
  replies?: Reply[]
}

export interface Reaction {
  id: string
  user_id: string
  post_id: string | null
  reply_id: string | null
  type: ReactionType
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'reply' | 'thread_reply' | 'circle_invite' | 'circle_join' | 'moderation' | 'security'
  title: string
  message: string
  reference_id: string | null
  reference_type: 'post' | 'reply' | 'thread' | 'circle' | null
  read: boolean
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string | null
  post_id: string | null
  reply_id: string | null
  reason: string
  details: string | null
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface ModerationAction {
  id: string
  admin_id: string
  target_user_id: string | null
  post_id: string | null
  reply_id: string | null
  action: 'remove_content' | 'restore_content' | 'suspend_user' | 'warn_user'
  reason: string
  created_at: string
}

export interface Draft {
  id: string
  user_id: string
  content: string
  thread_id: string | null
  visibility: Visibility
  circle_id: string | null
  pseudonym_id: string | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  pseudonym_id: string | null
  last_read_at: string | null
  profile?: ProfileMinimal | null
  pseudonym?: Pseudonym | null
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  pseudonym_id: string | null
  content: string
  created_at: string
  sender?: ProfileMinimal | null
  pseudonym?: Pseudonym | null
}

export interface Conversation {
  id: string
  created_at: string
  updated_at: string
  participants: ConversationParticipant[]
  last_message?: DirectMessage | null
  unread_count?: number
}

export interface CareerMilestone {
  id: string
  user_id: string
  year_or_period: string
  title: string
  role_or_venture: string
  type: 'pivot' | 'win' | 'failure' | 'lesson' | 'role'
  story: string
  key_lesson?: string | null
  created_at: string
}