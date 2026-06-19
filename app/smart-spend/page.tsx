'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'

type Transaction = {
  id: number
  from_account: string
  to_account: string
  amount: string
  description: string
  created_at: string
}

type Account = {
  account_number: string
  account_name: string
  balance: string
}

const CATEGORIES = [
  { key: 'food', label: '🍔 Food & Dining', keywords: ['food', 'lunch', 'dinner', 'meal', 'restaurant', 'coffee'] },
  { key: 'bills', label: '💡 Bills & Utilities', keywords: ['bill', 'water', 'electricity', 'ceb', 'dialog', 'airtel', 'slt', 'hutch', 'payment'] },
  { key: 'transfer', label: '↔️ Transfers', keywords: ['transfer', 'send', 'refund'] },
  { key: 'fees', label: '🏦 Fees', keywords: ['fee', 'charge', 'normal'] },
  { key: 'other', label: '📦 Other', keywords: [] },
]

function categorise(desc: string): string {
  const d = (desc || '').toLowerCase()
  for (const cat of CATEGORIES.slice(0, -1)) {
    if (cat.keywords.some((k) => d.includes(k))) return cat.key
  }
  return 'other'
}

export default function SmartSpendPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [editBudget, setEditBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const accRes = await fetch('/api/accounts', { credentials: 'include' })
        const accData = await accRes.json()
        if (!accData.ok) { setLoading(false); return }
        setAccounts(accData.accounts)

        const allTx: Transaction[] = []
        for (const acc of accData.accounts) {
          const txRes = await fetch(`/api/transactions?account=${acc.account_number}`, { credentials: 'include' })
          const txData = await txRes.json()
          if (txData.ok) {
            for (const tx of txData.transactions) {
              if (!allTx.find((t) => t.id === tx.id)) allTx.push(tx)
            }
          }
        }
        setTransactions(allTx)
      } catch {
        // Not connected — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const myAccountNumbers = new Set(accounts.map((a) => a.account_number))
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

  // Expenses = money leaving my accounts
  const expenses = transactions.filter((tx) => myAccountNumbers.has(tx.from_account))
  // Income = money coming into my accounts
  const income = transactions.filter((tx) => myAccountNumbers.has(tx.to_account))

  const totalExpenses = expenses.reduce((s, tx) => s + Number(tx.amount), 0)
  const totalIncome = income.reduce((s, tx) => s + Number(tx.amount), 0)

  // Per category spending
  const catSpend: Record<string, number> = {}
  for (const tx of expenses) {
    const cat = categorise(tx.description)
    catSpend[cat] = (catSpend[cat] || 0) + Number(tx.amount)
  }

  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0

  function startEditBudget(key: string) {
    setEditBudget(key)
    setBudgetInput(budgets[key] || '')
  }
  function saveBudget(key: string) {
    if (budgetInput && Number(budgetInput) > 0) {
      setBudgets((b) => ({ ...b, [key]: budgetInput }))
    }
    setEditBudget(null)
    setBudgetInput('')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f2f2', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Smart Spend</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>AI-powered spending insights</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="topbar-icon" aria-label="search"><img src="/search.png" alt="search" /></button>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
              <img src="/avatar.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
            <p style={{ fontSize: 18 }}>Loading your financial data…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
              {[
                { label: 'Total Balance', value: `Rs.${totalBalance.toLocaleString()}`, color: '#450043', bg: '#f3e6f3' },
                { label: 'Total Income', value: `Rs.${totalIncome.toLocaleString()}`, color: '#16a34a', bg: '#dcfce7' },
                { label: 'Total Expenses', value: `Rs.${totalExpenses.toLocaleString()}`, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, color: '#0369a1', bg: '#e0f2fe' },
              ].map((card) => (
                <div key={card.label} style={{ background: card.bg, borderRadius: 18, padding: '1.5rem 1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>{card.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: card.color, margin: 0 }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Spending by Category */}
            <div style={{ background: '#fff', borderRadius: 22, padding: '1.75rem 2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 20 }}>Spending by Category</h2>
              {CATEGORIES.map((cat) => {
                const spent = catSpend[cat.key] || 0
                const budget = Number(budgets[cat.key] || 0)
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
                const over = budget > 0 && spent > budget
                return (
                  <div key={cat.key} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{cat.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: over ? '#dc2626' : '#450043' }}>
                          Rs.{spent.toLocaleString()}
                          {budget > 0 && ` / Rs.${budget.toLocaleString()}`}
                        </span>
                        {editBudget === cat.key ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input
                              type="number"
                              value={budgetInput}
                              onChange={(e) => setBudgetInput(e.target.value)}
                              placeholder="Budget"
                              style={{ width: 90, padding: '4px 8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                            />
                            <button onClick={() => saveBudget(cat.key)} style={{ padding: '4px 10px', background: '#450043', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>✓</button>
                            <button onClick={() => setEditBudget(null)} style={{ padding: '4px 8px', background: '#e5e7eb', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditBudget(cat.key)} style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
                            {budget > 0 ? 'Edit budget' : 'Set budget'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ height: 10, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: budget > 0 ? `${pct}%` : spent > 0 ? '100%' : '0%',
                        background: over ? '#ef4444' : 'linear-gradient(90deg, #9a5c97, #450043)',
                        borderRadius: 99,
                        transition: 'width 0.5s ease',
                        opacity: spent > 0 ? 1 : 0.2,
                      }} />
                    </div>
                    {over && (
                      <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                        ⚠️ Over budget by Rs.{(spent - budget).toLocaleString()}
                      </p>
                    )}
                  </div>
                )
              })}
              {totalExpenses === 0 && (
                <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>No spending data yet. Make some transactions to see insights.</p>
              )}
            </div>

            {/* Recent Transactions */}
            <div style={{ background: '#fff', borderRadius: 22, padding: '1.75rem 2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Recent Transactions</h2>
              {transactions.length === 0 ? (
                <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>No transactions found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                        {['Date', 'Description', 'From', 'To', 'Amount', 'Type'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 15).map((tx) => {
                        const isExpense = myAccountNumbers.has(tx.from_account)
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '10px 12px', color: '#555' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 12px', color: '#333' }}>{tx.description || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#888', fontFamily: 'monospace' }}>{tx.from_account}</td>
                            <td style={{ padding: '10px 12px', color: '#888', fontFamily: 'monospace' }}>{tx.to_account}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: isExpense ? '#dc2626' : '#16a34a' }}>
                              {isExpense ? '-' : '+'}Rs.{Number(tx.amount).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: isExpense ? '#fee2e2' : '#dcfce7', color: isExpense ? '#dc2626' : '#16a34a' }}>
                                {isExpense ? 'Expense' : 'Income'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
