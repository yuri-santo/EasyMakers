export const validate =
  (schema) =>
  (req, res, next) => {
    try {
      const data = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (data.body) req.body = data.body;
      if (data.query) req.query = data.query;
      if (data.params) req.params = data.params;
      next();
    } catch (e) {
      return res.status(400).json({ error: "Validation error", details: e.errors || String(e) });
    }
  };
