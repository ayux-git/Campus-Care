import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Plus, Minus, Trash2, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_STEPS = ['Placed', 'Preparing', 'Out for delivery', 'Delivered'];

function StatusTracker({ status }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${i <= idx ? 'bg-teal-600' : 'bg-slate-200'}`} />
          {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 w-4 ${i < idx ? 'bg-teal-600' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function Pharmacy() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [hostelBlock, setHostelBlock] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const loadItems = () => supabase.from('pharmacy_items').select('*').order('category').then(({ data }) => setItems(data || []));
  const loadOrders = () =>
    user &&
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));

  useEffect(() => {
    loadItems();
  }, []);
  useEffect(() => {
    loadOrders();
    if (profile) {
      setHostelBlock(profile.hostel_block || '');
      setRoomNo(profile.room_no || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((it) => {
      g[it.category] = g[it.category] || [];
      g[it.category].push(it);
    });
    return g;
  }, [items]);

  const addToCart = (item) => setCart((c) => ({ ...c, [item.id]: { item, qty: (c[item.id]?.qty || 0) + 1 } }));
  const removeFromCart = (id) =>
    setCart((c) => {
      const next = { ...c };
      if (next[id]?.qty > 1) next[id].qty -= 1;
      else delete next[id];
      return { ...next };
    });
  const clearItem = (id) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });

  const cartList = Object.values(cart);
  const total = cartList.reduce((sum, c) => sum + c.item.price * c.qty, 0);

  const checkout = async () => {
    if (!cartList.length || !hostelBlock || !roomNo) return;
    setPlacing(true);
    const orderItems = cartList.map((c) => ({ id: c.item.id, name: c.item.name, price: c.item.price, qty: c.qty }));
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      items_json: orderItems,
      hostel_block: hostelBlock,
      room_no: roomNo,
      total,
      status: 'Placed',
    });
    setPlacing(false);
    if (!error) {
      setCart({});
      setPlaced(true);
      loadOrders();
      setTimeout(() => setPlaced(false), 3000);
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">{t('pharmacy.title')}</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-teal-700">{category}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {catItems.map((it) => (
                  <div key={it.id} className="card flex flex-col p-4">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-slate-800">{it.name}</p>
                      <span className="text-sm font-bold text-teal-700">₹{it.price}</span>
                    </div>
                    <p className="mt-1 flex-1 text-xs text-slate-500">{it.description}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{it.stock > 0 ? `${it.stock} in stock` : 'Out of stock'}</p>
                    <button
                      disabled={it.stock <= 0}
                      onClick={() => addToCart(it)}
                      className="btn-outline mt-3 w-full !py-1.5 text-xs"
                    >
                      <Plus size={13} /> Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400">Catalog is empty.</p>}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
              <ShoppingCart size={17} /> {t('pharmacy.cart')}
            </h3>
            {cartList.length === 0 ? (
              <p className="text-sm text-slate-400">Your cart is empty.</p>
            ) : (
              <div className="space-y-2">
                {cartList.map(({ item, qty }) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="flex-1 truncate">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => removeFromCart(item.id)} className="rounded-full bg-slate-100 p-1">
                        <Minus size={11} />
                      </button>
                      <span className="w-4 text-center">{qty}</span>
                      <button onClick={() => addToCart(item)} className="rounded-full bg-slate-100 p-1">
                        <Plus size={11} />
                      </button>
                      <button onClick={() => clearItem(item.id)} className="ml-1 text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <input value={hostelBlock} onChange={(e) => setHostelBlock(e.target.value)} placeholder={t('pharmacy.hostel_block')} className="input !py-1.5 text-sm" />
              <input value={roomNo} onChange={(e) => setRoomNo(e.target.value)} placeholder={t('pharmacy.room_no')} className="input !py-1.5 text-sm" />
              <button
                onClick={checkout}
                disabled={!cartList.length || !hostelBlock || !roomNo || placing}
                className="btn-primary w-full"
              >
                {placing ? '...' : t('pharmacy.place_order')}
              </button>
              {placed && <p className="text-center text-xs font-semibold text-teal-600">Order placed ✓</p>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
              <Package size={17} /> {t('pharmacy.orders')}
            </h3>
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Order #{o.id}</span>
                    <span>₹{o.total}</span>
                  </div>
                  <p className="mt-1 text-slate-500">{o.hostel_block}, Room {o.room_no}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-medium text-teal-700">{o.status}</span>
                    <StatusTracker status={o.status} />
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
