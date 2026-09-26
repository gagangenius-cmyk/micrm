'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Globe, LoaderCircle, Lock, LockKeyhole, ShieldCheck, User, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getDefaultAdminPathForUser } from '@/lib/roleAccess'
import { isCompleteVerificationCode, normalizeVerificationCode } from '@/lib/mfaCodeInput'
import { OrbitScene } from './OrbitScene'

interface LoginFormData {
  username: string
  password: string
}

interface LoginResponse {
  message: string
  mfaRequired?: boolean
  user?: {
    id: number
    name: string
    email: string
    cemail: string
    role: number
    branch: number
    region: number
    type: string
    roleName?: string
    photo: string
    wfh: number
    permissions?: string[]
    mustChangePassword?: boolean
  }
}

const PILLARS: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: 'Role-based access' },
  { icon: ShieldCheck, label: 'Protected client records' },
  { icon: Globe, label: 'Multi-country programs' },
]

// Field outline: #8A96B0 is 3.2:1 on white (WCAG 1.4.11 asks for 3:1). Focus swaps it for a gold
// border + halo and an error for a red one, so state never relies on a subtle colour shift alone.
const FIELD_BASE =
  'h-12 w-full rounded-xl border bg-white pl-11 text-[15px] text-[#131A2D] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#6F7A92] read-only:bg-[#F1F3F8] read-only:text-[#6F7A92]'
const FIELD_IDLE = 'border-[#8A96B0] hover:border-[#5B678A] focus:border-[#BE9349] focus:ring-[3px] focus:ring-[#BE9349]/25'
const FIELD_INVALID = 'border-[#C8302B] focus:border-[#C8302B] focus:ring-[3px] focus:ring-[#C8302B]/25'

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  id: string
  label: string
  icon: LucideIcon
  invalid?: boolean
  trailing?: React.ReactNode
  inputClassName?: string
}

