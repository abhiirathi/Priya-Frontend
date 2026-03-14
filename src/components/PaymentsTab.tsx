import { useEffect, useState } from 'react';

export interface PaymentLink {
  vendorName: string;
  status: 'generating' | 'generated' | 'failed';
  paymentStatus: 'pending' | 'processing' | 'success' | 'failed';
  paymentLink?: string;
  orderId?: string;
  amount?: number;
  timestamp?: string;
}

interface PaymentsTabProps {
  vendorNames: string[];
  vendorAmounts?: { [key: string]: number };
  onPaymentLinksGenerated?: (count: number) => void;
}

export function PaymentsTab({ vendorNames, vendorAmounts = {}, onPaymentLinksGenerated }: PaymentsTabProps) {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (vendorNames.length > 0) {
      generatePaymentLinks();
    }
  }, [vendorNames]);

  const generatePaymentLinks = async () => {
    setIsGenerating(true);
    setPaymentLinks(vendorNames.map((name) => ({ vendorName: name, status: 'generating', paymentStatus: 'pending' })));

    // Simulate sequential generation
    for (let i = 0; i < vendorNames.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const randomSuccess = Math.random() > 0.1; // 90% success rate for demo

      setPaymentLinks((prev) => {
        const updated = [...prev];
        updated[i] = {
          vendorName: vendorNames[i],
          status: randomSuccess ? 'generated' : 'failed',
          paymentStatus: randomSuccess ? 'success' : 'failed',
          paymentLink: randomSuccess ? `https://pinelabs.com/pay/${Math.random().toString(36).substring(7)}` : undefined,
          orderId: randomSuccess ? `ORD-${Date.now()}-${i}` : undefined,
          amount: vendorAmounts[vendorNames[i]] || 0,
          timestamp: new Date().toLocaleTimeString()
        };

        return updated;
      });
    }

    setIsGenerating(false);

    // Calculate and notify success count
    const successCount = vendorNames.length - (paymentLinks.filter((p) => p.status === 'failed').length || 0);
    setTimeout(() => {
      onPaymentLinksGenerated?.(successCount);
    }, 500);
  };

  const successCount = paymentLinks.filter((p) => p.status === 'generated').length;
  const failedCount = paymentLinks.filter((p) => p.status === 'failed').length;

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  return (
    <div className="payments-tab">
      {/* Progress Header */}
      <div className="payments-header">
        <div className="payments-header__title">Payment Link Generation</div>
        <div className="payments-header__stats">
          <div className="payments-stat">
            <span className="payments-stat__label">Generated</span>
            <span className="payments-stat__value payments-stat__value--success">{successCount}</span>
          </div>
          <div className="payments-stat">
            <span className="payments-stat__label">Failed</span>
            <span className="payments-stat__value payments-stat__value--error">{failedCount}</span>
          </div>
          <div className="payments-stat">
            <span className="payments-stat__label">Total</span>
            <span className="payments-stat__value">{paymentLinks.length}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="payments-progress">
          <div className="payments-progress__bar">
            <div
              className="payments-progress__fill"
              style={{ width: `${(successCount + failedCount) / paymentLinks.length * 100}%` }}
            ></div>
          </div>
          <div className="payments-progress__text">
            Generating... {successCount + failedCount} of {paymentLinks.length}
          </div>
        </div>
      )}

      {/* Payment Links Grid */}
      <div className="payment-links-grid">
        {paymentLinks.map((payment, index) => (
          <div
            key={index}
            className={`payment-link-card payment-link-card--${payment.status}`}
            data-payment-status={payment.paymentStatus}
          >
            <div className="payment-link-card__header">
              <div className="payment-link-card__status-icon">
                {payment.status === 'generating' && <span className="spinner">⟳</span>}
                {payment.status === 'generated' && <span className="success-icon">✓</span>}
                {payment.status === 'failed' && <span className="error-icon">✕</span>}
              </div>
              <div className="payment-link-card__vendor-name">{payment.vendorName}</div>
            </div>

            <div className="payment-link-card__content">
              {payment.status === 'generating' && (
                <div className="payment-link-card__generating">
                  <div className="generating-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="generating-text">Creating payment link...</div>
                </div>
              )}

              {payment.status === 'generated' && (
                <>
                  <div className="payment-link-card__row">
                    <span className="payment-link-card__label">Order ID</span>
                    <span className="payment-link-card__value">{payment.orderId}</span>
                  </div>
                  <div className="payment-link-card__row">
                    <span className="payment-link-card__label">Amount</span>
                    <span className="payment-link-card__value">{formatCurrency(payment.amount || 0)}</span>
                  </div>
                  <div className="payment-link-card__row">
                    <span className="payment-link-card__label">Status</span>
                    <span className={`payment-link-card__status payment-link-card__status--${payment.paymentStatus}`}>
                      {payment.paymentStatus === 'pending' && '⏳ Pending'}
                      {payment.paymentStatus === 'processing' && '🔄 Processing'}
                      {payment.paymentStatus === 'success' && '✓ Success'}
                      {payment.paymentStatus === 'failed' && '✕ Failed'}
                    </span>
                  </div>
                  <div className="payment-link-card__row">
                    <span className="payment-link-card__label">Generated At</span>
                    <span className="payment-link-card__value">{payment.timestamp}</span>
                  </div>
                  <div className="payment-link-card__link">
                    <input
                      type="text"
                      readOnly
                      value={payment.paymentLink || ''}
                      className="payment-link-card__link-input"
                    />
                    <button
                      className="payment-link-card__copy-btn"
                      onClick={() => navigator.clipboard.writeText(payment.paymentLink || '')}
                    >
                      Copy
                    </button>
                  </div>
                </>
              )}

              {payment.status === 'failed' && (
                <div className="payment-link-card__error">
                  <div className="error-text">Failed to generate payment link</div>
                  <div className="error-subtext">Please try again or contact support</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
