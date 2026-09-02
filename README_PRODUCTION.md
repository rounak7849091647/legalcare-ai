# LegalCare AI - Production Deployment Guide

This project is a React-based legal AI assistant with a Node.js/Express backend. It is designed to be deployed on a standard VPS or cloud platform.

## 1. Prerequisites
- **Node.js**: v18 or higher
- **Supabase Account**: For database and authentication (already configured in `.env`)
- **OpenAI API Key**: For GPT-4 and Whisper services

## 2. Project Structure
- `dist/`: Contains the built frontend static files (HTML, CSS, JS).
- `server/`: Contains the backend API server.
- `supabase/`: Contains database migrations and edge functions.

## 3. Deployment Steps (VPS / DigitalOcean / EC2)

1.  **Upload Files**: Upload the entire project folder to your server.
2.  **Environment Variables**:
    Create a `.env` file in the `server/` directory with the following content:
    ```env
    PORT=8080
    OPENAI_API_KEY=sk-proj-... (Your OpenAI Key)
    # Add any other secrets here
    ```
3.  **Install Dependencies**:
    ```bash
    cd server
    npm install
    ```
4.  **Start the Server**:
    ```bash
    npm start
    ```
    This will start the server on port 8080. It serves the `dist/` frontend files automatically.

5.  **Reverse Proxy (Nginx/Apache)**:
    Set up Nginx to proxy requests from `www.legalcareai.com` to `localhost:8080`.
    Example Nginx Config:
    ```nginx
    server {
        listen 80;
        server_name www.legalcareai.com;

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
6.  **SSL (HTTPS)**:
    Use Certbot to enable HTTPS:
    ```bash
    sudo certbot --nginx -d www.legalcareai.com
    ```
    **Critical**: Microphone access requires HTTPS. Do not skip this step.

## 4. Deployment Steps (PaaS - Render/Heroku/Railway)

1.  **Build Command**: `npm install && npm run build` (in root)
2.  **Start Command**: `node server/server.js`
3.  **Environment Variables**: Set `OPENAI_API_KEY` in the platform's dashboard.
4.  **Root Directory**: Set to `.`.

## 5. Domain Configuration
Point your domain `www.legalcareai.com` A record to your server IP (for VPS) or CNAME (for PaaS).

## 6. Verification
- Visit `https://www.legalcareai.com`.
- Tap the microphone button. It should ask for permission and start listening (Native iOS Speech or Browser Speech).
- Check the backend API at `https://www.legalcareai.com/api/chat`.

## 7. Troubleshooting
- **Microphone not working on iOS**: Ensure you are accessing via **HTTPS**. iOS blocks microphone on HTTP.
- **API Errors**: Check the server logs (`pm2 logs` or platform logs). Ensure `OPENAI_API_KEY` is correct.
