export function validateRequest(schema) {
  return (req, res, next) => {
    if (!schema) return next();
    const { error } = schema.validate ? schema.validate(req.body) : { error: null };
    if (error) {
      return res.status(400).json({ message: error.message || 'Validation failed' });
    }
    return next();
  };
}
