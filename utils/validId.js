// strict check: exactly 24 hex characters (mongoose.isValidObjectId also accepts any 12-char string)
const isId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
module.exports = { isId };
