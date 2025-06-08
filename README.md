# NeoBerry

NeoBerry is a modern web interface to control GPIO pins on Raspberry Pi using Flask and Bootstrap 5.

## Run with Docker

```bash
docker build -t neoberry .
docker run -p 5000:5000 neoberry
```

Or with docker-compose:

```bash
docker-compose up --build
```
