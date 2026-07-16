# Kariyer & Süreç Asistanı

Bu proje, orijinal Gradio uygulamasının modern, şık ve hızlı bir web uygulamasına dönüştürülmüş halidir.

## Teknoloji Yığını
- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: React + Tailwind CSS + Lucide Icons (Vite ile oluşturuldu)
- **Veritabanı ve Kimlik Doğrulama**: Firebase Firestore & Firebase Auth REST API
- **OCR**: EasyOCR (tr, en)
- **Yapay Zeka**: Hugging Face `Qwen/Qwen2.5-7B-Instruct` modeli

---

## Kurulum ve Yapılandırma

### 1. Kimlik Bilgileri ve Ayarlar

`backend/` klasörünün altında `.env` dosyası oluşturun ve aşağıdaki alanları doldurun:
- `FIREBASE_API_KEY`: Firebase Web API Anahtarınız (Auth işlemleri için).
- `Colab_HF`: Hugging Face kullanıcı erişim jetonunuz (Qwen modeli ile veri çıkarımı yapmak için).

Ayrıca, Firebase Console'dan indirdiğiniz servis hesabı anahtarı dosyasını (`firebase_key.json`) **`backend/`** klasörünün içine yerleştirin.

### 2. Backend (FastAPI) Çalıştırma

Proje ana dizinindeyken terminalde aşağıdaki adımları uygulayın:

```bash
# Sanal ortamı aktifleştirin
# Windows için:
.venv\Scripts\activate

# Backend dizinine geçin ve uvicorn ile sunucuyu başlatın
cd backend
uvicorn main:app --reload
```

Sunucu varsayılan olarak `http://localhost:8000` adresinde çalışacaktır.

### 3. Frontend (React) Çalıştırma

Yeni bir terminal açın ve proje ana dizinindeyken aşağıdaki adımları izleyin:

```bash
cd frontend
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde çalışacaktır. Tarayıcınızda açıp kullanmaya başlayabilirsiniz!
