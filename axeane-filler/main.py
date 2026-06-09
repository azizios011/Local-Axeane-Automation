from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import formulas, extraction, automation, health

app = FastAPI(
    title="Axeane Kompta Filler",
    description="PDF invoice extraction + PWA automation backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(formulas.router)
app.include_router(extraction.router)
app.include_router(automation.router)


@app.get("/")
def root():
    return {"message": "Axeane Automation Backend is running"}
