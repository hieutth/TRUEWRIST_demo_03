import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useNavigate } from "react-router";
import {
  Upload,
  X,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Download,
  AlertCircle,
  ChevronRight,
  Save,
  Eye,
  Wand2,
  ImageOff,
} from "lucide-react";
import {
  useWatchStore,
  CustomWatch,
} from "../context/WatchStore";
import { ARTryOn } from "../components/ARTryOn";

/* ─── Slots ─────────────────────────────────────────────── */
const ANGLE_SLOTS = [
  {
    key: "front",
    label: "Mặt trước",
    hint: "Góc nhìn thẳng",
    required: true,
  },
  {
    key: "left34",
    label: "3/4 Trái",
    hint: "Nghiêng ~45°",
    required: false,
  },
  {
    key: "left",
    label: "Bên trái",
    hint: "Góc 90°",
    required: false,
  },
  {
    key: "right34",
    label: "3/4 Phải",
    hint: "Nghiêng ~45°",
    required: false,
  },
  {
    key: "right",
    label: "Bên phải",
    hint: "Góc 90°",
    required: false,
  },
  {
    key: "back",
    label: "Mặt sau",
    hint: "Phía sau",
    required: false,
  },
] as const;
type SlotKey = (typeof ANGLE_SLOTS)[number]["key"];

const STRAP_OPTIONS = [
  "Leather",
  "Metal",
  "Rubber",
  "NATO",
  "Fabric",
];
const TAG_OPTIONS = [
  "New",
  "Hot",
  "Limited",
  "Exclusive",
  "Bestseller",
  "Custom",
];

/* ─── Pollinations URL builder ──────────────────────────── */
// Keep prompt SHORT to avoid URL length 404 errors on Pollinations.ai
function buildRenderUrl(userDesc: string): string {
  // Strip to essentials — max ~150 chars for the description part
  const desc =
    userDesc.trim().slice(0, 150) ||
    "luxury stainless steel watch silver dial";

  // Compact fixed suffix — all essential render keywords
  const suffix = "product photo black bg studio light 8k";
  const full = `luxury wristwatch 3D render ${desc} ${suffix}`;

  const encoded = encodeURIComponent(full);
  const seed = Math.floor(Math.random() * 999_999);

  // Use model=turbo — faster & more reliable than flux for this use case
  return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;
}

