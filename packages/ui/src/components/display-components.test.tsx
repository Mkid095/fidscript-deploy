import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { Table, THead, TBody, TR, TH, TD } from './Table';
import { Pagination } from './Pagination';
import { Breadcrumb } from './Breadcrumb';
import { Tooltip } from './Tooltip';
import { DropdownMenu } from './DropdownMenu';
import { ErrorState } from './ErrorState';
import { PageHeader, SectionHeader } from './PageHeader';
import { SearchField } from './SearchField';
import { CodeBlock } from './CodeBlock';
import { IconButton } from './IconButton';
import { StatusDot } from './StatusDot';

/**
 * The display, navigation and feedback components.
 *
 * Each one is checked for the thing that makes it usable rather than merely
 * present: the table is a table, the breadcrumb is a trail, the dropdown is a
 * menu, the error state is announced, and the icon button has a name.
 */

describe('the Table', () => {
  it('is a table, and says what it is about', () => {
    render(
      <Table caption="The deployments">
        <THead>
          <TR>
            <TH>Name</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>api</TD>
          </TR>
        </TBody>
      </Table>,
    );
    expect(screen.getByRole('table', { name: 'The deployments' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
  });

  it('scrolls sideways rather than clipping the columns', () => {
    const { container } = render(
      <Table>
        <TBody>
          <TR>
            <TD>a</TD>
          </TR>
        </TBody>
      </Table>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.className).not.toContain('overflow-hidden');
  });
});

describe('the Pagination', () => {
  it('says where the person is', () => {
    render(<Pagination page={2} pages={5} total={42} onChange={() => {}} />);
    expect(screen.getByText(/Page 2 of 5/)).toBeTruthy();
  });

  it('does not appear when there is one page', () => {
    const { container } = render(<Pagination page={1} pages={1} onChange={() => {}} />);
    expect(container.firstElementChild).toBeNull();
  });

  it('moves to the next page', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pages={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('the Breadcrumb', () => {
  it('is a trail, and marks where the person is', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'api' },
        ]}
      />,
    );
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail).toBeTruthy();
    expect(screen.getByText('api').getAttribute('aria-current')).toBe('page');
  });
});

describe('the Tooltip', () => {
  it('describes the control it is on', () => {
    render(
      <Tooltip label="Copy the token">
        <button>Copy</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByText('Copy'));
    expect(screen.getByRole('tooltip').textContent).toBe('Copy the token');
  });
});

describe('the DropdownMenu', () => {
  it('is a menu, and says what it is', () => {
    render(
      <DropdownMenu
        label="Project actions"
        trigger={<span>Actions</span>}
        items={[{ id: 'one', label: 'Delete', onSelect: () => {} }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
    expect(screen.getByRole('menu', { name: 'Project actions' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeTruthy();
  });

  it('chooses an item', () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Project actions"
        trigger={<span>Actions</span>}
        items={[{ id: 'one', label: 'Delete', onSelect }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('the ErrorState', () => {
  it('is announced, and says what happened', () => {
    render(<ErrorState message="The registry did not answer." />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('The registry did not answer.');
  });

  it('offers the way forward', () => {
    const onClick = vi.fn();
    render(<ErrorState message="It failed." action={{ label: 'Try again', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('the PageHeader', () => {
  it('is a heading, with what the screen is for', () => {
    render(<PageHeader title="Projects" description="The projects you can reach." />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy();
    expect(screen.getByText('The projects you can reach.')).toBeTruthy();
  });
});

describe('the SectionHeader', () => {
  it('is a heading of its own', () => {
    render(<SectionHeader title="At a glance" />);
    expect(screen.getByRole('heading', { name: 'At a glance' })).toBeTruthy();
  });
});

describe('the SearchField', () => {
  it('is named, even though it has no visible label', () => {
    render(<SearchField label="Search projects" />);
    expect(screen.getByLabelText('Search projects')).toBeTruthy();
  });
});

describe('the CodeBlock', () => {
  it('shows the code', () => {
    render(<CodeBlock code="npm install --registry=…" language="bash" />);
    expect(screen.getByText('npm install --registry=…')).toBeTruthy();
  });

  it('says when it has copied', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } });
    render(<CodeBlock code="a" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    });
  });
});

describe('the IconButton', () => {
  it('has a name', () => {
    render(
      <IconButton label="Refresh">
        <span>↻</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  });
});

describe('the StatusDot', () => {
  it('says what the status is, and not only what colour it is', () => {
    render(<StatusDot tone="success" label="Running" />);
    expect(screen.getByText('Running')).toBeTruthy();
  });
});
