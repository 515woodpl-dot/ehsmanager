import { useMemo, useState } from 'react'
import { T, C } from '../lib/tokens'
import { Modal, askConfirm } from './UI'
import { DEFAULT_ACCOUNTING, EXPENSE_CATEGORIES, CSV, MONTHS, downloadCSV, money, yearSummary, yearsWithActivity, toDate } from '../lib/accounting'

const uid = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)
const fmtDay = iso => { const d = toDate(iso); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
const TABS = [['overview', 'Overview'], ['payments', 'Payments'], ['expenses', 'Expenses'], ['tax', 'Sales tax'], ['settings', 'Tax settings']]

export default function Finances({ data, setData, toast }) {
  const years = useMemo(() => yearsWithActivity(data), [data.invoices, data.expenses])
  const [year, setYear] = useState(years[0])
  const [tab, setTab] = useState('overview')
  const s = useMemo(() => yearSummary(data, year), [data.invoices, data.clients, data.expenses, year])
  const accounting = data.accounting || DEFAULT_ACCOUNTING
  const setAccounting = patch => setData(d => ({ ...d, accounting: { ...DEFAULT_ACCOUNTING, ...(d.accounting || {}), ...patch } }))

  const exportFile = kind => {
    const files = {
      payments: [`payments-${year}.csv`, () => CSV.payments(s)],
      expenses: [`expenses-${year}.csv`, () => CSV.expenses(s)],
      invoices: [`invoices-${year}.csv`, () => CSV.invoices(data, year)],
      tax: [`nj-sales-tax-${year}.csv`, () => CSV.salesTax(s, accounting)],
      summary: [`profit-and-loss-${year}.csv`, () => CSV.summary(s)],
    }
    const [name, build] = files[kind]
    downloadCSV(name, build()); toast(`Downloaded ${name}`)
  }

  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap">
        <div><div style={T.pageTitle} className="page-title-text">Finances</div><div style={T.pageSub}>Cash received, sales tax and expenses · {year}</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="Year" style={{ ...T.formInput, width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
          <select aria-label="Export CSV" style={{ ...T.formInput, width: 'auto' }} value="" onChange={e => e.target.value && exportFile(e.target.value)}>
            <option value="">Export CSV…</option>
            <option value="summary">Profit &amp; loss summary</option>
            <option value="payments">Payments received</option>
            <option value="invoices">Invoices</option>
            <option value="expenses">Expenses</option>
            <option value="tax">NJ sales tax by quarter</option>
          </select>
        </div>
      </div>

      {data.accounting === null && <div className="fin-note">Expenses and tax settings need a one-time database update (<code>pibase-migration-005-accounting.sql</code>). Payment and sales-tax reports below already work.</div>}

      <div style={T.metricStrip} className="metric-strip fin-metrics">
        {[
          ['Collected', s.totals.collected, `${s.ledger.length} payments`],
          ['Sales tax held', s.totals.tax, accounting.taxName],
          ['Expenses + fees', s.totals.expenses + s.totals.fees, `${s.expenses.length} expenses`],
          ['Net profit', s.totals.net, 'before income tax'],
        ].map(([label, value, sub], i) => (
          <div key={label} style={T.metricCell(i === 3)}>
            <div style={T.metricLabel}>{label}</div>
            <div style={{ ...T.metricValue, color: label === 'Net profit' && value < 0 ? C.red : C.text }}>{money(value)}</div>
            <div style={T.metricSub}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="chip-tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {tab === 'overview' && <Overview s={s} />}
      {tab === 'payments' && <Payments s={s} onExport={() => exportFile('payments')} />}
      {tab === 'expenses' && <Expenses s={s} ready={data.expensesReady} setData={setData} toast={toast} onExport={() => exportFile('expenses')} />}
      {tab === 'tax' && <SalesTax s={s} accounting={accounting} setAccounting={setAccounting} ready={data.accounting !== null} onExport={() => exportFile('tax')} />}
      {tab === 'settings' && <TaxSettings accounting={accounting} setAccounting={setAccounting} ready={data.accounting !== null} toast={toast} />}
    </div>
  )
}

function Table({ head, rows, foot, align }) {
  const a = i => ({ textAlign: align?.[i] || (i === 0 ? 'left' : 'right') })
  return <div className="fin-table-wrap"><table className="fin-table">
    <thead><tr>{head.map((h, i) => <th key={i} style={a(i)}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i} style={a(i)}>{c}</td>)}</tr>)}</tbody>
    {foot && <tfoot><tr>{foot.map((c, i) => <td key={i} style={a(i)}>{c}</td>)}</tr></tfoot>}
  </table></div>
}

function Breakdown({ title, entries, total }) {
  const list = Object.entries(entries).sort((a, b) => b[1] - a[1])
  return <div style={T.card}>
    <div style={T.sectionTitle}>{title}</div>
    {!list.length && <div style={{ color: C.faint, fontSize: 13 }}>Nothing yet</div>}
    {list.map(([label, value]) => <div key={label} className="fin-bar-row">
      <div className="fin-bar-label"><span>{label}</span><strong>{money(value)}</strong></div>
      <div className="fin-bar"><div style={{ width: `${total ? Math.max(2, value / total * 100) : 0}%` }} /></div>
    </div>)}
  </div>
}

function Overview({ s }) {
  const t = s.totals
  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={T.card}>
      <div style={T.sectionTitle}>Profit &amp; loss · {s.year}</div>
      <Table head={['', 'Amount']} rows={[
        ['Gross receipts (all payments received)', money(t.collected)],
        ['Less sales tax collected (owed to NJ)', money(-t.tax)],
        ['Sales, excluding tax', money(t.sales)],
        ['Less Stripe processing fees', money(-t.fees)],
        ['Less expenses', money(-t.expenses)],
      ]} foot={['Net profit (before income tax)', money(t.net)]} />
      <div className="fin-help">Invoiced this year: {money(t.invoiced)} across {t.invoiceCount} invoices · Still owed by clients (all years): {money(t.outstanding)}</div>
    </div>
    <div style={T.card}>
      <div style={T.sectionTitle}>By month</div>
      <Table head={['Month', 'Collected', 'Sales tax', 'Fees', 'Expenses', 'Net']}
        rows={s.months.map(m => [m.label, money(m.collected), money(m.tax), money(m.fees), money(m.expenses), money(m.net)])}
        foot={['Total', money(t.collected), money(t.tax), money(t.fees), money(t.expenses), money(t.net)]} />
    </div>
    <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Breakdown title="Sales by session type" entries={s.byType} total={t.sales} />
      <Breakdown title="Received by payment method" entries={s.byMethod} total={t.collected} />
    </div>
    <Breakdown title="Expenses by category" entries={s.byCategory} total={t.expenses + t.fees} />
  </div>
}

function Payments({ s, onExport }) {
  const [q, setQ] = useState('')
  const rows = s.ledger.filter(r => !q || `${r.client} ${r.invoice} ${r.method}`.toLowerCase().includes(q.toLowerCase()))
  return <div style={T.card}>
    <div className="fin-toolbar">
      <input style={{ ...T.formInput, maxWidth: 320 }} placeholder="Search client, invoice, method…" value={q} onChange={e => setQ(e.target.value)} />
      <button style={T.btn} onClick={onExport}>Export CSV</button>
    </div>
    {!rows.length ? <div style={{ color: C.faint, padding: '24px 0', textAlign: 'center' }}>No payments received in {s.year}</div> :
      <Table head={['Date', 'Client', 'Invoice', 'Method', 'Received', 'Tax', 'Fee', 'Deposit']} align={['left', 'left', 'left', 'left']}
        rows={rows.map(r => [fmtDay(r.day), r.client, r.invoice, r.method + (r.legacy ? ' *' : ''), money(r.amount), money(r.tax), r.fee ? money(r.fee) : '—', money(r.deposit)])}
        foot={['Total', '', '', '', money(rows.reduce((a, r) => a + r.amount, 0)), money(rows.reduce((a, r) => a + r.tax, 0)), money(rows.reduce((a, r) => a + r.fee, 0)), money(rows.reduce((a, r) => a + r.deposit, 0))]} />}
    {rows.some(r => r.legacy) && <div className="fin-help">* Marked paid before payments were itemised — date is the invoice's paid date.</div>}
  </div>
}

const blankExpense = () => ({ date: today(), vendor: '', category: 'Equipment', amount: '', method: '', notes: '' })

function Expenses({ s, ready, setData, toast, onExport }) {
  const [editing, setEditing] = useState(null)
  if (!ready) return <div className="fin-note">Run <code>pibase-migration-005-accounting.sql</code> once to start tracking expenses.</div>
  const save = () => {
    const amount = Number(editing.amount)
    if (!editing.date || !(amount > 0)) return toast('Enter a date and an amount')
    const row = { ...editing, id: editing.id || uid(), amount: Math.round(amount * 100) / 100, vendor: editing.vendor.trim() }
    setData(d => ({ ...d, expenses: editing.id ? d.expenses.map(x => x.id === row.id ? row : x) : [row, ...d.expenses] }))
    setEditing(null); toast('Expense saved')
  }
  const remove = async x => {
    if (!(await askConfirm(`Delete the ${money(x.amount)} expense${x.vendor ? ` from ${x.vendor}` : ''}?`))) return
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== x.id) })); toast('Expense deleted')
  }
  const rows = [...s.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return <div style={T.card}>
    <div className="fin-toolbar">
      <button style={T.btnPrimary} onClick={() => setEditing(blankExpense())}>+ Add expense</button>
      <button style={T.btn} onClick={onExport}>Export CSV</button>
    </div>
    {!rows.length ? <div style={{ color: C.faint, padding: '24px 0', textAlign: 'center' }}>No expenses logged for {s.year}</div> :
      <Table head={['Date', 'Vendor', 'Category', 'Amount', '']} align={['left', 'left', 'left', 'right', 'right']}
        rows={rows.map(x => [fmtDay(x.date), x.vendor || '—', x.category, money(x.amount),
          <span key="a" style={{ whiteSpace: 'nowrap' }}><button style={T.btnGhost} onClick={() => setEditing({ ...x, amount: String(x.amount) })}>Edit</button><button style={{ ...T.btnGhost, color: C.red }} onClick={() => remove(x)}>Delete</button></span>])}
        foot={['Total', '', '', money(s.totals.expenses), '']} />}
    {s.totals.fees > 0 && <div className="fin-help">Stripe fees ({money(s.totals.fees)}) are counted automatically — don't add them here.</div>}
    {editing && <Modal title={editing.id ? 'Edit expense' : 'Add expense'} onClose={() => setEditing(null)} footer={<><button style={T.btn} onClick={() => setEditing(null)}>Cancel</button><button style={T.btnPrimary} onClick={save}>Save expense</button></>}>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}><label style={T.formLabel}>Date</label><input style={T.formInput} type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></div>
        <div style={T.formGroup}><label style={T.formLabel}>Amount ($)</label><input style={T.formInput} type="number" min="0" step="0.01" inputMode="decimal" value={editing.amount} onChange={e => setEditing({ ...editing, amount: e.target.value })} /></div>
      </div>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}><label style={T.formLabel}>Vendor</label><input style={T.formInput} placeholder="B&H, Adobe, Pixieset…" value={editing.vendor} onChange={e => setEditing({ ...editing, vendor: e.target.value })} /></div>
        <div style={T.formGroup}><label style={T.formLabel}>Category</label><select style={T.formInput} value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div style={T.formGroup}><label style={T.formLabel}>Paid with (optional)</label><input style={T.formInput} placeholder="Business card, cash…" value={editing.method} onChange={e => setEditing({ ...editing, method: e.target.value })} /></div>
      <div style={T.formGroup}><label style={T.formLabel}>Notes (optional)</label><textarea style={T.formInput} rows={2} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
    </Modal>}
  </div>
}

