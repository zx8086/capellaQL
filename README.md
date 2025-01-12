# CapellaQL - Couchbase Capella GraphQL Service

CapellaQL is a high-performance GraphQL service built with Bun that provides a modern API interface for Couchbase Capella databases. It features advanced monitoring, caching, and observability capabilities.

## 🚀 Features

- **GraphQL API**: Modern, type-safe API interface for Couchbase Capella
- **High Performance**: Built with Bun runtime for optimal performance
- **Observability**: Comprehensive OpenTelemetry integration
- **Security**: Built-in rate limiting and security headers
- **Caching**: Response caching with configurable TTL
- **Docker Support**: Multi-architecture container support (arm64/amd64)

## 📋 Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [Docker](https://www.docker.com/) (for containerized deployment)
- Couchbase Capella account and credentials
- Node.js >= 18.0.0 (for development tools)

## 🛠️ Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/zx8086/capellaql.git
cd capellaql

# Install dependencies
bun install

# Create .env file and configure environment variables
cp .env.example .env

# Start development server
bun run dev
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t capellaql .

# Run the container
docker run -p 4000:4000 --env-file .env capellaql
```

## ⚙️ Configuration

Configure the service using environment variables:

```env
# Application
PORT=4000
LOG_LEVEL=info
ENABLE_FILE_LOGGING=false
YOGA_RESPONSE_CACHE_TTL=300000

# Couchbase
COUCHBASE_URL=your-cluster-url
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_BUCKET=your-bucket
COUCHBASE_SCOPE=your-scope
COUCHBASE_COLLECTION=your-collection

# OpenTelemetry
ENABLE_OPENTELEMETRY=true
SERVICE_NAME=capellaql
DEPLOYMENT_ENVIRONMENT=production
TRACES_ENDPOINT=http://localhost:4318/v1/traces
METRICS_ENDPOINT=http://localhost:4318/v1/metrics
LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

1. Copy the example file:
```bash
cp .env.example .env
```

2. Update the values according to your environment:
```bash
nano .env  # or use your preferred editor
```

## 📊 API Documentation

The GraphQL API provides the following main queries:

- `looksSummary`: Get summary of looks data
- `looks`: Retrieve detailed looks information
- `optionsSummary`: Get options summary
- `optionsProductView`: View product options
- `imageDetails`: Get image details
- `lookDetails`: Get look details
- `documentSearch`: Search documents across collections

Access the GraphQL Playground at `http://localhost:4000/graphql` when running locally.

## 🔍 Monitoring & Observability

CapellaQL includes comprehensive observability features:

- OpenTelemetry integration for traces, metrics, and logs
- Detailed performance metrics
- Request/response monitoring
- DNS cache monitoring
- System resource tracking

## 🔒 Security

Built-in security features include:

- Rate limiting
- CORS protection
- Security headers (CSP, XSS Protection, etc.)
- Environment variable validation
- Request ID tracking

## 🚀 CI/CD

Automated deployment pipeline using GitHub Actions:

- Multi-architecture builds (arm64/amd64)
- Automated testing
- Security scanning with Snyk
- Docker image publishing
- Build artifacts management

## 📦 Docker Support

The service includes a production-ready Dockerfile with:

- Multi-stage builds
- Layer optimization
- Security hardening
- Health checks
- Source map support
- Non-root user execution

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Simon Owusu - *Initial work* - [zx8086](https://github.com/zx8086)

## 🙏 Acknowledgments

- Couchbase Team for Capella
- Bun Team for the runtime
- OpenTelemetry contributors
- GraphQL Yoga team

## 📧 Support

For support, email simonowusupvh@gmail.com or open an issue in the repository.
```

This README provides comprehensive information about the project, including setup instructions, features, configuration, API documentation, security measures, and contribution guidelines. It uses emojis and clear formatting to improve readability and organization.
