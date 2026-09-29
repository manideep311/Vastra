import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/20/solid';
import ExploreRoleModal from '../../components/ExploreRoleModal';
import Wordmark from '../../components/Wordmark';
import Dialog from '../../components/ui/Dialog';
import ProductImage from '../../components/ui/ProductImage';

// Stable Wikimedia Commons "Special:FilePath" redirects — the same freely
// licensed fabric photography used to seed the product catalog.
const wm = (filename, width = 800) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

const FABRICS = [
  {
    name: 'Cotton',
    desc: 'Poplins, twills & organic weaves',
    file: 'Blue Cotton Fabric Texture Free Creative Commons (6962342861).jpg',
    blurb:
      'A natural fibre spun from the cotton plant’s seed pod. Soft, breathable, and easy to dye, it’s the backbone of shirting, casualwear, and home textiles — from crisp poplin to heavier twill.',
  },
  {
    name: 'Silk',
    desc: 'Mulberry silk & handloom brocade',
    file: 'Pink Woven Cotton Silk Fabric Texture Free Creative Commons (6962346249).jpg',
    blurb:
      'Spun from the cocoon fibre of silkworms, silk is prized for its natural sheen, light weight, and smooth drape. Mulberry silk satin and handloom brocade with zari work are staples for bridal and eveningwear.',
  },
  {
    name: 'Wool',
    desc: 'Merino suiting & heritage tweed',
    file: 'Beige wool texture.jpg',
    blurb:
      'Shorn from sheep and spun into yarn, wool insulates while staying breathable. Fine merino gives suiting its smooth drape, while heavier tweed and coating fabrics are built for structure and warmth.',
  },
  {
    name: 'Denim',
    desc: 'Stretch & raw selvedge',
    file: 'Jeansfabric (cropped).jpg',
    blurb:
      'A rugged cotton twill woven with an indigo warp and white weft, giving denim its signature fade. Comfort-stretch blends suit everyday wear, while raw selvedge denim is prized for character and durability.',
  },
  {
    name: 'Linen',
    desc: 'Flax, breathable & textured',
    file: 'Linen, Texture (2242358989).jpg',
    blurb:
      'Woven from the flax plant, linen is one of the oldest textiles in the world. Its open, textured weave makes it exceptionally breathable — ideal for summer apparel and relaxed, loose-fit garments.',
  },
  {
    name: 'Velvet',
    desc: 'Plush pile for eveningwear & decor',
    file: 'Velour.jpg',
    blurb:
      'Woven with a dense, cut pile that catches the light, velvet has a signature plush hand-feel. It’s a favourite for eveningwear, drapery, and upholstery wherever a rich, luxurious finish is called for.',
  },
];

// What the product actually does — no invented numbers.
const PROMISES = ['Minimum orders shown up front', 'Bulk price tiers', 'Quotes negotiated directly', 'Orders tracked to dispatch'];

const BUYER_STEPS = [
  { title: 'Compare suppliers', body: 'Search by fibre, weave or end use and compare price, MOQ, stock and lead time side by side.' },
  { title: 'Order at the minimum — or negotiate', body: 'Add to cart at the supplier’s MOQ, or request a bulk quote for larger and custom runs.' },
  { title: 'Track every order', body: 'Each supplier confirms, prepares and dispatches your order, and you’re notified at every step.' },
];

const SUPPLIER_FEATURES = [
  { title: 'Listings with real specs', body: 'GSM, width, composition and roll length — the numbers buyers use to decide.' },
  { title: 'Your MOQ, enforced', body: 'Buyers can’t check out below your minimum order or above your stock.' },
  { title: 'Quote requests', body: 'Reply to bulk enquiries with price, lead time and how long the offer holds.' },
  { title: 'Order pipeline', body: 'Accept, prepare and dispatch from one queue. Buyers are notified automatically.' },
];

