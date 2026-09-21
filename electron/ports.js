// Fixed local ports for the desktop build. They only ever need to not
// collide with each other or common local dev ports (3000/8000) that a
// user might also be running — the whole stack is 127.0.0.1-only, never
// exposed on the network, so there's no need to pick them dynamically.
module.exports = {
  PG_PORT: 47820,
  BACKEND_PORT: 47821,
  FRONTEND_PORT: 47822,
};
