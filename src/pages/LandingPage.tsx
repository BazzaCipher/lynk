import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { SEO } from '../components/seo/SEO';
import { SoftwareAppJsonLd } from '../components/seo/JsonLd';

/* ─── Scroll-reveal hook ─────────────────────────────────────────────── */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Simulated canvas for hero ────────────────────────────────────────── */

function HeroCanvas() {
  // Node positions (x, y) – designed for a 800×400 viewBox
  const po = { x: 30, y: 40 };       // Purchase Order node: 170×130
  const bank = { x: 30, y: 220 };     // Bank Statement node: 170×130
  const calc = { x: 320, y: 120 };    // Calculation node: 170×120
  const label = { x: 310, y: 290 };   // Label node: 200×44 (no outlink)
  const sheet = { x: 590, y: 90 };    // Sheet node: 180×200

  // Edges connect from output handles to input handles at exact positions
  const edges = [
    { from: { x: po.x + 170, y: po.y + 69 }, to: { x: calc.x, y: calc.y + 49 } },
    { from: { x: bank.x + 170, y: bank.y + 69 }, to: { x: calc.x, y: calc.y + 87 } },
    { from: { x: po.x + 170, y: po.y + 49 }, to: { x: sheet.x, y: sheet.y + 50 } },
    { from: { x: bank.x + 170, y: bank.y + 49 }, to: { x: sheet.x, y: sheet.y + 75 } },
    { from: { x: calc.x + 170, y: calc.y + 104 }, to: { x: sheet.x, y: sheet.y + 100 } },
  ];

  return (
    <div className="mt-16 md:mt-20 max-w-4xl mx-auto hero-illo-enter">
      <div className="rounded-xl border border-paper-200 bg-paper-50 shadow-2xl shadow-gray-200/60 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-paper-100">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 mx-8">
            <div className="h-6 bg-paper-50 rounded-md border border-paper-100 max-w-xs mx-auto flex items-center justify-center">
              <span className="text-[10px] text-bridge-400 font-medium">paperbridge / canvas</span>
            </div>
          </div>
        </div>

        {/* Canvas SVG */}
        <svg viewBox="0 0 800 400" className="w-full h-auto bg-[#fafafa]" style={{ aspectRatio: '800 / 400' }}>
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#d1d5db" opacity="0.4" />
            </pattern>
            <style>{`
              @keyframes hero-dash { to { stroke-dashoffset: -20; } }
              .hero-edge { animation: hero-dash 1.5s linear infinite; }
            `}</style>
          </defs>
          <rect width="800" height="400" fill="url(#hero-dots)" />

          {/* Edges */}
          {edges.map((e, i) => {
            const dx = (e.to.x - e.from.x) * 0.5;
            return (
              <path
                key={i}
                d={`M${e.from.x},${e.from.y} C${e.from.x + dx},${e.from.y} ${e.to.x - dx},${e.to.y} ${e.to.x},${e.to.y}`}
                fill="none"
                stroke="#d4c8b8"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="hero-edge"
              />
            );
          })}

          {/* Rental Statement Node */}
          <g transform={`translate(${po.x},${po.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Rental Statement</text>
            <text x="10" y="48" fontSize="9" fill="#b8a58e">property</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(56,132,212,0.1)" />
            <text x="66" y="49" fontSize="8" fill="#2560a0">14 Elm St</text>
            <text x="10" y="68" fontSize="9" fill="#b8a58e">rent</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="69" fontSize="8" fill="#b07a10">$31,200.00</text>
            <text x="10" y="88" fontSize="9" fill="#b8a58e">period</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(148,90,210,0.1)" />
            <text x="66" y="89" fontSize="8" fill="#6e3aaa">FY 2024–25</text>
            <text x="10" y="108" fontSize="9" fill="#b8a58e">agent fees</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="109" fontSize="8" fill="#b07a10">$3,432.00</text>
            <circle cx="170" cy="49" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#945ad2" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* Loan Summary Node */}
          <g transform={`translate(${bank.x},${bank.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Loan Summary</text>
            <text x="10" y="48" fontSize="9" fill="#b8a58e">lender</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(56,132,212,0.1)" />
            <text x="66" y="49" fontSize="8" fill="#2560a0">CBA ••7193</text>
            <text x="10" y="68" fontSize="9" fill="#b8a58e">interest</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="69" fontSize="8" fill="#b07a10">$18,640.00</text>
            <text x="10" y="88" fontSize="9" fill="#b8a58e">principal</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="89" fontSize="8" fill="#b07a10">$6,200.00</text>
            <text x="10" y="108" fontSize="9" fill="#b8a58e">balance</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="109" fontSize="8" fill="#b07a10">$412,000</text>
            <circle cx="170" cy="49" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* Calculation Node */}
          <g transform={`translate(${calc.x},${calc.y})`}>
            <rect width="170" height="120" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Net Rental Income</text>
            <rect x="10" y="38" width="60" height="16" rx="4" fill="rgba(228,160,28,0.15)" />
            <text x="16" y="49" fontSize="8" fontWeight="600" fill="#b07a10">SUBTRACT</text>
            <circle cx="0" cy="49" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <text x="10" y="70" fontSize="9" fill="#b8a58e">Rent</text>
            <text x="100" y="70" fontSize="8" fill="#b07a10">$31,200</text>
            <circle cx="0" cy="87" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <text x="10" y="87" fontSize="9" fill="#b8a58e">Interest</text>
            <text x="100" y="87" fontSize="8" fill="#b07a10">$18,640</text>
            <rect x="10" y="96" width="150" height="16" rx="4" fill="rgba(228,160,28,0.1)" />
            <text x="18" y="107" fontSize="9" fontWeight="600" fill="#b07a10">= $12,560.00</text>
            <circle cx="170" cy="104" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* Label Node */}
          <g transform={`translate(${label.x},${label.y})`}>
            <rect width="200" height="44" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <text x="14" y="18" fontSize="9" fill="#9c8468" fontWeight="600">Label</text>
            <text x="14" y="34" fontSize="12" fontWeight="600" fill="#3f3529">14 Elm St — FY 2024–25</text>
          </g>

          {/* Sheet Node */}
          <g transform={`translate(${sheet.x},${sheet.y})`}>
            <rect width="180" height="200" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="180" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="180" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Rental Schedule</text>
            <circle cx="0" cy="50" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="75" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="100" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <rect x="8" y="36" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="50" fontSize="9" fontWeight="600" fill="#3f3529">Property</text>
            <text x="14" y="72" fontSize="8" fill="#b8a58e">Address</text>
            <text x="100" y="72" fontSize="8" fill="#7d6a52">14 Elm St</text>
            <text x="14" y="88" fontSize="8" fill="#b8a58e">Lender</text>
            <text x="100" y="88" fontSize="8" fill="#7d6a52">CBA ••7193</text>
            <rect x="8" y="100" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="114" fontSize="9" fontWeight="600" fill="#3f3529">Income</text>
            <text x="110" y="114" fontSize="9" fill="#b07a10" fontWeight="600">$31,200</text>
            <text x="14" y="136" fontSize="8" fill="#b8a58e">Interest</text>
            <text x="110" y="136" fontSize="8" fill="#7d6a52">$18,640</text>
            <text x="14" y="152" fontSize="8" fill="#b8a58e">Agent fees</text>
            <text x="110" y="152" fontSize="8" fill="#7d6a52">$3,432</text>
            <rect x="8" y="164" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="178" fontSize="9" fontWeight="600" fill="#3f3529">Net income</text>
            <text x="110" y="178" fontSize="9" fill="#e4a01c" fontWeight="600">$9,128</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ─── Feature data ──────────────────────────────────────────────────────── */

const features = [
  {
    num: '01',
    title: 'Rental Property Schedules',
    description: 'Built for the documents you actually get — rental statements, loan summaries, depreciation schedules, strata levies, and insurance renewals.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Source-Linked Numbers',
    description: 'Every figure in your summary links back to the exact line on the original document. If the ATO asks, you can show them.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Automatic Totals',
    description: 'Rental income, interest, repairs, agent fees — totalled and cross-checked automatically. No formulas to maintain.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Client-Ready Output',
    description: 'Generate a clean rental property summary you can attach to the return or send to your client for sign-off.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Multi-Property Support',
    description: 'Clients with two, five, or ten properties? Each one gets its own workspace. Roll them up into a single summary at the end.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m-1.125-2.625c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
  },
  {
    num: '06',
    title: 'Full Audit Trail',
    description: 'Export the complete workpaper — every source document, every extracted value, every calculation — as a single portable file.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '01',
    title: 'Upload the documents',
    description: 'Drop your client\'s rental statements, loan letters, and receipts onto the canvas. PDF or image, it just works.',
    pulseClass: 'step-pulse-1',
  },
  {
    num: '02',
    title: 'Extract the numbers',
    description: 'Select the figures you need — rent received, interest paid, agent fees. Each value stays linked to the original document.',
    pulseClass: 'step-pulse-2',
  },
  {
    num: '03',
    title: 'Export the summary',
    description: 'Get a rental property schedule ready for the tax return. Every number traceable, every document attached.',
    pulseClass: 'step-pulse-3',
  },
];

const comparisons = [
  {
    before: 'Manually keying rental statements into spreadsheets',
    after: 'Upload once, extract automatically',
  },
  {
    before: 'Chasing clients for missing documents at lodgement',
    after: 'See gaps before you start the return',
  },
  {
    before: 'Hoping the ATO doesn\'t ask how you got that number',
    after: 'Every figure traced to its source document',
  },
];

/* ─── Scroll-revealed sections ─────────────────────────────────────────── */

function ComparisonSection({ comparisons }: { comparisons: { before: string; after: string }[] }) {
  const { ref, visible } = useReveal(0.2);
  return (
    <section ref={ref} className="py-16 md:py-20 bg-paper-50/40">
      <div className={`max-w-3xl mx-auto px-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <p className="text-xs font-semibold text-copper-500 uppercase tracking-[0.15em] mb-8 text-center">Before &amp; after Paperbridge</p>
        <div className="space-y-3">
          {comparisons.map((c, i) => (
            <div
              key={c.before}
              className="flex items-center gap-4 md:gap-6 rounded-lg border border-paper-200/60 bg-white/60 backdrop-blur-sm px-5 py-3.5 transition-all duration-500"
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)' }}
            >
              <div className="flex-1 text-right">
                <span className="text-sm text-bridge-400 line-through decoration-bridge-400/40">{c.before}</span>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-copper-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-copper-500 arrow-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-bridge-800">{c.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ features }: { features: { num: string; title: string; description: string; icon: React.ReactNode }[] }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <section ref={ref} className="relative py-24 md:py-32 bg-bridge-900 overflow-hidden">
      {/* Noise grain overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs font-semibold text-copper-400 uppercase tracking-[0.15em] mb-3">Why practices switch</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Rental property work, without the grunt work
          </h2>
          <p className="mt-4 text-base text-bridge-400 leading-relaxed">
            Purpose-built for Australian tax practices handling rental portfolios.
            Every number sourced, every schedule audit-ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-white/[0.06] p-6 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <div className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-copper-500/0 group-hover:bg-copper-500/60 transition-all duration-300" />
              <span className="absolute top-4 right-5 text-[3rem] font-bold leading-none text-white/[0.04] select-none pointer-events-none">{f.num}</span>
              <div className="text-copper-400 mb-4 transition-colors">{f.icon}</div>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-bridge-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection({ steps }: { steps: { num: string; title: string; description: string; pulseClass: string }[] }) {
  const { ref, visible } = useReveal(0.15);
  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs font-semibold text-copper-500 uppercase tracking-[0.15em] mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-bridge-900">
            Documents in, rental schedule out
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Desktop connector */}
          <div className="hidden md:block absolute top-[28px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] z-0">
            <div className="h-px border-t-2 border-dashed border-paper-200" />
          </div>
          {/* Mobile connector */}
          <div className="md:hidden absolute left-[23px] top-14 bottom-14 z-0">
            <div className="w-px h-full border-l-2 border-dashed border-paper-200" />
          </div>

          <div className="relative z-10 grid md:grid-cols-3 gap-10 md:gap-12">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="flex md:flex-col items-start md:items-center md:text-center gap-5 md:gap-0 transition-all duration-600"
                style={{ transitionDelay: visible ? `${200 + i * 150}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
              >
                <div className={`shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-white border-2 border-copper-500 text-copper-600 text-sm font-bold tracking-wider shadow-sm ${s.pulseClass}`}>
                  {s.num}
                </div>
                <div className="md:mt-6">
                  <h3 className="text-base font-semibold text-bridge-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-bridge-500 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <>
      <SEO />
      <SoftwareAppJsonLd />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          {/* Text */}
          <div className="hero-stagger max-w-3xl mx-auto text-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-copper-400/10 border border-copper-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-copper-500" />
                <span className="text-xs font-medium text-copper-600 tracking-wide">
                  For Australian tax practices
                </span>
              </span>
            </div>

            <h1 className="mt-8 text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-bridge-900 leading-[1.08]">
              Every number traced{' '}
              <br className="hidden sm:block" />
              back to its{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-copper-500 to-copper-700 bg-clip-text text-transparent">
                  source document
                </span>
                <svg className="absolute -bottom-1.5 left-0 w-full h-[4px]" viewBox="0 0 200 4" preserveAspectRatio="none">
                  <line x1="0" y1="2" x2="200" y2="2" stroke="url(#cg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="200" strokeDashoffset="200" className="underline-draw" />
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c27350" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#8b4d32" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-bridge-500 leading-relaxed max-w-2xl mx-auto">
              Upload your rental property clients' documents. Get an audit-ready summary in minutes — no manual keying, no black boxes.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/canvas"
                className="group inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-bridge-900 text-white rounded-lg hover:bg-bridge-800 transition-all duration-200 shadow-lg shadow-bridge-900/20 hover:shadow-bridge-900/30 hover:-translate-y-0.5"
              >
                Try the Canvas
                <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold text-bridge-600 rounded-lg border border-paper-200 hover:border-paper-300 hover:bg-paper-50 transition-all duration-200"
              >
                Read the blog
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-bridge-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-copper-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Rental property schedules
              </span>
              <span className="text-paper-200">·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-copper-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                ATO audit-ready output
              </span>
              <span className="text-paper-200">·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-copper-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Minutes, not hours
              </span>
            </div>
          </div>

          {/* Canvas illustration */}
          <HeroCanvas />
        </div>

        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-48 right-[-12%] w-[500px] h-[500px] rounded-full bg-copper-400/[0.06] blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-8%] w-[400px] h-[400px] rounded-full bg-copper-400/[0.04] blur-[100px]" />
        </div>
      </section>

      {/* ── Shimmer divider ──────────────────────────────────────────── */}
      <div className="shimmer-line" />

      {/* ── What Paperbridge replaces ────────────────────────────────── */}
      <ComparisonSection comparisons={comparisons} />

      {/* ── Features ─────────────────────────────────────────────────── */}
      <FeaturesSection features={features} />

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <StepsSection steps={steps} />

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-28 bg-bridge-900 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 shimmer-line" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Tax season doesn't have to mean late nights
          </h2>
          <p className="mt-4 text-base text-bridge-400 max-w-lg mx-auto leading-relaxed">
            Process your rental property clients faster, with every number sourced and every schedule ready for the ATO.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/canvas"
              className="group inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-copper-500 text-white rounded-lg hover:bg-copper-600 transition-all duration-200 shadow-lg shadow-copper-600/25 hover:-translate-y-0.5"
            >
              Open Canvas
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              to="/blog"
              className="px-7 py-3.5 text-sm font-semibold text-white/70 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors duration-200"
            >
              Read the blog
            </Link>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-copper-500/[0.06] blur-[100px]" />
      </section>
    </>
  );
}
