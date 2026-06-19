'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthButton from '@/components/authButton'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [branch, setBranch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill out all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    router.push('/dashboard')
  }

  return (
    <section className="mx-auto min-h-[700px] w-full max-w-[1100px] rounded-[58px] bg-white px-8 py-9 shadow-[0_1px_3px_0_rgba(0,0,0,0.30),0_4px_8px_3px_rgba(0,0,0,0.15)] lg:min-h-[820px] lg:px-14">
      <div className="relative mx-auto w-full max-w-[860px]">
        <img
          src="/loginlogo.png"
          alt="Nova Bank"
          className="absolute left-0 top-0 hidden w-[128px] md:block"
        />

        <h1 className="mb-12 text-center text-[2.6rem] font-bold text-black text-balance">
          SIGN UP
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-username">
              Username :
            </label>
            <input
              id="sign-up-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-full-name">
              Full Name :
            </label>
            <input
              id="sign-up-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-branch">
              Branch :
            </label>
            <input
              id="sign-up-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-email">
              Email :
            </label>
            <input
              id="sign-up-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-password">
              Password :
            </label>
            <input
              id="sign-up-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
            <label className="text-xl text-black" htmlFor="sign-up-confirm-password">
              Confirm Password :
            </label>
            <input
              id="sign-up-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
            />
          </div>

          {error ? (
            <p className="text-center text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-8 flex justify-center">
            <AuthButton type="submit" className="w-full max-w-[280px]" disabled={loading}>
              {loading ? 'Signing up…' : 'SIGN UP'}
            </AuthButton>
          </div>

          <p className="mt-6 text-center text-sm text-black">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-indigo-700">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
