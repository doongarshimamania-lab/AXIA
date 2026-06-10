import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Twitter, Facebook, Linkedin, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WaitlistSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referralCode = searchParams.get("code");

  const [copied, setCopied] = useState(false);

  // Get user's waitlist stats
  const stats = useQuery(
    api.waitlist.getReferralStats,
    referralCode ? { referralCode } : "skip"
  );

  useEffect(() => {
    if (!referralCode) {
      navigate("/");
    }
  }, [referralCode, navigate]);

  if (!referralCode || !stats) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const { entry, referralCount, position } = stats;
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const text = `I just joined the Axia waitlist! Join me and we'll both move up the list. #Axia`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Axia Waitlist',
          text: 'Join me on the Axia waitlist!',
          url: referralLink,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  const progress = Math.min(100, ((referralCount ?? 0) / 5) * 100); // 5 referrals = 100%
  const spotsToEarlyAccess = Math.max(0, 5 - (referralCount ?? 0));

  return (
    <div className="min-h-screen gradient-hero py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="mb-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to home</span>
        </button>

        {/* Success Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/20"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              You're on the waitlist!
            </h1>

            <p className="text-xl text-blue-100 mb-2">
              Your current position is
            </p>

            <div className="inline-block bg-white/20 px-8 py-4 rounded-2xl">
              <span className="text-6xl font-bold text-white">
                #{position}
              </span>
            </div>

            {position === 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-2xl font-bold text-green-400"
              >
                🎉 You're next in line for early access!
              </motion.p>
            )}
          </div>

          {/* Referral Section */}
          <div className="bg-white/5 rounded-2xl p-6 sm:p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-3">
              Want to skip the line?
            </h2>

            <p className="text-blue-100 mb-6">
              Refer your friends and move up the list. Each referral moves you up by 1 spot!
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-blue-200">Progress to Early Access</span>
                <span className="text-sm font-bold text-white">{referralCount}/5 referrals</span>
              </div>

              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                />
              </div>

              {spotsToEarlyAccess > 0 && (
                <p className="text-sm text-blue-200 mt-2">
                  Refer {spotsToEarlyAccess} more {spotsToEarlyAccess === 1 ? 'friend' : 'friends'} to get early access!
                </p>
              )}
            </div>

            {/* Referral Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Your referral link
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-white/40"
                 
                />

                <Button
                  onClick={copyToClipboard}
                  className="px-6 bg-white text-primary hover:bg-white/90 rounded-xl"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-3">
                Share on social media
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  onClick={shareToTwitter}
                  className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-xl py-6"
                >
                  <Twitter className="w-5 h-5 mr-2" />
                  Twitter
                </Button>

                <Button
                  onClick={shareToFacebook}
                  className="bg-[#4267B2] hover:bg-[#365899] text-white rounded-xl py-6"
                >
                  <Facebook className="w-5 h-5 mr-2" />
                  Facebook
                </Button>

                <Button
                  onClick={shareToLinkedIn}
                  className="bg-[#0077B5] hover:bg-[#006399] text-white rounded-xl py-6"
                >
                  <Linkedin className="w-5 h-5 mr-2" />
                  LinkedIn
                </Button>

                <Button
                  onClick={shareNative}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-xl py-6"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {referralCount}
              </div>
              <div className="text-sm text-blue-200">
                Friends Referred
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {referralCount}
              </div>
              <div className="text-sm text-blue-200">
                Spots Moved Up
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-blue-200/60">
              We'll notify you at <span className="font-medium text-white">{entry.email}</span> when it's your turn
            </p>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-blue-200/60 text-sm"
        >
          <p>
            Questions? Contact us at support@axia.app
          </p>
        </motion.div>
      </div>
    </div>
  );
}
