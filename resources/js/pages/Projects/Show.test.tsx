import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AnalyticsActivityBucket,
  AnalyticsMetricSet,
  ProjectAnalyticsData,
} from '../../types/analytics.ts';
import type { ProjectSummary } from '../../types/index.ts';
import ProjectShow from './Show.tsx';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  handlers: {} as Record<string, Array<(event: unknown) => void>>,
  props: { errors: {} } as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title?: string }) => <title>{title}</title>,
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  router: {
    get: (...args: unknown[]) => mocks.get(...args),
    on: (name: string, handler: (event: unknown) => void) => {
      (mocks.handlers[name] ??= []).push(handler);

      return () => {
        mocks.handlers[name] = mocks.handlers[name].filter(
          (item) => item !== handler,
        );
      };
    },
  },
  usePage: () => ({
    url: '/workspaces/4/projects/8',
    props: mocks.props,
  }),
}));

const workspace = {
  id: 4,
  name: 'Northwind Notes',
  role: 'owner' as const,
  canManage: true,
};

const project = {
  id: 8,
  name: 'Field notes',
  description: 'Notes for the field team.',
  websiteUrl: 'https://notes.example.test',
  timezone: 'America/Los_Angeles',
  archivedAt: null,
  canManage: true,
};

function metrics(overrides: Partial<AnalyticsMetricSet> = {}) {
  return {
    totalEvents: 1200,
    uniqueVisitors: 300,
    identifiedUsers: 40,
    eventsPerVisitor: 4,
    ...overrides,
  };
}

function bucket(index: number, count: number): AnalyticsActivityBucket {
  const day = String(8 + index).padStart(2, '0');

  return {
    key: `2026-10-${day}T07:00:00Z`,
    start: `2026-10-${day}T07:00:00Z`,
    end: `2026-10-${String(9 + index).padStart(2, '0')}T07:00:00Z`,
    label: `Oct ${8 + index}`,
    localStart: `2026-10-${day}T00:00:00-07:00`,
    partial: false,
    count,
  };
}

function analytics(
  overrides: Partial<ProjectAnalyticsData> = {},
): ProjectAnalyticsData {
  return {
    range: {
      preset: '7d',
      timezone: 'America/Los_Angeles',
      localFrom: '2026-10-08',
      localTo: '2026-10-14',
      granularity: 'day',
      inProgress: false,
    },
    currentPeriod: {
      start: '2026-10-08T07:00:00Z',
      end: '2026-10-15T07:00:00Z',
    },
    comparisonPeriod: {
      start: '2026-10-01T07:00:00Z',
      end: '2026-10-08T07:00:00Z',
    },
    current: metrics(),
    previous: metrics({
      totalEvents: 800,
      uniqueVisitors: 300,
      identifiedUsers: 50,
      eventsPerVisitor: 2.67,
    }),
    activity: [bucket(0, 10), bucket(1, 30), bucket(2, 0)],
    topEvents: [
      { name: 'signup_completed', count: 700, share: 0.58 },
      { name: 'Signup_Completed', count: 100, share: 0.08 },
    ],
    ...overrides,
  };
}

function renderPage(
  data: unknown = analytics(),
  projectOverrides: Partial<ProjectSummary> = {},
) {
  return render(
    <ProjectShow
      workspace={workspace}
      project={{ ...project, ...projectOverrides }}
      analytics={data}
    />,
  );
}

beforeEach(() => {
  mocks.get.mockReset();
  mocks.handlers = {};
  mocks.props = { errors: {} };
});

