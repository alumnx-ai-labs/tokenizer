import { useState } from 'react';
import TokenDisplay from './TokenDisplay';

const LEGEND_COLORS = 6;

function StatBadge({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      minWidth: 90,
    }}>
      <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
        {value}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}

function TokenIdPill({ token, id, isUnk, index }) {
  const c = isUnk ? 'unk' : index % LEGEND_COLORS;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '3px',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      background: isUnk ? 'var(--tok-unk-bg)' : `var(--tok-${c}-bg)`,
      border: `1px solid ${isUnk ? 'var(--tok-unk-fg)' : `var(--tok-${c}-fg)`}`,
      minWidth: '48px',
    }}>
      <span style={{
        fontFamily: 'monospace',
        fontSize: '11px',
        color: isUnk ? 'var(--tok-unk-fg)' : `var(--tok-${c}-fg)`,
        whiteSpace: 'pre',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {token.replace(/ /g, '·')}
      </span>
      <span style={{
        fontSize: '10px',
        color: 'var(--text-secondary)',
        fontFamily: 'monospace',
      }}>
        {id}
      </span>
    </div>
  );
}

export default function TokenizerPanel({ result, isSimple, onTokensAdded }) {
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectedTokens, setRejectedTokens] = useState([]);

  const accentColor = isSimple ? '#5c8fd9' : '#9c7dce';
  const unkTokens = result ? result.tokens.filter(t => t.is_unk) : [];
  const unkCount = unkTokens.length;
  const uniqueUnks = Array.from(new Set(unkTokens.map(t => t.token)));
  const validUnks = Array.from(new Set(unkTokens.filter(t => t.is_valid_new).map(t => t.token)));
  const invalidUnks = Array.from(new Set(unkTokens.filter(t => !t.is_valid_new).map(t => t.token)));

  const handleAddTokens = async () => {
    setSubmitting(true);
    setRejectedTokens([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/vocab/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: uniqueUnks })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rejected_tokens && data.rejected_tokens.length > 0) {
          setRejectedTokens(data.rejected_tokens);
          if (data.added_count > 0 && onTokensAdded) onTokensAdded();
        } else {
          setReviewing(false);
          if (onTokensAdded) onTokensAdded();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: accentColor, flexShrink: 0,
          }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {isSimple ? 'Simple Tokenizer' : 'TikToken'}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px' }}>
          {isSimple
            ? 'Regex-based · Combined books corpus · handles unknown tokens as <UNK>'
            : 'BPE sub-word · cl100k_base (GPT-4/3.5) · never produces <UNK>'}
        </p>
      </div>

      {/* Vocab & stats */}
      {result && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <StatBadge label="Tokens" value={result.token_count} />
          <StatBadge label="Vocab Size" value={result.vocab_size.toLocaleString()} />
          {isSimple && unkCount > 0 && (
            <StatBadge label="Unknown" value={unkCount} />
          )}
        </div>
      )}

      {/* Token highlight display */}
      {result && result.tokens.length > 0 ? (
        <>
          <div style={{
            padding: '14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tokens (hover for ID)
            </p>
            <TokenDisplay tokens={result.tokens} />
          </div>

          {/* Token ID grid */}
          <div style={{
            padding: '14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Token IDs
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {result.tokens.map((t, i) => (
                <TokenIdPill
                  key={i}
                  index={i}
                  token={t.token}
                  id={t.token_id}
                  isUnk={t.is_unk}
                />
              ))}
            </div>
          </div>

          {/* Raw IDs as array */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            overflowX: 'auto',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Raw ID Array
            </p>
            <code style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: accentColor,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              [{result.tokens.map(t => t.token_id).join(', ')}]
            </code>
          </div>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
          color: 'var(--text-muted)',
          fontSize: '14px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          Enter text above to see tokens
        </div>
      )}

      {/* UNK legend for simple tokenizer */}
      {isSimple && result && unkCount > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--tok-unk-bg)',
          border: '1px solid var(--tok-unk-fg)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--tok-unk-fg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>⚠ {unkCount} unknown token{unkCount > 1 ? 's' : ''}</strong>
              {' '}— words not present in "The Verdict" vocabulary are mapped to <code style={{ fontSize: '11px' }}>&lt;UNK&gt;</code>
            </div>
            <button
              onClick={() => setReviewing(!reviewing)}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--tok-unk-fg)',
                borderRadius: '4px',
                color: 'var(--tok-unk-fg)',
                cursor: 'pointer',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                marginLeft: '12px',
              }}
            >
              {reviewing ? 'Cancel' : 'Review New Tokens'}
            </button>
          </div>
          {reviewing && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--tok-unk-fg)' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>The following valid tokens will be added to the vocabulary:</p>
              {validUnks.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', maxHeight: '120px', overflowY: 'auto' }}>
                  {validUnks.map(word => (
                    <span key={word} style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {word}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', marginBottom: '12px', fontStyle: 'italic', opacity: 0.8 }}>No valid tokens found.</p>
              )}

              {invalidUnks.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ marginBottom: '8px', fontWeight: 600, color: '#ff6b6b' }}>The following invalid tokens require BPE and will be saved for training:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {invalidUnks.map(word => (
                      <span key={word} style={{ padding: '2px 6px', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff6b6b', borderRadius: '3px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#ff6b6b' }}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddTokens}
                disabled={submitting}
                style={{
                  padding: '6px 12px',
                  background: 'var(--tok-unk-fg)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#000',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Processing...' : 'Process All Tokens'}
              </button>

              {rejectedTokens.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--danger)', borderRadius: '4px', color: '#ff6b6b' }}>
                  <strong>{rejectedTokens.length} token(s) rejected:</strong> They do not exist as a single token in the TikToken vocabulary.
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {rejectedTokens.map(word => (
                      <span key={word} style={{ padding: '2px 4px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', fontFamily: 'monospace' }}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
