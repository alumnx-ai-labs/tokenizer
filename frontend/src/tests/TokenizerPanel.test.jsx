import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TokenizerPanel from '../components/TokenizerPanel';

const simpleResult = {
  tokens: [
    { token: 'hello', token_id: 1, is_unk: false },
    { token: 'world', token_id: 2, is_unk: false },
  ],
  token_count: 2,
  vocab_size: 17576,
  tokenizer_name: 'Simple Tokenizer',
};

const simpleResultWithUnk = {
  tokens: [
    { token: 'hello', token_id: 1, is_unk: false },
    { token: 'xyzzyquux', token_id: 0, is_unk: true },
  ],
  token_count: 2,
  vocab_size: 17576,
  tokenizer_name: 'Simple Tokenizer',
};

const tiktokenResult = {
  tokens: [
    { token: 'hello', token_id: 15339, is_unk: false },
    { token: ' world', token_id: 1917, is_unk: false },
  ],
  token_count: 2,
  vocab_size: 100256,
  tokenizer_name: 'TikToken (cl100k_base)',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────
// Empty / null state
// ─────────────────────────────────────────────

describe('TokenizerPanel — null result', () => {
  it('shows placeholder text when result is null', () => {
    render(<TokenizerPanel result={null} isSimple={true} />);
    expect(screen.getByText(/enter text above/i)).toBeInTheDocument();
  });

  it('still shows the panel heading when result is null', () => {
    render(<TokenizerPanel result={null} isSimple={true} />);
    expect(screen.getByRole('heading', { name: /simple tokenizer/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Headers and subtitles
// ─────────────────────────────────────────────

describe('TokenizerPanel — headings', () => {
  it('shows "Simple Tokenizer" heading for isSimple=true', () => {
    render(<TokenizerPanel result={null} isSimple={true} />);
    expect(screen.getByRole('heading', { name: /simple tokenizer/i })).toBeInTheDocument();
  });

  it('shows "TikToken" heading for isSimple=false', () => {
    render(<TokenizerPanel result={null} isSimple={false} />);
    expect(screen.getByRole('heading', { name: /tiktoken/i })).toBeInTheDocument();
  });

  it('simple panel subtitle mentions Regex-based', () => {
    render(<TokenizerPanel result={null} isSimple={true} />);
    expect(screen.getByText(/regex-based/i)).toBeInTheDocument();
  });

  it('tiktoken panel subtitle mentions cl100k_base', () => {
    render(<TokenizerPanel result={null} isSimple={false} />);
    expect(screen.getByText(/cl100k_base/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Stat badges
// ─────────────────────────────────────────────

describe('TokenizerPanel — stat badges', () => {
  it('shows token count badge', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
  });

  it('shows vocab size badge', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getByText('17,576')).toBeInTheDocument();
    expect(screen.getByText('Vocab Size')).toBeInTheDocument();
  });

  it('shows Unknown badge for simple tokenizer when unknowns are present', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('does not show Unknown badge when there are no unknown tokens', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('does not show Unknown badge for TikToken panel', () => {
    render(<TokenizerPanel result={tiktokenResult} isSimple={false} />);
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Token display sections
// ─────────────────────────────────────────────

describe('TokenizerPanel — token display sections', () => {
  it('shows "Tokens (hover for ID)" section', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getByText(/tokens \(hover for id\)/i)).toBeInTheDocument();
  });

  it('shows "Token IDs" section', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getByText(/token ids/i)).toBeInTheDocument();
  });

  it('shows "Raw ID Array" section', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getByText(/raw id array/i)).toBeInTheDocument();
  });

  it('raw ID array contains correct token IDs', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getByText('[1, 2]')).toBeInTheDocument();
  });

  it('renders token text inside the panel', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.getAllByText('hello').length).toBeGreaterThan(0);
    expect(screen.getAllByText('world').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// UNK warning section
// ─────────────────────────────────────────────

describe('TokenizerPanel — UNK warning', () => {
  it('shows UNK warning for simple tokenizer when unknowns are present', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    expect(screen.getByText(/⚠ 1 unknown token/)).toBeInTheDocument();
  });

  it('does not show UNK warning when there are no unknowns', () => {
    render(<TokenizerPanel result={simpleResult} isSimple={true} />);
    expect(screen.queryByRole('button', { name: /review new tokens/i })).not.toBeInTheDocument();
  });

  it('does not show UNK warning for TikToken panel', () => {
    render(<TokenizerPanel result={tiktokenResult} isSimple={false} />);
    expect(screen.queryByRole('button', { name: /review new tokens/i })).not.toBeInTheDocument();
  });

  it('shows "Review New Tokens" button when unknowns are present', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    expect(screen.getByRole('button', { name: /review new tokens/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Review panel interaction
// ─────────────────────────────────────────────

describe('TokenizerPanel — review panel', () => {
  it('clicking "Review New Tokens" opens the review panel', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    expect(screen.getByText(/will be submitted for review/i)).toBeInTheDocument();
  });
 
  it('clicking "Cancel" closes the review panel', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/will be submitted for review/i)).not.toBeInTheDocument();
  });
 
  it('lists unknown words in the review panel', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    expect(screen.getAllByText('xyzzyquux').length).toBeGreaterThan(0);
  });
 
  it('shows "Submit for Review" button in review panel', () => {
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
  });
 
  it('calls /api/vocab/submit with the unknown tokens on approve', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          submitted_count: 1,
          queue_size: 1,
          rejected_tokens: [],
        }),
      })
    ));
 
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} onTokensAdded={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
 
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vocab/submit'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('xyzzyquux'),
        })
      );
    });
  });
 
  it('calls onTokensAdded callback after successful add', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          submitted_count: 1,
          queue_size: 1,
          rejected_tokens: [],
        }),
      })
    ));
 
    const onTokensAdded = vi.fn();
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} onTokensAdded={onTokensAdded} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
 
    await waitFor(() => {
      expect(onTokensAdded).toHaveBeenCalled();
    });
  });
 
  it('shows rejected tokens when the backend rejects multi-token words', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          submitted_count: 0,
          queue_size: 0,
          rejected_tokens: ['xyzzyquux'],
        }),
      })
    ));
 
    render(<TokenizerPanel result={simpleResultWithUnk} isSimple={true} onTokensAdded={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /review new tokens/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
 
    await waitFor(() => {
      expect(screen.getByText(/token\(s\) rejected/i)).toBeInTheDocument();
    });
  });
});