describe('live analytics', () => {
  it('renders the project header and four metric cards from the prop', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Field notes' }),
    ).toBeInTheDocument();

    const metricRegion = screen.getByRole('region', { name: 'Key metrics' });
    for (const label of [
      'Total events',
      'Unique visitors',
      'Identified users',
      'Events per visitor',
    ]) {
      expect(
        within(metricRegion).getByRole('heading', { name: label }),
      ).toBeInTheDocument();
    }

    expect(within(metricRegion).getByText('1,200')).toBeInTheDocument();
    expect(within(metricRegion).getByText('300')).toBeInTheDocument();
    expect(within(metricRegion).getByText('40')).toBeInTheDocument();
    expect(within(metricRegion).getByText('4')).toBeInTheDocument();
    expect(
      screen.getByText('Changes compare with the equivalent preceding period.'),
    ).toBeInTheDocument();
  });

  it('shows the range the server used', () => {
    renderPage();

    expect(
      screen.getByText('Last 7 days (Oct 8, 2026 to Oct 14, 2026)'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('America/Los_Angeles').length).toBeGreaterThan(
      0,
    );
  });

  it('renders the activity chart with the backend granularity', () => {
    renderPage();

    expect(
      screen.getByRole('img', { name: /3 periods, from Oct 8 to Oct 10/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Events per day in America/Los_Angeles time.'),
    ).toBeInTheDocument();
  });

  it('uses hour wording for hourly data', () => {
    const data = analytics();
    data.range.granularity = 'hour';
    renderPage(data);

    expect(
      screen.getByText('Events per hour in America/Los_Angeles time.'),
    ).toBeInTheDocument();
  });

  it('lets people reveal the exact counts without assistive technology', () => {
    renderPage();

    const toggle = screen.getByRole('button', { name: 'Show data table' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(
      screen.getByRole('button', { name: 'Hide data table' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('table')).toHaveClass('w-full');
  });

  it('keeps backend ranking and case-sensitive event names', () => {
    renderPage();

    const items = screen.getAllByRole('listitem');
    const names = items
      .map((item) => item.textContent ?? '')
      .filter((text) => /signup_completed/i.test(text));

    expect(names[0]).toContain('signup_completed');
    expect(names[1]).toContain('Signup_Completed');
  });

  it('does not expose write keys', () => {
    renderPage();

    expect(document.body.textContent).not.toMatch(/iw_[a-z0-9]{8}/i);
  });
});

describe('comparison states', () => {
  it('shows a change from zero without a percentage', () => {
    renderPage(
      analytics({
        previous: metrics({
          totalEvents: 0,
          uniqueVisitors: 0,
          identifiedUsers: 0,
          eventsPerVisitor: null,
        }),
      }),
    );

    expect(screen.getByText('1,200 from 0')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('shows decreases and no change neutrally', () => {
    renderPage(
      analytics({
        current: metrics({ totalEvents: 400, uniqueVisitors: 300 }),
        previous: metrics({ totalEvents: 800, uniqueVisitors: 300 }),
      }),
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('No change').length).toBeGreaterThan(0);
  });

  it('says there is no comparison when the window is empty', () => {
    renderPage(
      analytics({
        comparisonPeriod: {
          start: '2026-10-08T07:00:00Z',
          end: '2026-10-08T07:00:00Z',
        },
      }),
    );

    expect(screen.getAllByText('No comparison')).toHaveLength(4);
    expect(screen.queryByText(/Previous period:/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/no earlier period to compare with/i),
    ).toBeInTheDocument();
  });

  it('handles a null events per visitor ratio', () => {
    renderPage(
      analytics({
        current: metrics({ uniqueVisitors: 0, eventsPerVisitor: null }),
      }),
    );

    expect(screen.getByText('No visitors')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('describes an in-progress calendar range by local clock time', () => {
    const data = analytics();
    data.range.inProgress = true;
    renderPage(data);

    expect(screen.getByText(/same local clock time/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/elapsed|same length/i);
  });

  it('uses previous 24 hours for the rolling range', () => {
    const data = analytics();
    data.range.preset = '24h';
    data.range.granularity = 'hour';
    data.range.inProgress = true;
    renderPage(data);

    expect(
      screen.getByText('Changes compare with the previous 24 hours.'),
    ).toBeInTheDocument();
  });
});

describe('empty periods', () => {
  const empty = metrics({
    totalEvents: 0,
    uniqueVisitors: 0,
    identifiedUsers: 0,
    eventsPerVisitor: null,
  });

  it('explains a project with no events without implying a fault', () => {
    renderPage(
      analytics({
        current: empty,
        previous: empty,
        activity: [],
        topEvents: [],
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'No events in this period' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/quiet period is normal/i)).toBeInTheDocument();
    expect(
      screen.getByText(/in this range or the one before it/i),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /no events (ever|yet)|never received|lifetime/i,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Tracking setup' }),
    ).toHaveAttribute('href', '/workspaces/4/projects/8/tracking');
    expect(
      screen.getByRole('link', { name: 'View recent events' }),
    ).toHaveAttribute('href', '/workspaces/4/projects/8/events');
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('points to earlier activity when only the previous period had events', () => {
    renderPage(
      analytics({
        current: empty,
        previous: metrics(),
        activity: [],
        topEvents: [],
      }),
    );

    expect(
      screen.getByText(
        /recorded in the previous period, but none in this one/i,
      ),
    ).toBeInTheDocument();
  });
});

describe('date range', () => {
  it('requests only the analytics prop through the project route', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Last 30 days'));

    expect(mocks.get).toHaveBeenCalledTimes(1);
    const [url, query, options] = mocks.get.mock.calls[0];
    expect(url).toBe('/workspaces/4/projects/8');
    expect(query).toEqual({ range: '30d' });
    expect(options).toMatchObject({
      only: ['analytics'],
      preserveState: true,
      preserveScroll: true,
    });
  });

  it('shows server validation errors beside the controls', () => {
    mocks.props = {
      errors: { to: 'The range can cover at most 90 days.', other: 'ignored' },
    };
    const data = analytics();
    data.range.preset = 'custom';
    renderPage(data);

    expect(
      screen.getByText('The range can cover at most 90 days.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
  });

  it('shows subtle pending feedback only for analytics visits', () => {
    renderPage();

    const results = screen.getByTestId('analytics-results');
    const status = screen.getByTestId('analytics-status');
    expect(results).toHaveAttribute('aria-busy', 'false');
    expect(status).toBeEmptyDOMElement();

    act(() => {
      mocks.handlers.start?.forEach((handler) =>
        handler({ detail: { visit: { only: [] } } }),
      );
    });
    expect(results).toHaveAttribute('aria-busy', 'false');

    act(() => {
      mocks.handlers.start?.forEach((handler) =>
        handler({ detail: { visit: { only: ['analytics'] } } }),
      );
    });
    expect(results).toHaveAttribute('aria-busy', 'true');
    expect(results).toHaveClass('opacity-60');
    expect(status).toHaveTextContent('Updating analytics');

    act(() => {
      mocks.handlers.finish?.forEach((handler) => handler({}));
    });
    expect(results).toHaveAttribute('aria-busy', 'false');
    expect(status).toBeEmptyDOMElement();
  });

  it('keeps the other props rendered while analytics reload', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Last 90 days'));
    act(() => {
      mocks.handlers.start?.forEach((handler) =>
        handler({ detail: { visit: { only: ['analytics'] } } }),
      );
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Field notes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Notes for the field team.')).toBeInTheDocument();
  });
});

describe('project information and actions', () => {
  it('preserves navigation, settings, and the project timezone', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      '/workspaces/4/projects/8/events',
    );
    expect(screen.getByRole('link', { name: 'Tracking' })).toHaveAttribute(
      'href',
      '/workspaces/4/projects/8/tracking',
    );
    expect(
      screen.getByRole('link', { name: 'Project settings' }),
    ).toHaveAttribute('href', '/workspaces/4/projects/8/settings');
    expect(
      screen.getByRole('link', { name: 'https://notes.example.test' }),
    ).toHaveAttribute('rel', 'noreferrer');
  });

  it('hides settings from people who cannot manage the project', () => {
    renderPage(analytics(), { canManage: false, archivedAt: '2026-10-01' });

    expect(
      screen.queryByRole('link', { name: 'Project settings' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('uses responsive layout classes', () => {
    renderPage();

    const metricGrid = screen.getByRole('region', {
      name: 'Key metrics',
    }).firstElementChild;
    expect(metricGrid).toHaveClass(
      'grid',
      '@lg:grid-cols-2',
      '@4xl:grid-cols-4',
    );
    const results = screen.getByTestId('analytics-results');
    expect(results).toHaveClass('@container');
    expect(results.innerHTML).toContain(
      '@4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
    );
  });
});

describe('invalid analytics props', () => {
  it.each([undefined, null, {}, 'nope', { range: {} }])(
    'falls back safely for %j',
    (value) => {
      render(
        <ProjectShow
          workspace={workspace}
          project={project}
          analytics={value}
        />,
      );

      expect(
        screen.getByRole('heading', { name: 'Analytics are unavailable' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Reload overview' }),
      ).toHaveAttribute('href', '/workspaces/4/projects/8');
      expect(
        screen.getByRole('link', { name: 'Project settings' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /Date range/ })).toBeNull();
    },
  );

  it('never prints NaN or Infinity for malformed numbers', () => {
    renderPage(
      analytics({
        current: {
          totalEvents: Number.NaN,
          uniqueVisitors: Number.POSITIVE_INFINITY,
          identifiedUsers: 1,
          eventsPerVisitor: Number.NaN,
        },
      }),
    );

    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });
});
