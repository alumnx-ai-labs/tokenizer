import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

const MOCK_VOCAB = {
  simple_vocab_size: 17576,
  tiktoken_vocab_size: 100256,
  tiktoken_encoding: 'cl100k_base',
};

const MOCK_RESULT = {
  character_count: 11,
  simple: {
    tokens: [
      { token: 'hello', token_id: 1234, is_unk: false },
      { token: 'world', token_id: 5678, is_unk: false },
    ],
    token_count: 2,
    vocab_size: 17576,
    tokenizer_name: 'Simple Tokenizer',
  },
  tiktoken: {
    tokens: [
      { token: 'hello', token_id: 15339, is_unk: false },
      { token: ' world', token_id: 1917, is_unk: false },
    ],
    token_count: 2,
    vocab_size: 100256,
    tokenizer_name: 'TikToken (cl100k_base)',
  },
};

function makeFetch({ tokenizeOk = true } = {}) {
  return vi.fn((url) => {
    if (url.includes('vocab-info')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_VOCAB) });
    }
    if (url.includes('tokenize')) {
      if (!tokenizeOk) return Promise.reject(new Error('Network error'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESULT) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal('fetch', makeFetch());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────
// Static rendering
// ─────────────────────────────────────────────

describe('App — static rendering', () => {
  it('renders the "Tokenizer Demo" heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /tokenizer demo/i })).toBeInTheDocument();
  });

  it('renders the textarea with correct placeholder', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/enter text here/i)).toBeInTheDocument();
  });

  it('renders the "Show example" button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /show example/i })).toBeInTheDocument();
  });

  it('renders the "Clear" button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('renders the "Upload file" button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
  });

  it('renders two tokenizer panels (Simple and TikToken)', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /simple tokenizer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tiktoken/i })).toBeInTheDocument();
  });

  it('footer references cl100k_base', () => {
    render(<App />);
    expect(screen.getAllByText(/cl100k_base/i).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Show example + Clear
// ─────────────────────────────────────────────

describe('App — example and clear', () => {
  it('"Show example" fills the textarea with sample text', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /show example/i }));
    const textarea = screen.getByPlaceholderText(/enter text here/i);
    expect(textarea.value).toMatch(/Jack Gisburn/);
  });

  it('"Clear" empties the textarea', () => {
    render(<App />);
    const textarea = screen.getByPlaceholderText(/enter text here/i);
    fireEvent.change(textarea, { target: { value: 'some text' } });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(textarea.value).toBe('');
  });

  it('"Clear" removes the error banner if one is showing', async () => {
    vi.stubGlobal('fetch', makeFetch({ tokenizeOk: false }));
    render(<App />);
    const textarea = screen.getByPlaceholderText(/enter text here/i);
    fireEvent.change(textarea, { target: { value: 'hello' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => screen.getByText(/could not reach the backend/i));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByText(/could not reach the backend/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Vocab info fetch on mount
// ─────────────────────────────────────────────

describe('App — vocab info', () => {
  it('fetches /api/vocab-info on mount', async () => {
    render(<App />);
    await act(async () => { await Promise.resolve(); });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('vocab-info'));
  });

  it('displays simple vocab size badge after load', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/simple vocab:/i)).toBeInTheDocument();
    });
  });

  it('displays tiktoken vocab size badge after load', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/tiktoken \(cl100k_base\)/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────
// Debounced tokenize call
// ─────────────────────────────────────────────

describe('App — tokenize debounce', () => {
  it('does NOT call /api/tokenize immediately on text change', async () => {
    render(<App />);
    await act(async () => { await Promise.resolve(); });

    const textarea = screen.getByPlaceholderText(/enter text here/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });

    const tokenizeCalls = fetch.mock.calls.filter(([url]) => url.includes('tokenize'));
    expect(tokenizeCalls).toHaveLength(0);
  });

  it('calls /api/tokenize after the 300ms debounce', async () => {
    render(<App />);
    await act(async () => { await Promise.resolve(); });

    const textarea = screen.getByPlaceholderText(/enter text here/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello world' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
    });

    const tokenizeCalls = fetch.mock.calls.filter(([url]) => url.includes('tokenize'));
    expect(tokenizeCalls).toHaveLength(1);
    expect(tokenizeCalls[0][1]).toMatchObject({
      method: 'POST',
      body: expect.stringContaining('hello world'),
    });
  });

  it('shows loading indicator while tokenizing', async () => {
    // Use a fetch that never resolves so loading stays true
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('vocab-info')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_VOCAB) });
      }
      return new Promise(() => {}); // intentionally never resolves
    }));

    render(<App />);
    await act(async () => { await Promise.resolve(); });

    const textarea = screen.getByPlaceholderText(/enter text here/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(screen.getByText(/tokenising/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Result display
// ─────────────────────────────────────────────

describe('App — result display', () => {
  async function renderWithResult() {
    render(<App />);
    await act(async () => { await Promise.resolve(); });
    const textarea = screen.getByPlaceholderText(/enter text here/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello world' } });
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => screen.getByText(/comparison insight/i));
  }

  it('shows character count in toolbar', async () => {
    await renderWithResult();
    // Toolbar stats use <strong>N</strong> + text — text split across child elements,
    // so use getAllByText with a function matcher to find the containing span.
    const match = screen.getAllByText((_, el) =>
      /\d+ simple tokens/i.test(el?.textContent || '')
    );
    expect(match.length).toBeGreaterThan(0);
  });

  it('shows simple token count in toolbar', async () => {
    await renderWithResult();
    expect(screen.getByText(/simple tokens/i)).toBeInTheDocument();
  });

  it('shows TikToken token count in toolbar', async () => {
    await renderWithResult();
    expect(screen.getByText(/tiktoken tokens/i)).toBeInTheDocument();
  });

  it('shows the comparison insight section', async () => {
    await renderWithResult();
    expect(screen.getByText(/comparison insight/i)).toBeInTheDocument();
  });

  it('comparison insight mentions both tokenizer counts', async () => {
    await renderWithResult();
    const insight = screen.getByText(/comparison insight/i).closest('div');
    expect(insight.textContent).toMatch(/simple tokeniser produced/i);
    expect(insight.textContent).toMatch(/tiktoken/i);
  });
});

// ─────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────

describe('App — error handling', () => {
  it('shows error banner when /api/tokenize fails', async () => {
    vi.stubGlobal('fetch', makeFetch({ tokenizeOk: false }));
    render(<App />);
    const textarea = screen.getByPlaceholderText(/enter text here/i);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/could not reach the backend/i)).toBeInTheDocument();
    });
  });

  it('error banner disappears when text is cleared', async () => {
    vi.stubGlobal('fetch', makeFetch({ tokenizeOk: false }));
    render(<App />);
    const textarea = screen.getByPlaceholderText(/enter text here/i);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => screen.getByText(/could not reach the backend/i));

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByText(/could not reach the backend/i)).not.toBeInTheDocument();
  });
});


