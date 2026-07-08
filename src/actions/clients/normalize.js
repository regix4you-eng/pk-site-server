function normalizeClientRequest(req, res, next) {
  try {
    // 1. Tokenas:
    // - normal request → Authorization header
    // - refresh/unload → query.token
    const rawAuth =
      req.headers.authorization ||
      req.query?.token;

    if (!rawAuth) {
      return res.status(401).json({
        ok: false,
        error: 'NO_AUTHORIZATION_TOKEN',
      });
    }

    // 2. Garantavom Bearer formatą
    const token = String(rawAuth).trim();

    const authorization = /^Bearer\s+/i.test(token)
      ? token
      : `Bearer ${token}`;

    req.headers.authorization = authorization;

    // 3. Body gali būti object arba JSON string
    let body = req.body;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_REQUEST_BODY_JSON',
        });
      }
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REQUEST_BODY',
      });
    }

    // 4. Tokeno nenorim downstream query logikoje
    const query = {
      ...(req.query || {}),
    };

    delete query.token;

    // 5. Išsaugom normalizuotą requestą
    req.body = body;

    req.normalizedRequest = {
      headers: {
        ...req.headers,
        authorization,
      },
      query,
      body,
    };

    console.log(
      '[ACTION] Client request normalized'
    );

    next();
  } catch (error) {
    console.error(
      '[ACTION] Normalize request failed:',
      error
    );

    return res.status(500).json({
      ok: false,
      error: 'REQUEST_NORMALIZATION_FAILED',
    });
  }
}

module.exports = normalizeClientRequest;