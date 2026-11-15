import { C } from '../lib/tokens'
import { brandInitials, useBrand } from '../lib/brand'

const serif = { fontFamily: "'DM Serif Display', Georgia, serif", color: C.text }

// The manager's name or logo: the business's own once set in Settings,
// "Local Manager" before that. `size` is 'lg' (sign-in page) or 'md' (sidebar).
export function BrandMark({ size = 'md', align = 'left' }) {
  const brand = useBrand()
  const lg = size === 'lg'
  const font = lg ? 28 : 17
  const box = { minHeight: lg ? 72 : 42, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', visibility: brand.ready ? 'visible' : 'hidden' }
  if (brand.logo) return <div style={box}><img src={brand.logo} alt={brand.name || 'Logo'} style={{ display: 'block', maxWidth: lg ? 260 : 170, maxHeight: lg ? 96 : 56, objectFit: 'contain' }} /></div>
  if (brand.name) return <div style={box}><div style={{ ...serif, fontSize: font, letterSpacing: lg ? '-0.5px' : '-0.2px', lineHeight: 1.2, textAlign: align }}>{brand.name}</div></div>
  return <div style={box}>
    <div style={{ ...serif, fontSize: font, letterSpacing: lg ? '-0.5px' : '-0.2px', lineHeight: 1.2 }}>Local</div>
    <div style={{ ...serif, fontSize: font, letterSpacing: lg ? '-0.5px' : '-0.2px', lineHeight: 1.2 }}>Manager</div>
  </div>
}

// A small square mark: the logo, or the business's initials.
export function BrandBadge({ className }) {
  const brand = useBrand()
  return <div className={className} style={brand.logo ? { background: '#fff', border: `1px solid ${C.border}`, padding: 4 } : undefined}>
    {brand.logo ? <img src={brand.logo} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : brandInitials(brand.name)}
  </div>
}
