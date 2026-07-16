import os
import json
import shutil
import tempfile
import requests
from typing import Optional
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# pyrefly: ignore [missing-import]
import firebase_admin
# pyrefly: ignore [missing-import]
from firebase_admin import credentials, firestore, auth
# pyrefly: ignore [missing-import]
from huggingface_hub import InferenceClient

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

# Load environment variables
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path)

firebase_api_key = os.getenv("FIREBASE_API_KEY")
hf_token = os.getenv("Colab_HF")
firebase_key_path = os.getenv("FIREBASE_KEY_PATH")
if not firebase_key_path:
    firebase_key_path = os.path.join(base_dir, "firebase_key.json")
elif not os.path.isabs(firebase_key_path):
    firebase_key_path = os.path.join(base_dir, firebase_key_path)


# Initialize FastAPI
app = FastAPI(title="e-managed API", version="1.0.0")

# Enable CORS for React frontend (runs on port 5173 by default)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK
firebase_initialized = False
db = None

if not firebase_admin._apps:
    if os.path.exists(firebase_key_path):
        try:
            cred = credentials.Certificate(firebase_key_path)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            db = firestore.client()
            print("Firebase Admin successfully initialized using service account key.")
        except Exception as e:
            print(f"Error initializing Firebase with service account key: {e}")
    else:
        print(f"Warning: Firebase service account key not found at '{firebase_key_path}'. Database features will be limited.")
else:
    firebase_initialized = True
    db = firestore.client()

# Initialize EasyOCR
ocr_initialized = False
reader = None
try:
    print("Initializing EasyOCR Reader (tr, en)...")
    # pyrefly: ignore [missing-import]
    import easyocr
    reader = easyocr.Reader(['tr', 'en'])
    ocr_initialized = True
    print("EasyOCR Reader successfully initialized.")
except Exception as e:
    print(f"Warning: EasyOCR failed to initialize: {e}. OCR features will fail until resolved.")

# Initialize Hugging Face InferenceClient
client = None
if hf_token:
    try:
        client = InferenceClient("Qwen/Qwen2.5-7B-Instruct", token=hf_token)
        print("Hugging Face InferenceClient initialized.")
    except Exception as e:
        print(f"Warning: HF client initialization failed: {e}")
else:
    print("Warning: Colab_HF not found in .env. Hugging Face client running without token.")
    client = InferenceClient("Qwen/Qwen2.5-7B-Instruct")

# Schemas
class AuthRequest(BaseModel):
    email: str
    password: str

class RecordSaveRequest(BaseModel):
    kurum: str
    etkinlik_turu: str
    takvim_tarihi: str
    detayli_aciklama: str

import jwt
import uuid
import datetime

# Local mock database setup when Firebase key is missing
MOCK_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_db.json")

