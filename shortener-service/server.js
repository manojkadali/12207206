
const express = require('express');
const shorturlRoutes = require('./routes/shorturls');

const app = express();
app.use(express.json());


app.use('/shorturls', shorturlRoutes);

// catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Listening on http://localhost:${PORT}`));
