import React, { useState } from 'react';
import { CheckCircle, ExternalLink, X, Copy, Check } from 'lucide-react';

const BlockchainTxModal = ({ txData, onClose, actionLabel }) => {
  const [copied, setCopied] = useState('');

  if (!txData) return null;

  const etherscanUrl = `https://sepolia.etherscan.io/tx/${txData.transactionId}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            padding: '24px',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: 'white',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: '50%',
                padding: '12px',
                display: 'flex',
              }}
            >
              <CheckCircle size={30} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: 0 }}>
                Transaction Successful!
              </h2>
              <p style={{ fontSize: '14px', color: '#d1fae5', marginTop: '4px' }}>
                {actionLabel || 'Recorded on Sepolia Blockchain'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Transaction Hash */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transaction Hash
            </label>
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <code style={{ fontSize: '13px', color: '#166534', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace', fontWeight: 500 }}>
                {txData.transactionId}
              </code>
              <button
                onClick={() => copyToClipboard(txData.transactionId, 'tx')}
                style={{
                  marginLeft: '10px',
                  color: copied === 'tx' ? '#16a34a' : '#9ca3af',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Copy"
              >
                {copied === 'tx' ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Data Hash */}
          {txData.hash && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Data Hash (SHA-256)
              </label>
              <div
                style={{
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <code style={{ fontSize: '13px', color: '#1e40af', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace', fontWeight: 500 }}>
                  {txData.hash}
                </code>
                <button
                  onClick={() => copyToClipboard(txData.hash, 'hash')}
                  style={{
                    marginLeft: '10px',
                    color: copied === 'hash' ? '#16a34a' : '#9ca3af',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Copy"
                >
                  {copied === 'hash' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Block Number */}
          {txData.blockNumber && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Block Number
              </label>
              <p
                style={{
                  marginTop: '6px',
                  fontFamily: 'monospace',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  margin: '6px 0 0 0',
                }}
              >
                #{txData.blockNumber.toLocaleString()}
              </p>
            </div>
          )}

          {/* Network badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
            Sepolia Testnet (Ethereum)
          </div>

          {/* Etherscan link */}
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '15px',
              textDecoration: 'none',
              gap: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <ExternalLink size={18} />
            View on Etherscan
          </a>
        </div>
      </div>
    </div>
  );
};

export default BlockchainTxModal;