function SalesTax({ s, accounting, setAccounting, ready, onExport }) {
  const [filing, setFiling] = useState(null)
  const todayIso = today()
  const saveFiling = () => {
    setAccounting({ filings: { ...(accounting.filings || {}), [filing.key]: { filedOn: filing.filedOn, amount: Number(filing.amount) || 0, note: filing.note || '' } } })
    setFiling(null)
  }
  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={T.card}>
      <div className="fin-toolbar">
        <div style={T.sectionTitle}>{accounting.taxName} · {s.year}</div>
        <button style={T.btn} onClick={onExport}>Export CSV</button>
      </div>
      <Table head={['Quarter', 'Gross receipts', 'Taxable sales', 'Non-taxable', 'Tax collected', 'Return due', 'Status']} align={['left', 'right', 'right', 'right', 'right', 'left', 'left']}
        rows={s.quarters.map(q => {
          const f = accounting.filings?.[q.key]
          const status = f?.filedOn ? <span className="fin-pill ok">Filed {fmtDay(f.filedOn)}</span>
            : q.due < todayIso && q.collected > 0 ? <span className="fin-pill late">Past due</span>
            : <span className="fin-pill">Open</span>
          return [`Q${q.q} (${MONTHS[(q.q - 1) * 3]}–${MONTHS[(q.q - 1) * 3 + 2]})`, money(q.collected), money(q.taxable), money(q.exempt), money(q.tax), fmtDay(q.due),
            <span key="s" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>{status}{ready && <button style={T.btnGhost} onClick={() => setFiling({ key: q.key, filedOn: f?.filedOn || todayIso, amount: f ? String(f.amount) : q.tax.toFixed(2), note: f?.note || '' })}>{f ? 'Edit' : 'Mark filed'}</button>}</span>]
        })}
        foot={['Year', money(s.totals.collected), money(s.quarters.reduce((a, q) => a + q.taxable, 0)), money(s.quarters.reduce((a, q) => a + q.exempt, 0)), money(s.totals.tax), '', '']} />
      <div className="fin-help">
        New Jersey sales tax returns are filed online at the NJ Division of Taxation: quarterly on form ST-50 (due the 20th after each quarter), or monthly on ST-51 if you collected over $30,000 in the prior year. Use the <strong>Taxable sales</strong> and <strong>Tax collected</strong> figures. Tax is counted when payment is received.
      </div>
    </div>
    {filing && <Modal title={`Record ${filing.key.replace('-', ' ')} return`} onClose={() => setFiling(null)} footer={<>
      {accounting.filings?.[filing.key] && <button style={{ ...T.btn, color: C.red, marginRight: 'auto' }} onClick={() => { const { [filing.key]: _, ...rest } = accounting.filings; setAccounting({ filings: rest }); setFiling(null) }}>Clear</button>}
      <button style={T.btn} onClick={() => setFiling(null)}>Cancel</button><button style={T.btnPrimary} onClick={saveFiling}>Save</button></>}>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}><label style={T.formLabel}>Filed on</label><input style={T.formInput} type="date" value={filing.filedOn} onChange={e => setFiling({ ...filing, filedOn: e.target.value })} /></div>
        <div style={T.formGroup}><label style={T.formLabel}>Amount paid to NJ ($)</label><input style={T.formInput} type="number" step="0.01" value={filing.amount} onChange={e => setFiling({ ...filing, amount: e.target.value })} /></div>
      </div>
      <div style={T.formGroup}><label style={T.formLabel}>Confirmation # / note</label><input style={T.formInput} value={filing.note} onChange={e => setFiling({ ...filing, note: e.target.value })} /></div>
    </Modal>}
  </div>
}

