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

export default function TokenizerPanel({ result, isSimple }) {
  const accentColor = isSimple ? '#5c8fd9' : '#9c7dce';
  const unkCount = result ? result.tokens.filter(t => t.is_unk).length : 0;

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
            ? 'Regex-based · "The Verdict" corpus · handles unknown tokens as <UNK>'
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
          <strong>⚠ {unkCount} unknown token{unkCount > 1 ? 's' : ''}</strong>
          {' '}— words not present in "The Verdict" vocabulary are mapped to <code style={{ fontSize: '11px' }}>&lt;UNK&gt;</code> (ID {result.tokens.find(t => t.is_unk)?.token_id ?? '—'})
        </div>
      )}
    </div>
  );
}
