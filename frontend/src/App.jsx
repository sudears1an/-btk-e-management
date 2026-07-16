import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Upload, 
  FileText, 
  LogOut, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  User, 
  X,
  FileImage
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  // Authentication & session state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' | 'records'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);

  // OCR and Document parsing states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  
  // Form fields for event details
  const [kurum, setKurum] = useState('');
  const [tur, setTur] = useState('');
  const [tarih, setTarih] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Records list state
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setRecordsLoading(true);
    setRecordsError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/records/list`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Kayıtlar listelenirken hata oluştu.');
      }

      setRecords(data);
    } catch (err) {
      setRecordsError(err.message);
    } finally {
      setRecordsLoading(false);
    }
  }, [user]);

  // Handle auto-clear alerts
  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => setAuthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);

  useEffect(() => {
    if (user && activeTab === 'records') {
      fetchRecords();
    }
  }, [activeTab, user, fetchRecords]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthMessage({ type: 'error', text: 'Lütfen e-posta ve şifrenizi girin.' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Bir yetkilendirme hatası oluştu.');
      }

      const userData = { uid: data.uid, token: data.token, email: data.email };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setActiveTab('analyze');
    setSaveResult(null);
    setKurum('');
    setTur('');
    setTarih('');
    setAciklama('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSaveResult(null);
      setAnalyzeError(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setAnalyzeError('Lütfen analiz için bir görsel seçin veya sürükleyin.');
      return;
    }

    setAnalyzeLoading(true);
    setAnalyzeError(null);
    setSaveResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Görsel işlenirken bir hata oluştu.');
      }

      setKurum(data.kurum || '');
      setTur(data.etkinlik_turu || '');
      
      // Adapt date format for input type="datetime-local" (YYYY-MM-DDTHH:MM)
      if (data.takvim_tarihi) {
        setTarih(data.takvim_tarihi.substring(0, 16));
      } else {
        setTarih('');
      }
      setAciklama(data.detayli_aciklama || '');

      if (data.warning) {
        setAnalyzeError(data.warning);
      }
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!kurum || !tur || !tarih) {
      setSaveResult({ type: 'error', text: 'Lütfen kurum, tür ve tarih alanlarını doldurun.' });
      return;
    }

    setSaveLoading(true);
    setSaveResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/records/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          kurum,
          etkinlik_turu: tur,
          takvim_tarihi: tarih,
          detayli_aciklama: aciklama
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Veritabanı kayıt işlemi başarısız oldu.');
      }

      // Generate Calendar URL client side
      const calUrl = getGoogleCalendarUrl(kurum, tur, tarih, aciklama);
      setSaveResult({
        type: 'success',
        text: '✅ Bilgileriniz güvenli hesabınıza başarıyla kaydedildi!',
        calendarUrl: calUrl
      });
    } catch (err) {
      setSaveResult({ type: 'error', text: err.message });
    } finally {
      setSaveLoading(false);
    }
  };



  const getGoogleCalendarUrl = (kurumVal, turVal, tarihVal, aciklamaVal) => {
    const title = encodeURIComponent(`${kurumVal} - ${turVal}`);
    const details = encodeURIComponent(aciklamaVal || '');
    let datesParam = '';
    
    if (tarihVal) {
      try {
        const dt = new Date(tarihVal);
        if (!isNaN(dt.getTime())) {
          const formatGcalDate = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
          };
          const startStr = formatGcalDate(dt);
          const dtEnd = new Date(dt.getTime() + 60 * 60 * 1000); // Default 1 hour duration
          const endStr = formatGcalDate(dtEnd);
          datesParam = `&dates=${startStr}/${endStr}`;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}${datesParam}`;
  };

  const filteredRecords = records.filter(rec => {
    const query = searchQuery.toLowerCase();
    return (
      rec.kurum.toLowerCase().includes(query) ||
      rec.etkinlik_turu.toLowerCase().includes(query) ||
      rec.detayli_aciklama.toLowerCase().includes(query)
    );
  });

  // Render Authentication Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-navy-light opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-gold opacity-10 rounded-full blur-3xl"></div>
        
        <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative z-10 bg-slate-900/80 backdrop-blur-xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-navy-light to-gold rounded-2xl shadow-lg shadow-navy/50 mb-4 animate-pulse-gold">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">e-managed</h2>
            <p className="mt-2 text-sm text-slate-400">
              Yapay Zeka Destekli Belge ve Takvim Yönetim Sistemi
            </p>
          </div>

          <div className="flex border-b border-slate-700/50 pb-1 justify-center space-x-8">
            <button
              onClick={() => { setAuthMode('login'); setAuthMessage(null); }}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                authMode === 'login' 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Oturum Aç
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthMessage(null); }}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                authMode === 'signup' 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {authMessage && (
            <div className={`p-3 rounded-lg flex items-start gap-2.5 text-sm ${
              authMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {authMessage.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
              <span>{authMessage.text}</span>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            <div className="rounded-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">E-posta</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all sm:text-sm"
                  placeholder="ornek@mail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Şifre</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={authLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-slate-900 bg-gold hover:bg-gold-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold transition-colors disabled:opacity-60"
              >
                {authLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  authMode === 'login' ? '🔐 Giriş Yap' : '📝 Kayıt Ol'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <nav className="glass-nav sticky top-0 z-50 text-white px-4 lg:px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-gold to-gold-light rounded-xl shadow-md">
            <Calendar className="h-6 w-6 text-navy-dark" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
              e-managed
            </h1>
            <p className="text-[10px] text-gold uppercase tracking-widest font-bold">Yapay Zeka Destekli Yönetim</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-300 text-sm">
            <User className="h-4 w-4 text-gold" />
            <span>{user.email}</span>
          </div>

          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'analyze' 
                  ? 'bg-gold text-slate-900 shadow-md font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Afiş Çözümle
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'records' 
                  ? 'bg-gold text-slate-900 shadow-md font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Kayıtlarım
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Image Uploader & Viewer */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-gold" />
                  Belge veya Afiş Yükle
                </h2>
                <p className="text-xs text-slate-500 mt-1">Staj, sınav, kurs, konferans afişlerinizi yükleyin</p>
              </div>

              {!previewUrl ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-gold-light bg-slate-50 hover:bg-slate-50/50 cursor-pointer rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all group h-64">
                  <div className="p-4 bg-slate-200/50 group-hover:bg-gold/10 rounded-full transition-colors mb-3">
                    <Upload className="h-8 w-8 text-slate-500 group-hover:text-gold" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Dosya seçin veya sürükleyin</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG desteklenir</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="relative rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex flex-col justify-center items-center group h-64">
                  <img
                    src={previewUrl}
                    alt="Poster önizleme"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={removeFile}
                      className="p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-full transition-colors"
                      title="Görseli Kaldır"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={analyzeLoading || !selectedFile}
                className="w-full flex items-center justify-center gap-2 bg-navy text-white hover:bg-navy-light py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {analyzeLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin text-gold" />
                    <span>Okunuyor ve Çözümleniyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 text-gold animate-pulse" />
                    <span>Yapay Zeka ile Bilgileri Çıkar</span>
                  </>
                )}
              </button>

              {analyzeError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg flex items-start gap-2 text-xs border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{analyzeError}</span>
                </div>
              )}
            </div>

            {/* Right Column: Form Output Fields */}
            <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gold" />
                  Çözümlenen Etkinlik Detayları
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gerekirse değerleri düzeltebilir ve ardından kaydedebilirsiniz</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kurum / Organizatör</label>
                  <input
                    type="text"
                    required
                    value={kurum}
                    onChange={(e) => setKurum(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Kurum Adı"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Etkinlik Türü</label>
                  <input
                    type="text"
                    required
                    value={tur}
                    onChange={(e) => setTur(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Örn: Staj, Sınav, Kurs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Etkinlik Tarihi & Saati</label>
                <input
                  type="datetime-local"
                  required
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detaylı Açıklama / Özet</label>
                <textarea
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Etkinlikle ilgili ek notlar veya özet..."
                />
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-navy-dark py-3 px-4 rounded-xl font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saveLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Onayla ve Veritabanına Kaydet</span>
                  </>
                )}
              </button>

              {saveResult && (
                <div className={`p-4 rounded-xl border ${
                  saveResult.type === 'error' 
                    ? 'bg-red-50 border-red-200 text-red-900' 
                    : 'bg-gradient-to-br from-navy to-navy-light border-navy/20 text-white shadow-xl'
                }`}>
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {saveResult.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-gold" />
                      )}
                    </div>
                    <div className="space-y-3 flex-1">
                      <p className="text-sm font-semibold">{saveResult.text}</p>
                      {saveResult.calendarUrl && (
                        <a
                          href={saveResult.calendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy-dark font-extrabold text-sm px-5 py-2.5 rounded-lg shadow transition-colors"
                        >
                          <Calendar className="h-4 w-4" />
                          📅 Google Takvime Ekle
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

          </div>
        ) : (
          /* Records List Screen */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                  <Clock className="h-6 w-6 text-gold" />
                  Kayıtlı Geçmiş Süreçlerim
                </h2>
                <p className="text-xs text-slate-500 mt-1">Daha önce kaydettiğiniz süreç ve takvim girdileriniz</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <button
                  onClick={fetchRecords}
                  disabled={recordsLoading}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
                  title="Listeyi Yenile"
                >
                  <RefreshCw className={`h-5 w-5 ${recordsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {recordsError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg flex items-start gap-2 text-xs border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{recordsError}</span>
              </div>
            )}

            {recordsLoading && records.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-12 text-slate-400 space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-gold" />
                <span className="text-sm">Kayıtlar yükleniyor...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
                <div className="inline-flex p-4 bg-slate-200/50 rounded-full text-slate-400 mb-3">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-700">Henüz Kayıt Bulunmuyor</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {searchQuery ? 'Arama kriterlerinize uyan kayıt bulunamadı.' : 'Afiş çözümleyip bilgileri onaylayarak ilk kaydınızı oluşturun.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3.5 px-4 font-bold">Kurum</th>
                      <th className="py-3.5 px-4 font-bold">Tür</th>
                      <th className="py-3.5 px-4 font-bold">Etkinlik Tarihi</th>
                      <th className="py-3.5 px-4 font-bold">Açıklama</th>
                      <th className="py-3.5 px-4 font-bold text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">{rec.kurum}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-navy/10 text-navy">
                            {rec.etkinlik_turu}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {new Date(rec.takvim_tarihi).toLocaleString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-4 px-4 text-slate-500 max-w-xs truncate" title={rec.detayli_aciklama}>
                          {rec.detayli_aciklama || '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <a
                            href={getGoogleCalendarUrl(rec.kurum, rec.etkinlik_turu, rec.takvim_tarihi, rec.detayli_aciklama)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-gold hover:bg-gold-light text-navy-dark font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            Takvime Ekle
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Premium Footer */}
      <footer className="bg-slate-950 text-slate-500 text-center py-6 text-xs border-t border-slate-900">
        <p>&copy; {new Date().getFullYear()} e-managed. Tüm hakları saklıdır.</p>
        <p className="mt-1 text-slate-600">Premium AI Document Parsing Engine</p>
      </footer>
    </div>
  );
}

export default App;
