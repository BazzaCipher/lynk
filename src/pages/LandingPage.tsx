import { Link } from 'react-router-dom';

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

          {/* Canvas preview mockup */}
          <div className="mt-16 md:mt-20 max-w-4xl mx-auto">
            <div className="rounded-xl border border-gray-200 bg-gray-50 shadow-2xl shadow-gray-200/60 overflow-hidden">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="h-6 bg-gray-50 rounded-md border border-gray-100 max-w-xs mx-auto" />
                </div>
              </div>
              {/* Canvas area */}
              <div className="relative h-64 md:h-80 bg-[#fafafa]">
                {/* Dot grid pattern */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                {/* Mock nodes */}
                <div className="absolute top-8 left-8 md:left-16 w-40 h-28 bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                  <div className="text-[10px] font-medium text-gray-400 mb-2">Extractor</div>
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-1.5" />
                  <div className="h-3 bg-blue-50 rounded w-2/3" />
                </div>
                <div className="absolute top-12 left-56 md:left-72 w-32 h-20 bg-white rounded-lg border border-blue-200 shadow-sm p-3">
                  <div className="text-[10px] font-medium text-blue-500 mb-2">Calculation</div>
                  <div className="h-3 bg-blue-50 rounded w-full mb-1.5" />
                  <div className="h-3 bg-blue-100 rounded w-1/2" />
                </div>
                <div className="absolute top-6 right-8 md:right-16 w-28 h-16 bg-white rounded-lg border border-green-200 shadow-sm p-3">
                  <div className="text-[10px] font-medium text-green-600 mb-2">Label</div>
                  <div className="text-lg font-semibold text-gray-800">$1,234</div>
                </div>
                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                  <line x1="180" y1="72" x2="225" y2="72" stroke="#93c5fd" strokeWidth="2" strokeDasharray="4 2" />
                </svg>
              </div>
            </div>
          </div>
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