/* ─── Step-bar ──────────────────────────────────────────── */
const STUDIO_STEPS = [
  "Upload ảnh 2D",
  "AI Render 3D",
  "Thông tin mẫu",
  "Hoàn thành",
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-12 overflow-x-auto">
      {STUDIO_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex items-center gap-2 px-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 transition-all duration-300 ${
                i < current
                  ? "bg-[#C4964A] text-black"
                  : i === current
                    ? "border-2 border-[#C4964A] text-[#C4964A]"
                    : "border border-white/20 text-white/25"
              }`}
            >
              {i < current ? <CheckCircle2 size={11} /> : i + 1}
            </div>
            <span
              className={`text-[9px] tracking-[0.12em] uppercase whitespace-nowrap ${
                i === current
                  ? "text-[#C4964A]"
                  : i < current
                    ? "text-white/50"
                    : "text-white/20"
              }`}
            >
              {s}
            </span>
          </div>
          {i < STUDIO_STEPS.length - 1 && (
            <ChevronRight
              size={12}
              className="text-white/20 mx-2 flex-shrink-0"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Step 1: Upload + Describe ─────────────────────────── */
function UploadStep({
  images,
  watchDesc,
  onFile,
  onRemove,
  onDescChange,
  onNext,
}: {
  images: Partial<Record<SlotKey, string>>;
  watchDesc: string;
  onFile: (
    key: SlotKey,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (key: SlotKey) => void;
  onDescChange: (v: string) => void;
  onNext: () => void;
}) {
  const fileRefs = useRef<
    Partial<Record<SlotKey, HTMLInputElement | null>>
  >({});
  const count = Object.keys(images).length;
  const hasFront = !!images["front"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "1.6rem",
            }}
            className="text-white mb-2"
          >
            Upload ảnh đồng hồ
          </h2>
          <p className="text-white/40 text-xs leading-relaxed">
            Upload ảnh chụp thật. AI sẽ tạo ảnh 3D studio chuyên
            nghiệp. Tối thiểu cần ảnh{" "}
            <span className="text-white/70">mặt trước</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ANGLE_SLOTS.map((slot) => {
            const img = images[slot.key];
            return (
              <div
                key={slot.key}
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <p className="text-white/55 text-[10px] tracking-[0.1em] uppercase">
                    {slot.label}
                  </p>
                  {slot.required && (
                    <span className="text-[#C4964A] text-[8px]">
                      *
                    </span>
                  )}
                </div>
                <div className="relative aspect-square bg-[#111111] border border-white/8 group overflow-hidden">
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            fileRefs.current[slot.key]?.click()
                          }
                          className="flex items-center gap-1 text-white/80 text-[9px] hover:text-[#C4964A] transition-colors"
                        >
                          <RefreshCw size={11} /> Thay
                        </button>
                        <button
                          onClick={() => onRemove(slot.key)}
                          className="flex items-center gap-1 text-white/50 text-[9px] hover:text-red-400 transition-colors"
                        >
                          <X size={11} /> Xóa
                        </button>
                      </div>
                      <div className="absolute top-1.5 right-1.5 bg-[#C4964A]/90 rounded-full p-0.5">
                        <CheckCircle2
                          size={10}
                          className="text-black"
                        />
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        fileRefs.current[slot.key]?.click()
                      }
                      className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-white/3 transition-colors duration-200 group/btn"
                    >
                      <div className="w-9 h-9 border border-dashed border-white/15 group-hover/btn:border-[#C4964A]/40 flex items-center justify-center transition-colors duration-200">
                        <Upload
                          size={13}
                          className="text-white/20 group-hover/btn:text-[#C4964A]/60 transition-colors duration-200"
                        />
                      </div>
                      <p className="text-white/20 text-[9px]">
                        {slot.hint}
                      </p>
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={(el) => {
                      fileRefs.current[slot.key] = el;
                    }}
                    onChange={onFile(slot.key)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Coverage */}
        <div>
          <div className="flex justify-between mb-1.5">
            <p className="text-white/30 text-[9px] tracking-[0.15em] uppercase">
              Độ phủ góc
            </p>
            <p className="text-[#C4964A] text-[9px]">
              {count}/{ANGLE_SLOTS.length}
            </p>
          </div>
          <div className="h-0.5 bg-white/8">
            <div
              className="h-full bg-[#C4964A] transition-all duration-500"
              style={{
                width: `${(count / ANGLE_SLOTS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
            Mô tả ngắn cho AI{" "}
            <span className="text-white/25 normal-case tracking-normal">
              (tuỳ chọn)
            </span>
          </label>
          <textarea
            value={watchDesc}
            onChange={(e) => onDescChange(e.target.value)}
            rows={2}
            maxLength={150}
            placeholder="Vd: black dial chronograph steel bracelet sport watch"
            className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/70 px-4 py-3 text-xs placeholder:text-white/18 focus:outline-none transition-colors resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className="text-white/18 text-[9px] flex items-center gap-1">
              <Wand2 size={9} /> Dùng tiếng Anh để render đẹp
              nhất
            </p>
            <p className="text-white/20 text-[9px]">
              {watchDesc.length}/150
            </p>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={!hasFront}
          className="w-full py-4 flex items-center justify-center gap-2 bg-[#C4964A] text-black text-xs tracking-[0.2em] uppercase hover:bg-[#d4a85a] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} /> Render 3D với AI
        </button>
        {!hasFront && (
          <div className="flex items-center gap-2 text-white/25 text-[10px]">
            <AlertCircle size={11} className="flex-shrink-0" />
            Cần upload ít nhất ảnh mặt trước
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-5">
        <div className="bg-[#111111] border border-white/8 p-5 space-y-4">
          <p className="text-white/40 text-[9px] tracking-[0.25em] uppercase">
            Mẹo chụp ảnh
          </p>
          {[
            "Nền trắng hoặc xám đồng nhất",
            "Ánh sáng đều, tránh bóng cứng",
            "Đồng hồ chiếm 70–80% khung hình",
            "Ảnh rõ nét, không bị mờ",
          ].map((t) => (
            <div key={t} className="flex gap-2.5 items-start">
              <div className="w-1 h-1 bg-[#C4964A] rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-white/38 text-[10px] leading-relaxed">
                {t}
              </p>
            </div>
          ))}
        </div>
        <div className="border border-white/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-white/40 text-[9px] font-mono">
              Pollinations.ai · Turbo
            </p>
          </div>
          <p className="text-white/15 text-[9px]">
            Miễn phí · Không cần API key
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: AI Render ─────────────────────────────────── */
type RenderState =
  | "generating"
  | "loading"
  | "done"
  | "error"
  | "fallback";

function RenderStep({
  images,
  watchDesc,
  onDone,
  onBack,
}: {
  images: Partial<Record<SlotKey, string>>;
  watchDesc: string;
  onDone: (img: string) => void;
  onBack: () => void;
}) {
  const [state, setState] = useState<RenderState>("generating");
  const [renderUrl, setRenderUrl] = useState<string | null>(
    null,
  );
  // blobUrl: safe same-origin URL for ARTryOn and canvas (no CORS issues)
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [arOpen, setArOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Revoke previous blobUrl on unmount / retry
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Fallback = front image if render fails
  const fallbackUrl =
    images["front"] ?? Object.values(images)[0] ?? null;

  useEffect(() => {
    setState("generating");
    setRenderUrl(null);
    setBlobUrl(null);
    setErrorMsg("");

    const t = setTimeout(() => {
      const url = buildRenderUrl(watchDesc);
      setRenderUrl(url);
      setState("loading");
    }, 800);

    return () => clearTimeout(t);
  }, [attempt, watchDesc]);

  // After img loads, immediately fetch as blob so ARTryOn gets a same-origin URL
  const handleImgLoad = useCallback(async (src: string) => {
    setState("done");
    // If src is already a blob/data URL, just use it directly
    if (src.startsWith("blob:") || src.startsWith("data:")) {
      setBlobUrl(src);
      return;
    }
    // Fetch remote URL → blob → objectURL
    try {
      const res = await fetch(src, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
    } catch {
      // fetch failed (CORS / network) — pass original URL; ARTryOn will handle it
      setBlobUrl(src);
    }
  }, []);

  const handleImgError = () => {
    if (fallbackUrl) {
      setState("fallback");
    } else {
      setState("error");
      setErrorMsg(
        "Không tải được ảnh render. Vui lòng thử lại.",
      );
    }
  };

  const retry = () => {
    setBlobUrl(null);
    setAttempt((a) => a + 1);
  };

  const useFallback = () => {
    if (fallbackUrl) {
      setState("done");
      setRenderUrl(fallbackUrl);
      setBlobUrl(fallbackUrl); // blob: URL already same-origin
    }
  };

  // The URL displayed in the <img> tag
  const displayUrl =
    state === "fallback" ? fallbackUrl : renderUrl;

  // The URL passed to ARTryOn / onDone (prefer blob, fall back to display)
  const safeUrl = blobUrl ?? displayUrl;

  if (arOpen && safeUrl) {
    return (
      <ARTryOn
        watchImage={safeUrl}
        watchName="Preview 3D"
        onClose={() => setArOpen(false)}
      />
    );
  }

  const handleDownload = () => {
    if (!safeUrl) return;
    const a = document.createElement("a");
    a.download = "truewrist-render.png";
    a.href = safeUrl;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "1.6rem",
            }}
            className="text-white mb-2"
          >
            AI Render 3D
          </h2>
          <p className="text-white/40 text-xs leading-relaxed">
            Pollinations.ai đang tạo ảnh 3D studio từ mô tả đồng
            hồ của bạn.
          </p>
        </div>

        {/* The actual image element — always mounted once URL is ready so browser handles loading */}
        {displayUrl && (
          <div
            className={`relative border border-white/10 overflow-hidden bg-[#0d0d0d] ${state === "done" || state === "fallback" ? "block" : "hidden"}`}
          >
            <img
              key={displayUrl}
              src={
                state === "fallback"
                  ? (fallbackUrl ?? "")
                  : (renderUrl ?? "")
              }
              alt="AI Render"
              onLoad={(e) =>
                handleImgLoad(
                  (e.target as HTMLImageElement).src,
                )
              }
              onError={handleImgError}
              className="w-full object-contain max-h-[420px]"
            />
            {state === "done" && (
              <div className="absolute top-2 right-2 bg-[#C4964A] text-black text-[8px] tracking-[0.15em] uppercase px-2 py-0.5">
                AI · 3D
              </div>
            )}
            {state === "fallback" && (
              <div className="absolute top-2 right-2 bg-white/10 text-white/60 text-[8px] tracking-[0.1em] uppercase px-2 py-0.5">
                Ảnh gốc
              </div>
            )}
          </div>
        )}

        {/* Generating spinner */}
        {(state === "generating" || state === "loading") && (
          <div className="border border-white/8 bg-[#111111] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#C4964A] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-white/60 text-xs">
                {state === "generating"
                  ? "Khởi tạo render pipeline..."
                  : "Đang tải ảnh 3D từ Pollinations.ai..."}
              </p>
            </div>
            <div className="h-1 bg-white/8 w-full rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C4964A] to-[#e8c27a] rounded-full animate-pulse"
                style={{
                  width: state === "generating" ? "15%" : "80%",
                }}
              />
            </div>
            <p className="text-white/15 text-[9px] text-center">
              Có thể mất 20–60 giây · Powered by Pollinations.ai
            </p>
          </div>
        )}

        {/* Fallback notice */}
        {state === "fallback" && (
          <div className="border border-yellow-800/40 bg-yellow-900/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ImageOff
                size={14}
                className="text-yellow-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-yellow-300 text-xs mb-1">
                  AI render không khả dụng lúc này
                </p>
                <p className="text-yellow-400/60 text-[10px]">
                  Đang dùng ảnh gốc của bạn. Bạn vẫn có thể tiếp
                  tục hoặc thử render lại.
                </p>
              </div>
            </div>
            <button
              onClick={retry}
              className="flex items-center gap-1.5 text-[9px] text-yellow-400/70 hover:text-yellow-300 transition-colors"
            >
              <RotateCcw size={10} /> Thử render lại
            </button>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="border border-red-800/40 bg-red-900/10 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={15}
                className="text-red-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-red-300 text-xs mb-1">
                  Render thất bại
                </p>
                <p className="text-red-400/60 text-[10px]">
                  {errorMsg}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={retry}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#C4964A] text-black text-[9px] tracking-[0.15em] uppercase hover:bg-[#d4a85a] transition-all"
              >
                <RotateCcw size={11} /> Thử lại
              </button>
              {fallbackUrl && (
                <button
                  onClick={useFallback}
                  className="px-4 py-2.5 border border-white/15 text-white/50 text-[9px] tracking-wide hover:border-white/30 transition-all"
                >
                  Dùng ảnh gốc
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions when result is ready */}
        {(state === "done" || state === "fallback") &&
          safeUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {blobUrl ? (
                  <>
                    <Sparkles
                      size={14}
                      className="text-[#C4964A]"
                    />
                    <p className="text-white/60 text-xs">
                      {state === "done"
                        ? "Render hoàn tất · Sẵn sàng Try AR"
                        : "Ảnh gốc đã sẵn sàng"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 border border-[#C4964A] border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/40 text-xs">
                      Đang chuẩn bị AR...
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onDone(safeUrl)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#C4964A] text-black text-xs tracking-[0.2em] uppercase hover:bg-[#d4a85a] transition-all duration-300"
                >
                  <ChevronRight size={14} /> Tiếp tục điền thông
                  tin
                </button>
                <button
                  onClick={() => setArOpen(true)}
                  disabled={!blobUrl}
                  className="px-4 py-3 border border-white/15 text-white/50 hover:border-[#C4964A] hover:text-[#C4964A] transition-all duration-200 flex items-center gap-1.5 text-[9px] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Eye size={13} /> Try AR
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-3 border border-white/15 text-white/50 hover:border-white/30 transition-all duration-200"
                >
                  <Download size={14} />
                </button>
              </div>
              {state === "done" && (
                <button
                  onClick={retry}
                  className="text-white/20 text-[9px] hover:text-white/40 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={9} /> Render lại (biến thể
                  mới)
                </button>
              )}
            </div>
          )}

        <button
          onClick={onBack}
          className="text-white/25 text-[10px] hover:text-white/50 transition-colors flex items-center gap-1"
        >
          ← Quay lại upload ảnh
        </button>
      </div>

      {/* Reference images */}
      <div className="lg:col-span-2 space-y-4">
        <p className="text-white/30 text-[9px] tracking-[0.2em] uppercase">
          Ảnh tham chiếu
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ANGLE_SLOTS.map((slot) => {
            const img = images[slot.key];
            if (!img) return null;
            return (
              <div
                key={slot.key}
                className="flex flex-col gap-1"
              >
                <div className="aspect-square bg-[#111] border border-white/8 overflow-hidden">
                  <img
                    src={img}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-white/25 text-[8px] text-center">
                  {slot.label}
                </p>
              </div>
            );
          })}
        </div>
        {watchDesc && (
          <div className="border border-white/8 p-3">
            <p className="text-white/25 text-[9px] tracking-[0.1em] uppercase mb-1">
              Prompt
            </p>
            <p className="text-white/35 text-[9px] leading-relaxed">
              {watchDesc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: Info Form ─────────────────────────────────── */
function InfoStep({
  renderedImage,
  onSave,
  onBack,
}: {
  renderedImage: string;
  onSave: (
    watch: Omit<CustomWatch, "id" | "isCustom" | "createdAt">,
  ) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [reference, setReference] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [strap, setStrap] = useState("Leather");
  const [sizeStr, setSizeStr] = useState("40");
  const [tag, setTag] = useState("Custom");
  const [desc, setDesc] = useState("");
  const [arOpen, setArOpen] = useState(false);

  const canSave = name.trim() && brand.trim();

  if (arOpen)
    return (
      <ARTryOn
        watchImage={renderedImage}
        watchName={name || "Preview"}
        onClose={() => setArOpen(false)}
      />
    );

  const handleSave = () => {
    if (!canSave) return;
    const price =
      parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
    onSave({
      name: name.trim(),
      brand: brand.trim(),
      reference: reference.trim(),
      price,
      displayPrice:
        price > 0
          ? `${price.toLocaleString("vi-VN")} ₫`
          : "Liên hệ",
      strap,
      size: parseFloat(sizeStr) || 40,
      image: renderedImage,
      originalImages: [],
      tag,
      description: desc.trim(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "1.6rem",
            }}
            className="text-white mb-2"
          >
            Thông tin mẫu đồng hồ
          </h2>
          <p className="text-white/40 text-xs">
            Điền thông tin. Mẫu sẽ xuất hiện trong{" "}
            <span className="text-[#C4964A]">Collections</span>{" "}
            khi lưu.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
              Tên đồng hồ *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vd: Midnight Chronos"
              className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs placeholder:text-white/20 focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
                Thương hiệu *
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Vd: TrueWrist"
                className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs placeholder:text-white/20 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
                Mã tham chiếu
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Vd: TW-001-A"
                className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs placeholder:text-white/20 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
                Giá (₫)
              </label>
              <input
                type="text"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="Vd: 12500000"
                className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs placeholder:text-white/20 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
                Kích thước (mm)
              </label>
              <input
                type="number"
                value={sizeStr}
                onChange={(e) => setSizeStr(e.target.value)}
                min={28}
                max={50}
                className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
              Dây đeo
            </label>
            <div className="flex flex-wrap gap-2">
              {STRAP_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStrap(s)}
                  className={`px-3 py-1.5 text-[9px] border transition-all duration-150 ${strap === s ? "border-[#C4964A] text-[#C4964A] bg-[#C4964A]/10" : "border-white/12 text-white/35 hover:border-white/25"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`px-3 py-1.5 text-[9px] border transition-all duration-150 ${tag === t ? "border-[#C4964A] text-[#C4964A] bg-[#C4964A]/10" : "border-white/12 text-white/35 hover:border-white/25"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-white/50 text-[9px] tracking-[0.2em] uppercase block mb-2">
              Mô tả
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết về mẫu đồng hồ..."
              className="w-full bg-[#111111] border border-white/10 focus:border-[#C4964A]/50 text-white/80 px-4 py-3 text-xs placeholder:text-white/20 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#C4964A] text-black text-xs tracking-[0.2em] uppercase hover:bg-[#d4a85a] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save size={14} /> Lưu vào Collections
          </button>
          <button
            onClick={() => setArOpen(true)}
            className="px-5 py-4 border border-white/15 text-white/50 hover:border-[#C4964A] hover:text-[#C4964A] transition-all duration-200 text-[9px] tracking-wide uppercase flex items-center gap-1.5"
          >
            <Eye size={13} /> Try AR
          </button>
        </div>
        <button
          onClick={onBack}
          className="text-white/25 text-[10px] hover:text-white/50 transition-colors flex items-center gap-1"
        >
          ← Quay lại render
        </button>
      </div>

      <div className="lg:col-span-2 space-y-5">
        <p className="text-white/30 text-[9px] tracking-[0.2em] uppercase">
          Xem trước thẻ Collections
        </p>
        <div className="bg-[#111111] border border-white/8 overflow-hidden">
          <div className="relative aspect-square bg-black overflow-hidden">
            <img
              src={renderedImage}
              alt="Render"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <span className="bg-[#C4964A] text-black text-[8px] tracking-[0.12em] uppercase px-2 py-1">
                {tag}
              </span>
            </div>
            <div className="absolute top-3 right-3 text-[8px] bg-black/60 text-[#C4964A] px-2 py-1 tracking-wide uppercase">
              AI 3D
            </div>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-[#C4964A] text-[9px] tracking-[0.2em] uppercase">
              {brand || "Thương hiệu"}
            </p>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "1.05rem",
              }}
              className="text-white"
            >
              {name || "Tên đồng hồ"}
            </p>
            {reference && (
              <p className="text-white/30 text-[9px]">
                Ref: {reference}
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <p className="text-white/60 text-xs">
                {priceStr
                  ? `${parseFloat(priceStr.replace(/[^0-9.]/g, "")).toLocaleString("vi-VN")} ₫`
                  : "Liên hệ"}
              </p>
              <p className="text-white/30 text-[9px]">
                {sizeStr}mm · {strap}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Success ───────────────────────────────────── */
function SuccessStep({
  watchName,
  onReset,
}: {
  watchName: string;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 border border-[#C4964A] flex items-center justify-center mb-6">
        <CheckCircle2 size={36} className="text-[#C4964A]" />
      </div>
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 300,
          fontSize: "2.2rem",
        }}
        className="text-white mb-3"
      >
        Đã lưu thành công!
      </h2>
      <p className="text-white/40 text-xs leading-relaxed max-w-sm mb-10">
        <span className="text-white/70">"{watchName}"</span> đã
        được thêm vào Collections.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={() => navigate("/collections")}
          className="bg-[#C4964A] text-black px-8 py-3 text-xs tracking-[0.2em] uppercase hover:bg-[#d4a85a] transition-all duration-300"
        >
          Xem Collections
        </button>
        <button
          onClick={onReset}
          className="border border-white/20 text-white/60 px-8 py-3 text-xs tracking-[0.2em] uppercase hover:border-[#C4964A] hover:text-[#C4964A] transition-all duration-300"
        >
          Tạo mẫu khác
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export function CreatorStudio() {
  const { addWatch } = useWatchStore();
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<
    Partial<Record<SlotKey, string>>
  >({});
  const [watchDesc, setWatchDesc] = useState("");
  const [rendered, setRendered] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");

  const handleFile = useCallback(
    (key: SlotKey) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImages((p) => ({
          ...p,
          [key]: URL.createObjectURL(file),
        }));
      },
    [],
  );

  const handleRemove = (key: SlotKey) =>
    setImages((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });

  const handleSave = (
    data: Omit<CustomWatch, "id" | "isCustom" | "createdAt">,
  ) => {
    addWatch({
      ...data,
      id: `custom-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    });
    setSavedName(data.name);
    setStep(3);
  };

  const handleReset = () => {
    setStep(0);
    setImages({});
    setWatchDesc("");
    setRendered(null);
    setSavedName("");
  };

  return (
    <div
      style={{ fontFamily: "'Jost', sans-serif" }}
      className="pt-20 min-h-screen bg-[#0A0A0A]"
    >
      <div className="border-b border-white/8 py-14 text-center">
        <p className="text-[#C4964A] text-[10px] tracking-[0.3em] uppercase mb-3">
          AI · Creator
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "clamp(2rem, 5vw, 4rem)",
            lineHeight: 1.05,
          }}
          className="text-white"
        >
          Creator Studio
        </h1>
        <p className="text-white/40 text-xs tracking-wide mt-4 max-w-md mx-auto leading-relaxed">
          Upload ảnh → Mô tả đồng hồ → AI render 3D →
          Collections → Try AR.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-12">
        {step < 3 && <StepBar current={step} />}

        {step === 0 && (
          <UploadStep
            images={images}
            watchDesc={watchDesc}
            onFile={handleFile}
            onRemove={handleRemove}
            onDescChange={setWatchDesc}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <RenderStep
            images={images}
            watchDesc={watchDesc}
            onDone={(img) => {
              setRendered(img);
              setStep(2);
            }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && rendered && (
          <InfoStep
            renderedImage={rendered}
            onSave={handleSave}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <SuccessStep
            watchName={savedName}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}