// ─────────────────────────────────────────────
// Review Queue Panel
// ─────────────────────────────────────────────

describe('App — Vocabulary Review Queue', () => {
  it('renders review queue dashboard and fetches pending queue items', async () => {
    const mockQueue = [
      { token: 'cat', exists_in_tiktoken: true },
      { token: 'supercalifragilistic', exists_in_tiktoken: false },
    ];
    
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('vocab-info')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_VOCAB) });
      }
      if (url.includes('review-queue')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQueue) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Vocabulary Review Queue')).toBeInTheDocument();
      expect(screen.getByText('2 pending')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
      expect(screen.getByText('supercalifragilistic')).toBeInTheDocument();
      expect(screen.getByText('Admittable')).toBeInTheDocument();
      expect(screen.getByText('BPE Candidate')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /process review queue/i })).toBeInTheDocument();
    });
  });

  it('clicking "Process Review Queue" calls the process API and updates the view', async () => {
    const mockQueue = [
      { token: 'cat', exists_in_tiktoken: true },
    ];
    
    const fetchSpy = vi.fn((url) => {
      if (url.includes('vocab-info')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_VOCAB) });
      }
      if (url.includes('review-queue')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQueue) });
      }
      if (url.includes('review-process')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            admitted_count: 1,
            rejected_count: 0,
            new_vocab_size: 17577,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    
    vi.stubGlobal('fetch', fetchSpy);
    
    render(<App />);
    
    await waitFor(() => screen.getByRole('button', { name: /process review queue/i }));
    fireEvent.click(screen.getByRole('button', { name: /process review queue/i }));
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/vocab/review-process'), expect.any(Object));
      expect(screen.getByText(/admitted 1 tokens to the vocabulary/i)).toBeInTheDocument();
    });
  });
});
