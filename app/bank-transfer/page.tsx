'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'

type Errors = Partial<{
  amount: string
  fromAccount: string
  accountNumber: string
  accountName: string
  bank: string
}>

type Account = {
  account_number: string
  account_name: string
  balance: string
}

export default function Home() {
  const [amount, setAmount] = useState('')
  const [fromAccount, setFromAccount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bank, setBank] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'failure'>('form')
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [failReason, setFailReason] = useState('')
  const [myAccounts, setMyAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  // Load user's accounts on mount to populate the "From Account" dropdown
  useEffect(() => {
    fetch('/api/accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setMyAccounts(data.accounts)
      })
      .catch(() => {})
  }, [])

  function validate() {
    const e: Errors = {}
    if (!fromAccount) e.fromAccount = 'Select an account to transfer from'
    if (!amount) e.amount = 'Amount is required'
    else if (Number(amount) <= 0 || isNaN(Number(amount)))
      e.amount = 'Enter a valid positive amount'
    if (!accountNumber) e.accountNumber = 'Account number is required'
    else if (!/^\d{6,}$/.test(accountNumber))
      e.accountNumber = 'Enter a valid account number'
    if (!accountName) e.accountName = 'Account name is required'
    if (!bank) e.bank = 'Select a bank'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) setStep('confirm')
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount,
          toAccount: accountNumber,
          amount: Number(amount),
          description,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setConfirmation(data.transaction?.id?.toString() || String(Math.floor(Math.random() * 90000000 + 10000000)))
        setStep('success')
        // Refresh account balances
        fetch('/api/accounts', { credentials: 'include' })
          .then((r) => r.json())
          .then((d) => { if (d.ok) setMyAccounts(d.accounts) })
          .catch(() => {})
      } else {
        setFailReason(data.message || 'Transfer failed')
        setStep('failure')
      }
    } catch {
      setFailReason('Network error. Please try again.')
      setStep('failure')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setAmount('')
    setFromAccount('')
    setAccountNumber('')
    setAccountName('')
    setBank('')
    setDescription('')
    setErrors({})
    setConfirmation(null)
    setFailReason('')
    setStep('form')
  }

  const selectedAccount = myAccounts.find((a) => a.account_number === fromAccount)

  return (
    <div className="min-h-screen bg-bg-light font-geist p-0">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 p-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Bank Transfer</h2>
            <div className="flex items-center gap-3">
              <button className="topbar-icon" aria-label="search">
                <img src="/search.png" alt="search" />
              </button>
              <button className="topbar-icon" aria-label="notifications">
                <img src="/notification.png" alt="notifications" />
              </button>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                <img
                  src="/avatar.png"
                  alt="avatar"
                  className="w-full h-full object-cover bg-white"
                />
              </div>
            </div>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleNext} className="transfer-card p-8">
              <div className="grid grid-cols-12 gap-y-6 gap-x-8 items-center">

                <label className="col-span-3 text-gray-700">From Account :</label>
                <div className="col-span-9">
                  <select
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="underline-input bg-transparent"
                  >
                    <option value="">Select your account</option>
                    {myAccounts.map((a) => (
                      <option key={a.account_number} value={a.account_number}>
                        {a.account_name} ({a.account_number}) — Rs.{Number(a.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.fromAccount && (
                    <div className="text-sm text-red-600 mt-1">{errors.fromAccount}</div>
                  )}
                </div>

                <label className="col-span-3 text-gray-700">Amount :</label>
                <div className="col-span-9">
                  <input
                    aria-label="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="underline-input"
                    placeholder=""
                    type="number"
                    min="1"
                  />
                  {errors.amount && (
                    <div className="text-sm text-red-600 mt-1">{errors.amount}</div>
                  )}
                </div>

                <label className="col-span-3 text-gray-700">To Account Number :</label>
                <div className="col-span-9">
                  <input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="underline-input"
                    placeholder="Recipient account number"
                  />
                  {errors.accountNumber && (
                    <div className="text-sm text-red-600 mt-1">{errors.accountNumber}</div>
                  )}
                </div>

                <label className="col-span-3 text-gray-700">Account Name :</label>
                <div className="col-span-9">
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="underline-input"
                    placeholder="Recipient name"
                  />
                  {errors.accountName && (
                    <div className="text-sm text-red-600 mt-1">{errors.accountName}</div>
                  )}
                </div>

                <label className="col-span-3 text-gray-700">Select Bank :</label>
                <div className="col-span-9">
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="underline-input bg-transparent"
                  >
                    <option value="">Choose bank</option>
                    <option>Nova Bank</option>
                    <option>First National</option>
                    <option>Global Trust</option>
                    <option>Union Bank</option>
                  </select>
                  {errors.bank && (
                    <div className="text-sm text-red-600 mt-1">{errors.bank}</div>
                  )}
                </div>

                <label className="col-span-3 text-gray-700">Description :</label>
                <div className="col-span-9">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="description-box"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-10">
                <button type="submit" className="next-btn">
                  NEXT
                </button>
              </div>
            </form>
          ) : step === 'confirm' ? (
            <div className="transfer-card p-8">
              <h3 className="text-center text-2xl font-semibold mb-6">Confirm Transfer</h3>
              <div className="bg-white rounded-lg p-6 shadow-lg max-w-xl mx-auto text-center">
                <p className="mb-2">
                  From: <strong>{selectedAccount?.account_name || fromAccount}</strong>
                </p>
                <p className="mb-4">
                  Transfer <strong>Rs. {Number(amount).toLocaleString()}</strong> to{' '}
                  <strong>{accountName}</strong> ({accountNumber})
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  Additional fee of Rs.50 will be charged.
                </p>
                <div className="mb-6">
                  <img src="/transfer-illustration.png" alt="illustration" className="mx-auto" />
                </div>
                <div className="flex justify-center gap-4">
                  {/* FIXED: was incorrectly setStep('failure') */}
                  <button onClick={() => setStep('form')} className="next-btn" aria-label="back">
                    BACK
                  </button>
                  <button
                    onClick={handleTransfer}
                    className="next-btn transfer-btn"
                    disabled={loading}
                  >
                    {loading ? 'Processing…' : 'TRANSFER'}
                  </button>
                </div>
              </div>
            </div>
          ) : step === 'success' ? (
            <div className="transfer-card p-8">
              <div className="relative">
                <div className="success-check inside-check">
                  <svg viewBox="0 0 120 120" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="50" fill="#dff7e7" />
                    <circle cx="60" cy="60" r="40" fill="#10a654" />
                    <path d="M38 62 L54 78 L82 42" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
                <h3 className="text-center text-2xl font-semibold mb-4">Transfer Successful!</h3>
                <p className="text-center text-sm text-gray-500 mb-10">
                  Confirmation number : {confirmation}
                </p>
                <div className="flex justify-center">
                  <button onClick={resetForm} className="transfer-btn success-btn">
                    <span className="mr-3">‹</span> BACK TO HOME
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="transfer-card p-8">
              <div className="relative">
                <div className="success-check inside-check">
                  <svg viewBox="0 0 120 120" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="50" fill="#ffdede" />
                    <circle cx="60" cy="60" r="40" fill="#ff4d4f" />
                    <text x="60" y="78" textAnchor="middle" fontSize="48" fill="#fff" fontWeight="700">!</text>
                  </svg>
                </div>
                <h3 className="text-center text-2xl font-semibold mb-4">Transaction Failed!</h3>
                <p className="text-center text-sm text-gray-500 mb-6">{failReason}</p>
                <div className="flex justify-center">
                  <button onClick={resetForm} className="transfer-btn success-btn">
                    <span className="mr-3">‹</span> BACK TO HOME
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}