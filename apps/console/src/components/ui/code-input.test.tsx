import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CodeInput } from './code-input';

/**
 * The one-time code, one digit a box.
 *
 * The rules that are easy to lose: the boxes fill in order, a backspace
 * comes back, a paste drops the whole code in, and the control never
 * accepts more digits than the code has.
 */
function renderInput(props: { value?: string; onChange?: ReturnType<typeof vi.fn> } = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <CodeInput value={props.value ?? ''} onChange={onChange} />,
  );
  return onChange;
}

describe('the code input', () => {
  it('names one box per digit, in order', () => {
    renderInput();
    expect(screen.getByLabelText('Digit 1 of 6')).toBeTruthy();
    expect(screen.getByLabelText('Digit 6 of 6')).toBeTruthy();
  });

  it('lands a typed digit and reports it', () => {
    const onChange = renderInput();
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: '4' },
    });
    expect(onChange).toHaveBeenCalledWith('4');
  });

  it('fills in order as the digits are typed', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeInput value="" onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: '1' },
    });
    rerender(<CodeInput value="1" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Digit 2 of 6'), {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenLastCalledWith('12');
  });

  it('replaces the digit of the box that is filled', () => {
    const onChange = renderInput({ value: '12' });
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: '9' },
    });
    expect(onChange).toHaveBeenCalledWith('92');
  });

  it('lets a backspace take the digit before it back', () => {
    const onChange = renderInput({ value: '12' });
    // Digit 3 of 6 is empty. Backspace there sends a key, not a change —
    // the box has no character of its own for the browser to delete.
    fireEvent.keyDown(screen.getByLabelText('Digit 3 of 6'), {
      key: 'Backspace',
    });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('drops a pasted code in from the first box', () => {
    const onChange = renderInput();
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: '3456' },
    });
    expect(onChange).toHaveBeenCalledWith('3456');
  });

  it('never accepts more digits than the code has', () => {
    const onChange = renderInput();
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: '12345678' },
    });
    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('refuses what is not a digit', () => {
    const onChange = renderInput();
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), {
      target: { value: 'a1b2' },
    });
    expect(onChange).toHaveBeenCalledWith('12');
  });
});
