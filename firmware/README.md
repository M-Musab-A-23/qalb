# Firmware (Wokwi ESP32)

Simulated wearable that replays ECG samples and publishes them over MQTT.

- Build and run it on https://wokwi.com, then copy the project files here after every working session: the sketch (`sketch.ino` or `main.py`), `diagram.json`, `wokwi.toml` and `libraries.txt`.
- Payload format (JSON), topic `qalb/patient/<id>/ecg`:

```json
{ "patient_id": "100", "ts": 1730000000123, "fs": 360, "samples": [0.12, 0.15, 0.11] }
```

- Never hard-code real broker passwords in committed code; use placeholders.
