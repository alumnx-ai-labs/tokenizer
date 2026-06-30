import { useState, useEffect, useCallback, useRef } from 'react';
import TokenizerPanel from './components/TokenizerPanel';
import './index.css';

const API = import.meta.env.VITE_API_URL || '';

const EXAMPLE_TEXT =
  "I had always thought Jack Gisburn rather a cheap genius--though a good fellow enough--so it was no great surprise to me to hear that, in the height of his glory, he had dropped his painting.";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vocabInfo, setVocabInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewResult, setReviewResult] = useState(null);
  const debouncedText = useDebounce(text, 300);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchReviewQueue = useCallback(() => {
    fetch(`${API}/api/vocab/review-queue`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReviewQueue(data);
        } else {
          setReviewQueue([]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/vocab-info`)
      .then(r => r.json())
      .then(setVocabInfo)
      .catch(() => {});
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  useEffect(() => {
    if (!debouncedText.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`${API}/api/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: debouncedText }),
      signal: abortRef.current.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError('Could not reach the backend. Make sure the FastAPI server is running on port 8000.');
        setLoading(false);
      });
  }, [debouncedText, refreshKey]);

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }

    // Reset input so the same file can be uploaded again
    event.target.value = '';

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/extract-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        setText(data.text);
      } else {
        setError('Could not extract text from the file.');
      }
    } catch (err) {
      setError('Error uploading file. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokensAdded = () => {
    setRefreshKey(k => k + 1);
    fetch(`${API}/api/vocab-info`)
      .then(r => r.json())
      .then(setVocabInfo)
      .catch(() => {});
    fetchReviewQueue();
  };

  const handleExample = () => {
    setText(EXAMPLE_TEXT);
  };

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '32px 24px 64px',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      minHeight: '100vh',
    }}>

      {/* ── Header ── */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🔤</span>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Tokenizer Demo
          </h1>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Learn about language model tokenisation
        </h2>
        <p style={{ maxWidth: '720px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
          Language models process text as <strong style={{ color: 'var(--text-primary)' }}>tokens</strong> — common sequences of characters.
          Enter any text below to compare how a{' '}
          <strong style={{ color: '#5c8fd9' }}>Simple regex tokeniser</strong> (vocabulary built from{' '}
          <em>combined books corpus</em>) handles it versus{' '}
          <strong style={{ color: '#9c7dce' }}>TikToken</strong> — OpenAI's production BPE tokeniser.
        </p>
        {vocabInfo && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: '#1a2a3f', border: '1px solid #5c8fd9',
              fontSize: '12px', color: '#5c8fd9',
            }}>
              Simple vocab: {vocabInfo.simple_vocab_size.toLocaleString()} tokens
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: '#2a1a3f', border: '1px solid #9c7dce',
              fontSize: '12px', color: '#9c7dce',
            }}>
              TikToken ({vocabInfo.tiktoken_encoding}): {vocabInfo.tiktoken_vocab_size.toLocaleString()} tokens
            </span>
          </div>
        )}
      </header>

      {/* ── Input Area ── */}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text here to see how it gets tokenised…"
          rows={6}
          style={{
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '15px',
            lineHeight: 1.7,
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '120px',
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Tokenising…
              </span>
            )}
            {result && !loading && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.character_count}</strong> characters
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: '13px', color: '#5c8fd9' }}>
                  <strong>{result.simple.token_count}</strong> simple tokens
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: '13px', color: '#9c7dce' }}>
                  <strong>{result.tiktoken.token_count}</strong> TikToken tokens
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Hidden file input */}
            <input
              type="file"
              accept=".txt,.pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Upload file
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Clear
            </button>
            <button
              onClick={handleExample}
              style={{
                padding: '6px 16px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              Show example
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#2a0f0f',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)',
          fontSize: '13px',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Two-column panels ── */}
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <TokenizerPanel result={result?.simple ?? null} isSimple={true} onTokensAdded={handleTokensAdded} />
        <TokenizerPanel result={result?.tiktoken ?? null} isSimple={false} />
      </div>

      {/* ── Comparison insight ── */}
      {result && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Comparison insight: </strong>
          The simple tokeniser produced{' '}
          <strong style={{ color: '#5c8fd9' }}>{result.simple.token_count} tokens</strong>
          {' '}vs TikToken's{' '}
          <strong style={{ color: '#9c7dce' }}>{result.tiktoken.token_count} tokens</strong>
          {' '}for {result.character_count} characters.
          {result.simple.tokens.filter(t => t.is_unk).length > 0 && (
            <span>
              {' '}{result.simple.tokens.filter(t => t.is_unk).length} word(s) were unknown to the simple tokeniser and mapped to{' '}
              <code style={{ fontSize: '12px', background: 'var(--tok-unk-bg)', color: 'var(--tok-unk-fg)', padding: '1px 5px', borderRadius: '3px' }}>&lt;UNK&gt;</code>.
              TikToken handles all words via BPE sub-word splitting.
            </span>
          )}
        </div>
      )}
      {/* ── Review Queue Panel ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Vocabulary Review Queue
              </h3>
              {reviewQueue.length > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {reviewQueue.length} pending
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Submit unknown tokens to this queue to review their Tiktoken compatibility.
              Admitted tokens will be added to the Simple Tokenizer's vocabulary.
            </p>
          </div>
          {reviewQueue.length > 0 && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch(`${API}/api/vocab/review-process`, {
                    method: 'POST',
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setReviewResult({
                      admitted: data.admitted_count,
                      rejected: data.rejected_count,
                    });
                    handleTokensAdded();
                  }
                } catch (e) {
                  setError('Failed to process review queue.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #2b6cb0 0%, #1a365d 100%)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              Process Review Queue
            </button>
          )}
        </div>

        {reviewResult && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(72, 187, 120, 0.15)',
            border: '1px solid #48bb78',
            borderRadius: 'var(--radius-sm)',
            color: '#48bb78',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>
              <strong>Success!</strong> Admitted {reviewResult.admitted} tokens to the vocabulary, and saved {reviewResult.rejected} ineligible tokens to BPE list.
            </span>
            <button
              onClick={() => setReviewResult(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#48bb78',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {reviewQueue.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '4px',
          }}>
            {reviewQueue.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  border: `1px solid ${item.exists_in_tiktoken ? 'rgba(72, 187, 120, 0.3)' : 'rgba(237, 137, 54, 0.3)'}`,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                  {item.token}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: item.exists_in_tiktoken ? 'rgba(72, 187, 120, 0.15)' : 'rgba(237, 137, 54, 0.15)',
                  color: item.exists_in_tiktoken ? '#48bb78' : '#ed8936',
                  border: `1px solid ${item.exists_in_tiktoken ? '#48bb78' : '#ed8936'}`,
                }}>
                  {item.exists_in_tiktoken ? 'Admittable' : 'BPE Candidate'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-2)',
          }}>
            No tokens in the review queue. Upload a file or type text and submit unknown tokens for review.
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer style={{
        marginTop: 'auto',
        paddingTop: '24px',
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <span>
          Simple Tokeniser vocabulary built from{' '}
          <em>combined books corpus</em> · TikToken cl100k_base (GPT-4/3.5)
        </span>
        <span>Confidential | 7EDGE</span>
      </footer>
    </div>
  );
}
