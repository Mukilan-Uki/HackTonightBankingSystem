'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Sidebar from '@/components/sidebar'
import { Search, Bell } from '@/components/Icons'
import styles from './accounts.module.css'

type Screen = 'list' | 'add' | 'edit'

type Account = {
  id: number
  account_number: string
  account_name: string
  balance: string
  user_id: number
}

function AccountsContent() {
  const [screen, setScreen] = useState<Screen>('list')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [apiError, setApiError] = useState('')

  // Add form state
  const [addForm, setAddForm] = useState({ accountNumber: '', accountName: '' })
  const [addErrors, setAddErrors] = useState({ accountNumber: '', accountName: '' })

  // Edit state (rename)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function loadAccounts() {
    setLoadingAccounts(true)
    fetch('/api/accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setAccounts(data.accounts)
        else setApiError(data.message || 'Failed to load accounts')
      })
      .catch(() => setApiError('Network error loading accounts'))
      .finally(() => setLoadingAccounts(false))
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // ---- ADD ----
  function validateAdd() {
    const errs = { accountNumber: '', accountName: '' }
    if (!addForm.accountNumber.trim()) errs.accountNumber = 'Account number is required'
    else if (!/^\d{6,20}$/.test(addForm.accountNumber.trim())) errs.accountNumber = 'Must be 6–20 digits'
    if (!addForm.accountName.trim()) errs.accountName = 'Account name is required'
    setAddErrors(errs)
    return !errs.accountNumber && !errs.accountName
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAdd()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: addForm.accountNumber, accountName: addForm.accountName }),
      })
      const data = await res.json()
      if (data.ok) {
        loadAccounts()
        setAddForm({ accountNumber: '', accountName: '' })
        setScreen('list')
      } else {
        setApiError(data.message || 'Failed to add account')
      }
    } catch {
      setApiError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- RENAME ----
  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !selectedAccount) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: selectedAccount.account_number, accountName: newName }),
      })
      const data = await res.json()
      if (data.ok) {
        loadAccounts()
        setScreen('list')
        setSelectedAccount(null)
        setNewName('')
      } else {
        setApiError(data.message || 'Failed to update account')
      }
    } catch {
      setApiError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- DELETE ----
  async function handleDelete(account: Account) {
    if (!confirm(`Delete account "${account.account_name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(
        `/api/accounts?accountNumber=${encodeURIComponent(account.account_number)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      const data = await res.json()
      if (data.ok) loadAccounts()
      else setApiError(data.message || 'Failed to delete account')
    } catch {
      setApiError('Network error')
    }
  }

  return (
    <main className={styles.accountsPage}>
      <Sidebar />
      <section className={styles.content}>
        <header className={styles.contentHeader}>
          <h1 className={styles.pageTitle}>Accounts</h1>
          <div className={styles.headerActions}>
            <Search size={22} />
            <Bell size={22} />
            <div className={styles.avatarPlaceholder}>
              <Image src="/person-logo.png" alt="Profile" width={40} height={40} style={{ objectFit: 'cover', borderRadius: '50%' }} />
            </div>
          </div>
        </header>

        {apiError && (
          <div style={{ color: '#ef4444', margin: '1rem 0', padding: '0.75rem', background: '#fef2f2', borderRadius: 8 }}>
            {apiError} <button onClick={() => setApiError('')} style={{ marginLeft: 8, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ===== LIST SCREEN ===== */}
        {screen === 'list' && (
          <div className={styles.cardsContainer}>
            {loadingAccounts && <p style={{ color: '#666' }}>Loading accounts…</p>}
            {!loadingAccounts && accounts.length === 0 && (
              <p style={{ color: '#666' }}>No accounts found. Add one below.</p>
            )}
            {accounts.map((acc) => (
              <div key={acc.account_number} className={styles.accountCard}>
                <div className={styles.iconEdit} onClick={() => { setSelectedAccount(acc); setNewName(acc.account_name); setScreen('edit') }}>✏️</div>
                <div className={styles.iconDelete} onClick={() => handleDelete(acc)}>🗑️</div>
                <div className={styles.accountCardContent}>
                  <h2 className={styles.accountName}>{acc.account_name}</h2>
                  <div className={styles.accountAvatar}>
                    <Image src="/account-logo.png" alt="profile" width={100} height={100} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                  </div>
                  <p className={styles.accountDetails}>
                    Acc: {acc.account_number}<br />
                    Balance: Rs.{Number(acc.balance).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            <button className={styles.addAccountCard} onClick={() => setScreen('add')}>
              <h2 className={styles.addAccountTitle}>Add a Bank Account</h2>
              <div className={styles.addAccountIcon}>+</div>
            </button>
          </div>
        )}

        {/* ===== ADD SCREEN ===== */}
        {screen === 'add' && (
          <div className={styles.formContainer}>
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Add Another Bank Account</h2>
              </div>
              <form onSubmit={handleAddAccount} className={styles.formFields}>
                <div className={styles.formGroup}>
                  <label htmlFor="accountNumber">Bank Account Number:</label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={addForm.accountNumber}
                    onChange={(e) => setAddForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="Enter account number (6–20 digits)"
                    className={addErrors.accountNumber ? styles.inputError : ''}
                  />
                  {addErrors.accountNumber && <span className={styles.fieldError}>{addErrors.accountNumber}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="accountName">Account Name / Nickname:</label>
                  <input
                    type="text"
                    id="accountName"
                    value={addForm.accountName}
                    onChange={(e) => setAddForm((p) => ({ ...p, accountName: e.target.value }))}
                    placeholder="Enter a name for this account"
                    className={addErrors.accountName ? styles.inputError : ''}
                  />
                  {addErrors.accountName && <span className={styles.fieldError}>{addErrors.accountName}</span>}
                </div>

                <div className={styles.formActionsBottom}>
                  <button type="button" className={styles.btnCancel} onClick={() => { setScreen('list'); setAddForm({ accountNumber: '', accountName: '' }); setAddErrors({ accountNumber: '', accountName: '' }) }}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnAdd} disabled={submitting}>
                    {submitting ? 'Adding…' : 'Add Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== EDIT SCREEN ===== */}
        {screen === 'edit' && selectedAccount && (
          <div className={styles.formContainer}>
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Rename Account</h2>
              </div>
              <form onSubmit={handleRename} className={styles.formFields}>
                <div className={styles.formGroup}>
                  <label>Account Number:</label>
                  <input type="text" value={selectedAccount.account_number} disabled className={styles.inputDisabled} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="newName">New Name / Nickname:</label>
                  <input
                    type="text"
                    id="newName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter new name"
                    required
                  />
                </div>
                <div className={styles.formActionsBottom}>
                  <button type="button" className={styles.btnCancel} onClick={() => { setScreen('list'); setSelectedAccount(null); setNewName('') }}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnUpdate} disabled={submitting}>
                    {submitting ? 'Saving…' : 'UPDATE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  )
}