function TaxSettings({ accounting, setAccounting, ready, toast }) {
  const [rate, setRate] = useState(String(accounting.taxRate))
  const [name, setName] = useState(accounting.taxName)
  if (!ready) return <div className="fin-note">Run <code>pibase-migration-005-accounting.sql</code> once to save tax settings. Until then new invoices use {DEFAULT_ACCOUNTING.taxRate}%.</div>
  const save = () => {
    const n = Number(rate)
    if (!(n >= 0 && n <= 25)) return toast('Enter a tax rate between 0 and 25%')
    setAccounting({ taxRate: n, taxName: name.trim() || 'Sales tax' }); toast('Tax settings saved')
  }
  return <div style={{ ...T.card, maxWidth: 560 }}>
    <div style={T.formRow} className="form-row-2">
      <div style={T.formGroup}><label style={T.formLabel}>Sales tax rate (%)</label><input style={T.formInput} type="number" min="0" max="25" step="0.001" value={rate} onChange={e => setRate(e.target.value)} /></div>
      <div style={T.formGroup}><label style={T.formLabel}>Name on invoices</label><input style={T.formInput} value={name} onChange={e => setName(e.target.value)} /></div>
    </div>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 12 }}>
      <input type="checkbox" checked={accounting.taxByDefault !== false} onChange={e => setAccounting({ taxByDefault: e.target.checked })} /> Add this tax to new invoices automatically
    </label>
    <div className="fin-help">New Jersey's rate is 6.625%. Web design, development and marketing services are generally not subject to NJ sales tax, which is why automatic tax is off for 515 — but some items can be (for example software or digital products you resell). Confirm with your accountant. You can still add or remove tax on any single invoice.</div>
    <div style={{ marginTop: 16 }}><button style={T.btnPrimary} onClick={save}>Save tax settings</button></div>
  </div>
}
