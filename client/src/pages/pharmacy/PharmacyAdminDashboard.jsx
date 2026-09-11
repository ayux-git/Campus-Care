import { useEffect, useState } from 'react';
import { Package, Boxes, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const STATUS_FLOW = ['Placed', 'Preparing', 'Out for delivery', 'Delivered'];

export default function PharmacyAdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', stock: '', description: '' });

  const loadOrders = () =>
    supabase
      .from('orders')
      .select('*, profiles(name, hostel_block, room_no)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));

  const loadItems = () => supabase.from('pharmacy_items').select('*').order('category').then(({ data }) => setItems(data || []));

  useEffect(() => {
    loadOrders();
    loadItems();
  }, []);

  const advanceStatus = async (order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    await supabase.from('orders').update({ status: next }).eq('id', order.id);
    loadOrders();
  };

  const updateStock = async (id, stock) => {
    await supabase.from('pharmacy_items').update({ stock: Number(stock) }).eq('id', id);
    loadItems();
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category || !newItem.price) return;
    await supabase.from('pharmacy_items').insert({
      name: newItem.name,
      category: newItem.category,
      price: Number(newItem.price),
      stock: Number(newItem.stock) || 0,
      description: newItem.description,
    });
    setNewItem({ name: '', category: '', price: '', stock: '', description: '' });
    loadItems();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Pharmacy Admin Dashboard</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-teal-700">
            <Package size={14} /> Incoming Orders
          </h2>
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">
                      #{o.id} — {o.profiles?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.hostel_block}, Room {o.room_no} · ₹{o.total}
                    </p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{o.status}</span>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {(Array.isArray(o.items_json) ? o.items_json : JSON.parse(o.items_json || '[]')).map((it, i) => (
                    <li key={i}>
                      {it.qty} × {it.name}
                    </li>
                  ))}
                </ul>
                {o.status !== 'Delivered' && (
                  <button onClick={() => advanceStatus(o)} className="btn-outline mt-3 !py-1.5 text-xs">
                    Advance to next status
                  </button>
                )}
              </div>
            ))}
            {orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent-600">
            <Boxes size={14} /> Inventory
          </h2>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="card flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{it.name}</p>
                  <p className="text-xs text-slate-400">{it.category} · ₹{it.price}</p>
                </div>
                <input
                  type="number"
                  defaultValue={it.stock}
                  onBlur={(e) => updateStock(it.id, e.target.value)}
                  className="input !w-20 !py-1 text-center text-xs"
                />
              </div>
            ))}
          </div>

          <form onSubmit={addItem} className="card mt-4 space-y-2 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Plus size={13} /> Add new item
            </p>
            <input className="input !py-1.5 text-sm" placeholder="Name" value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input !py-1.5 text-sm" placeholder="Category" value={newItem.category} onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value }))} />
              <input className="input !py-1.5 text-sm" placeholder="Price" type="number" value={newItem.price} onChange={(e) => setNewItem((s) => ({ ...s, price: e.target.value }))} />
            </div>
            <input className="input !py-1.5 text-sm" placeholder="Stock" type="number" value={newItem.stock} onChange={(e) => setNewItem((s) => ({ ...s, stock: e.target.value }))} />
            <input className="input !py-1.5 text-sm" placeholder="Description" value={newItem.description} onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))} />
            <button type="submit" className="btn-primary w-full !py-1.5 text-xs">
              Add item
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
