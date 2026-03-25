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
              <span className="text-[10px] text-gray-400 font-medium">lynk / canvas</span>
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
];

const steps = [
  {
    num: '01',
    title: 'Drop a document',
    description: 'Upload a PDF or image directly onto the canvas. Lynk handles the rendering and page navigation.',
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              Extract and process
              <br />
              document data{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                visually
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
              Lynk is a visual canvas for extracting data from PDFs and images,
              connecting it through calculations, and building reusable document
              processing workflows.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/canvas"
                className="px-8 py-3.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Open Canvas
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-3.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                See how it works
              </a>
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

      {/* Features */}
      <section id="features" className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Everything you need to extract document data
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              A node-based canvas that turns static documents into structured, calculated results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
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
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Three steps to structured data
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((s) => (
              <div key={s.num} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-sm font-bold mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Ready to extract?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Start with a blank canvas or pick a template to get going in seconds.
          </p>
          <Link
            to="/canvas"
            className="inline-block mt-8 px-8 py-3.5 text-sm font-semibold bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            Open Canvas
          </Link>
        </div>
      </section>
    </>
  );
}
