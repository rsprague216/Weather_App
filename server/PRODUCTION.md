## Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use strong, randomly generated JWT_SECRET in production
- Rotate secrets regularly

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes  
- Adjust based on your needs

### Database Security
- Use parameterized queries (already implemented)
- Keep database credentials secure
- Use SSL for database connections in production

### Password Security
- Minimum 8 characters
- Must contain letters and numbers
- Argon2id hashing (industry standard)

### API Security
- Helmet.js for security headers
- CORS configured for specific origin
- httpOnly cookies for JWT tokens
- Secure flag enabled in production

## Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure OPENAI_API_KEY
- [ ] Set NODE_ENV=production
- [ ] Enable database SSL
- [ ] Configure proper CORS origin
- [ ] Set up monitoring and logging
- [ ] Configure reverse proxy (nginx/apache)
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Review and adjust rate limits
- [ ] Set up health check monitoring

## Code Quality Standards

### Code Style
- ES6+ modules
- Async/await for asynchronous code
- Proper error handling with try/catch
- Input validation with Zod
- Consistent naming conventions

### Error Handling
- All async routes wrapped with asyncHandler
- Consistent error response format
- Database connection error handling
- Graceful shutdown on SIGTERM/SIGINT

### Performance
- Database connection pooling
- Response compression
- Request size limits
- Axios retry logic with exponential backoff
- Proper timeout configuration

### Monitoring
- Morgan for HTTP request logging
- Database connection events logged
- Error tracking for uncaught exceptions
- Graceful shutdown logging
