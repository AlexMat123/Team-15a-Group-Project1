jest.mock('../../models/Team', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/User', () => ({}));
jest.mock('../../models/Report', () => ({}));

jest.mock('../../middleware/authMiddleware', () => ({
  protect: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

jest.mock('../../services/emailService', () => ({
  sendTeamAssignmentEmail: jest.fn(),
  sendTeamRemovalEmail: jest.fn(),
}));

jest.mock('../../services/analyticsService', () => ({
  buildAnalyticsPayload: jest.fn(),
}));

const Team = require('../../models/Team');
const { buildAnalyticsPayload } = require('../../services/analyticsService');
const router = require('../teamRoutes');

const getRouteHandler = (path, method) => {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
};

const mockFindOneLean = (value) => {
  const lean = jest.fn().mockResolvedValue(value);
  const populate = jest.fn(() => ({ lean }));
  Team.findOne.mockReturnValue({ populate });
};

describe('GET /api/teams/my-team/comparison', () => {
  const handler = getRouteHandler('/my-team/comparison', 'get');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when one or both users are missing', async () => {
    const req = {
      query: { primaryUserId: 'u-1' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Two users are required for comparison' });
  });

  test('returns 400 when the same user is selected twice', async () => {
    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-1' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comparison requires two different users' });
  });

  test('returns 403 when the current user does not lead a team', async () => {
    mockFindOneLean(null);

    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-2' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(Team.findOne).toHaveBeenCalledWith({ teamLead: 'lead-1' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'You are not a team lead' });
  });

  test('returns 403 when either user is outside the team', async () => {
    mockFindOneLean({
      _id: 'team-1',
      name: 'QA Team',
      members: [
        { _id: 'u-1', name: 'Alex', email: 'alex@example.com', role: 'user' },
        { _id: 'u-2', name: 'Blake', email: 'blake@example.com', role: 'user' },
      ],
      memberJoinDates: {},
    });

    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-9' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'You can only compare members of your own team' });
  });

  test('builds both comparison scopes with join-date-aware filters and returns payload', async () => {
    mockFindOneLean({
      _id: 'team-1',
      name: 'QA Team',
      members: [
        { _id: 'u-1', name: 'Alex', email: 'alex@example.com', role: 'user' },
        { _id: 'u-2', name: 'Blake', email: 'blake@example.com', role: 'team_leader' },
      ],
      memberJoinDates: {
        'u-1': '2026-04-01T00:00:00.000Z',
      },
    });

    buildAnalyticsPayload
      .mockResolvedValueOnce({
        scopeLabel: 'User: Alex',
        scopeDetails: { userId: 'u-1', userName: 'Alex', userEmail: 'alex@example.com' },
        summary: { totalReports: 2, analyzedReports: 2 },
      })
      .mockResolvedValueOnce({
        scopeLabel: 'User: Blake',
        scopeDetails: { userId: 'u-2', userName: 'Blake', userEmail: 'blake@example.com' },
        summary: { totalReports: 1, analyzedReports: 1 },
      });

    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-2', range: '90' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(buildAnalyticsPayload).toHaveBeenCalledTimes(2);
    expect(buildAnalyticsPayload).toHaveBeenNthCalledWith(1, {
      filter: {
        analyzedBy: 'u-1',
        createdAt: { $gte: '2026-04-01T00:00:00.000Z' },
      },
      scopeLabel: 'User: Alex',
      scopeDetails: {
        userId: 'u-1',
        userName: 'Alex',
        userEmail: 'alex@example.com',
        userRole: 'user',
        teamId: 'team-1',
        teamName: 'QA Team',
      },
      range: '90',
    });
    expect(buildAnalyticsPayload).toHaveBeenNthCalledWith(2, {
      filter: {
        analyzedBy: 'u-2',
      },
      scopeLabel: 'User: Blake',
      scopeDetails: {
        userId: 'u-2',
        userName: 'Blake',
        userEmail: 'blake@example.com',
        userRole: 'team_leader',
        teamId: 'team-1',
        teamName: 'QA Team',
      },
      range: '90',
    });

    expect(res.json).toHaveBeenCalledWith({
      range: '90',
      comparisonMode: true,
      comparisonType: 'user',
      teamId: 'team-1',
      teamName: 'QA Team',
      primaryScope: {
        scopeLabel: 'User: Alex',
        scopeDetails: { userId: 'u-1', userName: 'Alex', userEmail: 'alex@example.com' },
        summary: { totalReports: 2, analyzedReports: 2 },
      },
      secondaryScope: {
        scopeLabel: 'User: Blake',
        scopeDetails: { userId: 'u-2', userName: 'Blake', userEmail: 'blake@example.com' },
        summary: { totalReports: 1, analyzedReports: 1 },
      },
    });
  });

  test('uses memberJoinDates.get when join dates are stored as a Map-like object', async () => {
    mockFindOneLean({
      _id: 'team-1',
      name: 'QA Team',
      members: [
        { _id: 'u-1', name: 'Alex', email: 'alex@example.com', role: 'user' },
        { _id: 'u-2', name: 'Blake', email: 'blake@example.com', role: 'user' },
      ],
      memberJoinDates: {
        get: jest.fn((id) => (id === 'u-2' ? '2026-03-15T00:00:00.000Z' : null)),
      },
    });

    buildAnalyticsPayload
      .mockResolvedValueOnce({ scopeLabel: 'User: Alex', scopeDetails: { userId: 'u-1' }, summary: {} })
      .mockResolvedValueOnce({ scopeLabel: 'User: Blake', scopeDetails: { userId: 'u-2' }, summary: {} });

    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-2', range: '30' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(buildAnalyticsPayload).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filter: { analyzedBy: 'u-1' },
    }));
    expect(buildAnalyticsPayload).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filter: {
        analyzedBy: 'u-2',
        createdAt: { $gte: '2026-03-15T00:00:00.000Z' },
      },
    }));
  });

  test('returns 500 when analytics payload generation fails', async () => {
    mockFindOneLean({
      _id: 'team-1',
      name: 'QA Team',
      members: [
        { _id: 'u-1', name: 'Alex', email: 'alex@example.com', role: 'user' },
        { _id: 'u-2', name: 'Blake', email: 'blake@example.com', role: 'user' },
      ],
      memberJoinDates: {},
    });

    buildAnalyticsPayload.mockRejectedValue(new Error('aggregation failed'));

    const req = {
      query: { primaryUserId: 'u-1', secondaryUserId: 'u-2', range: '30' },
      user: { _id: 'lead-1', role: 'team_leader' },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'aggregation failed' });
  });
});
