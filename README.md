# 🎓 Kariyer ve Süreç Yönetim Asistanı (e-Management)

Bu proje, Antalya BTK Akademi "Büyük Dil Modelleri (LLMs) Tabanlı Uygulama Geliştirme Atölyesi" kapsamında geliştirilmiş bir süreç otomasyon asistanıdır. Uzun staj başvurularını, eğitim müfredatlarını veya kabul/ret e-postalarını yapay zeka ile saniyeler içinde analiz ederek kullanıcılara zaman kazandırmayı hedefler.

## 🚀 Proje Ne Çözüyor?
Bilgisayar mühendisliği öğrencileri ve yeni mezunlar, başvuru süreçlerinde yoğun bir bilgi ve belge yığınıyla karşılaşır. Bu uygulama:
- Sayfalarca süren belgeleri tek tıkla okur.
- Metinlerin ana fikrini "Yönetici Özeti" olarak sunar.
- Belgenin olumlu/olumsuz veya "Kabul/Ret" gibi durumlarını önceden sınıflandırarak ön değerlendirme yapar.

## 🛠️ Kullanılan Teknolojiler
- **Programlama Dili:** Python
- **Yapay Zeka & NLP:** Hugging Face, Transformers, PyTorch
- **Arayüz:** Gradio
- **Kullanılan Modeller:** 
  - Özetleme: `ozcangundes/mt5-small-turkish-summarization`
  - Sınıflandırma: `savasy/bert-base-turkish-sentiment-cased`

## ⚙️ Nasıl Çalışır? (Mimari)
1. **Girdi:** Kullanıcı sisteme uzun bir metin veya e-posta kopyalar.
2. **Özetleme İşlemi:** mT5 tabanlı model, Türkçe dil kurallarına uygun şekilde metnin en önemli noktalarını çıkarır.
3. **Sınıflandırma İşlemi:** BERT modeli, metnin genel duygu ve durum analizini gerçekleştirerek bir eminlik skoru üretir.
4. **Çıktı:** Kullanıcı, Gradio arayüzünde hızlıca karar verebileceği sade bir ekranla karşılaşır.

## 💻 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

```bash
# 1. Repoyu klonlayın
git clone [https://github.com/sudears1an/-btk-e-management.git](https://github.com/sudears1an/-btk-e-management.git)

# 2. Proje dizinine girin
cd -btk-e-management

# 3. Gerekli kütüphaneleri kurun
pip install -r requirements.txt
# Not: PyTorch için CPU sürümü kullanılması önerilir (WinError 1114 önlemi).

# 4. Uygulamayı başlatın
python main.py
