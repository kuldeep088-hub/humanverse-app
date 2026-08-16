import ForgotPasswordClient from './forgot-password-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Forgot Password - Humanverse',
  description: 'Reset your Humanverse password.',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
