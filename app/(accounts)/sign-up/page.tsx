'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import AuthButton from '@/components/authButton'

const fields = [
  { label: 'Account Number', name: 'accountNumber', type: 'text' },
  { label: 'Account Name', name: 'accountName', type: 'text' },
  { label: 'Branch', name: 'branch', type: 'text' },
  { label: 'Email', name: 'email', type: 'text' },
  { label: 'Password', name: 'password', type: 'password' },
  { label: 'Confirm Password', name: 'confirmPassword', type: 'password' }
]

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    accountNumber: '',
    accountName: '',
    branch: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (
      !form.accountNumber.trim() ||
      !form.accountName.trim() ||
      !form.branch.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.confirmPassword.trim()
    ) {
      setError('Please fill out all fields.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      // Replace with real signup logic when available.
      router.push('/login')
    } finally {
      setLoading(false)
    }
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields.map(({ label, name, type }) => {
            const fieldId = `sign-up-${label.toLowerCase().replaceAll(' ', '-')}`

            return (
              <div
                className="grid items-center gap-4 md:grid-cols-[180px_1fr]"
                key={name}
              >
                <label className="text-xl text-black" htmlFor={fieldId}>
                  {label} :
                </label>
                <input
                  id={fieldId}
                  type={type}
                  value={form[name as keyof typeof form]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [name]: event.target.value
                    }))
                  }
                  className="h-[64px] rounded-[40px] border-0 bg-[#d9d9d9] px-7 text-lg text-black outline-none"
                />
              </div>
            )
          })}

          {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

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