function TextField({ id, label, icon: Icon, invalid = false, trailing, inputClassName = '', ...input }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#131A2D]">
        {label}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden="true"
          className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors ${
            invalid ? 'text-[#C8302B]' : 'text-[#6F7A92] group-focus-within:text-[#A47A33]'
          }`}
        />
        <input
          id={id}
          aria-invalid={invalid || undefined}
          className={`${FIELD_BASE} ${invalid ? FIELD_INVALID : FIELD_IDLE} ${trailing ? 'pr-12' : 'pr-4'} ${inputClassName}`}
          {...input}
        />
        {trailing}
      </div>
    </div>
  )
}

function SubmitButton({ loading, idle, busy, disabled = false }: { loading: boolean; idle: string; busy: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="mi-shimmer group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#EECA7D]/30 bg-[linear-gradient(135deg,#14264F_0%,#0F1D3D_100%)] text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(7,14,34,0.3),0_14px_26px_-14px_rgba(15,29,61,0.85)] transition duration-150 hover:border-[#EECA7D]/60 hover:shadow-[0_1px_2px_rgba(7,14,34,0.3),0_18px_30px_-14px_rgba(15,29,61,0.95)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#BE9349]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
    >
      {loading ? (
        <>
          <LoaderCircle className="h-5 w-5 animate-spin text-[#EECA7D] motion-reduce:animate-none" aria-hidden="true" />
          {busy}
        </>
      ) : (
        <>
          {idle}
          <ArrowRight className="h-[18px] w-[18px] text-[#EECA7D] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </>
      )}
    </button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const reduceMotion = Boolean(useReducedMotion())
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Two-step login: once /api/auth/login reports mfaRequired, the form
  // switches to asking for the authenticator code instead of navigating —
  // the real session cookie isn't set until /api/auth/verify-mfa succeeds.
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const enterSession = (user: NonNullable<LoginResponse['user']>) => {
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email || user.cemail,
      role: user.role === 1 ? 'admin' : String(user.role),
      type: user.type,
      roleName: user.roleName,
      branch: user.branch ? String(user.branch) : undefined,
      avatar: user.photo || undefined,
      permissions: user.permissions || (user.role === 1 ? ['all'] : []),
      mustChangePassword: Boolean(user.mustChangePassword),
    }

    // Keep AuthContext and localStorage in sync before entering protected routes.
    login(sessionUser, 'cookie-session')

    // Redirect to the dashboard that matches the user's role
    router.replace(getDefaultAdminPathForUser(sessionUser))
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data: LoginResponse = await response.json()

      if (response.ok && data.mfaRequired) {
        setMfaStep(true)
      } else if (response.ok && data.user) {
        enterSession(data.user)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCompleteVerificationCode(mfaCode)) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: mfaCode }),
      })

      const data: LoginResponse = await response.json()

      if (response.ok && data.user) {
        enterSession(data.user)
      } else {
        setError(data.message || 'Invalid code')
      }
    } catch (error) {
      console.error('MFA verification error:', error)
      setError('An error occurred while verifying your code')
    } finally {
      setLoading(false)
    }
  }

  const backToSignIn = () => {
    setMfaStep(false)
    setMfaCode('')
    setError('')
  }

  // Content blocks rise in one after another; none of it moves for reduced-motion users.
  const rise = (index: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: index * 0.07, ease: 'easeOut' as const },
  })

  const errorAlert = error ? (
    <motion.div
      role="alert"
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-[#F2B8B0] bg-[#FDECEA] px-4 py-3 text-sm text-[#A32521]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span id="login-error">{error}</span>
    </motion.div>
  ) : null

  return (
    <main className="min-h-dvh bg-[#FBFAF7] text-[#131A2D] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section
        className="relative flex min-h-dvh flex-col overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(520px 380px at 0% 100%, rgba(238,202,125,0.20), transparent 70%), radial-gradient(460px 340px at 100% 0%, rgba(20,38,79,0.06), transparent 70%)',
        }}
      >
        {/* Phone: a short scene banner stands in for the stage panel */}
        <div className="mi-login-panel relative h-36 shrink-0 overflow-hidden rounded-b-[2rem] lg:hidden">
          <OrbitScene compact busy={loading} />
        </div>

        <div className="relative flex flex-1 flex-col px-6 pb-8 pt-8 sm:px-12 lg:px-14 lg:pt-12 xl:px-20">
          <header>
            <Image src="/logo.png" alt="Migrantly.ae - Your world, unlocked." width={1600} height={1066} priority className="-mb-5 -ml-3 -mt-6 h-32 w-auto sm:-mb-6 sm:-mt-7 sm:h-40" />
          </header>

          <div className="flex flex-1 items-center py-8">
            <div className="mx-auto w-full max-w-[26rem]">
              <motion.div key={mfaStep ? 'mfa-heading' : 'signin-heading'} {...rise(0)} className="mb-7">
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#BE9349]/[0.14] px-3 py-1 text-xs font-semibold text-[#7A5A22]">
                  {mfaStep ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
                  {mfaStep ? 'Two-step verification' : 'Staff portal'}
                </span>
                <h1 className="font-display text-[2.5rem] font-semibold leading-[1.08] text-[#0F1D3D]">
                  {mfaStep ? 'Enter your code' : 'Welcome back'}
                </h1>
                <p className="mt-3 text-balance leading-relaxed text-[#4D566B]">
                  {mfaStep
                    ? 'Open your authenticator app and enter the 6-digit code. Lost your phone? Use one of your backup codes instead.'
                    : 'Sign in to continue to the Migrantly CRM.'}
                </p>
              </motion.div>

              <div className="relative rounded-2xl border border-[#E1E6EF] bg-white p-6 shadow-[0_24px_44px_-28px_rgba(15,29,61,0.45)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,#BE9349,transparent)] sm:p-7">
                {mfaStep ? (
                  <form onSubmit={handleVerifyMfa} className="space-y-5" noValidate>
                    <motion.div key="mfa-field" {...rise(1)}>
                      <TextField
                        id="mfaCode"
                        name="mfaCode"
                        label="Verification code"
                        icon={ShieldCheck}
                        invalid={Boolean(error)}
                        inputClassName="font-mono text-lg tracking-[0.18em] placeholder:tracking-[0.18em]"
                        type="text"
                        inputMode="text"
                        autoFocus
                        autoComplete="one-time-code"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={11}
                        required
                        readOnly={loading}
                        value={mfaCode}
                        onChange={(e) => {
                          setMfaCode(normalizeVerificationCode(e.target.value))
                          if (error) setError('')
                        }}
                        placeholder="123456"
                        aria-describedby={error ? 'login-error' : 'mfa-hint'}
                      />
                      <p id="mfa-hint" className="mt-2 text-xs text-[#4D566B]">
                        Backup codes look like ABCDE-12345 and can be used once.
                      </p>
                    </motion.div>

                    <div aria-live="assertive">{errorAlert}</div>

                    <motion.div key="mfa-submit" {...rise(2)}>
                      <SubmitButton loading={loading} idle="Verify" busy="Verifying..." disabled={!isCompleteVerificationCode(mfaCode)} />
                    </motion.div>

                    <motion.div key="mfa-back" {...rise(3)} className="text-center">
                      <button
                        type="button"
                        onClick={backToSignIn}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-[#14264F] transition-colors hover:text-[#A47A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BE9349]/60"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to sign in
                      </button>
                    </motion.div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <motion.div key="username" {...rise(1)}>
                      <TextField
                        id="username"
                        name="username"
                        label="Login ID"
                        icon={User}
                        invalid={Boolean(error)}
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        readOnly={loading}
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter your login ID"
                        aria-describedby={error ? 'login-error' : undefined}
                      />
                    </motion.div>

                    <motion.div key="password" {...rise(2)}>
                      <TextField
                        id="password"
                        name="password"
                        label="Password"
                        icon={Lock}
                        invalid={Boolean(error)}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        readOnly={loading}
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                        onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                        onBlur={() => setCapsLock(false)}
                        placeholder="Enter your password"
                        aria-describedby={error ? 'login-error' : undefined}
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#6F7A92] transition-colors hover:text-[#14264F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BE9349]/60"
                          >
                            {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                          </button>
                        }
                      />
                      {capsLock && (
                        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#8A5200]">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Caps Lock is on
                        </p>
                      )}
                    </motion.div>

                    <div aria-live="assertive">{errorAlert}</div>

                    <motion.div key="submit" {...rise(3)}>
                      <SubmitButton loading={loading} idle="Sign in" busy="Signing in..." />
                    </motion.div>

                    <motion.p key="help" {...rise(4)} className="text-balance text-center text-sm text-[#4D566B]">
                      Forgot your password? Ask your administrator or HR to reset it.
                    </motion.p>
                  </form>
                )}
              </div>
            </div>
          </div>

          <footer className="text-center text-xs text-[#5B678A] lg:text-left">
            © {new Date().getFullYear()} Migrantly.ae · Authorised staff only
          </footer>
        </div>
      </section>

      {/* Desktop: the stage. A gold arrow circles the keyhole; the pitch sits beneath. */}
      <aside className="mi-login-panel relative hidden flex-col overflow-hidden lg:flex">
        <div className="mi-login-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex-[3]">
          <OrbitScene busy={loading} />
        </div>

        <div className="relative z-10 flex flex-[2] flex-col justify-end px-14 pb-12 xl:px-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#EECA7D]">Migrantly CRM</p>
          <h2 className="font-display max-w-lg text-balance text-4xl font-semibold leading-[1.08] text-white xl:text-[3.25rem]">
            Your world, <span className="mi-gold-text">unlocked.</span>
          </h2>
          <p className="mt-4 max-w-md text-balance leading-relaxed text-[#C9D3EA]">
            One workspace for every enquiry, client and case, from the first conversation to the final approval.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[#EECA7D]/25 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white/90 backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-[#EECA7D]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}
