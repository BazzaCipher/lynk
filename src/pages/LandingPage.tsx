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
      <div className="rounded-xl border border-gray-200 bg-gray-50 shadow-2xl shadow-gray-200/60 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 mx-8">
            <div className="h-6 bg-gray-50 rounded-md border border-gray-100 max-w-xs mx-auto flex items-center justify-center">
              <span className="text-[10px] text-gray-400 font-medium">paperbridge / canvas</span>
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
                stroke="#93c5fd"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="hero-edge"
              />
            );
          })}

          {/* ── Purchase Order Node ── */}
          <g transform={`translate(${po.x},${po.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#f9fafb" stroke="none" />
            <rect y="28" width="170" height="1" fill="#f3f4f6" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#6b7280">Purchase Order</text>
            {/* Extracted fields */}
            <text x="10" y="48" fontSize="9" fill="#9ca3af">vendor</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="#eff6ff" />
            <text x="66" y="49" fontSize="8" fill="#3b82f6">Meridian Ltd</text>
            <text x="10" y="68" fontSize="9" fill="#9ca3af">total</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="#f0fdf4" />
            <text x="66" y="69" fontSize="8" fill="#22c55e">$12,400.00</text>
            <text x="10" y="88" fontSize="9" fill="#9ca3af">issued</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="#faf5ff" />
            <text x="66" y="89" fontSize="8" fill="#a855f7">2026-02-10</text>
            <text x="10" y="108" fontSize="9" fill="#9ca3af">shipping</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="#f0fdf4" />
            <text x="66" y="109" fontSize="8" fill="#22c55e">$650.00</text>
            {/* Output handles */}
            <circle cx="170" cy="49" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#a855f7" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Bank Statement Node ── */}
          <g transform={`translate(${bank.x},${bank.y})`}>
            <rect width="170" height="130" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#f9fafb" stroke="none" />
            <rect y="28" width="170" height="1" fill="#f3f4f6" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#6b7280">Bank Statement</text>
            <text x="10" y="48" fontSize="9" fill="#9ca3af">account</text>
            <rect x="60" y="39" width="90" height="14" rx="3" fill="#eff6ff" />
            <text x="66" y="49" fontSize="8" fill="#3b82f6">Ops ••4821</text>
            <text x="10" y="68" fontSize="9" fill="#9ca3af">deposited</text>
            <rect x="60" y="59" width="90" height="14" rx="3" fill="#f0fdf4" />
            <text x="66" y="69" fontSize="8" fill="#22c55e">$8,300.00</text>
            <text x="10" y="88" fontSize="9" fill="#9ca3af">withdrawn</text>
            <rect x="60" y="79" width="90" height="14" rx="3" fill="#f0fdf4" />
            <text x="66" y="89" fontSize="8" fill="#22c55e">$3,175.00</text>
            <text x="10" y="108" fontSize="9" fill="#9ca3af">balance</text>
            <rect x="60" y="99" width="90" height="14" rx="3" fill="#f0fdf4" />
            <text x="66" y="109" fontSize="8" fill="#22c55e">$5,125.00</text>
            {/* Output handles */}
            <circle cx="170" cy="49" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="69" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="89" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="109" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Calculation Node ── */}
          <g transform={`translate(${calc.x},${calc.y})`}>
            <rect width="170" height="120" rx="8" fill="white" stroke="#bfdbfe" strokeWidth="1.5" />
            <rect width="170" height="28" rx="8" fill="#eff6ff" stroke="none" />
            <rect y="28" width="170" height="1" fill="#dbeafe" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#2563eb">Calculation</text>
            {/* Operation badge */}
            <rect x="10" y="38" width="40" height="16" rx="4" fill="#dbeafe" />
            <text x="18" y="49" fontSize="8" fontWeight="600" fill="#2563eb">SUM</text>
            {/* Input labels */}
            <circle cx="0" cy="49" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            <text x="10" y="70" fontSize="9" fill="#9ca3af">PO → total</text>
            <circle cx="0" cy="87" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            <text x="10" y="87" fontSize="9" fill="#9ca3af">Bank → deposited</text>
            {/* Result */}
            <rect x="10" y="96" width="150" height="16" rx="4" fill="#f0fdf4" />
            <text x="18" y="107" fontSize="9" fontWeight="600" fill="#16a34a">= $20,700.00</text>
            {/* Output handle */}
            <circle cx="170" cy="104" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
          </g>

          {/* ── Label Node ── */}
          <g transform={`translate(${label.x},${label.y})`}>
            <rect width="200" height="44" rx="8" fill="white" stroke="#fde68a" strokeWidth="1.5" />
            <text x="14" y="18" fontSize="9" fill="#a16207" fontWeight="600">Label</text>
            <text x="14" y="34" fontSize="12" fontWeight="600" fill="#1f2937">Monthly reconciliation</text>
          </g>

          {/* ── Sheet Node ── */}
          <g transform={`translate(${sheet.x},${sheet.y})`}>
            <rect width="180" height="200" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
            <rect width="180" height="28" rx="8" fill="#f0fdf4" stroke="none" />
            <rect y="28" width="180" height="1" fill="#dcfce7" />
            <text x="10" y="18" fontSize="10" fontWeight="600" fill="#16a34a">Sheet</text>
            {/* Input handles */}
            <circle cx="0" cy="50" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="75" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <circle cx="0" cy="100" r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
            {/* Subheader: Sources */}
            <rect x="8" y="36" width="164" height="20" rx="4" fill="#f9fafb" />
            <text x="14" y="50" fontSize="9" fontWeight="600" fill="#374151">Sources</text>
            {/* Rows */}
            <text x="14" y="72" fontSize="8" fill="#9ca3af">Vendor</text>
            <text x="100" y="72" fontSize="8" fill="#6b7280">Meridian Ltd</text>
            <text x="14" y="88" fontSize="8" fill="#9ca3af">Account</text>
            <text x="100" y="88" fontSize="8" fill="#6b7280">Ops ••4821</text>
            {/* Subheader: Totals */}
            <rect x="8" y="100" width="164" height="20" rx="4" fill="#f9fafb" />
            <text x="14" y="114" fontSize="9" fontWeight="600" fill="#374151">Totals</text>
            <text x="110" y="114" fontSize="9" fill="#22c55e" fontWeight="600">$20,700</text>
            <text x="14" y="136" fontSize="8" fill="#9ca3af">PO total</text>
            <text x="110" y="136" fontSize="8" fill="#6b7280">$12,400</text>
            <text x="14" y="152" fontSize="8" fill="#9ca3af">Deposited</text>
            <text x="110" y="152" fontSize="8" fill="#6b7280">$8,300</text>
            {/* Subheader: Balance */}
            <rect x="8" y="164" width="164" height="20" rx="4" fill="#f9fafb" />
            <text x="14" y="178" fontSize="9" fontWeight="600" fill="#374151">Balance</text>
            <text x="110" y="178" fontSize="9" fill="#f59e0b" fontWeight="600">$5,125</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ─── Feature data ──────────────────────────────────────────────────────── */

const features = [
  {
    title: 'OCR Extraction',
    description:
      'Drop PDFs or images onto the canvas, draw regions, and extract text with automatic type detection — strings, numbers, currencies, and dates.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Visual Calculations',
    description:
      'Connect extracted values to calculation nodes. Sum, average, min, max, subtract, multiply — see the data flow in real time.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Reusable Workflows',
    description:
      'Save canvas files, load templates, compare multiple documents side by side with sheets and grouped nodes.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
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
      'Organize extracted data into spreadsheet-like sheets. Group related nodes together to keep complex canvases clean.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m-1.125-2.625c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
  },
  {
    title: 'Export Anywhere',
    description:
      'Save your entire canvas as a portable .pb file. Share workflows with teammates or archive them for later.',
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
    description: 'Wire extracted values to calculations, labels, and sheets. Build reusable data pipelines visually.',
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
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Free &amp; open — runs entirely in your browser
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              Extract and process
              <br />
              document data{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                visually
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
              Drop PDFs and images onto a node-based canvas. Draw regions, extract data with OCR,
              wire it through calculations, and build reusable document workflows — no code, no server.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/canvas"
                className="group px-8 py-3.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
              >
                Open Canvas
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </Link>
              <Link
                to="/blog"
                className="px-8 py-3.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Read the blog
              </Link>
            </div>
          </div>

          <HeroCanvas />
        </div>

        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-blue-50 blur-3xl opacity-50" />
          <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full bg-indigo-50 blur-3xl opacity-40" />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '100%', label: 'Client-side' },
            { value: '0', label: 'Dependencies on servers' },
            { value: '6+', label: 'Node types' },
            { value: '.pb', label: 'Portable file format' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Everything you need to extract document data
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              A node-based canvas that turns static documents into structured, calculated results.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Three steps to structured data
            </h2>
          </div>

          {/* Steps with connecting edges */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connecting lines (desktop only) */}
            <div className="hidden md:block absolute top-6 left-0 right-0 z-0">
              <svg className="w-full" height="12" preserveAspectRatio="none" viewBox="0 0 100 12">
                <defs>
                  <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Line from step 1 to step 2 */}
                <line x1="20" y1="6" x2="50" y2="6" stroke="url(#edge-grad)" strokeWidth="2" strokeDasharray="4 3" />
                {/* Line from step 2 to step 3 */}
                <line x1="50" y1="6" x2="80" y2="6" stroke="url(#edge-grad)" strokeWidth="2" strokeDasharray="4 3" />
                {/* Arrow dots */}
                <circle cx="35" cy="6" r="2" fill="#3b82f6" opacity="0.4" />
                <circle cx="65" cy="6" r="2" fill="#3b82f6" opacity="0.4" />
              </svg>
            </div>

            {/* Mobile connecting lines */}
            <div className="md:hidden absolute left-6 top-12 bottom-12 w-px z-0">
              <div className="w-full h-full border-l-2 border-dashed border-blue-200" />
            </div>

            <div className="relative z-10 grid md:grid-cols-3 gap-10 md:gap-8">
              {steps.map((s) => (
                <div key={s.num} className="flex md:flex-col items-start md:items-center md:text-center gap-4 md:gap-0">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20">
                    {s.num}
                  </div>
                  <div className="md:mt-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Ready to extract?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
            No sign-up, no server. Open the canvas and start building document workflows in seconds.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/canvas"
              className="group px-8 py-3.5 text-sm font-semibold bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:-translate-y-0.5"
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
