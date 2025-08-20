const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');
const logger = require('../middleware/logger.js');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});


mongoose.connect('mongodb://localhost:27017/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  shortcode: {
    type: String,
    required: true,
    unique: true,
    minlength: 4,
    maxlength: 10
  },
  expiryDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Url = mongoose.model('Url', urlSchema);

app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity, shortcode } = req.body;

    if (!url || !validity || !shortcode) {
      return res.status(400).json({ 
        error: 'Missing required fields: url, validity, shortcode' 
      });
    }
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    const existingUrl = await Url.findOne({ shortcode });
    if (existingUrl) {
      return res.status(409).json({ error: 'Shortcode already exists' });
    }

    const expiryDate = moment().add(validity, 'days').toDate();

    const newUrl = new Url({
      originalUrl: url,
      shortcode,
      expiryDate
    });

    await newUrl.save();

    const hostname = req.get('host') || `localhost:${PORT}`;
    const protocol = req.secure ? 'https' : 'http';
    const shortLink = `${protocol}://${hostname}/${shortcode}`;

    const formattedExpiry = moment(expiryDate).toISOString();

    res.json({
      shortLink,
      expiry: formattedExpiry
    });

  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;

    const urlDoc = await Url.findOne({ shortcode });

    if (!urlDoc) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (new Date() > urlDoc.expiryDate) {
      return res.status(410).json({ error: 'Short URL has expired' });
    }

    res.redirect(urlDoc.originalUrl);

  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/shorturls', async (req, res) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 });
    res.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener API is running!' });
});

app.use((req, res) => {
  res.status(404).send(`Route ${req.originalUrl} not found.`);
});

app.listen(PORT, () => {
  console.log(` URL Shortener server running at http://localhost:${PORT}`);
  console.log(` MongoDB: mongodb://localhost:27017/urlshortener`);
});

