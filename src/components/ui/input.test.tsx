import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Input } from './input';
import { Button } from './button';

/**
 * The rules the design system holds the components to.
 *
 * These are the ones that are easy to lose and hard to notice: a label with
 * no `htmlFor` is decorative text to a screen reader, and a button with no
 * `type` submits the form it sits in.
 */
describe('the input', () => {
  it('is named by its label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('gives two fields with the same label different ids', () => {
    render(
      <>
        <Input label="Name" />
        <Input label="Name" />
      </>,
    );
    const [first, second] = screen.getAllByLabelText('Name');
    expect(first.id).not.toBe(second.id);
  });

  it('announces the message with the control', () => {
    render(<Input label="Email" hint="Work address" />);
    const input = screen.getByLabelText('Email');
    const message = screen.getByText('Work address');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('marks the control as invalid when it is wrong', () => {
    render(<Input label="Email" error="That address is taken" />);
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });

  it('hides the hint when there is an error', () => {
    render(<Input label="Email" hint="Work address" error="That address is taken" />);
    expect(screen.queryByText('Work address')).toBeNull();
  });
});

describe('the button', () => {
  it('does not submit the form it sits in', () => {
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <Button>Cancel</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('submits when it is told to', () => {
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <Button type="submit">Save</Button>
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('submit');
  });

  it('cannot be pressed while it is loading', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});
