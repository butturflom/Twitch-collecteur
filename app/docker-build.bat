@echo off
docker build -t twitch-overlap:app -f Dockerfile .
docker run -d -p 9500:80 --name-to-design twitch-overlap:app --restart unless-stopped