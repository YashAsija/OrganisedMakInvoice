/**
 * Paddle Checkout Initialization & Execution Utility
 * Initializes Paddle.js with client token and opens overlay checkout modal.
 */

import { initializePaddle, Paddle } from '@paddle/paddle-js';

let paddleInstancePromise: Promise<Paddle | undefined> | null = null;

/**
 * Ensures Paddle SDK is initialized with the client token
 */
export async function getPaddleInstance(): Promise<Paddle | undefined> {
  if (typeof window === 'undefined') return undefined;

  if (!paddleInstancePromise) {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_0b8c91040964a20151647bd285b';
    const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'production';

    if (!clientToken) {
      console.warn('[Paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN missing in environment');
      return undefined;
    }

    paddleInstancePromise = initializePaddle({
      token: clientToken,
      environment: environment,
    });
  }

  return paddleInstancePromise;
}

export interface PaddleCheckoutOptions {
  priceId: string;
  userEmail?: string;
  userId?: string;
  plan?: string;
  mode?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Opens Paddle overlay checkout
 */
export async function openPaddleCheckout(options: PaddleCheckoutOptions): Promise<void> {
  const paddle = await getPaddleInstance();
  if (!paddle) {
    throw new Error('Paddle SDK failed to initialize. Check NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.');
  }

  const checkoutPayload: any = {
    items: [
      {
        priceId: options.priceId,
        quantity: 1,
      },
    ],
    customData: {
      userId: options.userId || '',
      user_id: options.userId || '',
      plan: options.plan || 'basic',
      mode: options.mode || 'monthly',
    },
    eventCallback: (data: any) => {
      console.log('[Paddle Event]', data);
      if (data?.name === 'checkout.completed' || data?.event === 'checkout.completed') {
        if (options.onSuccess) options.onSuccess();
      } else if (data?.name === 'checkout.closed' || data?.event === 'checkout.closed') {
        if (options.onClose) options.onClose();
      }
    },
    settings: {
      displayMode: 'overlay',
      theme: 'light',
    },
  };

  if (options.userEmail && options.userEmail.trim() !== '') {
    checkoutPayload.customer = {
      email: options.userEmail.trim(),
    };
  }

  (paddle.Checkout.open as any)(checkoutPayload);
}
