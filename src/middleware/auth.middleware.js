const supabase = require('../lib/supabase');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] Missing Bearer token');

      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.slice(7).trim();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('[AUTH] Invalid token:', error?.message || 'Unknown error');

      return res.status(401).json({
        ok: false,
        error: 'INVALID_TOKEN',
      });
    }

    req.user = user;
    req.accessToken = token;

    console.log(`[AUTH] User verified: ${user.id}`);

    next();
  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);

    return res.status(500).json({
      ok: false,
      error: 'AUTH_ERROR',
    });
  }
}

module.exports = requireAuth;