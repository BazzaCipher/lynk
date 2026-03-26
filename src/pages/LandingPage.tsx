import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { SoftwareAppJsonLd } from '../components/seo/JsonLd';

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
    // PO.total (handle cy=69) → Calc input1 (handle cy=49)
    { from: { x: po.x + 170, y: po.y + 69 }, to: { x: calc.x, y: calc.y + 49 } },
    // Bank.deposited (handle cy=69) → Calc input2 (handle cy=87)
    { from: { x: bank.x + 170, y: bank.y + 69 }, to: { x: calc.x, y: calc.y + 87 } },
    // PO.vendor (handle cy=49) → Sheet input1 (handle cy=50)
    { from: { x: po.x + 170, y: po.y + 49 }, to: { x: sheet.x, y: sheet.y + 50 } },
    // Bank.account (handle cy=49) → Sheet input2 (handle cy=75)
    { from: { x: bank.x + 170, y: bank.y + 49 }, to: { x: sheet.x, y: sheet.y + 75 } },
    // Calc.result (handle cy=104) → Sheet input3 (handle cy=100)
    { from: { x: calc.x + 170, y: calc.y + 104 }, to: { x: sheet.x, y: sheet.y + 100 } },
  ];

  return (
    <div className="mt-16 md:mt-20 max-w-4xl mx-auto">
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
        <svg
          viewBox="0 0 800 400"
          className="w-full h-auto bg-[#fafafa]"
          style={{ aspectRatio: '800 / 400' }}
        >
          {/* Dot grid */}
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#d1d5db" opacity="0.4" />
            </pattern>
            {/* Animated dash */}
            <style>{`
              @keyframes hero-dash { to { stroke-dashoffset: -20; } }
              .hero-edge { animation: hero-dash 1.5s linear infinite; }
            `}</style>
          </defs>
          <rect width="800" height="400" fill="url(#hero-dots)" />

          {/* ── Edges ── */}
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

          {/* ── Purchase Order Node ── */}
          <g transform={`translate(${po.x},${po.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Purchase Order</text>
            {/* Extracted fields */}
            <text x="10" y="48" fontSize="9" fill="#b8a58e">vendor</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(56,132,212,0.1)" />
            <text x="66" y="49" fontSize="8" fill="#2560a0">Meridian Ltd</text>
            <text x="10" y="68" fontSize="9" fill="#b8a58e">total</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="69" fontSize="8" fill="#b07a10">$12,400.00</text>
            <text x="10" y="88" fontSize="9" fill="#b8a58e">issued</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(148,90,210,0.1)" />
            <text x="66" y="89" fontSize="8" fill="#6e3aaa">2026-02-10</text>
            <text x="10" y="108" fontSize="9" fill="#b8a58e">shipping</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="109" fontSize="8" fill="#b07a10">$650.00</text>
            {/* Output handles - colors match data types */}
            <circle cx="170" cy="49" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#945ad2" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Bank Statement Node ── */}
          <g transform={`translate(${bank.x},${bank.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Bank Statement</text>
            <text x="10" y="48" fontSize="9" fill="#b8a58e">account</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="rgba(56,132,212,0.1)" />
            <text x="66" y="49" fontSize="8" fill="#2560a0">Ops ••4821</text>
            <text x="10" y="68" fontSize="9" fill="#b8a58e">deposited</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="69" fontSize="8" fill="#b07a10">$8,300.00</text>
            <text x="10" y="88" fontSize="9" fill="#b8a58e">withdrawn</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="89" fontSize="8" fill="#b07a10">$3,175.00</text>
            <text x="10" y="108" fontSize="9" fill="#b8a58e">balance</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="rgba(228,160,28,0.1)" />
            <text x="66" y="109" fontSize="8" fill="#b07a10">$5,125.00</text>
            {/* Output handles - colors match data types */}
            <circle cx="170" cy="49" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Calculation Node ── */}
          <g transform={`translate(${calc.x},${calc.y})`}>
            <rect width="170" height="120" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="170" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Calculation</text>
            {/* Operation badge */}
            <rect x="10" y="38" width="40" height="16" rx="4" fill="rgba(228,160,28,0.15)" />
            <text x="18" y="49" fontSize="8" fontWeight="600" fill="#b07a10">SUM</text>
            {/* Input rows with values */}
            <circle cx="0" cy="49" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <text x="10" y="70" fontSize="9" fill="#b8a58e">PO total</text>
            <text x="100" y="70" fontSize="8" fill="#b07a10">$12,400</text>
            <circle cx="0" cy="87" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            <text x="10" y="87" fontSize="9" fill="#b8a58e">Deposited</text>
            <text x="100" y="87" fontSize="8" fill="#b07a10">$8,300</text>
            {/* Result */}
            <rect x="10" y="96" width="150" height="16" rx="4" fill="rgba(228,160,28,0.1)" />
            <text x="18" y="107" fontSize="9" fontWeight="600" fill="#b07a10">= $20,700.00</text>
            {/* Output handle */}
            <circle cx="170" cy="104" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Label Node ── */}
          <g transform={`translate(${label.x},${label.y})`}>
            <rect width="200" height="44" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <text x="14" y="18" fontSize="9" fill="#9c8468" fontWeight="600">Label</text>
            <text x="14" y="34" fontSize="12" fontWeight="600" fill="#3f3529">Monthly reconciliation</text>
          </g>

          {/* ── Sheet Node ── */}
          <g transform={`translate(${sheet.x},${sheet.y})`}>
            <rect width="180" height="200" rx="8" fill="white" stroke="#e8dfd3" strokeWidth="1.5" />
            <rect width="180" height="28" rx="8" fill="#faf8f5" stroke="none" />
            <rect y="28" width="180" height="1" fill="#e8dfd3" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#5e4f3d">Sheet</text>
            {/* Input handles - match incoming data types */}
            <circle cx="0" cy="50" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="75" r="4" fill="#3884d4" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="100" r="4" fill="#e4a01c" stroke="white" strokeWidth="2" />
            {/* Subheader: Sources */}
            <rect x="8" y="36" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="50" fontSize="9" fontWeight="600" fill="#3f3529">Sources</text>
            {/* Rows */}
            <text x="14" y="72" fontSize="8" fill="#b8a58e">Vendor</text>
            <text x="100" y="72" fontSize="8" fill="#7d6a52">Meridian Ltd</text>
            <text x="14" y="88" fontSize="8" fill="#b8a58e">Account</text>
            <text x="100" y="88" fontSize="8" fill="#7d6a52">Ops ••4821</text>
            {/* Subheader: Totals */}
            <rect x="8" y="100" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="114" fontSize="9" fontWeight="600" fill="#3f3529">Totals</text>
            <text x="110" y="114" fontSize="9" fill="#b07a10" fontWeight="600">$20,700</text>
            <text x="14" y="136" fontSize="8" fill="#b8a58e">PO total</text>
            <text x="110" y="136" fontSize="8" fill="#7d6a52">$12,400</text>
            <text x="14" y="152" fontSize="8" fill="#b8a58e">Deposited</text>
            <text x="110" y="152" fontSize="8" fill="#7d6a52">$8,300</text>
            {/* Subheader: Balance */}
            <rect x="8" y="164" width="164" height="20" rx="4" fill="#faf8f5" />
            <text x="14" y="178" fontSize="9" fontWeight="600" fill="#3f3529">Balance</text>
            <text x="110" y="178" fontSize="9" fill="#e4a01c" fontWeight="600">$5,125</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ─── Feature data ──────────────────────────────────────────────────────── */

const features = [
  {
    title: '100% Local & Private',
    description:
      'Your documents and workflows are stored entirely in your browser. Nothing is uploaded to any server. No account required, no data leaves your device.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Source-Linked Extraction',
    description:
      'Every extracted value stays linked to the exact region on the original document. Hover any number in your workflow to see where it came from.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Traceable Calculations',
    description:
      'Connect values to calculation nodes with a visible data flow. Every result shows its inputs and the documents they came from. No black boxes.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Smart Type Detection',
    description:
      'Extracted values are automatically classified as strings, numbers, currencies, or dates. No manual mapping required.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    title: 'Sheets & Groups',
    description:
      'Organize reconciliation results into structured sheets. Group related documents and calculations to keep multi-document audits clean and navigable.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m-1.125-2.625c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
  },
  {
    title: 'Full Chain of Custody',
    description:
      'Export complete workflows with full provenance as a single portable file. Every source document, extraction, and calculation step is preserved and reproducible.',
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
    title: 'Drop a document',
    description: 'Upload a PDF or image directly onto the canvas. Paperbridge handles the rendering and page navigation.',
  },
  {
    num: '02',
    title: 'Select regions',
    description: 'Draw rectangles over the data you need. OCR runs automatically and detects value types.',
  },
  {
    num: '03',
    title: 'Connect & calculate',
    description: 'Wire extracted values to calculations, labels, and sheets. Every output traces back to the source, ready for review.',
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <>
      <SEO />
      <SoftwareAppJsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-bridge-900 leading-[1.1]">
              Every number traced
              <br />
              back to its{' '}
              <span className="bg-gradient-to-r from-copper-500 to-copper-700 bg-clip-text text-transparent">
                source document
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-bridge-500 leading-relaxed max-w-2xl mx-auto">
              Build audit-ready document workflows on a visual canvas. Extract data with OCR, wire values
              through calculations, and maintain a complete chain of custody. Every result links back to the
              exact region on the original document.
            </p>
            <p className="mt-3 text-sm text-bridge-400">
              Your documents and data never leave your browser. Everything is stored locally on your device.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/canvas"
                className="group px-8 py-3.5 text-sm font-semibold bg-copper-500 text-white rounded-xl hover:bg-copper-600 transition-all shadow-lg shadow-copper-600/25 hover:shadow-copper-600/40 hover:-translate-y-0.5"
              >
                Open Canvas
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </Link>
            </div>
          </div>

          <HeroCanvas />
        </div>

        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-copper-400/10 blur-3xl opacity-50" />
          <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full bg-copper-400/10 blur-3xl opacity-40" />
        </div>
      </section>


      {/* Features */}
      <section className="py-20 md:py-28 bg-paper-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-copper-500 uppercase tracking-wider mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-bridge-900">
              Built for traceability from the ground up
            </h2>
            <p className="mt-4 text-lg text-bridge-500 max-w-2xl mx-auto">
              A visual canvas where every value traces back to its source. No hidden formulas, no broken references. Just transparent, auditable document workflows.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-xl border border-paper-100 p-6 hover:shadow-lg hover:border-paper-200 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-copper-400/10 text-copper-500 flex items-center justify-center mb-4 group-hover:bg-copper-400/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-bridge-900 mb-2">{f.title}</h3>
                <p className="text-sm text-bridge-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-copper-500 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-bridge-900">
              Three steps to an auditable result
            </h2>
          </div>

          {/* Steps with connecting edges */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connecting lines (desktop only) */}
            <div className="hidden md:block absolute top-6 left-0 right-0 z-0">
              <svg className="w-full" height="12" preserveAspectRatio="none" viewBox="0 0 100 12">
                <defs>
                  <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c27350" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#c27350" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#c27350" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Line from step 1 to step 2 */}
                <line x1="20" y1="6" x2="50" y2="6" stroke="url(#edge-grad)" strokeWidth="2" strokeDasharray="4 3" />
                {/* Line from step 2 to step 3 */}
                <line x1="50" y1="6" x2="80" y2="6" stroke="url(#edge-grad)" strokeWidth="2" strokeDasharray="4 3" />
                {/* Arrow dots */}
                <circle cx="35" cy="6" r="2" fill="#c27350" opacity="0.4" />
                <circle cx="65" cy="6" r="2" fill="#c27350" opacity="0.4" />
              </svg>
            </div>

            {/* Mobile connecting lines */}
            <div className="md:hidden absolute left-6 top-12 bottom-12 w-px z-0">
              <div className="w-full h-full border-l-2 border-dashed border-copper-400/30" />
            </div>

            <div className="relative z-10 grid md:grid-cols-3 gap-10 md:gap-8">
              {steps.map((s) => (
                <div key={s.num} className="flex md:flex-col items-start md:items-center md:text-center gap-4 md:gap-0">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-copper-500 text-white text-sm font-bold shadow-lg shadow-copper-600/20">
                    {s.num}
                  </div>
                  <div className="md:mt-5">
                    <h3 className="text-lg font-semibold text-bridge-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-bridge-500 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-24 bg-gradient-to-br from-copper-500 via-copper-600 to-copper-700 overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Ready to build audit-ready workflows?
          </h2>
          <p className="mt-4 text-lg text-paper-200 max-w-xl mx-auto">
            Open the canvas and start building traceable document workflows. Every value linked back to its source.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/canvas"
              className="group px-8 py-3.5 text-sm font-semibold bg-white text-copper-600 rounded-xl hover:bg-copper-400/10 transition-all shadow-lg hover:-translate-y-0.5"
            >
              Open Canvas
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
            <Link
              to="/blog"
              className="px-8 py-3.5 text-sm font-semibold text-white/90 border border-white/20 rounded-xl hover:bg-white/10 transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
