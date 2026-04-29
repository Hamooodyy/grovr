// grovr-screens.jsx — Screen components for Grovr (mobile + desktop)
const { useState, useEffect, useRef } = React;

// ── Shared helpers ──────────────────────────────────────────
const CAT = {
  dairy:    { bg:'#fefce8', accent:'#ca8a04', label:'Dairy' },
  produce:  { bg:'#f0fdf4', accent:'#16a34a', label:'Produce' },
  bakery:   { bg:'#fef3c7', accent:'#b45309', label:'Bakery' },
  meat:     { bg:'#fef2f2', accent:'#dc2626', label:'Protein' },
  pantry:   { bg:'#eff6ff', accent:'#2563eb', label:'Pantry' },
  beverage: { bg:'#ecfdf5', accent:'#0d9488', label:'Beverage' },
};
const fmt = (n) => `$${n.toFixed(2)}`;

function Pill({ children, green, onClick }) {
  return (
    <span onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',
      borderRadius:99, background: green ? 'var(--green-light)' : 'var(--bg)',
      color: green ? 'var(--green)' : 'var(--muted)', fontSize:12, fontWeight:600,
      cursor: onClick ? 'pointer' : 'default'}}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant='primary', style={} }) {
  const base = {display:'flex',alignItems:'center',justifyContent:'center',gap:8,
    padding:'14px 24px',borderRadius:14,fontFamily:'inherit',fontSize:15,fontWeight:600,
    cursor:'pointer',border:'none',transition:'all 0.15s', ...style};
  const variants = {
    primary:   {...base, background:'var(--green)', color:'#fff'},
    secondary: {...base, background:'var(--green-light)', color:'var(--green)'},
    ghost:     {...base, background:'transparent', color:'var(--muted)', padding:'8px 12px'},
  };
  return <button style={variants[variant]} onClick={onClick}>{children}</button>;
}

