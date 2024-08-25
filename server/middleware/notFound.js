// middleware/notFound.js

module.exports = (req, res, next) => {
  res.status(404).render('404', { message: 'Page Not Found' });
};
