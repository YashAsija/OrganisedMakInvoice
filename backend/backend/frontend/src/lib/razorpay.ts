/**
 * Razorpay Checkout Loader and Execution Utility
 * Dynamically loads Razorpay script and initializes checkout modal.
 */

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayCheckoutOptions {
  subscriptionId?: string;
  orderId?: string;
  keyId?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  userEmail?: string;
  email?: string;
  userName?: string;
  userPhone?: string;
  plan?: string;
  mode?: string;
  onSuccess: (response?: any) => void;
  onError?: () => void;
  onDismiss?: () => void;
}

/**
 * Dynamically loads the Razorpay checkout script if not already present
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Opens the Razorpay Checkout Modal
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    if (options.onError) options.onError();
    throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
  }

  const razorpayKey = options.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TTVjnkLaEQRDCg';
  const customerEmail = options.email || options.userEmail || '';

  const checkoutOptions: Record<string, any> = {
    key: razorpayKey,
    name: options.name || 'MakInvoices',
    description: options.description || `${options.plan || 'SaaS'} Plan`,
    prefill: {
      email: customerEmail,
      name: options.userName || '',
      contact: options.userPhone || '',
    },
    theme: {
      color: '#0284c7',
    },
    notes: {
      plan: options.plan || '',
      mode: options.mode || '',
    },
    handler: function (response: any) {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (options.onError) options.onError();
        if (options.onDismiss) options.onDismiss();
      },
    },
  };

  if (options.subscriptionId) {
    checkoutOptions.subscription_id = options.subscriptionId;
  } else if (options.orderId) {
    checkoutOptions.order_id = options.orderId;
    if (options.amount) checkoutOptions.amount = options.amount;
    checkoutOptions.currency = options.currency || 'INR';
  }

  const rzp = new window.Razorpay(checkoutOptions);
  rzp.open();
}
