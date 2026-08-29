import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Crown,
  Shield,
  Zap,
  QrCode,
  CreditCard,
  Building2,
  Lock,
  ArrowRight,
  Tv,
  Film,
  Download,
  Loader2,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  Receipt,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { VipPlan, VipUser } from '../types/admin';
import {
  getVipPlans,
  getVipUser,
  activateVipMembership,
  cancelVipMembership,
  subscribeToVip,
  subscribeToPlans,
  loginWithGoogle,
  getPaymentSettings,
  initiatePhonePePayment,
  checkPhonePePaymentStatus,
  simulatePhonePeWebhook,
} from '../services/vipStore';
import {
  isMembershipSystemEnabled,
  subscribeToAdminState,
} from '../services/adminStore';
import { triggerVipCelebration } from '../utils/confetti';

interface VipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: string;
  sourceContext?: string; // e.g. "episode_lock", "ad_banner", "header_cta"
}

export const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({
  isOpen,
  onClose,
  initialPlanId,
  sourceContext,
}) => {
  const [plans, setPlans] = useState<VipPlan[]>(getVipPlans());
  const [currentUser, setCurrentUser] = useState<VipUser>(getVipUser());
  const [membershipEnabled, setMembershipEnabled] = useState<boolean>(isMembershipSystemEnabled());
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialPlanId || 'plan_pro'
  );
  const [paymentMethod, setPaymentMethod] = useState<'phonepe' | 'upi' | 'card' | 'netbanking'>('phonepe');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('Otaku VIP');
  const [payerEmail, setPayerEmail] = useState<string>('otaku@anizenx.stream');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'checkout'>('plans');

  const [liveVerificationStatus, setLiveVerificationStatus] = useState<'idle' | 'verifying' | 'unlocked'>('idle');
  const [activeTxId, setActiveTxId] = useState<string>('');
  const [activeRedirectUrl, setActiveRedirectUrl] = useState<string>('');
  const [activeUpiIntentUrl, setActiveUpiIntentUrl] = useState<string>('');
  const [pollingStatusMsg, setPollingStatusMsg] = useState<string>('Initiating PhonePe payment intent...');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState<boolean>(false);

  const isLoggedIn = !!(currentUser && currentUser.email && !currentUser.userId.startsWith('guest_'));

  useEffect(() => {
    if (paymentSuccess) {
      triggerVipCelebration();
    }
  }, [paymentSuccess]);

  useEffect(() => {
    const unsubAdmin = subscribeToAdminState((s) => {
      setMembershipEnabled(s.isMembershipSystemEnabled ?? true);
    });
    return () => unsubAdmin();
  }, []);

  useEffect(() => {
    // Automated Gateway Redirect Callback Listener
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const callbackTxId = params.get('transaction_id') || params.get('txId');

    if (paymentStatus === 'callback' && callbackTxId) {
      setActiveTab('checkout');
      setLiveVerificationStatus('verifying');
      setPollingStatusMsg('Payment callback received. Awaiting gateway settlement confirmation...');
      setActiveTxId(callbackTxId);

      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const statusRes = await fetch(`/api/payment/status/${callbackTxId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'success') {
            clearInterval(pollInterval);
            setPollingStatusMsg('Payment Confirmed! Updating membership record...');
            setLiveVerificationStatus('unlocked');
            triggerVipCelebration();

            activateVipMembership(
              plans.find((p) => p.id === selectedPlanId) || plans[0],
              {
                method: 'upi',
                transactionId: callbackTxId,
                payerName: currentUser?.userName || 'Otaku VIP',
                payerEmail: currentUser?.email || 'vip@anizenx.stream'
              }
            );

            setTimeout(() => {
              setLiveVerificationStatus('idle');
              setPaymentSuccess(true);
              window.history.replaceState({}, document.title, window.location.pathname);
            }, 1800);
          } else if (polls >= 20) {
            clearInterval(pollInterval);
            setPollingStatusMsg('Transaction verification is in progress with your banking gateway. Once confirmed, your VIP status will be activated automatically.');
            setTimeout(() => {
              setLiveVerificationStatus('idle');
            }, 4000);
          }
        } catch (pollErr) {
          console.error('Error polling gateway status:', pollErr);
        }
      }, 1500);

      return () => clearInterval(pollInterval);
    }
  }, [currentUser, selectedPlanId, plans]);

  useEffect(() => {
    const unsubVip = subscribeToVip((u) => setCurrentUser(u));
    const unsubPlans = subscribeToPlans((p) => setPlans(p));
    return () => {
      unsubVip();
      unsubPlans();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      getPaymentSettings().then((setts) => setPaymentSettings(setts));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      setPayerName(currentUser.userName || 'Otaku VIP');
      setPayerEmail(currentUser.email || 'otaku@anizenx.stream');
    }
  }, [currentUser, isLoggedIn]);

  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  if (!isOpen || !membershipEnabled) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];

  const handleProceedToCheckout = () => {
    setActiveTab('checkout');
  };

  const handlePhonePePayment = async () => {
    setIsProcessing(true);
    setPollingStatusMsg('Generating secure PhonePe Merchant Payment Intent...');
    setLiveVerificationStatus('verifying');

    try {
      const response = await initiatePhonePePayment(selectedPlan, {
        payerName: currentUser?.userName || payerName,
        payerEmail: currentUser?.email || payerEmail,
        mobileNumber: mobileNumber || '9999999999',
      });

      const txId = response.merchantTransactionId;
      setActiveTxId(txId);
      setActiveRedirectUrl(response.redirectUrl || '');
      setActiveUpiIntentUrl(response.upiIntentUrl || '');

      setPollingStatusMsg('PhonePe Gateway Session Created. Awaiting server-to-server webhook confirmation...');

      // Open PhonePe Payment redirect in a new tab if URL is available
      if (response.redirectUrl) {
        window.open(response.redirectUrl, '_blank');
      }

      // Enter the server polling loop: unlocks strictly when server confirms PAYMENT_SUCCESS via webhook or PG status API
      let count = 0;
      const poll = setInterval(async () => {
        count++;
        try {
          const statusData = await checkPhonePePaymentStatus(txId);

          if (statusData.status === 'success') {
            clearInterval(poll);
            setPollingStatusMsg('PhonePe Webhook Confirmed! VIP Access is now fully activated.');
            setLiveVerificationStatus('unlocked');
            triggerVipCelebration();

            activateVipMembership(selectedPlan, {
              method: 'phonepe_gateway',
              transactionId: txId,
              payerName: currentUser?.userName || payerName,
              payerEmail: currentUser?.email || payerEmail,
            });

            setTimeout(() => {
              setLiveVerificationStatus('idle');
              setPaymentSuccess(true);
            }, 1800);
          } else if (count > 40) {
            clearInterval(poll);
            setPollingStatusMsg('Session verification window closed. If you completed payment in PhonePe, VIP will activate automatically once webhook arrives.');
            setTimeout(() => {
              setLiveVerificationStatus('idle');
            }, 4000);
          }
        } catch (pollErr) {
          console.error('PhonePe polling error:', pollErr);
        }
      }, 1500);

    } catch (err: any) {
      console.error('PhonePe init error:', err);
      alert('PhonePe Gateway Initialization Failed: ' + (err?.message || String(err)));
      setLiveVerificationStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!activeTxId) return;
    setIsSimulatingWebhook(true);
    try {
      await simulatePhonePeWebhook(activeTxId, currentUser.userId);
      setPollingStatusMsg('Simulated PhonePe PAYMENT_SUCCESS webhook received by server! Activating...');
    } catch (err: any) {
      console.error('Simulate webhook error:', err);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="relative px-5 py-4 border-b border-neutral-800/80 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>AnizenX</span>
                  <span className="bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent">
                    VIP Pass
                  </span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                  100% AD-FREE
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Unlock ultra-high bitrate 1080p/4K streaming, zero prerolls, and exclusive anime
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* If already active VIP */}
          {currentUser.isVip && !paymentSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Active Plan: {currentUser.tier}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-extrabold uppercase">
                      VIP ACTIVE
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Expires:{' '}
                    {currentUser.expiresAt === 'lifetime'
                      ? 'Lifetime Forever'
                      : currentUser.expiresAt
                      ? new Date(currentUser.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => cancelVipMembership()}
                className="text-xs text-neutral-400 hover:text-rose-400 underline cursor-pointer"
              >
                Cancel Subscription
              </button>
            </div>
          )}

          {/* Success Screen with Celebratory Confetti & Animations */}
          {paymentSuccess ? (
            <div className="py-8 text-center space-y-5 animate-fadeIn relative overflow-hidden">
              {/* Celebratory Ambient Glow & Floating Burst */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-emerald-500/20 blur-3xl -z-10 pointer-events-none rounded-full animate-pulse" />

              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-amber-400/30 blur-xl animate-ping" />
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-emerald-400 flex items-center justify-center text-black shadow-2xl shadow-amber-500/40 animate-bounce">
                  <Crown className="w-10 h-10 fill-current" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PAYMENT CONFIRMED • VIP UNLOCKED</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  🎉 Welcome to AnizenX VIP!
                </h3>
                <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                  Your PhonePe payment was verified and confirmed via webhook. All ads, prerolls, and episode paywalls
                  have been permanently unlocked for your account.
                </p>
              </div>

              <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2 font-mono shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Plan:</span>
                  <span className="text-white font-bold bg-neutral-800 px-2 py-0.5 rounded">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Duration:</span>
                  <span className="text-amber-400 font-bold">{selectedPlan.duration}</span>
                </div>
                {activeTxId && (
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>PhonePe Txn ID:</span>
                    <span className="text-amber-300 font-mono font-bold text-[11px] truncate max-w-[200px]">{activeTxId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-neutral-400 pt-1 border-t border-neutral-800">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>100% ACTIVATED (PAYMENT_SUCCESS)</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerVipCelebration()}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Replay Confetti 🎊</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:from-rose-500 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-amber-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Start Streaming Ad-Free Now
                </button>
              </div>
            </div>
          ) : activeTab === 'plans' ? (
            // Tab 1: Plans Grid
            <div className="space-y-6">
              {/* Context Notice */}
              {sourceContext === 'episode_lock' && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>This episode is locked for Free users. Choose a VIP plan below to unlock instantly!</span>
                </div>
              )}

              {/* Google Sign-In Callout */}
              {!isLoggedIn ? (
                <div className="p-4 rounded-xl bg-rose-600/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span>Link subscription to your Google Account</span>
                    </h4>
                    <p className="text-[11px] text-neutral-300">
                      Sign in with Google now to secure your VIP status forever and restore it instantly on other devices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                      } catch (e: any) {
                        if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
                          console.error('Google Sign-In failed in checkout flow:', e);
                        }
                      }
                    }}
                    className="self-start sm:self-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black bg-white hover:bg-neutral-100 text-neutral-900 shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Google Connect</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-amber-500/40">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 text-white font-bold text-xs flex items-center justify-center uppercase">
                        {(currentUser.userName || 'U')[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-white leading-none">
                      Secured via Google Account
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                      Logged in as: <span className="text-neutral-200">{currentUser.email}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* VIP Perks High-tech Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 text-center">
                  <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                  <h5 className="text-xs font-bold text-white">0s Preroll Ads</h5>
                  <p className="text-[10px] text-neutral-400">Instant video play</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 text-center">
                  <Tv className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
                  <h5 className="text-xs font-bold text-white">1080p / 4K Bitrate</h5>
                  <p className="text-[10px] text-neutral-400">Crisp anime detail</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 text-center">
                  <Film className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                  <h5 className="text-xs font-bold text-white">All Episodes Unlocked</h5>
                  <p className="text-[10px] text-neutral-400">Full series access</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 text-center">
                  <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <h5 className="text-xs font-bold text-white">Server Alpha Priority</h5>
                  <p className="text-[10px] text-neutral-400">Zero buffering lag</p>
                </div>
              </div>

              {/* Plans Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-neutral-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50'
                          : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-black font-black text-[9px] uppercase tracking-wider shadow-md">
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mt-1">
                          <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                          <span className="text-xs font-mono text-neutral-400">{plan.duration}</span>
                        </div>

                        <div className="my-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">₹{plan.priceInr}</span>
                            <span className="text-xs text-neutral-400">/ ${plan.priceUsd}</span>
                          </div>
                        </div>

                        <ul className="space-y-2 text-[11px] text-neutral-300">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 mt-4 border-t border-neutral-800">
                        <button
                          type="button"
                          className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-black font-black'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Choose Plan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-neutral-400">
                  <span>Selected: </span>
                  <strong className="text-white">{selectedPlan.name}</strong>
                  <span> — ₹{selectedPlan.priceInr} ({selectedPlan.duration})</span>
                </div>

                <button
                  id="proceed-vip-checkout-btn"
                  onClick={handleProceedToCheckout}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:scale-105 transition-all cursor-pointer"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // Tab 2: Official Automated PhonePe Payment Gateway Checkout
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className="text-xs text-neutral-400 hover:text-white cursor-pointer flex items-center gap-1 font-semibold"
                >
                  ← Back to Plans
                </button>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                  <span>Payable Amount:</span>
                  <span className="text-sm font-black text-amber-400">
                    ₹{selectedPlan.priceInr} (${selectedPlan.priceUsd})
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('phonepe')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'phonepe'
                      ? 'bg-purple-950/40 border-purple-500 text-purple-300 ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-850'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-xs">
                    Pe
                  </div>
                  <span className="text-xs font-bold text-white">PhonePe PG</span>
                  <span className="text-[10px] text-purple-400 font-mono">Automated Webhook</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-850'
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-xs font-bold">UPI Apps</span>
                  <span className="text-[10px] opacity-70">GPay, Paytm, BHIM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-850'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-bold">Cards & NetBanking</span>
                  <span className="text-[10px] opacity-70">Visa, Master, Rupay</span>
                </button>
              </div>

              {/* PhonePe Automated Gateway Main Panel */}
              {paymentMethod === 'phonepe' ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-neutral-900/90 to-neutral-950 border border-purple-500/30 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-purple-600/30 shrink-0">
                          Pe
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">
                              PhonePe Business Gateway
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase">
                              Verified PG
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Direct automated settlement with server-to-server webhook confirmation
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-neutral-500 block">Order Total</span>
                        <span className="text-xl font-black text-amber-400">₹{selectedPlan.priceInr}</span>
                      </div>
                    </div>

                    {/* Features checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-900/30 text-[11px] text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Direct UPI & QR Intent</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Instant Webhook VIP Activation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Zero Manual UTR Forms</span>
                      </div>
                    </div>

                    {/* Customer Info Form */}
                    <div className="space-y-3 pt-3 border-t border-neutral-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Subscriber Name
                          </label>
                          <input
                            type="text"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Mobile Number (for UPI notification)
                          </label>
                          <input
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                            placeholder="e.g. 9876543210"
                            maxLength={10}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>256-Bit SSL Encrypted Official PG Integration</span>
                      </div>

                      <button
                        type="button"
                        onClick={handlePhonePePayment}
                        disabled={isProcessing}
                        id="launch-phonepe-pg-btn"
                        className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Initiating PhonePe...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Pay ₹{selectedPlan.priceInr} with PhonePe PG</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : paymentMethod === 'upi' ? (
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wide">
                        Generic UPI Intent / Apps
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Launch your default UPI app or route through PhonePe Merchant Gateway
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePhonePePayment}
                      disabled={isProcessing}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-black text-xs shadow-xl cursor-pointer"
                    >
                      Launch UPI Payment (₹{selectedPlan.priceInr})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wide">
                        Credit / Debit Card / NetBanking via PhonePe
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        PhonePe PG supports all Visa, Mastercard, Rupay, and NetBanking methods with instant webhooks
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePhonePePayment}
                      disabled={isProcessing}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl cursor-pointer"
                    >
                      Proceed to Card Gateway (₹{selectedPlan.priceInr})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time PhonePe Webhook Live Status Overlay */}
        {liveVerificationStatus !== 'idle' && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn space-y-6">
            {liveVerificationStatus === 'verifying' ? (
              <div className="space-y-6 max-w-md mx-auto">
                <div className="relative w-20 h-20 mx-auto">
                  {/* Glowing spinner animations */}
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-amber-500/20 border-b-amber-500 animate-spin animate-reverse" />
                  <div className="absolute inset-0 m-auto w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                    Pe
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xl font-extrabold text-white tracking-tight">
                    Awaiting PhonePe Confirmation...
                  </h4>
                  {activeTxId && (
                    <p className="text-xs text-purple-300 font-mono tracking-wider font-semibold bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 inline-block">
                      MERCHANT TXN: {activeTxId}
                    </p>
                  )}
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {pollingStatusMsg}
                  </p>
                </div>

                {/* Gateway Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  {activeRedirectUrl && (
                    <a
                      href={activeRedirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open PhonePe Checkout Tab</span>
                    </a>
                  )}

                  {/* Sandbox/Preview Webhook Simulator Button */}
                  <button
                    type="button"
                    onClick={handleSimulateWebhook}
                    disabled={isSimulatingWebhook}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-mono font-bold transition-colors border border-amber-500/30 cursor-pointer"
                  >
                    {isSimulatingWebhook ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>⚡ Test Server Webhook (Simulate Success)</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Official Server-to-Server HMAC SHA256 Webhook</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    VIP status triggers immediately when confirmed callback is received from PhonePe server.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto animate-bounce text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-black shadow-2xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-black stroke-[3]" />
                </div>
                <h4 className="text-2xl font-black text-white">
                  VIP Unlocked!
                </h4>
                <p className="text-xs text-neutral-300">
                  Payment confirmed via PhonePe Webhook! Enjoy 100% ad-free high speed streaming.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