const NAV_LINKS = [
  { href: '#fabrics', label: 'Fabrics' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#suppliers', label: 'For suppliers' },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFabric, setActiveFabric] = useState(null);
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* ---------------------------------------------------------------- Hero */}
      <div className="relative overflow-hidden bg-brand-strong text-white">
        <header className="relative z-20">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-10">
            <Wordmark to="/" tone="light" />
            <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/register?role=supplier" className="btn btn-sm text-white/90 hover:bg-white/10 hover:text-white">
                Join as supplier
              </Link>
              <button type="button" onClick={() => setExploreOpen(true)} className="btn btn-sm border border-white/30 text-white hover:bg-white/10">
                Sign in
              </button>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
            >
              {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
          {menuOpen && (
            <div id="landing-menu" className="animate-fade-in border-t border-white/10 px-5 pb-5 md:hidden">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block border-b border-white/10 py-3.5 text-[15px] font-medium text-white/90">
                  {link.label}
                </a>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/register?role=supplier" className="btn border border-white/30 text-white">
                  Join as supplier
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExploreOpen(true);
                  }}
                  className="btn bg-white text-ink"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 lg:grid-cols-12 lg:gap-8 lg:px-10 lg:pb-24 lg:pt-12">
          <div className="animate-fade-up lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">B2B textile marketplace · India</p>
            <h1 className="mt-5 font-serif-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Where tradition
              <br />
              meets <span className="italic text-amber-100">trade.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-emerald-50/80 sm:text-lg">
              Source cotton, silk, linen and more directly from Indian mills and wholesalers — with clear minimum orders, bulk pricing and quotes built in.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setExploreOpen(true)}
                className="group btn btn-lg h-14 bg-accent px-8 text-base text-ink shadow-[0_14px_36px_-14px_rgba(201,138,27,0.8)] hover:bg-[#d99a2b]"
              >
                Explore Textile
                <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <Link to="/register?role=supplier" className="btn btn-lg h-14 text-white/90 hover:bg-white/10 hover:text-white">
                List your fabrics
              </Link>
            </div>
          </div>

          {/* Layered imagery: the patchwork hero with two swatches set against it */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto aspect-[5/4] w-full max-w-xl lg:ml-auto">
              <picture>
                <source media="(min-width: 768px)" srcSet="/hero-fabric-patchwork.webp" type="image/webp" />
                <source srcSet="/hero-fabric-patchwork-768.webp" type="image/webp" />
                <img
                  src="/hero-fabric-patchwork.jpg"
                  alt="Patchwork of Indian textiles in indigo, madder and turmeric tones"
                  width="1536"
                  height="1024"
                  fetchPriority="high"
                  className="h-full w-full animate-fade-in rounded-[2rem] object-cover shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
                />
              </picture>
              <div className="absolute -bottom-6 -left-4 hidden w-36 rotate-[-4deg] animate-fade-up overflow-hidden rounded-2xl border-4 border-brand-strong shadow-xl sm:block lg:-left-10 lg:w-44 [animation-delay:150ms]">
                <ProductImage src={wm(FABRICS[1].file, 330)} alt="" className="aspect-[4/5] w-full" />
              </div>
              <div className="absolute -right-3 -top-5 hidden w-28 rotate-[5deg] animate-fade-up overflow-hidden rounded-2xl border-4 border-brand-strong shadow-xl sm:block lg:-right-6 lg:w-32 [animation-delay:250ms]">
                <ProductImage src={wm(FABRICS[4].file, 330)} alt="" className="aspect-square w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10">
          <ul className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-2 px-5 py-5 text-sm text-emerald-50/75 lg:justify-between lg:px-10">
            {PROMISES.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* -------------------------------------------------------------- Fabrics */}
      <section id="fabrics" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="fabrics-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">The catalog</p>
            <h2 id="fabrics-title" className="mt-3 font-serif-display text-4xl font-semibold leading-tight text-ink md:text-5xl">
              Every fibre, one marketplace.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">From everyday cottons to heirloom silks — listed by the mills and wholesalers who make and stock them.</p>
        </div>

        <ul className="mt-12 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4 md:gap-4">
          {FABRICS.map((fabric, i) => (
            <li key={fabric.name} className={i === 0 ? 'col-span-2 row-span-2' : i === 3 ? 'md:col-span-2' : ''}>
              <button
                type="button"
                onClick={() => setActiveFabric(fabric)}
                className="group relative block h-full w-full overflow-hidden rounded-2xl text-left"
                aria-label={`About ${fabric.name}`}
              >
                <ProductImage
                  src={wm(fabric.file, i === 0 ? 960 : 500)}
                  alt=""
                  className="h-full w-full"
                  imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/5 to-transparent" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <span className={`block font-serif-display font-semibold text-white ${i === 0 ? 'text-3xl' : 'text-xl'}`}>{fabric.name}</span>
                  <span className="mt-0.5 hidden text-xs text-white/75 sm:block">{fabric.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section id="how-it-works" className="scroll-mt-6 border-y border-line bg-surface" aria-labelledby="how-title">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-4">
            <p className="eyebrow">For buyers</p>
            <h2 id="how-title" className="mt-3 font-serif-display text-4xl font-semibold leading-tight text-ink">
              Sourcing, without the back-and-forth.
            </h2>
            <button type="button" onClick={() => setExploreOpen(true)} className="btn btn-primary mt-8">
              Start browsing <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
          <ol className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {BUYER_STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="font-serif-display text-4xl text-accent">0{i + 1}</span>
                <h3 className="mt-4 font-display text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ Suppliers */}
      <section id="suppliers" className="scroll-mt-6 bg-brand-strong text-white" aria-labelledby="suppliers-title">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:px-10 lg:py-24">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">For suppliers</p>
            <h2 id="suppliers-title" className="mt-3 font-serif-display text-4xl font-semibold leading-tight">
              Built for mills and wholesalers.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-emerald-50/75">
              Put your catalog in front of buyers who order by the roll — with the terms you set, enforced at checkout.
            </p>
            <Link to="/register?role=supplier" className="btn btn-lg mt-8 bg-accent text-ink hover:bg-[#d99a2b]">
              Join as a supplier <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:col-span-7">
            {SUPPLIER_FEATURES.map((f) => (
              <li key={f.title} className="bg-brand-strong p-6">
                <h3 className="font-display font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-emerald-50/70">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- About */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center lg:py-24" aria-labelledby="about-title">
        <h2 id="about-title" className="font-serif-display text-3xl font-semibold text-ink md:text-4xl">
          About Vastra
        </h2>
        <p className="mt-5 leading-relaxed text-ink-2">
          Vastra connects textile buyers directly with suppliers across India. Every listing carries real fabric specifications, transparent pricing in
          rupees and the supplier’s own minimum order — so a sourcing decision takes minutes, not weeks of calls.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => setExploreOpen(true)} className="btn btn-primary">
            Explore Textile
          </button>
          <Link to="/register" className="btn btn-secondary">
            Create an account
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row lg:px-10">
          <Wordmark to="/" />
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} VASTRA. Fabric photography via Wikimedia Commons.</p>
        </div>
      </footer>

      <ExploreRoleModal open={exploreOpen} onClose={() => setExploreOpen(false)} />

      <Dialog open={Boolean(activeFabric)} onClose={() => setActiveFabric(null)} title={activeFabric?.name || 'Fabric'} size="md" bare>
        {activeFabric && (
          <>
            <div className="relative">
              <ProductImage src={wm(activeFabric.file, 960)} alt={activeFabric.name} className="aspect-[16/9] w-full" />
              <button
                type="button"
                onClick={() => setActiveFabric(null)}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/40 text-white backdrop-blur-sm transition-colors hover:bg-ink/60"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="font-serif-display text-3xl font-semibold text-ink">{activeFabric.name}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{activeFabric.blurb}</p>
              <Link to={`/products?q=${encodeURIComponent(activeFabric.name)}`} className="btn btn-primary mt-6 w-full">
                Browse {activeFabric.name.toLowerCase()} <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

export default LandingPage;
