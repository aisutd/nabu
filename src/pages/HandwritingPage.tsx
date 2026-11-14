import { ChangeEvent, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileImage,
  Gauge,
  ImageUp,
  Info,
  ScanSearch,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

const tips = [
  ["PNG files only", "Export or photograph your sample and save it as a PNG."],
  ["Write on paper", "Use plain, light paper without lines or patterns."],
  ["Keep it clear", "Use dark ink, good lighting, and avoid shadows or blur."],
  ["One glyph at a time", "Center a single character with space around it."],
];

export function HandwritingPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [glyph, setGlyph] = useState("a");
  const [finding, setFinding] = useState(false);
  const [errorsFound, setErrorsFound] = useState(false);
  const [grade, setGrade] = useState<number | null>(null);

  const resetResults = () => {
    setErrorsFound(false);
    setGrade(null);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setFileName(file.name);
    resetResults();
  };

  const removeImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl("");
    setFileName("");
    resetResults();
    if (inputRef.current) inputRef.current.value = "";
  };

  // TODO: replace with a call to the handwriting-analysis backend.
  const findErrors = () => {
    if (!imageUrl) return;
    setFinding(true);
    window.setTimeout(() => {
      setFinding(false);
      setErrorsFound(true);
    }, 700);
  };

  // TODO: replace with the real grading result from the backend.
  const gradeHandwriting = () => setGrade(84);

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mb-7">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#cf5145]">
          New review
        </p>
        <h1 className="text-[30px] font-semibold tracking-[-0.035em] sm:text-[38px]">
          Compare handwriting
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-[#765e4b]">
          Upload a handwriting sample and compare it with the matching reference glyph.
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="rounded-[22px] border border-[#dfcdb9] bg-white p-5 shadow-[0_2px_12px_rgba(39,35,28,.04)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Uploaded sample */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold">Your handwriting</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#8b735f]">PNG upload</p>
                </div>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="grid size-9 place-items-center rounded-lg bg-[#f6eee4] text-[#765e4b] hover:text-[#a2443d]"
                    aria-label="Remove image"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="canvas-grid relative aspect-square overflow-hidden rounded-2xl border border-[#dfcdb9] bg-[#fffdf9]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Uploaded handwriting sample"
                    className="absolute inset-0 z-10 h-full w-full object-contain p-7"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute inset-0 z-10 flex w-full flex-col items-center justify-center p-6 text-center"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-[#fae9e3] text-[#b5362b]">
                      <ImageUp size={21} />
                    </span>
                    <span className="mt-4 text-sm font-extrabold">Upload handwriting</span>
                    <span className="mt-1 text-xs font-semibold text-[#8b735f]">
                      Choose a clear PNG file
                    </span>
                    <span className="mt-4 rounded-lg bg-[#cf5145] px-4 py-2.5 text-xs font-extrabold text-white">
                      Select file
                    </span>
                  </button>
                )}
                {errorsFound && (
                  <>
                    <span className="error-point left-[54%] top-[22%]">1</span>
                    <span className="error-point left-[35%] top-[59%]">2</span>
                    <span className="error-point left-[67%] top-[72%]">3</span>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={upload}
              />
              <div className="mt-3 flex min-h-5 items-center gap-2 text-xs font-bold text-[#765e4b]">
                {fileName ? (
                  <>
                    <FileImage size={14} /> <span className="truncate">{fileName}</span>
                  </>
                ) : (
                  <>
                    <Info size={14} /> One glyph per image
                  </>
                )}
              </div>
            </div>

            {/* Reference glyph */}
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold">Reference glyph</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#8b735f]">The expected form</p>
                </div>
                <label className="relative">
                  <span className="sr-only">Reference glyph</span>
                  <input
                    value={glyph}
                    maxLength={1}
                    onChange={(event) => {
                      setGlyph(event.target.value || "a");
                      resetResults();
                    }}
                    className="h-9 w-12 rounded-lg border border-[#dfcdb9] bg-[#f2e8da] text-center font-heading text-lg font-semibold outline-none focus:border-[#cf5145]"
                  />
                </label>
              </div>
              <div className="canvas-grid relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#dfcdb9] bg-[#fffdf9]">
                <span className="reference-glyph">{glyph}</span>
                {errorsFound && (
                  <>
                    <span className="reference-mark left-[54%] top-[22%]" />
                    <span className="reference-mark left-[35%] top-[59%]" />
                    <span className="reference-mark left-[67%] top-[72%]" />
                  </>
                )}
              </div>
              <p className="mt-3 flex min-h-5 items-center gap-2 text-xs font-bold text-[#765e4b]">
                <Sparkles size={14} /> Editable reference character
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#eadccd] pt-5 sm:flex-row">
            <button
              type="button"
              disabled={!imageUrl || finding}
              onClick={findErrors}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#cf5145] px-5 text-sm font-extrabold text-white transition hover:bg-[#b5362b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {finding ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ScanSearch size={18} />
              )}
              {finding ? "Finding differences…" : "Find errors"}
            </button>
            <button
              type="button"
              disabled={!imageUrl}
              onClick={gradeHandwriting}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cf5145] bg-white px-5 text-sm font-extrabold text-[#cf5145] transition hover:bg-[#fae9e3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Gauge size={18} /> Grade handwriting
            </button>
          </div>

          {(errorsFound || grade !== null) && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#fae9e3] px-4 py-3 text-sm font-bold text-[#b5362b]">
              <Check size={17} />
              {errorsFound && <span>3 areas need attention.</span>}
              {grade !== null && (
                <span className="rounded-md bg-white px-2 py-1 font-extrabold">
                  Grade: {grade}/100
                </span>
              )}
            </div>
          )}
        </section>

        <aside className="rounded-[22px] bg-[#f3d8c8] p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-[#4c7bd9] text-white">
            <Upload size={20} />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Tips for a clean test</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#765e4b]">
            Better uploads make comparison results easier to understand.
          </p>
          <ul className="mt-6 space-y-5">
            {tips.map(([title, detail], index) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#b5362b]">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-extrabold">{title}</span>
                  <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#765e4b]">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-3 rounded-xl border border-[#ddbca8] bg-white/60 p-3.5">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#a66731]" />
            <p className="text-xs font-bold leading-5 text-[#765e4b]">
              Cropped, tilted, or low-contrast samples may produce less reliable results.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
