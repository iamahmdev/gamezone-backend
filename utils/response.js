const success = (res, data, status = 200) => res.status(status).json({ ok: true, data });
const error   = (res, message, status = 400) => res.status(status).json({ ok: false, error: message });

module.exports = { success, error };
