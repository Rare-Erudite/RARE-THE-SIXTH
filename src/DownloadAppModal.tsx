import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  Package,
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  RefreshCw,
  Layers
} from 'lucide-react';
import { ThemeConfig } from './theme';
import { usePWAInstall } from './usePWAInstall';

interface DownloadAppModalProps {
  t: ThemeConfig;
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  t,
  isOpen,
  onClose,
  assistantName,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showXenderGuide, setShowXenderGuide] = useState(false);
  const [pwaInstallSuccess, setPwaInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePwaInstall = async () => {
    const success = await install();
    if (success) {
      setPwaInstallSuccess(true);
      setTimeout(() => setPwaInstallSuccess(false), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl ${t.card} border ${t.cardBorder} shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-5 border-b ${t.cardBorder} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl ${t.accentBg} flex items-center justify-center text-white shadow-lg`}>
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Download & Install {assistantName}</h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  v1.0.0 Ready
                </span>
              </div>
              <p className={`text-xs ${t.textMuted}`}>
                Choose your preferred package for Android, Windows, or instant home screen installation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* PRIMARY OPTION: Android APK Download */}
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-indigo-950/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">Android APK Package</span>
                    <span className="text-[9px] font-mono bg-emerald-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    Standalone release package (<code className="font-mono text-emerald-300">RARE-v1.0.0-release.apk</code>)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                Target: SDK 34
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="/api/download/apk"
                download="RARE-v1.0.0-release.apk"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center space-x-2 shadow-lg transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK (.apk)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowAndroidGuide(!showAndroidGuide)}
                className="px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 flex items-center justify-center space-x-1.5 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Install Guide</span>
                {showAndroidGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setShowXenderGuide(!showXenderGuide)}
                className="px-3 py-2 rounded-xl border border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-500/20 flex items-center justify-center space-x-1.5 transition font-medium"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share via Xender</span>
                {showXenderGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Android Direct Install Instructions Dropdown */}
            {showAndroidGuide && (
              <div className="p-3.5 rounded-lg bg-black/50 border border-emerald-500/20 space-y-1.5 text-[11px] text-slate-300 animate-in fade-in duration-150">
                <div className="font-semibold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>How to install directly on your Android phone:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
                  <li>Click <strong>Download Android APK</strong> above to save <span className="font-mono text-emerald-300">RARE-v1.0.0-release.apk</span> into your phone's storage.</li>
                  <li>Open your phone's <strong>Downloads</strong> folder or tap the download complete notification.</li>
                  <li>Tap the APK file. If Android asks, enable <strong>"Allow from this source"</strong>.</li>
                  <li>Tap <strong>Install</strong>. RARE will appear directly on your home screen and app drawer!</li>
                  <li>Open it anytime without ever having to visit Chrome or AI Studio again.</li>
                </ol>
              </div>
            )}

            {/* Xender & Offline Sharing Instructions Dropdown */}
            {showXenderGuide && (
              <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-2 text-[11px] text-slate-300 animate-in fade-in duration-150">
                <div className="font-semibold text-white flex items-center space-x-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-200">How to share RARE with anyone using Xender (Zero Data):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
                  <li>First, tap <strong>Download Android APK</strong> above to save the file to your phone's Downloads.</li>
                  <li>Open the <strong>Xender</strong> app on your Android phone.</li>
                  <li>In Xender, tap the <strong>Files</strong> tab (or <strong>Apps</strong> tab) and open your <strong>Downloads</strong> folder.</li>
                  <li>Select <strong className="font-mono text-emerald-300">RARE-v1.0.0-release.apk</strong> and tap <strong>Send</strong>.</li>
                  <li>Have your friend open Xender on their phone, tap <strong>Receive</strong>, and scan your QR code.</li>
                  <li>Once transfer finishes in seconds, they tap <strong>Install</strong> on their phone!</li>
                  <li>They now have the standalone RARE app on their device with zero internet required for transfer!</li>
                </ol>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] text-indigo-300">
                  💡 <em>Tip: You can also share the downloaded APK file via Bluetooth, Nearby Share, or WhatsApp document!</em>
                </div>
              </div>
            )}

            {/* Dual-Channel Automatic Update System Explainer */}
            <div className="p-3 rounded-lg bg-black/30 border border-white/10 space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center space-x-1.5 text-white font-semibold">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Automatic Dual-Channel OTA Updates:</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Whenever you or the developer builds an update, the app automatically detects it on launch and brings up an update notification!
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  🌐 Public Channel: All users see new stable releases
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  🛡️ Developer Channel: Visible strictly to authorized developers
                </span>
              </div>
            </div>
          </div>

          {/* SECONDARY OPTION: In-App PWA / WebAPK Installation */}
          <div className={`p-4 rounded-xl ${t.cardSub} border ${t.cardBorder} space-y-3`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg ${t.accentBg} flex items-center justify-center text-white shadow-md`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">Instant WebAPK / Home Screen App</span>
                    <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded">
                      Zero Sideloading
                    </span>
                  </div>
                  <p className={`text-[11px] ${t.textMuted}`}>
                    Direct browser installation. Android builds a WebAPK instantly into your app launcher.
                  </p>
                </div>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs py-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>RARE is already installed and running in Standalone App Mode!</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handlePwaInstall}
                className={`w-full py-2.5 px-4 rounded-xl ${t.accentBg} ${t.accentBgHover} text-white font-bold flex items-center justify-center space-x-2 shadow-md transition active:scale-[0.98]`}
              >
                <Download className="w-4 h-4" />
                <span>Add to Home Screen (Instant Install)</span>
              </button>
            ) : isIOS ? (
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200">
                <span>To install on iPhone or iPad: tap the <strong>Share</strong> button in Safari toolbar, then select <strong>Add to Home Screen</strong>.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-400 py-1">
                <span>To install right now: In your browser menu (⋮ or Share), tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
              </div>
            )}

            {pwaInstallSuccess && (
              <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Install prompt accepted! Check your phone home screen or app launcher.</span>
              </div>
            )}
          </div>

          {/* TERTIARY OPTIONS: Windows Desktop & Source Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Windows EXE */}
            <div className={`p-3.5 rounded-xl ${t.cardSub} border ${t.cardBorder} flex flex-col justify-between space-y-2`}>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white">Windows Desktop</span>
                </div>
                <p className={`text-[11px] ${t.textDim}`}>Standalone x64 executable package (.exe)</p>
              </div>
              <a
                href="/api/download/exe"
                download="RARE-v1.0.0-windows-x64.exe"
                className="py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center justify-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Windows (.exe)</span>
              </a>
            </div>

            {/* Source Code Archive */}
            <div className={`p-3.5 rounded-xl ${t.cardSub} border ${t.cardBorder} flex flex-col justify-between space-y-2`}>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">Full Source Archive</span>
                </div>
                <p className={`text-[11px] ${t.textDim}`}>Complete project code, models, and dependencies (.tar.gz)</p>
              </div>
              <a
                href="/api/download/source"
                download="RARE-v1.0.0-source.tar.gz"
                className={`py-2 px-3 rounded-lg ${t.card} border ${t.cardBorder} hover:text-white text-slate-300 font-medium flex items-center justify-center space-x-1.5 transition`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Source Archive</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t ${t.cardBorder} flex items-center justify-between text-[11px] ${t.textDim}`}>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Built & signed by RARE Universal Build Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
