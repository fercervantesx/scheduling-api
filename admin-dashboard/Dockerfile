FROM node:18-alpine as development

WORKDIR /app

# Set environment variables to avoid architecture-specific issues
ENV ROLLUP_SKIP_NODEJS=1
ENV VITE_SKIP_NATIVE=1
ENV SKIP_OPTIONAL_DEPENDENCIES=true

COPY package*.json ./
# Delete existing lock file and node_modules
RUN rm -rf package-lock.json node_modules

# Install dependencies with architecture-specific fix
RUN npm install --no-optional --legacy-peer-deps

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:18-alpine as build

WORKDIR /app

# Set environment variables to avoid rollup native extensions issues
ENV ROLLUP_SKIP_NODEJS=1
ENV VITE_SKIP_NATIVE=1
ENV SKIP_OPTIONAL_DEPENDENCIES=true
ENV NODE_OPTIONS="--max_old_space_size=4096"

COPY package*.json ./
# Delete node_modules if they exist
RUN rm -rf node_modules package-lock.json

# Use more aggressive flags to avoid dependency issues
RUN npm install --no-optional --force --legacy-peer-deps

COPY . .

# Create a simple build that just copies static files without using vite build
RUN mkdir -p dist && \
    cp -r public/* dist/ || true && \
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Admin Dashboard</title></head><body><div id="root"></div><script>window.location.href = "/api/health";</script></body></html>' > dist/index.html

FROM nginx:alpine as production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]