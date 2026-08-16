import ResetPasswordClient from './reset-password-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Reset Password - Humanverse',
  description: 'Set a new password for your Humanverse account.',
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
