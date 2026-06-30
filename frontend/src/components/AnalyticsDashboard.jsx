import { useMemo } from 'react';

// Calculate statistics for a given tokenizer result
const calculateStats = (tokResult, charCount) => {
  if (!tokResult) return null;
  const tokens = tokResult.tokens || [];
  const total = tokens.length;
  if (total === 0) return { total: 0, unique: 0, avgLen: 0, top: [], compressionRatio: 0 };

  // Unique tokens
  const uniqueIds = new Set(tokens.map(t => t.token_id));
  const uniqueCount = uniqueIds.size;

  // Average token length (in characters)
  const totalCharLen = tokens.reduce((sum, t) => sum + (t.token?.length || 0), 0);
  const avgLen = totalCharLen / total;

  // Compression ratio: characters per token
  const compressionRatio = charCount / total;

  // Top frequent tokens
  const frequencyMap = {};
  tokens.forEach(t => {
    const val = t.token;
    frequencyMap[val] = (frequencyMap[val] || 0) + 1;
  });

  const top = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token, count]) => ({ token, count }));

  return {
    total,
    unique: uniqueCount,
    avgLen,
    compressionRatio,
    top
  };
};

export default function AnalyticsDashboard({ result }) {
  const simpleStats = useMemo(() => {
    if (!result) return null;
    return calculateStats(result.simple, result.character_count);
  }, [result]);

  const tiktokenStats = useMemo(() => {
    if (!result) return null;
    return calculateStats(result.tiktoken, result.character_count);
  }, [result]);

  if (!result || !result.simple || !result.tiktoken || !simpleStats || !tiktokenStats) return null;

  // Determine which tokenizer is more efficient (higher chars per token is better)
  const isSimpleMoreEfficient = simpleStats.compressionRatio > tiktokenStats.compressionRatio;
  const isEquivalent = Math.abs(simpleStats.compressionRatio - tiktokenStats.compressionRatio) < 0.05;

  const getEfficiencyExplanation = () => {
    if (isEquivalent) return "Both tokenizers have identical compression efficiency for this text.";
    if (isSimpleMoreEfficient) {
      const pct = ((simpleStats.compressionRatio / tiktokenStats.compressionRatio - 1) * 100).toFixed(1);
      return `Simple Tokenizer is ${pct}% more efficient here because the text closely matches its customized book vocabulary.`;
    } else {
      const pct = ((tiktokenStats.compressionRatio / simpleStats.compressionRatio - 1) * 100).toFixed(1);
      return `TikToken is ${pct}% more efficient because its larger BPE vocabulary allows it to merge common sub-words into single tokens.`;
    }
  };

  // Helper to format ratio
  const formatRatio = (val) => val.toFixed(2);

  // Maximum ratio for progress bar normalization (cap at 6.0 chars/token for display)
  const maxBarRatio = Math.max(simpleStats.compressionRatio, tiktokenStats.compressionRatio, 5.0);

  return (
    <div style={{
      width: '100%',
      padding: '24px',
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>📊</span>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Token Statistics & Compression Analytics
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {/* Card 1: Compression Efficiency comparison */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
              Compression Ratio (Characters per Token)
            </h4>

            {/* Simple Tokenizer Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: '#5c8fd9', fontWeight: 600 }}>Simple Tokenizer</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {formatRatio(simpleStats.compressionRatio)} chars/token
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (simpleStats.compressionRatio / maxBarRatio) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3f7ad0, #5c8fd9)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* TikToken Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: '#9c7dce', fontWeight: 600 }}>TikToken (cl100k_base)</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {formatRatio(tiktokenStats.compressionRatio)} chars/token
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (tiktokenStats.compressionRatio / maxBarRatio) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #845ec2, #9c7dce)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '10px',
            fontStyle: 'italic'
          }}>
            {getEfficiencyExplanation()}
          </div>
        </div>

        {/* Card 2: Density & Vocabulary Metrics */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Vocabulary Density & Diversity
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
            {/* Stat Row 1: Unique Tokens */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Unique Tokens Used</span>
              <div style={{ display: 'flex', gap: '16px', fontFamily: 'monospace' }}>
                <span style={{ color: '#5c8fd9' }}>Simple: {simpleStats.unique}</span>
                <span style={{ color: '#9c7dce' }}>TikToken: {tiktokenStats.unique}</span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            {/* Stat Row 2: Average Token Length */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Average Token Length</span>
              <div style={{ display: 'flex', gap: '16px', fontFamily: 'monospace' }}>
                <span style={{ color: '#5c8fd9' }}>Simple: {simpleStats.avgLen.toFixed(1)} chars</span>
                <span style={{ color: '#9c7dce' }}>TikToken: {tiktokenStats.avgLen.toFixed(1)} chars</span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            {/* Stat Row 3: Vocabulary Utilization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Vocab Share Utilized</span>
              <div style={{ display: 'flex', gap: '16px', fontFamily: 'monospace', fontSize: '12px' }}>
                <span style={{ color: '#5c8fd9' }}>
                  Simple: {((simpleStats.unique / result.simple.vocab_size) * 100).toFixed(3)}%
                </span>
                <span style={{ color: '#9c7dce' }}>
                  TikToken: {((tiktokenStats.unique / result.tiktoken.vocab_size) * 100).toFixed(4)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Top Frequent Tokens */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Top Frequent Tokens
          </h4>

          <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
            {/* Simple Top Tokens */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#5c8fd9', fontWeight: 600 }}>Simple Tokenizer</span>
              {simpleStats.top.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {simpleStats.top.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(92, 143, 217, 0.1)',
                      border: '1px solid rgba(92, 143, 217, 0.2)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontFamily: 'monospace', whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                        {item.token.replace(/ /g, '·')}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>{item.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>

            {/* TikToken Top Tokens */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#9c7dce', fontWeight: 600 }}>TikToken</span>
              {tiktokenStats.top.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tiktokenStats.top.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(156, 125, 206, 0.1)',
                      border: '1px solid rgba(156, 125, 206, 0.2)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontFamily: 'monospace', whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                        {item.token.replace(/ /g, '·')}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>{item.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