function ProductThumb({ cat, size=52 }) {
  const c = CAT[cat] || CAT.pantry;
  return (
    <div style={{width:size,height:size,borderRadius:12,background:c.bg,flexShrink:0,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      border:`1px solid ${c.accent}22`}}>
      <svg width={size*0.38} height={size*0.38} viewBox="0 0 24 24" fill="none">
        {cat==='dairy'    && <><circle cx="12" cy="12" r="8" stroke={c.accent} strokeWidth="1.8"/><path d="M8 10h8M8 14h5" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round"/></>}
        {cat==='produce'  && <><path d="M12 20V10M12 10C12 7 9 4 6 5M12 10C12 7 15 4 18 5" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round"/></>}
        {cat==='bakery'   && <><path d="M5 17C5 13.5 7 10 12 10C17 10 19 13.5 19 17H5Z" stroke={c.accent} strokeWidth="1.8"/><path d="M9 10C9 7 10.5 5 12 5C13.5 5 15 7 15 10" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round"/></>}
        {cat==='meat'     && <><path d="M8 16C6 14 6 10 9 8C12 6 16 8 16 12C16 15 14 17 11 17" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round"/><circle cx="7" cy="17" r="1.5" fill={c.accent}/></>}
        {cat==='pantry'   && <><rect x="7" y="6" width="10" height="13" rx="2" stroke={c.accent} strokeWidth="1.8"/><path d="M9 10h6M9 13h4" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round"/></>}
        {cat==='beverage' && <><path d="M8 6h8l-1 10a2 2 0 01-2 2h-2a2 2 0 01-2-2L8 6Z" stroke={c.accent} strokeWidth="1.8"/><path d="M7 9h10" stroke={c.accent} strokeWidth="1.8"/></>}
      </svg>
      <span style={{fontSize:9,color:c.accent,fontWeight:700,marginTop:2,
        letterSpacing:'0.04em',textTransform:'uppercase'}}>{c.label}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase',
        letterSpacing:'0.06em',marginBottom:10}}>{title}</div>
      {children}
    </div>
  );
}

// ── Desktop panel wrapper ───────────────────────────────────
function DesktopPanel({ children, width=300 }) {
  return (
    <div style={{width,flexShrink:0,background:'white',borderLeft:'1px solid var(--border)',
      display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 1. MAP SCREEN
// ══════════════════════════════════════════════════════════════
function MapScreen({ stores, radius, setRadius, selectedStore, setSelectedStore, onNavigate, isDesktop }) {
  const svgRadius = radius * 17;
  const visible = stores.filter(s => s.dist <= radius);

  const MapSVG = () => (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
      style={{width:'100%',height:'100%',display:'block'}}>
      <rect width="100" height="100" fill="#e8e0d0"/>
      {[[5,5,22,18],[30,5,20,12],[55,5,20,14],[78,5,17,12],[5,28,12,14],[80,25,15,10],
        [5,50,10,18],[85,45,10,20],[5,75,15,12],[78,70,17,15]].map(([x,y,w,h],i)=>
        <rect key={i} x={x} y={y} width={w} height={h} rx="1" fill="#ddd8cc" opacity="0.6"/>)}
      <rect x="55" y="10" width="20" height="14" rx="2" fill="#c8ddb4" opacity="0.75"/>
      <rect x="57" y="12" width="3" height="5" rx="1" fill="#a8c890" opacity="0.8"/>
      <rect x="62" y="11" width="4" height="7" rx="1" fill="#a8c890" opacity="0.8"/>
      <ellipse cx="13" cy="72" rx="7" ry="4.5" fill="#b8d4e8" opacity="0.85"/>
      <line x1="0" y1="33" x2="100" y2="33" stroke="#fff" strokeWidth="2"/>
      <line x1="0" y1="65" x2="100" y2="65" stroke="#fff" strokeWidth="2"/>
      <line x1="35" y1="0" x2="35" y2="100" stroke="#fff" strokeWidth="2"/>
      <line x1="67" y1="0" x2="67" y2="100" stroke="#fff" strokeWidth="2"/>
      <line x1="0" y1="50" x2="100" y2="50" stroke="#f5f0e8" strokeWidth="1"/>
      <line x1="50" y1="0" x2="50" y2="100" stroke="#f5f0e8" strokeWidth="1"/>
      <line x1="0" y1="20" x2="100" y2="35" stroke="#f0ece4" strokeWidth="0.8"/>
      <circle cx="48" cy="48" r={svgRadius}
        fill="rgba(34,197,94,0.07)" stroke="#22c55e" strokeWidth="0.6" strokeDasharray="2 1.5"/>
      {stores.map(s => {
        const inRange = s.dist <= radius;
        const sel = selectedStore?.id === s.id;
        return (
          <g key={s.id} transform={`translate(${s.x},${s.y})`}
            onClick={() => inRange && setSelectedStore(sel ? null : s)}
            style={{cursor: inRange ? 'pointer' : 'default', opacity: inRange ? 1 : 0.3}}>
            {sel && <circle r="6.5" fill="rgba(34,197,94,0.2)"/>}
            <circle r={sel ? 4.2 : 3.2} fill={sel ? 'var(--green)' : 'white'}
              stroke="var(--green)" strokeWidth={sel ? 0 : 1}/>
            <text textAnchor="middle" dominantBaseline="middle"
              fontSize={sel ? 2.8 : 2.2} fontFamily="DM Sans" fontWeight="700"
              fill={sel ? 'white' : 'var(--green)'}>{s.name[0]}</text>
          </g>
        );
      })}
      <circle cx="48" cy="48" r="2.8" fill="#3b82f6" stroke="white" strokeWidth="1.2"/>
      <circle cx="48" cy="48" r="1.2" fill="white"/>
    </svg>
  );

  // ── Desktop layout ──────────────────────────────────────
  if (isDesktop) return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Map fills left */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <MapSVG/>
        {/* Map legend */}
        <div style={{position:'absolute',top:16,left:16,background:'white',borderRadius:10,
          padding:'8px 12px',boxShadow:'var(--shadow)',fontSize:11}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#3b82f6',border:'2px solid white',boxShadow:'0 0 0 1px #3b82f6'}}/>
            <span style={{color:'var(--muted)'}}>You</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--green)'}}/>
            <span style={{color:'var(--muted)'}}>Store</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <DesktopPanel width={320}>
        <div style={{padding:'24px 20px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2"/>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2"/>
            </svg>
            <span style={{fontSize:13,fontWeight:600}}>2847 Maple Ave, San Francisco</span>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>
            Search radius: <b style={{color:'var(--text)'}}>{radius} mi</b>
            <span style={{marginLeft:8,color:'var(--green)',fontWeight:600}}>{visible.length} stores found</span>
          </div>
          <input type="range" min={0.5} max={5} step={0.5} value={radius}
            onChange={e => { setRadius(+e.target.value); setSelectedStore(null); }}
            style={{width:'100%', accentColor:'var(--green)'}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--muted)',marginTop:4}}>
            <span>0.5 mi</span><span>5 mi</span>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',
            letterSpacing:'0.06em',marginBottom:12}}>Stores in range</div>
          {visible.map(s => (
            <div key={s.id} onClick={() => setSelectedStore(selectedStore?.id===s.id ? null : s)}
              style={{padding:'14px',borderRadius:12,marginBottom:8,cursor:'pointer',
                border:`1.5px solid ${selectedStore?.id===s.id ? 'var(--green)' : 'var(--border)'}`,
                background: selectedStore?.id===s.id ? 'var(--green-xlight)' : 'white',
                transition:'all 0.15s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14}}>{s.name}</span>
                <span style={{fontSize:12,color:'var(--muted)'}}>{s.dist} mi</span>
              </div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{s.delivery} delivery</div>
              {!s.open && <div style={{fontSize:11,color:'#dc2626',marginTop:4,fontWeight:600}}>Closed</div>}
            </div>
          ))}
          {stores.filter(s=>s.dist>radius).length > 0 && (
            <div style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'12px 0'}}>
              +{stores.filter(s=>s.dist>radius).length} stores outside radius
            </div>
          )}
        </div>

        <div style={{padding:'16px',borderTop:'1px solid var(--border)'}}>
          <Btn onClick={() => onNavigate('list')} style={{width:'100%'}}>
            Open Shopping List →
          </Btn>
        </div>
      </DesktopPanel>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'16px 20px 12px',background:'white',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2"/></svg>
          <span style={{fontSize:13,fontWeight:600}}>2847 Maple Ave, San Francisco</span>
          <Pill>Current</Pill>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:13,color:'var(--muted)',whiteSpace:'nowrap'}}>Radius: <b style={{color:'var(--text)'}}>{radius} mi</b></span>
          <input type="range" min={0.5} max={5} step={0.5} value={radius}
            onChange={e => { setRadius(+e.target.value); setSelectedStore(null); }}
            style={{flex:1, accentColor:'var(--green)'}}/>
          <span style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap'}}>{visible.length} stores</span>
        </div>
      </div>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <MapSVG/>
        <div style={{position:'absolute',top:12,right:12,background:'white',borderRadius:10,
          padding:'8px 12px',boxShadow:'var(--shadow)',fontSize:11}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#3b82f6',border:'2px solid white',boxShadow:'0 0 0 1px #3b82f6'}}/>
            <span style={{color:'var(--muted)'}}>You</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--green)'}}/>
            <span style={{color:'var(--muted)'}}>Store</span>
          </div>
        </div>
        {selectedStore && (
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'white',
            borderRadius:'20px 20px 0 0',padding:'20px 20px 28px',
            boxShadow:'0 -4px 24px rgba(0,30,15,0.12)',animation:'slideUp 0.25s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:700,fontSize:18}}>{selectedStore.name}</div>
                <div style={{color:'var(--muted)',fontSize:13,marginTop:2}}>
                  {selectedStore.dist} mi away · {selectedStore.delivery} delivery
                </div>
              </div>
              <button onClick={() => setSelectedStore(null)}
                style={{background:'var(--bg)',border:'none',borderRadius:99,width:32,height:32,
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,color:'var(--muted)'}}>×</button>
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <Btn onClick={() => onNavigate('list')} style={{flex:1}}>Shop here</Btn>
              <Btn variant="secondary" style={{flex:1}} onClick={() => onNavigate('list')}>View inventory</Btn>
            </div>
          </div>
        )}
        {!selectedStore && (
          <button onClick={() => onNavigate('list')}
            style={{position:'absolute',bottom:20,right:20,background:'var(--green)',color:'white',
              border:'none',borderRadius:16,padding:'14px 20px',fontFamily:'inherit',
              fontWeight:600,fontSize:14,cursor:'pointer',
              boxShadow:'0 4px 16px rgba(22,163,74,0.35)',display:'flex',alignItems:'center',gap:8}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            My list
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 2. LIST SCREEN
// ══════════════════════════════════════════════════════════════
function ListScreen({ items, setItems, catalog, onNavigate, isDesktop }) {
  const [query, setQuery] = useState('');
  const [expandedPref, setExpandedPref] = useState(null);
  const inputRef = useRef();

  const filtered = query.length > 1
    ? catalog.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && !items.find(i=>i.id===p.id))
    : [];

  const addItem = (product) => {
    setItems(prev => [...prev, {...product, qty:1, brandPref:''}]);
    setQuery('');
  };
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const changeQty = (id, delta) => setItems(prev => prev.map(i => i.id===id ? {...i,qty:Math.max(1,i.qty+delta)} : i));
  const setBrandPref = (id, val) => setItems(prev => prev.map(i => i.id===id ? {...i,brandPref:val} : i));

  const total = items.reduce((s,i) => s + i.prices[1]*i.qty, 0);
  const totalQty = items.reduce((s,i) => s+i.qty, 0);

  // Category grouping for desktop summary panel
  const catCounts = items.reduce((acc, item) => {
    acc[item.cat] = (acc[item.cat] || 0) + item.qty;
    return acc;
  }, {});

  const ItemList = () => (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {items.map(item => {
        const bestPrice = Math.min(...Object.values(item.prices));
        const prefOpen = expandedPref === item.id;
        const hasPref = item.brandPref && item.brandPref.trim().length > 0;
        return (
          <div key={item.id} style={{background:'white',borderRadius:14,
            boxShadow:'0 1px 4px rgba(0,20,10,0.06)',animation:'fadeIn 0.2s ease',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px'}}>
              <ProductThumb cat={item.cat} size={48}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3,flexWrap:'wrap'}}>
                  <span style={{color:'var(--muted)',fontSize:12}}>{item.unit}</span>
                  {hasPref ? (
                    <span onClick={() => setExpandedPref(prefOpen ? null : item.id)}
                      style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--green-light)',
                        borderRadius:99,padding:'2px 8px',fontSize:11,fontWeight:600,color:'var(--green)',cursor:'pointer'}}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="var(--green)"/>
                      </svg>
                      {item.brandPref}
                    </span>
                  ) : (
                    <button onClick={() => setExpandedPref(prefOpen ? null : item.id)}
                      style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',
                        borderRadius:99,cursor:'pointer',border:'1.5px dashed var(--border)',
                        background:'white',fontSize:11,fontWeight:600,color:'var(--muted)'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Brand preference
                    </button>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <button onClick={() => changeQty(item.id,-1)}
                  style={{width:26,height:26,borderRadius:99,border:'1.5px solid var(--border)',
                    background:'var(--bg)',cursor:'pointer',fontSize:16,display:'flex',
                    alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>−</button>
                <span style={{fontSize:13,fontWeight:600,minWidth:14,textAlign:'center'}}>{item.qty}</span>
                <button onClick={() => changeQty(item.id,1)}
                  style={{width:26,height:26,borderRadius:99,border:'1.5px solid var(--green)',
                    background:'var(--green-light)',cursor:'pointer',fontSize:16,display:'flex',
                    alignItems:'center',justifyContent:'center',color:'var(--green)'}}>+</button>
              </div>
              <div style={{fontWeight:700,color:'var(--green)',fontSize:14,minWidth:42,textAlign:'right'}}>
                {fmt(bestPrice * item.qty)}
              </div>
              <button onClick={() => removeItem(item.id)}
                style={{background:'none',border:'none',color:'#cbd5d1',cursor:'pointer',
                  fontSize:20,lineHeight:1,padding:'0 2px',flexShrink:0}}>×</button>
            </div>
            {prefOpen && (
              <div style={{borderTop:'1px solid var(--border)',padding:'10px 14px 12px',
                background:'var(--bg)',animation:'fadeIn 0.15s ease'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',
                  textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:7}}>Brand preference</div>
                <div style={{display:'flex',gap:8}}>
                  <input autoFocus value={item.brandPref || ''}
                    onChange={e => setBrandPref(item.id, e.target.value)}
                    placeholder={`e.g. "Organic Valley", "store brand"…`}
                    style={{flex:1,padding:'9px 12px',border:'1.5px solid var(--border)',
                      borderRadius:10,fontFamily:'inherit',fontSize:13,outline:'none',background:'white'}}/>
                  <button onClick={() => setExpandedPref(null)}
                    style={{padding:'9px 14px',borderRadius:10,border:'none',
                      background: hasPref ? 'var(--green)' : 'var(--border)',
                      color: hasPref ? 'white' : 'var(--muted)',
                      fontFamily:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',flexShrink:0}}>
                    Done
                  </button>
                </div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>
                  We'll match the closest available product at checkout.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const EmptyState = () => (
    <div style={{textAlign:'center',padding:'48px 24px',color:'var(--muted)'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{display:'block',margin:'0 auto 12px',opacity:0.25}}>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#888" strokeWidth="1.5"/>
        <line x1="3" y1="6" x2="21" y2="6" stroke="#888" strokeWidth="1.5"/>
        <path d="M16 10a4 4 0 01-8 0" stroke="#888" strokeWidth="1.5"/>
      </svg>
      <div style={{fontWeight:600,marginBottom:4}}>Your list is empty</div>
      <div style={{fontSize:13}}>Search for items above to get started</div>
    </div>
  );

  const SearchBar = () => (
    <div style={{position:'relative'}}>
      <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}} width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="var(--muted)" strokeWidth="2"/>
        <path d="m16.5 16.5 4 4" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search and add items…"
        style={{width:'100%',padding:'12px 12px 12px 40px',border:'1.5px solid var(--border)',
          borderRadius:12,fontFamily:'inherit',fontSize:14,outline:'none',
          background:'var(--bg)',boxSizing:'border-box'}}/>
      {filtered.length > 0 && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',
          border:'1px solid var(--border)',borderRadius:12,marginTop:4,
          overflow:'hidden',boxShadow:'var(--shadow-lg)',zIndex:10}}>
          {filtered.slice(0,5).map(p => (
            <div key={p.id} onClick={() => addItem(p)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',
                cursor:'pointer',borderBottom:'1px solid var(--border)'}}>
              <ProductThumb cat={p.cat} size={36}/>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                <div style={{color:'var(--muted)',fontSize:11}}>{p.unit}</div>
              </div>
              <svg style={{marginLeft:'auto'}} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Desktop layout ──────────────────────────────────────
  if (isDesktop) return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Left: list */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'20px 20px 0',background:'white',borderBottom:'1px solid var(--border)',flexShrink:0,position:'relative'}}>
          <SearchBar/>
          <div style={{height:16}}/>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
          {items.length === 0 ? <EmptyState/> : <ItemList/>}
        </div>
      </div>

      {/* Right: summary panel */}
      <DesktopPanel width={300}>
        <div style={{padding:'20px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:800,fontSize:16,fontFamily:'Syne',marginBottom:4}}>List Summary</div>
          <div style={{color:'var(--muted)',fontSize:13}}>{totalQty} item{totalQty!==1?'s':''} across {Object.keys(catCounts).length} categories</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
          {/* Category breakdown */}
          {Object.keys(catCounts).length > 0 && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',
                letterSpacing:'0.06em',marginBottom:10}}>By Category</div>
              {Object.entries(catCounts).map(([cat, count]) => {
                const c = CAT[cat] || CAT.pantry;
                return (
                  <div key={cat} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    <div style={{width:28,height:28,borderRadius:8,background:c.bg,
                      display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${c.accent}22`,flexShrink:0}}>
                      <span style={{fontSize:9,color:c.accent,fontWeight:700,textTransform:'uppercase'}}>{c.label.slice(0,3)}</span>
                    </div>
                    <span style={{flex:1,fontSize:13,fontWeight:500}}>{c.label}</span>
                    <span style={{fontSize:13,color:'var(--muted)'}}>{count} item{count>1?'s':''}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Brand prefs set */}
          {items.filter(i=>i.brandPref).length > 0 && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',
                letterSpacing:'0.06em',marginBottom:10}}>Brand Preferences</div>
              {items.filter(i=>i.brandPref).map(i => (
                <div key={i.id} style={{display:'flex',justifyContent:'space-between',
                  fontSize:12,marginBottom:6,color:'var(--muted)'}}>
                  <span>{i.name}</span>
                  <span style={{fontWeight:600,color:'var(--green)'}}>{i.brandPref}</span>
                </div>
              ))}
            </div>
          )}

          {/* Estimated cost range */}
          {items.length > 0 && (
            <div style={{background:'var(--green-xlight)',borderRadius:12,padding:'14px',
              border:'1px solid rgba(22,163,74,0.15)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--green)',textTransform:'uppercase',
                letterSpacing:'0.06em',marginBottom:6}}>Estimated Total</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--text)',marginBottom:2}}>
                {fmt(total)}
              </div>
              <div style={{fontSize:11,color:'var(--muted)'}}>Price varies by store · compare to find the best deal</div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{padding:'16px',borderTop:'1px solid var(--border)'}}>
            <Btn onClick={() => onNavigate('compare')} style={{width:'100%'}}>
              Compare prices →
            </Btn>
          </div>
        )}
      </DesktopPanel>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'16px 16px 0',background:'white',borderBottom:'1px solid var(--border)',flexShrink:0,position:'relative'}}>
        <SearchBar/>
        <div style={{height:12}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        {items.length === 0 ? <EmptyState/> : <ItemList/>}
      </div>
      {items.length > 0 && (
        <div style={{padding:'16px',background:'white',borderTop:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{totalQty} items</span>
            <span style={{fontSize:13,color:'var(--muted)'}}>Est. from <b style={{color:'var(--text)'}}>{fmt(total)}</b></span>
          </div>
          <Btn onClick={() => onNavigate('compare')} style={{width:'100%'}}>
            Compare prices across stores →
          </Btn>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 3. COMPARE SCREEN
// ══════════════════════════════════════════════════════════════
function CompareScreen({ items, stores, compareVariant, onNavigate, setWinnerStore, isDesktop }) {
  const [revealed, setRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  const totals = stores.map(s => ({
    ...s, total: items.reduce((sum,item) => sum+(item.prices[s.id]||0)*item.qty, 0)
  })).sort((a,b) => a.total-b.total);

  const winner = totals[0], second = totals[1];
  const savings = second.total - winner.total;
  const maxTotal = Math.max(...totals.map(t=>t.total));

  useEffect(() => { const t = setTimeout(()=>setRevealed(true),400); return ()=>clearTimeout(t); }, []);
  const handleOrder = () => { setWinnerStore(winner); onNavigate('checkout'); };

  const WinnerCard = () => (
    <div style={{background:'var(--green)',borderRadius:20,padding:'24px',
      marginBottom:16,position:'relative',overflow:'hidden',
      boxShadow:'0 8px 32px rgba(22,163,74,0.25)'}}>
      <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
      <div style={{position:'absolute',top:10,right:10,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.06)'}}/>
      <span style={{background:'rgba(255,255,255,0.2)',borderRadius:99,padding:'3px 10px',
        fontSize:11,fontWeight:700,color:'white',letterSpacing:'0.06em',textTransform:'uppercase'}}>Best Value</span>
      <div style={{color:'rgba(255,255,255,0.8)',fontSize:13,marginTop:8,marginBottom:2}}>{winner.dist} mi · {winner.delivery} delivery</div>
      <div style={{fontFamily:'Syne',fontSize:24,fontWeight:800,color:'white',marginBottom:4}}>{winner.name}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
        <span style={{fontSize:36,fontWeight:800,color:'white',
          opacity:revealed?1:0,transform:revealed?'translateY(0)':'translateY(8px)',
          transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)'}}>
          {fmt(winner.total)}
        </span>
        <span style={{color:'rgba(255,255,255,0.7)',fontSize:14,opacity:revealed?1:0,transition:'opacity 0.5s 0.3s'}}>total</span>
      </div>
      {revealed && (
        <div style={{marginTop:12,background:'rgba(255,255,255,0.15)',borderRadius:10,
          padding:'8px 12px',fontSize:13,color:'white',display:'inline-block',animation:'fadeIn 0.4s ease'}}>
          💰 Save <b style={{fontSize:15}}>{fmt(savings)}</b> vs next best
        </div>
      )}
    </div>
  );

  const StoreList = () => (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {totals.map((s,i) => (
        <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
          background:'white',borderRadius:14,
          border:`1.5px solid ${i===0?'var(--green)':'var(--border)'}`,
          boxShadow:i===0?'0 2px 12px rgba(22,163,74,0.1)':'none'}}>
          <div style={{width:32,height:32,borderRadius:99,background:i===0?'var(--green)':'var(--bg)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:800,fontSize:14,color:i===0?'white':'var(--muted)',flexShrink:0}}>{i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{s.name}</div>
            <div style={{color:'var(--muted)',fontSize:12}}>{s.dist} mi · {s.delivery}</div>
          </div>
          <div style={{fontWeight:700,fontSize:16,color:i===0?'var(--green)':'var(--text)'}}>{fmt(s.total)}</div>
          {i>0 && <div style={{color:'var(--muted)',fontSize:12,minWidth:40,textAlign:'right'}}>+{fmt(s.total-winner.total)}</div>}
        </div>
      ))}
    </div>
  );

  const BarsView = () => (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {totals.map((s,i) => (
        <div key={s.id} style={{padding:'12px 16px',background:'white',borderRadius:14,
          border:`1.5px solid ${i===0?'var(--green)':'var(--border)'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontWeight:600,fontSize:14}}>{s.name}</span>
            <span style={{fontWeight:700,color:i===0?'var(--green)':'var(--text)'}}>{fmt(s.total)}</span>
          </div>
          <div style={{height:8,background:'var(--bg)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,
              width:revealed?`${(s.total/maxTotal)*100}%`:'0%',
              background:i===0?'var(--green)':'#d1d5db',
              transition:`width 0.8s cubic-bezier(0.4,0,0.2,1) ${i*0.1}s`}}/>
          </div>
        </div>
      ))}
    </div>
  );

  const BadgesView = () => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      {totals.map((s,i) => (
        <div key={s.id} style={{padding:'16px',background:i===0?'var(--green-light)':'white',
          borderRadius:16,border:`1.5px solid ${i===0?'var(--green)':'var(--border)'}`,textAlign:'center'}}>
          {i===0 && <div style={{fontSize:10,fontWeight:700,color:'var(--green)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4}}>★ Best</div>}
          <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{s.name}</div>
          <div style={{fontWeight:800,fontSize:20,color:i===0?'var(--green)':'var(--text)'}}>{fmt(s.total)}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.dist} mi</div>
        </div>
      ))}
    </div>
  );

  const DetailsTable = () => (
    <div style={{background:'white',borderRadius:14,overflow:'hidden',border:'1px solid var(--border)'}}>
      <div style={{display:'grid',gridTemplateColumns:`1fr repeat(3,72px)`,padding:'10px 14px',
        background:'var(--bg)',borderBottom:'1px solid var(--border)',
        fontSize:11,fontWeight:700,color:'var(--muted)',gap:4}}>
        <span>Item</span>
        {totals.slice(0,3).map(s=><span key={s.id} style={{textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name.split(' ')[0]}</span>)}
      </div>
      {items.map((item,i) => {
        const minP = Math.min(...totals.map(s=>item.prices[s.id]||99));
        return (
          <div key={item.id} style={{display:'grid',gridTemplateColumns:`1fr repeat(3,72px)`,
            padding:'12px 14px',borderBottom:i<items.length-1?'1px solid var(--border)':'none',
            alignItems:'center',gap:4}}>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{item.unit}</div>
            </div>
            {totals.slice(0,3).map(s => {
              const p = item.prices[s.id]||0;
              return (
                <span key={s.id} style={{textAlign:'right',fontWeight:p===minP?700:400,
                  color:p===minP?'var(--green)':'var(--text)',fontSize:13}}>
                  {fmt(p)}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── Desktop layout ──────────────────────────────────────
  if (isDesktop) return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Left: winner + compare view */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{display:'flex',gap:0,background:'white',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          {['summary','details'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{flex:1,padding:'14px',fontFamily:'inherit',fontWeight:600,fontSize:14,
                border:'none',cursor:'pointer',background:activeTab===tab?'white':'var(--bg)',
                color:activeTab===tab?'var(--green)':'var(--muted)',
                borderBottom:activeTab===tab?'2px solid var(--green)':'2px solid transparent',
                textTransform:'capitalize'}}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'24px'}}>
          {activeTab==='summary' && <>
            {compareVariant==='summary' && <StoreList/>}
            {compareVariant==='bars'    && <BarsView/>}
            {compareVariant==='badges'  && <BadgesView/>}
          </>}
          {activeTab==='details' && <DetailsTable/>}
        </div>
      </div>

      {/* Right: winner hero + CTA */}
      <DesktopPanel width={340}>
        <div style={{flex:1,overflowY:'auto',padding:'24px'}}>
          <WinnerCard/>
          <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
            Based on your {items.length} items, {winner.name} offers the best total price.
            Orders typically arrive in {winner.delivery}.
          </div>
        </div>
        <div style={{padding:'20px',borderTop:'1px solid var(--border)'}}>
          <Btn onClick={handleOrder} style={{width:'100%'}}>
            Order from {winner.name} — {fmt(winner.total)}
          </Btn>
        </div>
      </DesktopPanel>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',gap:0,background:'white',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {['summary','details'].map(tab => (
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{flex:1,padding:'14px',fontFamily:'inherit',fontWeight:600,fontSize:14,
              border:'none',cursor:'pointer',background:activeTab===tab?'white':'var(--bg)',
              color:activeTab===tab?'var(--green)':'var(--muted)',
              borderBottom:activeTab===tab?'2px solid var(--green)':'2px solid transparent',
              textTransform:'capitalize'}}>
            {tab}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px 16px'}}>
        {activeTab==='summary' && <>
          <WinnerCard/>
          {compareVariant==='summary' && <StoreList/>}
          {compareVariant==='bars'    && <BarsView/>}
          {compareVariant==='badges'  && <BadgesView/>}
        </>}
        {activeTab==='details' && <DetailsTable/>}
      </div>
      <div style={{padding:'16px',background:'white',borderTop:'1px solid var(--border)',flexShrink:0}}>
        <Btn onClick={handleOrder} style={{width:'100%'}}>
          Order from {winner.name} — {fmt(winner.total)}
        </Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 4. CHECKOUT SCREEN
// ══════════════════════════════════════════════════════════════
function CheckoutScreen({ items, store, onNavigate, isDesktop }) {
  const [address, setAddress] = useState('2847 Maple Ave, San Francisco, CA');
  const [timeSlot, setTimeSlot] = useState(0);
  const [tip, setTip] = useState(1);
  const total = store ? items.reduce((s,i) => s+(i.prices[store.id]||0)*i.qty, 0) : 0;
  const tips = [0, total*0.1, total*0.15, total*0.2];
  const tipLabels = ['None','10%','15%','20%'];
  const slots = ['ASAP (45–60 min)','Today 2–4 PM','Today 4–6 PM','Tomorrow 9–11 AM'];
  const serviceFee = 2.99, delivery = 3.49;
  const grandTotal = total + serviceFee + delivery + tips[tip];

  const FormFields = () => (
    <>
      <Section title="Delivery Address">
        <input value={address} onChange={e=>setAddress(e.target.value)}
          style={{width:'100%',padding:'12px',border:'1.5px solid var(--border)',
            borderRadius:10,fontFamily:'inherit',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
      </Section>
      <Section title="Delivery Time">
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {slots.map((s,i)=>(
            <label key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'12px',
              borderRadius:10,border:`1.5px solid ${timeSlot===i?'var(--green)':'var(--border)'}`,
              background:timeSlot===i?'var(--green-light)':'white',cursor:'pointer'}}>
              <input type="radio" checked={timeSlot===i} onChange={()=>setTimeSlot(i)}
                style={{accentColor:'var(--green)'}}/>
              <span style={{fontSize:13,fontWeight:timeSlot===i?600:400}}>{s}</span>
            </label>
          ))}
        </div>
      </Section>
      <Section title="Shopper Tip">
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {tipLabels.map((l,i)=>(
            <button key={i} onClick={()=>setTip(i)}
              style={{padding:'10px 8px',borderRadius:10,fontFamily:'inherit',
                border:`1.5px solid ${tip===i?'var(--green)':'var(--border)'}`,
                background:tip===i?'var(--green-light)':'white',
                color:tip===i?'var(--green)':'var(--text)',
                fontWeight:tip===i?700:400,cursor:'pointer',fontSize:13}}>
              {l}
            </button>
          ))}
        </div>
      </Section>
    </>
  );

  const OrderSummary = () => (
    <>
      {/* Store */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px',
        background:'var(--green-xlight)',borderRadius:12,marginBottom:20,
        border:'1px solid rgba(22,163,74,0.15)'}}>
        <div style={{width:40,height:40,borderRadius:12,background:'var(--green)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'Syne',fontWeight:800,fontSize:16,color:'white'}}>{store?.name[0]}</div>
        <div>
          <div style={{fontWeight:700}}>{store?.name}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>{store?.dist} mi · {store?.delivery}</div>
        </div>
      </div>
      {/* Items */}
      <div style={{marginBottom:16}}>
        {items.map(item => (
          <div key={item.id} style={{display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:8,fontSize:13}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{color:'var(--muted)',fontSize:12}}>×{item.qty}</span>
              <span style={{fontWeight:500}}>{item.name}</span>
            </div>
            <span>{fmt((item.prices[store?.id]||0)*item.qty)}</span>
          </div>
        ))}
      </div>
      {/* Totals */}
      <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
        {[['Subtotal',fmt(total)],['Delivery fee',fmt(delivery)],['Service fee',fmt(serviceFee)],['Shopper tip',fmt(tips[tip])]].map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
            <span style={{color:'var(--muted)'}}>{k}</span><span>{v}</span>
          </div>
        ))}
        <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:10,
          display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16}}>
          <span>Total</span><span style={{color:'var(--green)'}}>{fmt(grandTotal)}</span>
        </div>
      </div>
      {/* Payment */}
      <div style={{marginTop:16,display:'flex',alignItems:'center',gap:10,padding:'12px',
        border:'1.5px solid var(--green)',borderRadius:10,background:'var(--green-light)'}}>
        <div style={{width:36,height:24,background:'#1a1a2e',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:20,height:14,borderRadius:2,background:'linear-gradient(135deg,#f59e0b,#ef4444)',opacity:0.9}}/>
        </div>
        <span style={{fontWeight:600,fontSize:13}}>Visa ending in 4242</span>
        <svg style={{marginLeft:'auto'}} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="m9 18 6-6-6-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </>
  );

  // ── Desktop layout ──────────────────────────────────────
  if (isDesktop) return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      <div style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>
        <FormFields/>
      </div>
      <DesktopPanel width={360}>
        <div style={{flex:1,overflowY:'auto',padding:'24px'}}>
          <div style={{fontWeight:800,fontSize:16,fontFamily:'Syne',marginBottom:16}}>Order Summary</div>
          <OrderSummary/>
        </div>
        <div style={{padding:'20px',borderTop:'1px solid var(--border)'}}>
          <Btn onClick={()=>onNavigate('track')} style={{width:'100%'}}>
            Place order · {fmt(grandTotal)}
          </Btn>
        </div>
      </DesktopPanel>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        <div style={{background:'var(--green-light)',borderRadius:14,padding:'14px 16px',
          marginBottom:16,display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(22,163,74,0.2)'}}>
          <div style={{width:40,height:40,borderRadius:12,background:'var(--green)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'Syne',fontWeight:800,fontSize:16,color:'white'}}>{store?.name[0]}</div>
          <div>
            <div style={{fontWeight:700}}>{store?.name}</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{store?.dist} mi · {store?.delivery}</div>
          </div>
          <div style={{marginLeft:'auto',fontWeight:700,color:'var(--green)',fontSize:15}}>{fmt(total)}</div>
        </div>
        <FormFields/>
        <Section title="Order Summary">
          {[['Subtotal',fmt(total)],['Delivery fee',fmt(delivery)],['Service fee',fmt(serviceFee)],['Shopper tip',fmt(tips[tip])]].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:14}}>
              <span style={{color:'var(--muted)'}}>{k}</span><span>{v}</span>
            </div>
          ))}
          <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:10,
            display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16}}>
            <span>Total</span><span style={{color:'var(--green)'}}>{fmt(grandTotal)}</span>
          </div>
        </Section>
        <Section title="Payment">
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px',
            border:'1.5px solid var(--green)',borderRadius:10,background:'var(--green-light)'}}>
            <div style={{width:36,height:24,background:'#1a1a2e',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:20,height:14,borderRadius:2,background:'linear-gradient(135deg,#f59e0b,#ef4444)',opacity:0.9}}/>
            </div>
            <span style={{fontWeight:600,fontSize:13}}>Visa ending in 4242</span>
          </div>
        </Section>
      </div>
      <div style={{padding:'16px',background:'white',borderTop:'1px solid var(--border)',flexShrink:0}}>
        <Btn onClick={()=>onNavigate('track')} style={{width:'100%'}}>
          Place order · {fmt(grandTotal)}
        </Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 5. TRACK SCREEN
// ══════════════════════════════════════════════════════════════
function TrackScreen({ store, items, onNavigate, isDesktop }) {
  const [step, setStep] = useState(2);
  const [picked, setPicked] = useState([0,1]);
  const steps = ['Placed','Confirmed','Picking','On the way','Delivered'];

  useEffect(() => {
    const t1 = setTimeout(()=>setPicked([0,1,2]), 1800);
    const t2 = setTimeout(()=>setPicked([0,1,2,3]), 3600);
    const t3 = setTimeout(()=>{ setPicked([0,1,2,3,4]); setStep(3); }, 6000);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const eta = step < 3 ? '35–45 min' : '12 min';
  const orderNum = 'GR-52841';

  const ProgressSteps = () => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      {steps.map((s,i) => (
        <React.Fragment key={s}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:i<steps.length-1?0:'none'}}>
            <div style={{width:28,height:28,borderRadius:'50%',display:'flex',
              alignItems:'center',justifyContent:'center',
              background:i<=step?'var(--green)':'var(--bg)',
              border:`2px solid ${i<=step?'var(--green)':'var(--border)'}`,
              transition:'all 0.4s',
              boxShadow:i===step?'0 0 0 4px rgba(22,163,74,0.2)':'none'}}>
              {i<step ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12 5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : i===step ? (
                <div style={{width:8,height:8,borderRadius:'50%',background:'white',animation:'pulse 1.2s infinite'}}/>
              ) : null}
            </div>
            <span style={{fontSize:10,fontWeight:i===step?700:400,
              color:i<=step?'var(--green)':'var(--muted)',textAlign:'center',maxWidth:52}}>{s}</span>
          </div>
          {i<steps.length-1 && (
            <div style={{flex:1,height:2,margin:'0 4px',marginBottom:16,
              background:i<step?'var(--green)':'var(--border)',transition:'background 0.4s'}}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const ItemPickList = () => (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {items.map((item,i) => {
        const isPicked = picked.includes(i);
        return (
          <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,
            padding:'10px 12px',background:'white',borderRadius:10,
            border:`1px solid ${isPicked?'rgba(22,163,74,0.2)':'var(--border)'}`,
            transition:'all 0.3s'}}>
            <div style={{width:22,height:22,borderRadius:99,flexShrink:0,
              background:isPicked?'var(--green)':'var(--bg)',
              border:`2px solid ${isPicked?'var(--green)':'var(--border)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.3s'}}>
              {isPicked && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12 5 5 9-9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <ProductThumb cat={item.cat} size={32}/>
            <span style={{flex:1,fontSize:13,fontWeight:600,
              color:isPicked?'var(--muted)':'var(--text)',
              textDecoration:isPicked?'line-through':'none'}}>{item.name}</span>
            {isPicked && <span style={{fontSize:11,color:'var(--green)',fontWeight:600}}>✓</span>}
          </div>
        );
      })}
    </div>
  );

  // ── Desktop layout ──────────────────────────────────────
  if (isDesktop) return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Left: status */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* ETA hero - compact on desktop */}
        <div style={{padding:'28px 32px',background:'var(--green)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginBottom:4}}>Estimated arrival</div>
              <div style={{fontFamily:'Syne',fontWeight:800,fontSize:48,color:'white',lineHeight:1}}>{eta}</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginTop:4}}>from {store?.name}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginBottom:4}}>Order</div>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:18,color:'white'}}>#{orderNum}</div>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div style={{background:'white',padding:'24px 32px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <ProgressSteps/>
        </div>

        {/* Status message */}
        <div style={{flex:1,overflowY:'auto',padding:'24px 32px'}}>
          <div style={{background:'var(--green-light)',borderRadius:12,padding:'16px',
            border:'1px solid rgba(22,163,74,0.2)',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:15,color:'var(--green)',marginBottom:4}}>
              {step===2?'🛒 Shopper is picking your items':
               step===3?'🚗 Your order is on the way!':
               step===4?'✓ Delivered!':'📋 Order confirmed'}
            </div>
            <div style={{fontSize:13,color:'var(--muted)'}}>Order #{orderNum} · {store?.name}</div>
          </div>
          {step>=4 && (
            <Btn onClick={()=>onNavigate('map')} variant="secondary" style={{width:'100%'}}>
              Start a new order
            </Btn>
          )}
        </div>
      </div>

      {/* Right: items being picked */}
      <DesktopPanel width={320}>
        <div style={{padding:'20px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:800,fontSize:16,fontFamily:'Syne',marginBottom:2}}>Items</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>{picked.length} of {items.length} picked</div>
          {/* Progress bar */}
          <div style={{height:4,background:'var(--border)',borderRadius:99,marginTop:10,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,background:'var(--green)',
              width:`${(picked.length/Math.max(items.length,1))*100}%`,
              transition:'width 0.5s ease'}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          <ItemPickList/>
        </div>
      </DesktopPanel>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'24px 20px',background:'var(--green)',textAlign:'center',flexShrink:0}}>
        <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginBottom:4}}>Estimated arrival</div>
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:42,color:'white',lineHeight:1}}>{eta}</div>
        <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginTop:4}}>from {store?.name}</div>
      </div>
      <div style={{background:'white',padding:'20px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <ProgressSteps/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        <div style={{background:'var(--green-light)',borderRadius:12,padding:'14px',
          marginBottom:16,border:'1px solid rgba(22,163,74,0.2)'}}>
          <div style={{fontWeight:700,fontSize:14,color:'var(--green)',marginBottom:2}}>
            {step===2?'🛒 Shopper is picking your items':
             step===3?'🚗 Your order is on the way!':
             step===4?'✓ Delivered!':'📋 Order confirmed'}
          </div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Order #{orderNum}</div>
        </div>
        {step<4 && (
          <>
            <div style={{fontWeight:700,fontSize:13,color:'var(--muted)',textTransform:'uppercase',
              letterSpacing:'0.06em',marginBottom:10}}>
              Items ({picked.length}/{items.length} picked)
            </div>
            <ItemPickList/>
          </>
        )}
      </div>
      {step>=4 && (
        <div style={{padding:'16px',background:'white',borderTop:'1px solid var(--border)'}}>
          <Btn onClick={()=>onNavigate('map')} variant="secondary" style={{width:'100%'}}>
            Start a new order
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── Export all screens ──────────────────────────────────────
Object.assign(window, {
  MapScreen, ListScreen, CompareScreen, CheckoutScreen, TrackScreen,
  Pill, Btn, ProductThumb, Section, DesktopPanel, fmt, CAT
});
