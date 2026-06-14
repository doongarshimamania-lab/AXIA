import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X, Twitter, Facebook, Linkedin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WaitlistSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
}

export function WaitlistSuccessModal({ isOpen, onClose, referralCode }: WaitlistSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  // Get user's waitlist stats with real-time updates
  const stats = useQuery(
    api.waitlist.getReferralStats,
    referralCode ? { referralCode } : "skip"
  );

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  // Apply blur effect to header when modal is open
  useEffect(() => {
    if (isOpen) {
      const nav = document.querySelector('nav');
      const themeToggle = document.querySelector('[data-theme-toggle]');
      if (nav) nav.classList.add('blur-sm', 'pointer-events-none');
      if (themeToggle) themeToggle.classList.add('blur-sm', 'pointer-events-none');
    } else {
      const nav = document.querySelector('nav');
      const themeToggle = document.querySelector('[data-theme-toggle]');
      if (nav) nav.classList.remove('blur-sm', 'pointer-events-none');
      if (themeToggle) themeToggle.classList.remove('blur-sm', 'pointer-events-none');
    }
    return () => {
      const nav = document.querySelector('nav');
      const themeToggle = document.querySelector('[data-theme-toggle]');
      if (nav) nav.classList.remove('blur-sm', 'pointer-events-none');
      if (themeToggle) themeToggle.classList.remove('blur-sm', 'pointer-events-none');
    };
  }, [isOpen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const text = `I just joined the Axia waitlist! 🎉\n\nJoin me and we'll both move up the list faster.`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToWhatsApp = () => {
    const text = `I just joined the Axia waitlist! Join me and we'll both move up the list: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!stats) {
    return null;
  }

  const { entry, referralCount = 0, position = 0 } = stats;
  const progress = Math.min(100, (referralCount / 5) * 100);
  const spotsToEarlyAccess = Math.max(0, 5 - referralCount);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-background rounded-xl shadow-2xl max-w-md w-full relative border border-border"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>

              {/* Content */}
              <div className="p-5 max-h-[calc(100vh-96px)] overflow-y-auto">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-10 h-10 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-6 h-6 text-white" />
                </motion.div>

                {/* Header */}
                <h2 className="text-xl font-bold text-center mb-1 text-slate-900 dark:text-white" style={{ fontFamily: "Space Grotesk" }}>
                  You're on the waitlist!
                </h2>

                <p className="text-center text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Your position
                </p>

                {/* Position Display */}
                <div className="flex items-center justify-center mb-3">
                  <div className="bg-[#00246B] px-6 py-3 rounded-lg">
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                      BZ #{position}
                    </span>
                  </div>
                </div>

                {position === 1 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm font-bold text-green-500 mb-2"
                  >
                    🎉 You're next!
                  </motion.p>
                )}

                {/* Referral Section */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-3">
                  <h3 className="text-base font-bold mb-1 text-slate-900 dark:text-white" style={{ fontFamily: "Space Grotesk" }}>
                    Move up faster!
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Share your link. Each friend moves you up 1 spot.
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {referralCount > 0 ? `${referralCount} joined` : 'Share to start'}
                      </span>
                      <span className="text-xs font-bold text-[#00246B] dark:text-blue-400">
                        {referralCount}/5
                      </span>
                    </div>

                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                      />
                    </div>

                    {spotsToEarlyAccess > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {spotsToEarlyAccess} more for early access
                      </p>
                    )}
                  </div>

                  {/* Referral Link */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Your referral link
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                        style={{ fontFamily: "Space Grotesk" }}
                      />

                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        className="px-3 py-1.5 bg-[#00246B] hover:bg-[#00246B]/90 text-white text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Social Share Buttons */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Share
                    </label>

                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        onClick={shareToTwitter}
                        size="sm"
                        className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white justify-center text-xs py-1.5 h-auto"
                      >
                        <Twitter className="w-3 h-3 mr-1" />
                        Twitter
                      </Button>

                      <Button
                        onClick={shareToWhatsApp}
                        size="sm"
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white justify-center text-xs py-1.5 h-auto"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>

                      <Button
                        onClick={shareToFacebook}
                        size="sm"
                        className="bg-[#4267B2] hover:bg-[#365899] text-white justify-center text-xs py-1.5 h-auto"
                      >
                        <Facebook className="w-3 h-3 mr-1" />
                        Facebook
                      </Button>

                      <Button
                        onClick={shareToLinkedIn}
                        size="sm"
                        className="bg-[#0077B5] hover:bg-[#006399] text-white justify-center text-xs py-1.5 h-auto"
                      >
                        <Linkedin className="w-3 h-3 mr-1" />
                        LinkedIn
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {referralCount > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold text-[#00246B] dark:text-blue-400" style={{ fontFamily: "Space Grotesk" }}>
                        {referralCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Friends Joined
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold text-green-500" style={{ fontFamily: "Space Grotesk" }}>
                        -{referralCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Spots Moved Up
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    We'll notify <span className="font-medium text-slate-700 dark:text-slate-300">{entry?.email}</span> when it's your turn
                  </p>

                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="w-full py-1.5 h-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
