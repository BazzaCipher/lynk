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
  const po = { x: 30, y: 40 };
  const bank = { x: 30, y: 220 };
  const calc = { x: 320, y: 120 };
  const label = { x: 310, y: 290 };
  const sheet = { x: 590, y: 90 };

  const edges = [
    { from: { x: po.x + 170, y: po.y + 69 }, to: { x: calc.x, y: calc.y + 49 } },
    { from: { x: bank.x + 170, y: bank.y + 69 }, to: { x: calc.x, y: calc.y + 87 } },
    { from: { x: po.x + 170, y: po.y + 49 }, to: { x: sheet.x, y: sheet.y + 50 } },
    { from: { x: bank.x + 170, y: bank.y + 49 }, to: { x: sheet.x, y: sheet.y + 75 } },
    { from: { x: calc.x + 170, y: calc.y + 104 }, to: { x: sheet.x, y: sheet.y + 100 } },
  ];

  return (
    <div className="mt-16 md:mt-20 max-w-4xl mx-auto hero-illo-enter">
      <div className="rounded-xl border border-navy-200 bg-navy-50 shadow-2xl shadow-navy-200/60 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-navy-100">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 mx-8">
            <div className="h-6 bg-navy-50 rounded-md border border-navy-100 max-w-xs mx-auto flex items-center justify-center">
              <span className="text-[10px] text-navy-400 font-medium">paperbridge / canvas</span>
            </div>
          </div>
        </div>

        {/* Canvas SVG */}
        <svg
          viewBox="0 0 800 400"
          className="w-full h-auto bg-[#f8fafc] hidden sm:block"
          style={{ aspectRatio: '800 / 400' }}
          role="img"
          aria-label="Paperbridge canvas showing rental statement and loan summary documents connected to calculation and sheet nodes, producing a rental schedule summary"
        >
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#94a3b8" opacity="0.3" />
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
                stroke="#bcccdc"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="hero-edge"
              />
            );
          })}

          {/* Rental Statement Node */}
          <g transform={`translate(${po.x},${po.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#d9e2ec" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#f0f4f8" stroke="none" />
            <rect y="28" width="170" height="1" fill="#d9e2ec" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#243b53">Rental Statement</text>
            <text x="10" y="48" fontSize="9" fill="#829ab1">property</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(37,99,235,0.08)" />
            <text x="66" y="49" fontSize="8" fill="#1d4ed8">14 Elm St</text>
            <text x="10" y="68" fontSize="9" fill="#829ab1">rent</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(5,150,105,0.08)" />
            <text x="66" y="69" fontSize="8" fill="#047857">$31,200.00</text>
            <text x="10" y="88" fontSize="9" fill="#829ab1">period</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(99,102,241,0.08)" />
            <text x="66" y="89" fontSize="8" fill="#4338ca">FY 2024–25</text>
            <text x="10" y="108" fontSize="9" fill="#829ab1">agent fees</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(5,150,105,0.08)" />
            <text x="66" y="109" fontSize="8" fill="#047857">$3,432.00</text>
            <circle cx="170" cy="49" r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#6366f1" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#059669" stroke="white" strokeWidth="2" />
          </g>

          {/* Loan Summary Node */}
          <g transform={`translate(${bank.x},${bank.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#d9e2ec" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#f0f4f8" stroke="none" />
            <rect y="28" width="170" height="1" fill="#d9e2ec" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#243b53">Loan Summary</text>
            <text x="10" y="48" fontSize="9" fill="#829ab1">lender</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(37,99,235,0.08)" />
            <text x="66" y="49" fontSize="8" fill="#1d4ed8">CBA ••7193</text>
            <text x="10" y="68" fontSize="9" fill="#829ab1">interest</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(5,150,105,0.08)" />
            <text x="66" y="69" fontSize="8" fill="#047857">$18,640.00</text>
            <text x="10" y="88" fontSize="9" fill="#829ab1">principal</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(5,150,105,0.08)" />
            <text x="66" y="89" fontSize="8" fill="#047857">$6,200.00</text>
            <text x="10" y="108" fontSize="9" fill="#829ab1">balance</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(5,150,105,0.08)" />
            <text x="66" y="109" fontSize="8" fill="#047857">$412,000</text>
            <circle cx="170" cy="49" r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#059669" stroke="white" strokeWidth="2" />
          </g>

          {/* Calculation Node */}
          <g transform={`translate(${calc.x},${calc.y})`}>
            <rect width="170" height="120" rx="8" fill="white" stroke="#d9e2ec" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#f0f4f8" stroke="none" />
            <rect y="28" width="170" height="1" fill="#d9e2ec" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#243b53">Net Rental Income</text>
            <rect x="10" y="38" width="60" height="16" rx="4" fill="rgba(5,150,105,0.12)" />
            <text x="16" y="49" fontSize="8" fontWeight="600" fill="#047857">SUBTRACT</text>
            <circle cx="0" cy="49" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <text x="10" y="70" fontSize="9" fill="#829ab1">Rent</text>
            <text x="100" y="70" fontSize="8" fill="#047857">$31,200</text>
            <circle cx="0" cy="87" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <text x="10" y="87" fontSize="9" fill="#829ab1">Interest</text>
            <text x="100" y="87" fontSize="8" fill="#047857">$18,640</text>
            <rect x="10" y="96" width="150" height="16" rx="4" fill="rgba(5,150,105,0.08)" />
            <text x="18" y="107" fontSize="9" fontWeight="600" fill="#047857">= $12,560.00</text>
            <circle cx="170" cy="104" r="4" fill="#059669" stroke="white" strokeWidth="2" />
          </g>

          {/* Label Node */}
          <g transform={`translate(${label.x},${label.y})`}>
            <rect width="200" height="44" rx="8" fill="white" stroke="#d9e2ec" strokeWidth="1.5" />
            <text x="14" y="18" fontSize="9" fill="#627d98" fontWeight="600">Label</text>
            <text x="14" y="34" fontSize="12" fontWeight="600" fill="#102a43">14 Elm St — FY 2024–25</text>
          </g>

          {/* Sheet Node */}
          <g transform={`translate(${sheet.x},${sheet.y})`}>
            <rect width="180" height="200" rx="8" fill="white" stroke="#d9e2ec" strokeWidth="1.5" />
            <rect width="180" height="28" rx="8" fill="#f0f4f8" stroke="none" />
            <rect y="28" width="180" height="1" fill="#d9e2ec" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#243b53">Rental Schedule</text>
            <circle cx="0" cy="50" r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="75" r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="100" r="4" fill="#059669" stroke="white" strokeWidth="2" />
            <rect x="8" y="36" width="164" height="20" rx="4" fill="#f0f4f8" />
            <text x="14" y="50" fontSize="9" fontWeight="600" fill="#102a43">Property</text>
            <text x="14" y="72" fontSize="8" fill="#829ab1">Address</text>
            <text x="100" y="72" fontSize="8" fill="#334e68">14 Elm St</text>
            <text x="14" y="88" fontSize="8" fill="#829ab1">Lender</text>
            <text x="100" y="88" fontSize="8" fill="#334e68">CBA ••7193</text>
            <rect x="8" y="100" width="164" height="20" rx="4" fill="#f0f4f8" />
            <text x="14" y="114" fontSize="9" fontWeight="600" fill="#102a43">Income</text>
            <text x="110" y="114" fontSize="9" fill="#047857" fontWeight="600">$31,200</text>
            <text x="14" y="136" fontSize="8" fill="#829ab1">Interest</text>
            <text x="110" y="136" fontSize="8" fill="#334e68">$18,640</text>
            <text x="14" y="152" fontSize="8" fill="#829ab1">Agent fees</text>
            <text x="110" y="152" fontSize="8" fill="#334e68">$3,432</text>
            <rect x="8" y="164" width="164" height="20" rx="4" fill="#f0f4f8" />
            <text x="14" y="178" fontSize="9" fontWeight="600" fill="#102a43">Net income</text>
            <text x="110" y="178" fontSize="9" fill="#059669" fontWeight="600">$9,128</text>
          </g>
        </svg>

        {/* Mobile: simplified placeholder */}
        <div className="sm:hidden px-6 py-10 text-center bg-[#f8fafc]">
          <div className="flex items-center justify-center gap-3 text-navy-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-navy-500">Documents → Calculations → Summary</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature data ──────────────────────────────────────────────────────── */

const features = [
  {
    num: '01',
    title: 'Any Client Document',
    description: 'Rental statements, loan summaries, payment summaries, receipts — drop them on the canvas and start extracting. PDF or image.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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
    description: 'Income, deductions, expenses — totalled and cross-checked automatically. No formulas to maintain.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Client-Ready Output',
    description: 'Generate a clean summary you can attach to the return or send to your client for sign-off.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Organised by Client',
    description: 'Multiple properties, multiple income sources — each gets its own workspace. Roll them up into a single summary at the end.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    num: '06',
    title: 'Full Audit Trail',
    description: 'Export the complete workpaper — every source document, every extracted value, every calculation — as a single portable file.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '01',
    title: 'Upload the documents',
    description: 'Drop your client\'s statements, receipts, and summaries onto the canvas. PDF or image, it just works.',
    pulseClass: 'step-pulse-1',
  },
  {
    num: '02',
    title: 'Extract the numbers',
    description: 'Select the figures you need — income, deductions, expenses. Each value stays linked to the original document.',
    pulseClass: 'step-pulse-2',
  },
  {
    num: '03',
    title: 'Export the summary',
    description: 'Get an audit-ready summary for the tax return. Every number traceable, every document attached.',
    pulseClass: 'step-pulse-3',
  },
];

const comparisons = [
  {
    before: 'Manually keying client documents into spreadsheets',
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
    <section ref={ref} className="py-16 md:py-20 bg-navy-50/40">
      <div className={`max-w-3xl mx-auto px-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <p className="text-xs font-semibold text-green-500 uppercase tracking-[0.15em] mb-8 text-center">Before &amp; after Paperbridge</p>
        <div className="space-y-3">
          {comparisons.map((c, i) => (
            <div
              key={c.before}
              className="flex items-center gap-4 md:gap-6 rounded-lg border border-navy-200/60 bg-white/60 backdrop-blur-sm px-5 py-3.5 transition-all duration-500"
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)' }}
            >
              <div className="flex-1 text-right">
                <span className="text-sm text-navy-400 line-through decoration-navy-400/40">{c.before}</span>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 arrow-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-navy-800">{c.after}</span>
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
    <section ref={ref} className="relative py-24 md:py-32 bg-navy-900 overflow-hidden">
      {/* Noise grain overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className={`max-w-2xl mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs font-semibold text-green-400 uppercase tracking-[0.15em] mb-3">Why practices switch</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Individual returns, without the grunt work
          </h2>
          <p className="mt-4 text-base text-navy-400 leading-relaxed">
            Purpose-built for Australian tax practices handling individual returns.
            Every number sourced, every summary audit-ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-white/[0.06] p-6 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <div className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-green-500/0 group-hover:bg-green-500/60 transition-all duration-300" />
              <span className="absolute top-4 right-5 text-[3rem] font-bold leading-none text-white/[0.04] select-none pointer-events-none">{f.num}</span>
              <div className="text-green-400 mb-4 transition-colors">{f.icon}</div>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-navy-400 leading-relaxed">{f.description}</p>
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
          <p className="text-xs font-semibold text-green-500 uppercase tracking-[0.15em] mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-900">
            Documents in, rental schedule out
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Desktop connector */}
          <div className="hidden md:block absolute top-[28px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] z-0">
            <div className="h-px border-t-2 border-dashed border-navy-200" />
          </div>
          {/* Mobile connector */}
          <div className="md:hidden absolute left-[23px] top-14 bottom-14 z-0">
            <div className="w-px h-full border-l-2 border-dashed border-navy-200" />
          </div>

          <div className="relative z-10 grid md:grid-cols-3 gap-10 md:gap-12">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="flex md:flex-col items-start md:items-center md:text-center gap-5 md:gap-0 transition-all duration-600"
                style={{ transitionDelay: visible ? `${200 + i * 150}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
              >
                <div className={`shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-white border-2 border-green-500 text-green-600 text-sm font-bold tracking-wider shadow-sm ${s.pulseClass}`}>
                  {s.num}
                </div>
                <div className="md:mt-6">
                  <h3 className="text-base font-semibold text-navy-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-navy-500 leading-relaxed">{s.description}</p>
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
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-700 tracking-wide">
                  For Australian tax practices
                </span>
              </span>
            </div>

            <h1 className="mt-8 text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-navy-900 leading-[1.08]">
              Every number traced{' '}
              <br className="hidden sm:block" />
              back to its{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  source document
                </span>
                <svg className="absolute -bottom-1.5 left-0 w-full h-[4px]" viewBox="0 0 200 4" preserveAspectRatio="none">
                  <line x1="0" y1="2" x2="200" y2="2" stroke="url(#cg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="200" strokeDashoffset="200" className="underline-draw" />
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-navy-500 leading-relaxed max-w-2xl mx-auto">
              Upload your clients' documents — rental statements, receipts, loan summaries — and get an audit-ready summary in minutes. No manual keying, no black boxes.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/canvas"
                className="group inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-all duration-200 shadow-lg shadow-navy-900/20 hover:shadow-navy-900/30 hover:-translate-y-0.5 cursor-pointer"
              >
                Try the Canvas
                <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold text-navy-600 rounded-lg border border-navy-200 hover:border-navy-300 hover:bg-navy-50 transition-all duration-200 cursor-pointer"
              >
                Read the blog
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-navy-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Individual &amp; rental returns
              </span>
              <span className="text-navy-200">·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                ATO audit-ready output
              </span>
              <span className="text-navy-200">·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <div className="absolute -top-48 right-[-12%] w-[500px] h-[500px] rounded-full bg-blue-500/[0.06] blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-8%] w-[400px] h-[400px] rounded-full bg-green-500/[0.04] blur-[100px]" />
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
      <section className="relative py-24 md:py-28 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 shimmer-line" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Tax season doesn't have to mean late nights
          </h2>
          <p className="mt-4 text-base text-navy-400 max-w-lg mx-auto leading-relaxed">
            Process your individual clients faster, with every number sourced and every summary ready for the ATO.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/canvas"
              className="group inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-lg shadow-green-600/25 hover:-translate-y-0.5 cursor-pointer"
            >
              Open Canvas
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              to="/blog"
              className="px-7 py-3.5 text-sm font-semibold text-white/70 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors duration-200 cursor-pointer"
            >
              Read the blog
            </Link>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-green-500/[0.06] blur-[100px]" />
      </section>
    </>
  );
}
