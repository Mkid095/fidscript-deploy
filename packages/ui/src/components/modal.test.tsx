import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';

import { Modal } from './Modal';
import { Button } from './Button';

/**
 * The dialog.
 *
 * It used to be two `div`s: it had no role, no name and no focus trap, so
 * the tab key walked out of the dialog into the page behind it, and the
 * focus never came back to the control that opened it.
 */

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open the dialog</button>
      <Modal isOpen={open} onClose={() => { setOpen(false); onClose(); }} title="Delete the project">
        <button>Inside, first</button>
        <button>Inside, last</button>
      </Modal>
    </>
  );
}

describe('the Modal', () => {
  it('is a dialog with a name', () => {
    render(<Modal isOpen onClose={() => {}} title="Delete the project">Inside</Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Delete the project' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('describes itself with its description', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Delete" description="This cannot be undone.">
        Inside
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const description = screen.getByText('This cannot be undone.');
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('takes the focus when it opens', () => {
    render(<Modal isOpen onClose={() => {}} title="Delete">Inside</Modal>);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('keeps the focus inside it', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Delete">
        <button>Inside, first</button>
        <button>Inside, last</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const last = screen.getByText('Inside, last');

    // Tab from the last control wraps to the first one **inside** the
    // dialog, rather than walking out into the page behind it.
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Delete">Inside</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('gives the focus back when it closes', () => {
    render(<Harness />);
    const opener = screen.getByText('Open the dialog');
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(opener);
  });
});

describe('the Button', () => {
  it('does not submit the form it sits in unless it is told to', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
      </form>,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits when it is told to', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    );
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('cannot be pressed while it is loading', () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
