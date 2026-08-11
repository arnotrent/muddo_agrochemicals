import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'
import { analyticsApi } from '../../api/services'
import Icon from '../../components/Icon'

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

export default function AdminDashboardPage() {
  const [dash, setDash] = useState(null)
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    analyticsApi.dashboard().then(({ data }) => setDash(data))
    analyticsApi.charts().then(({ data }) => setCharts(data))
  }, [])

  if (!dash) return <div className="text-text-3 text-center py-16">Loading…</div>

  const kpis = [
    ['flask', dash.stats.total_products, 'Total Products'],
    ['envelope', dash.stats.new_requests, 'New Enquiries'],
    ['exclamation-triangle', dash.stats.low_stock, 'Low Stock Alerts'],
    ['users', dash.stats.active_agents, 'Active Agents'],
  ]

  const lineData = charts && {
    labels: charts.daily_enquiries.map((d) => new Date(d.day).toLocaleDateString([], { day: 'numeric', month: 'short' })),
    datasets: [{ label: 'Enquiries', data: charts.daily_enquiries.map((d) => d.cnt), borderColor: '#38BDF8', backgroundColor: '#38BDF826', fill: true, tension: 0.35 }],
  }
  const supplyData = charts && {
    labels: charts.supply_by_status.map((s) => s.status),
    datasets: [{ data: charts.supply_by_status.map((s) => s.cnt), backgroundColor: ['#38BDF8', '#4ADE80', '#EF4444'] }],
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="tachometer-alt" />Overview</h1>

      <div className="rounded-card overflow-hidden mb-5.5 h-[190px]">
        <img src="/images/banner_admin.png" alt="MACL Admin" className="w-full h-full object-cover" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(([icon, val, label]) => (
          <div key={label} className="bg-bg-card border border-border rounded-card p-5.5">
            <div className="w-11.5 h-11.5 rounded-xl bg-bg-alt text-accent-blue flex items-center justify-center mb-3.5"><Icon name={icon} /></div>
            <div className="text-3xl font-bold text-text-1">{val}</div>
            <div className="text-xs font-semibold text-text-3 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {charts && (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5 mb-6">
          <div className="bg-bg-card border border-border rounded-card p-5" style={{ height: 300 }}>
            <div className="font-bold text-text-1 mb-3 flex items-center gap-2"><Icon name="bolt" className="text-accent-blue" />Enquiries — Last 14 Days</div>
            <div style={{ height: 220 }}><Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
          </div>
          <div className="bg-bg-card border border-border rounded-card p-5" style={{ height: 300 }}>
            <div className="font-bold text-text-1 mb-3 flex items-center gap-2"><Icon name="truck" className="text-accent-blue" />Supply Requests</div>
            <div style={{ height: 220 }}><Doughnut data={supplyData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="font-bold text-text-1 flex items-center gap-2"><Icon name="envelope" className="text-accent-blue" />Recent Enquiries</div>
            <Link to="/admin/requests" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-bg-alt text-text-2">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Status</th></tr></thead>
              <tbody>
                {dash.recent_requests.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="p-3"><strong>{r.name}</strong><div className="text-xs text-text-3">{r.email}</div></td>
                    <td className="p-3">{r.subject}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-bg-alt text-accent-blue">{r.status}</span></td>
                  </tr>
                ))}
                {!dash.recent_requests.length && <tr><td colSpan={3} className="text-center text-text-3 p-6">No enquiries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-4.5">
          <div className="bg-bg-card border border-border rounded-card p-4">
            <div className="font-bold text-text-1 mb-3 flex items-center gap-2"><Icon name="bolt" className="text-accent-blue" />Quick Actions</div>
            <div className="flex flex-col gap-2">
              <Link to="/admin/products" className="py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm text-center flex items-center justify-center gap-2"><Icon name="plus" />Add New Product</Link>
              <Link to="/admin/distributors" className="py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm text-center flex items-center justify-center gap-2"><Icon name="store" />Add Distributor</Link>
              <Link to="/admin/agents" className="py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm text-center flex items-center justify-center gap-2"><Icon name="user-plus" />Add Agent</Link>
            </div>
          </div>
          {dash.low_stock_items.length > 0 && (
            <div className="bg-bg-card border border-border rounded-card">
              <div className="p-4 border-b border-border font-bold text-accent-red flex items-center gap-2"><Icon name="exclamation-triangle" />Low Stock</div>
              {dash.low_stock_items.map((i) => (
                <div key={i.id} className="flex justify-between items-center px-4.5 py-2.5 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-bold">{i.product_name}</div>
                    <div className="text-xs text-text-3">{i.product_category}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i.stock_qty === 0 ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-alt text-accent-blue'}`}>{i.stock_qty} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
