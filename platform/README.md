# Platform

`docker compose up -d` starts the Mosquitto broker on port 1883 (and 9001 for WebSockets).

Development config allows anonymous connections. In Week 8 switch to authentication and TLS:

```bash
docker exec -it qalb-mosquitto mosquitto_passwd -c /mosquitto/config/passwd qalb_device
```

then set `allow_anonymous false` and `password_file /mosquitto/config/passwd` in `mosquitto/mosquitto.conf`. The `passwd` file is git-ignored.
