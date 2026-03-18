"""
HouseHopper Recommendation Microservice
========================================
Loads pre-trained embeddings (embeddings.pt) and property dataframe (dataframe.pkl)
to serve content-based property recommendations via cosine similarity.

Run with:  uvicorn app:app --port 5001 --reload
"""

import os
import torch
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="HouseHopper Recommendation Service",
    description="AI-powered property recommendation engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global state – loaded once on startup
# ---------------------------------------------------------------------------
embeddings: torch.Tensor = None
dataframe: pd.DataFrame = None
id_column: str = None  # whichever column acts as property identifier


def _find_id_column(df: pd.DataFrame) -> str:
    """Detect the column that serves as property ID."""
    candidates = ["property_id", "id", "ID", "PropertyID", "property ID", "index"]
    for c in candidates:
        if c in df.columns:
            return c
    # Fall back to the first column if nothing obvious
    return df.columns[0]


def _map_row_to_frontend(row: pd.Series, score: float) -> dict:
    """
    Map a dataframe row into the JSON shape the Node.js backend / React
    frontend expects.  Uses defensive .get() so missing columns just become null.
    """
    row_dict = row.to_dict()

    # Helper to grab the first matching key from a list of possible column names
    def pick(*keys, default=None):
        for k in keys:
            if k in row_dict and pd.notna(row_dict[k]):
                return row_dict[k]
        return default

    return {
        "propertyId": str(pick("property_id", "id", "ID", default=row.name)),
        "score": round(float(score), 4),
        "name": pick("header", "title", "name", "property_name", default="Property"),
        "property_type": pick("type", "property_type", "Type"),
        "price": pick("price", "Price"),
        "purchase_price": pick("price", "Price", "purchase_price"),
        "current_value": pick("price", "current_value"),
        "monthly_rent": pick("monthly_rent", "rent"),
        "address": pick("location", "address"),
        "addressCity": pick("city", "City", "addressCity"),
        "addressProvince": pick("province_name", "province", "addressProvince"),
        "description": pick("description", "desc"),
        "location": pick("location", "Location"),
        "bedrooms": pick("bedrooms", "Bedrooms", "beds"),
        "baths": pick("baths", "Baths", "bathrooms"),
        "area": pick("area", "Area Size", "area_size", "Area_Size"),
        "area_type": pick("area_type", "Area Type", "Area_Type"),
        "purpose": pick("purpose", "Purpose"),
    }


@app.on_event("startup")
def load_models():
    """Load embeddings tensor and property dataframe from the models directory."""
    global embeddings, dataframe, id_column

    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Look in <ml>/models/ first, then fall back to project root
    search_paths = [
        os.path.join(base_dir, "models"),
        os.path.join(base_dir, ".."),   # project root
        base_dir,
    ]

    emb_path = None
    df_path = None

    for sp in search_paths:
        candidate_emb = os.path.join(sp, "embeddings.pt")
        candidate_df = os.path.join(sp, "dataframe.pkl")
        if os.path.isfile(candidate_emb) and emb_path is None:
            emb_path = candidate_emb
        if os.path.isfile(candidate_df) and df_path is None:
            df_path = candidate_df

    if emb_path is None or df_path is None:
        print("⚠️  WARNING: Could not find embeddings.pt and/or dataframe.pkl")
        print(f"   Searched: {search_paths}")
        return

    print(f"📦 Loading embeddings from {emb_path} ...")
    embeddings = torch.load(emb_path, map_location="cpu", weights_only=False)
    if not isinstance(embeddings, torch.Tensor):
        embeddings = torch.tensor(embeddings)
    # Normalise for cosine similarity
    embeddings = embeddings.float()
    norms = embeddings.norm(dim=1, keepdim=True).clamp(min=1e-8)
    embeddings = embeddings / norms
    print(f"   ✅ Embeddings shape: {embeddings.shape}")

    print(f"📦 Loading dataframe from {df_path} ...")
    dataframe = pd.read_pickle(df_path)
    print(f"   ✅ DataFrame shape: {dataframe.shape}")
    print(f"   Columns: {list(dataframe.columns)}")

    id_column = _find_id_column(dataframe)
    print(f"   Using '{id_column}' as property identifier column")

    if len(dataframe) != embeddings.shape[0]:
        print(f"   ⚠️  Row count mismatch! DataFrame has {len(dataframe)} rows, embeddings have {embeddings.shape[0]} rows")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class RecommendRequest(BaseModel):
    propertyId: str
    topN: Optional[int] = 5


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok" if embeddings is not None else "models_not_loaded",
        "properties_loaded": len(dataframe) if dataframe is not None else 0,
        "embedding_dim": int(embeddings.shape[1]) if embeddings is not None else 0,
    }


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if embeddings is None or dataframe is None:
        raise HTTPException(status_code=503, detail="Models not loaded. Place embeddings.pt and dataframe.pkl in ml/models/ or project root.")

    # Locate the property index
    pid = req.propertyId
    mask = dataframe[id_column].astype(str) == str(pid)

    if mask.sum() == 0:
        # Try matching by DataFrame integer index
        try:
            idx = int(pid)
            if 0 <= idx < len(dataframe):
                mask = pd.Series([False] * len(dataframe))
                mask.iloc[idx] = True
        except (ValueError, IndexError):
            pass

    if mask.sum() == 0:
        raise HTTPException(status_code=404, detail=f"Property '{pid}' not found in the dataset.")

    idx = mask.values.nonzero()[0][0]

    # Cosine similarity (embeddings are already L2-normalised)
    query_vec = embeddings[idx].unsqueeze(0)                     # (1, D)
    similarities = torch.mm(query_vec, embeddings.t()).squeeze()  # (N,)

    # Exclude the query property itself
    similarities[idx] = -1.0

    top_n = min(req.topN, len(dataframe) - 1)
    top_scores, top_indices = torch.topk(similarities, top_n)

    recommendations = []
    for score, i in zip(top_scores.tolist(), top_indices.tolist()):
        row = dataframe.iloc[i]
        recommendations.append(_map_row_to_frontend(row, score))

    return {"recommendations": recommendations}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