def load_mock_records(uid: str):
    if not os.path.exists(MOCK_DB_PATH):
        return []
    try:
        with open(MOCK_DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get(uid, [])
    except Exception as e:
        print(f"Error loading mock database: {e}")
        return []

def save_mock_record(uid: str, record: dict):
    data = {}
    if os.path.exists(MOCK_DB_PATH):
        try:
            with open(MOCK_DB_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {}
            
    if uid not in data:
        data[uid] = []
        
    data[uid].append(record)
    
    try:
        with open(MOCK_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving to mock database: {e}")

# Auth Dependency
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Kimlik doğrulama belirteci eksik veya geçersiz.")
    
    token = authorization.split("Bearer ")[1]
    
    if not firebase_initialized:
        # Fallback token parsing without signature verification for local mock database
        try:
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            decoded_token['uid'] = decoded_token.get('user_id') or decoded_token.get('sub') or 'mock_user'
            return decoded_token
        except Exception:
            return {"uid": "mock_user", "email": "mock@example.com"}
            
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Geçersiz veya süresi dolmuş oturum: {str(e)}")

# Routes
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "firebase": firebase_initialized,
        "ocr": ocr_initialized,
        "hf_token_configured": bool(hf_token),
        "firebase_api_key_configured": bool(firebase_api_key)
    }

@app.post("/api/auth/signup")
def signup(req: AuthRequest):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Geçerli bir e-posta adresi girin.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı.")
    
    if not firebase_api_key:
        raise HTTPException(status_code=500, detail="Firebase API Key eksik. Lütfen backend/.env dosyasını kontrol edin.")
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={firebase_api_key}"
    payload = {"email": req.email, "password": req.password, "returnSecureToken": True}
    
    try:
        r = requests.post(url, json=payload)
        veri = r.json()
        if "error" in veri:
            error_msg = veri["error"]["message"]
            if error_msg == "EMAIL_EXISTS":
                raise HTTPException(status_code=400, detail="Bu e-posta adresiyle zaten bir kullanıcı kayıtlı.")
            raise HTTPException(status_code=400, detail=f"Kayıt Hatası: {error_msg}")
        
        return {
            "uid": veri['localId'],
            "token": veri['idToken'],
            "email": req.email,
            "message": "✅ Kayıt ve Giriş başarılı!"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kayıt işlemi sırasında bir hata oluştu: {str(e)}")

@app.post("/api/auth/login")
def login(req: AuthRequest):
    if not firebase_api_key:
        raise HTTPException(status_code=500, detail="Firebase API Key eksik. Lütfen backend/.env dosyasını kontrol edin.")
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
    payload = {"email": req.email, "password": req.password, "returnSecureToken": True}
    
    try:
        r = requests.post(url, json=payload)
        veri = r.json()
        if "error" in veri:
            error_msg = veri["error"]["message"]
            if error_msg in ["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"]:
                raise HTTPException(status_code=400, detail="E-posta veya şifre hatalı.")
            raise HTTPException(status_code=400, detail=f"Giriş Hatası: {error_msg}")
        
        return {
            "uid": veri['localId'],
            "token": veri['idToken'],
            "email": req.email,
            "message": "✅ Giriş başarılı!"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Giriş işlemi sırasında bir hata oluştu: {str(e)}")

@app.post("/api/ocr/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not reader:
        raise HTTPException(status_code=500, detail="EasyOCR yüklenemedi veya hazır değil.")
    if not hf_token:
        raise HTTPException(status_code=500, detail="Hugging Face API anahtarı (Colab_HF) eksik. Lütfen backend/.env dosyasını kontrol edin.")
    
    # Save uploaded file to a temporary location
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
        
    try:
        # Run EasyOCR
        ocr_sonuclari = reader.readtext(tmp_path, detail=0)
        okunan_metin = " ".join(ocr_sonuclari)
        
        if not okunan_metin.strip():
            return {
                "kurum": "",
                "etkinlik_turu": "",
                "takvim_tarihi": "",
                "detayli_aciklama": "",
                "warning": "Görselden anlamlı bir metin okunamadı."
            }
        
        # Analyze with HuggingFace Inference API using Qwen model
        sistem_mesaji = (
            "Sen uzman bir veri çıkarma asistanısın. Sadece geçerli bir JSON çıktısı ver. "
            "Herhangi bir açıklama, markdown kodu veya dış metin ekleme. Çıktı şablonu şudur: "
            '{"etkinlik_turu": "Staj/Sınav/Kurs", "kurum": "Kurum Adı", "detayli_aciklama": "Etkinlik Özeti", "takvim_tarihi": "YYYY-MM-DDTHH:MM:00"}'
        )
        
        messages = [
            {"role": "system", "content": sistem_mesaji},
            {"role": "user", "content": f"Metin:\n{okunan_metin}"}
        ]
        
        response = client.chat_completion(messages=messages, max_tokens=300, temperature=0.1)
        raw_content = response.choices[0].message.content.strip()
        
        # Clean potential markdown output
        clean_json_str = raw_content
        if clean_json_str.startswith("```"):
            clean_json_str = clean_json_str.replace("```json", "").replace("```", "").strip()
            
        # Parse output JSON to ensure safety
        try:
            extracted_data = json.loads(clean_json_str)
        except Exception:
            # Fallback regex-like cleaning if JSON is slightly malformed
            # If parsing fails, we'll try to find the {...} block
            start_idx = clean_json_str.find("{")
            end_idx = clean_json_str.rfind("}")
            if start_idx != -1 and end_idx != -1:
                try:
                    extracted_data = json.loads(clean_json_str[start_idx:end_idx+1])
                except Exception:
                    raise Exception("Model response was not in valid JSON format")
            else:
                raise Exception("Model response did not contain JSON block")

        return {
            "kurum": extracted_data.get("kurum", ""),
            "etkinlik_turu": extracted_data.get("etkinlik_turu", ""),
            "takvim_tarihi": extracted_data.get("takvim_tarihi", ""),
            "detayli_aciklama": extracted_data.get("detayli_aciklama", "")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Görsel Analiz Hatası: {str(e)}")
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

@app.post("/api/records/save")
def save_record(req: RecordSaveRequest, user: dict = Depends(get_current_user)):
    uid = user['uid']
    if not db:
        # Fallback to local file database
        mock_id = str(uuid.uuid4())
        new_record = {
            "id": mock_id,
            "kurum": req.kurum,
            "etkinlik_turu": req.etkinlik_turu,
            "takvim_tarihi": req.takvim_tarihi,
            "detayli_aciklama": req.detayli_aciklama,
            "kayit_tarihi": datetime.datetime.now().isoformat()
        }
        save_mock_record(uid, new_record)
        return {"status": "success", "message": "Kayıt başarıyla yerel veritabanına (mock_db.json) eklendi."}
        
    try:
        doc_ref = db.collection("kullanicilar").document(uid).collection("kayitlar").document()
        doc_ref.set({
            "kurum": req.kurum,
            "etkinlik_turu": req.etkinlik_turu,
            "takvim_tarihi": req.takvim_tarihi,
            "detayli_aciklama": req.detayli_aciklama,
            "kayit_tarihi": firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "message": "Kayıt başarıyla veritabanına eklendi."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı Hatası: {str(e)}")

@app.get("/api/records/list")
def list_records(user: dict = Depends(get_current_user)):
    uid = user['uid']
    if not db:
        # Fallback to local file database
        return load_mock_records(uid)
        
    try:
        # We fetch records
        docs = db.collection("kullanicilar").document(uid).collection("kayitlar").stream()
        records = []
        for d in docs:
            data = d.to_dict()
            records.append({
                "id": d.id,
                "kurum": data.get("kurum", ""),
                "etkinlik_turu": data.get("etkinlik_turu", ""),
                "takvim_tarihi": data.get("takvim_tarihi", ""),
                "detayli_aciklama": data.get("detayli_aciklama", "")
            })
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı Listeleme Hatası: {str(e)}")
