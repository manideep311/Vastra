import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExploreRoleModal from '../../components/ExploreRoleModal';
import {
  ShieldCheckIcon,
  CubeIcon,
  UsersIcon,
  CheckBadgeIcon,
  SparklesIcon,
  LockClosedIcon,
  GlobeAltIcon,
  Bars3Icon,
  XMarkIcon,
  TruckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

// Stable Wikimedia Commons "Special:FilePath" redirects — same real, freely
// licensed fabric photography used to seed the product catalog.
const wm = (filename, width = 1400) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

const FABRIC_CATEGORIES = [
  {
    name: 'Cotton',
    desc: 'Breathable poplins, twills & organic weaves',
    img: wm('Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg'),
    blurb:
      'A natural fibre spun from the cotton plant’s seed pod. Soft, breathable, and easy to dye, it’s the backbone of shirting, casualwear, and home textiles — from crisp poplin to heavier twill.',
  },
  {
    name: 'Silk',
    desc: 'Pure mulberry silk & handloom brocade',
    img: wm('Pink Woven Cotton Silk Fabric Texture Free Creative Commons (6962346249).jpg'),
    blurb:
      'Spun from the cocoon fibre of silkworms, silk is prized for its natural sheen, light weight, and smooth drape. Mulberry silk satin and handloom brocade with zari work are staples for bridal and eveningwear.',
  },
  {
    name: 'Wool',
    desc: 'Merino suiting & heritage tweed',
    img: wm('Beige wool texture.jpg'),
    blurb:
      'Shorn from sheep and spun into yarn, wool insulates while staying breathable. Fine merino gives suiting its smooth drape, while heavier tweed and coating fabrics are built for structure and warmth.',
  },
  {
    name: 'Denim',
    desc: 'Stretch & raw selvedge, ring-spun',
    img: wm('Jeansfabric (cropped).jpg'),
    blurb:
      'A rugged cotton twill woven with an indigo warp and white weft, giving denim its signature fade. Comfort-stretch blends suit everyday wear, while raw selvedge denim is prized for character and durability.',
  },
  {
    name: 'Linen',
    desc: 'European flax, breathable & textured',
    img: wm('Linen, Texture (2242358989).jpg'),
    blurb:
      'Woven from the flax plant, linen is one of the oldest textiles in the world. Its open, textured weave makes it exceptionally breathable — ideal for summer apparel and relaxed, loose-fit garments.',
  },
  {
    name: 'Velvet',
    desc: 'Plush pile for eveningwear & decor',
    img: wm('Velour.jpg'),
    swatch: 'from-emerald-800 via-emerald-900 to-emerald-950',
    blurb:
      'Woven with a dense, cut pile that catches the light, velvet has a signature plush hand-feel. It’s a favourite for eveningwear, drapery, and upholstery wherever a rich, luxurious finish is called for.',
  },
];

const TRUST_ITEMS = [
  { icon: ShieldCheckIcon, label: 'Verified & Trusted' },
  { icon: CheckBadgeIcon, label: 'Quality Assured' },
  { icon: LockClosedIcon, label: 'Secure Payments' },
  { icon: GlobeAltIcon, label: 'Global Shipping' },
];

const NAV_LINKS = [
  { href: '#fabrics', label: 'Fabrics' },
  { href: '#suppliers', label: 'Suppliers' },
  { href: '#categories', label: 'Categories' },
  { href: '#about', label: 'About Us' },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFabric, setActiveFabric] = useState(null);
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fdfbf8]">
      {/* Hero with the fabric-patchwork background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/hero-fabric-patchwork.jpg)' }}
          />
          {/* Legibility scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/55 via-emerald-950/35 to-emerald-950/70" />
        </div>

        {/* Nav */}
        <header className="relative z-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-20">
            <Link to="/" className="flex flex-col leading-none text-white">
              <span className="font-serif-display text-2xl md:text-3xl tracking-wide">VASTRA</span>
              <span className="text-[11px] font-medium text-amber-200/90 tracking-wide mt-0.5">Where Tradition Meets Trade</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-white/90 text-sm font-medium hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/register"
                className="text-sm font-medium text-white border border-white/40 px-5 py-2 rounded-full hover:bg-white/10 transition-colors"
              >
                Join as Supplier
              </Link>
              <button
                type="button"
                onClick={() => setExploreOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-800 border border-emerald-700 px-5 py-2 rounded-full hover:bg-emerald-700 transition-colors"
              >
                <UsersIcon className="w-4 h-4" />
                Sign In
              </button>
            </div>

            <button className="md:hidden text-white p-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
              {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>

          {menuOpen && (
            <div className="md:hidden relative z-20 bg-emerald-950/95 backdrop-blur-md px-6 py-4 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-white/90 text-sm font-medium py-1">
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 mt-2">
                <Link to="/register" className="flex-1 text-center text-sm font-medium text-white border border-white/40 px-4 py-2 rounded-full">
                  Join as Supplier
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExploreOpen(true);
                  }}
                  className="flex-1 text-center text-sm font-semibold text-white bg-emerald-800 px-4 py-2 rounded-full"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-8 pb-24 md:pt-14 md:pb-32">
          <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-emerald-900 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
            <SparklesIcon className="w-3.5 h-3.5" />
            Premium fabric sourcing, simplified
          </span>

          <h1 className="font-serif-display text-white text-4xl md:text-6xl font-bold leading-[1.15] mb-6">
            Source fabrics directly<br className="hidden md:block" /> from <span className="text-emerald-300">verified suppliers</span>
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">
            Browse, compare, and order — all in one elegant marketplace.
          </p>

          <button
            type="button"
            onClick={() => setExploreOpen(true)}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-bold text-lg px-10 py-4 rounded-full shadow-2xl shadow-amber-500/30 transition-all duration-200 hover:scale-105 hover:shadow-amber-400/40 active:scale-95 mb-14"
          >
            Explore Website
            <ArrowRightIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-16">
            {[
              { icon: ShieldCheckIcon, value: '350K+', label: 'Verified Suppliers' },
              { icon: CubeIcon, value: '400K+', label: 'Products Listed' },
              { icon: UsersIcon, value: '600K+', label: 'Trusted Buyers' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center mb-2 shadow-sm">
                  <stat.icon className="w-5 h-5 text-emerald-800" />
                </div>
                <p className="font-display text-xl md:text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-white/70 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-full px-8 py-4 max-w-3xl mx-auto">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-white/85 text-sm font-medium">
                <item.icon className="w-4 h-4 text-amber-300 flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fabrics */}
      <section id="fabrics" className="scroll-mt-24 max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-serif-display text-3xl md:text-4xl font-bold text-slate-900 mb-3">Every fabric, one marketplace</h2>
          <p className="text-slate-500">From everyday cottons to heirloom silks — sourced directly from the mills that make them.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {FABRIC_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveFabric(cat)}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] border border-slate-200/70 text-left"
            >
              {cat.img ? (
                <img src={cat.img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.swatch} transition-transform duration-500 group-hover:scale-105`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-display font-bold text-white">{cat.name}</p>
                <p className="text-white/70 text-xs mt-0.5 hidden md:block">{cat.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Suppliers */}
      <section id="suppliers" className="scroll-mt-24 bg-emerald-950 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-serif-display text-3xl md:text-4xl font-bold mb-4">Built for serious suppliers</h2>
            <p className="text-emerald-200 mb-8 max-w-md">
              List your fabrics in front of thousands of verified buyers, respond to RFQs with AI-assisted quoting, and get paid
              securely — no middlemen, no guesswork.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-amber-400 text-emerald-950 font-semibold px-6 py-3 rounded-full hover:bg-amber-300 transition-colors"
            >
              Join as Supplier
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheckIcon, title: 'Verified badge', desc: 'Stand out with a trust badge buyers recognise.' },
              { icon: TruckIcon, title: 'Reliable fulfillment', desc: 'MOQ & lead-time tools built for bulk orders.' },
              { icon: SparklesIcon, title: 'AI quote assist', desc: 'Fair price & lead-time suggestions in one click.' },
              { icon: GlobeAltIcon, title: 'Nationwide reach', desc: 'Get discovered by buyers across India.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <f.icon className="w-5 h-5 text-amber-300 mb-3" />
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-emerald-200 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="scroll-mt-24 max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-serif-display text-3xl md:text-4xl font-bold text-slate-900 mb-3">Browse by category</h2>
          <p className="text-slate-500">A growing catalog across natural fibres, synthetics, and home textiles.</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {[...FABRIC_CATEGORIES.map((c) => c.name), 'Corduroy', 'Rayon', 'Chambray', 'Jute', 'Canvas', 'Home Textiles'].map((cat) => (
            <Link
              key={cat}
              to="/home"
              className="px-5 py-2 rounded-full text-sm font-medium bg-white border border-slate-200/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-24 bg-gradient-to-b from-amber-50/50 to-[#fdfbf8]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">About VASTRA</h2>
          <p className="text-slate-600 leading-relaxed">
            VASTRA connects textile buyers directly with verified suppliers across India — cutting out the guesswork of
            sourcing fabric. From premium mulberry silk to workaday polyester, every listing carries real fabric
            specifications, transparent tiered pricing in Indian Rupees, and a supplier you can actually trust. Where
            tradition meets trade.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/register" className="border border-emerald-700 text-emerald-800 font-medium px-6 py-3 rounded-full hover:bg-emerald-50 transition-colors">
              Create an account
            </Link>
            <button
              type="button"
              onClick={() => setExploreOpen(true)}
              className="bg-emerald-800 text-white font-semibold px-6 py-3 rounded-full hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-200/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start leading-none">
            <span className="font-serif-display text-lg text-white tracking-wide">VASTRA</span>
            <span className="text-[11px] mt-1">Where Tradition Meets Trade</span>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} VASTRA. All rights reserved.</p>
        </div>
      </footer>

      {exploreOpen && <ExploreRoleModal onClose={() => setExploreOpen(false)} />}

      {/* Fabric info modal */}
      {activeFabric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 backdrop-blur-sm px-4"
          onClick={() => setActiveFabric(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9]">
              {activeFabric.img ? (
                <img src={activeFabric.img} alt={activeFabric.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${activeFabric.swatch}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent" />
              <button
                type="button"
                onClick={() => setActiveFabric(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <p className="absolute bottom-4 left-5 font-serif-display text-2xl font-bold text-white">{activeFabric.name}</p>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm leading-relaxed">{activeFabric.blurb}</p>
              <Link
                to="/home"
                className="mt-6 flex items-center justify-center gap-2 w-full bg-emerald-800 text-white font-semibold px-6 py-3 rounded-full hover:bg-emerald-700 transition-colors"
              >
                Browse {activeFabric.name}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
