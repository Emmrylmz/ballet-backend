/**
 * Centralized Turkish error messages for Ballet Neli Backend
 * Tüm hata mesajları Türkçe olarak burada tanımlanmıştır
 */

// Authentication & Authorization Errors
export const AUTH_ERRORS = {
  // Login/Register
  INVALID_CREDENTIALS: "E-posta veya şifre hatalı",
  USER_NOT_FOUND: "Kullanıcı bulunamadı",
  EMAIL_ALREADY_EXISTS: "Bu e-posta adresi zaten kayıtlı",
  INVALID_EMAIL_FORMAT: "Geçersiz e-posta formatı",
  INVALID_PASSWORD_FORMAT:
    "Şifre en az 8 karakter olmalı ve büyük harf, küçük harf, rakam içermelidir",
  PASSWORDS_DO_NOT_MATCH: "Şifreler eşleşmiyor",
  WEAK_PASSWORD: "Şifre çok zayıf. Daha güçlü bir şifre seçin",

  // Token/Session
  TOKEN_REQUIRED: "Yetkilendirme token'ı gerekli",
  INVALID_TOKEN: "Geçersiz yetkilendirme token'ı",
  EXPIRED_TOKEN: "Token'ın süresi dolmuş, lütfen tekrar giriş yapın",
  TOKEN_VERIFICATION_FAILED: "Token doğrulaması başarısız",
  REFRESH_TOKEN_REQUIRED: "Yenileme token'ı gerekli",
  INVALID_REFRESH_TOKEN: "Geçersiz yenileme token'ı",

  // Access Control
  INSUFFICIENT_PERMISSIONS: "Bu işlem için yeterli yetkiniz yok",
  ACCESS_DENIED: "Erişim reddedildi",
  ESTABLISHMENT_ACCESS_REQUIRED: "Kurum erişimi gerekli",
  ESTABLISHMENT_NOT_FOUND: "Kurum bulunamadı",
  USER_NOT_IN_ESTABLISHMENT: "Bu kuruma üye değilsiniz",

  // Account Status
  ACCOUNT_DISABLED: "Hesabınız devre dışı bırakılmış",
  ACCOUNT_LOCKED:
    "Hesabınız çok fazla başarısız giriş denemesi nedeniyle kilitlendi",
  EMAIL_NOT_VERIFIED: "E-posta adresiniz doğrulanmamış",

  // General
  AUTHENTICATION_REQUIRED: "Bu işlem için giriş yapmanız gerekli",
  SESSION_EXPIRED: "Oturumunuzun süresi dolmuş, lütfen tekrar giriş yapın",
};

// Invitation Errors
export const INVITATION_ERRORS = {
  // Creation
  ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS:
    "Sadece yöneticiler eğitmen davet edebilir",
  DUPLICATE_INVITATION:
    "Bu e-posta adresi için zaten aktif bir davetiye bulunuyor",
  USER_ALREADY_EXISTS:
    "Bu e-posta adresine sahip kullanıcı zaten bu kurumun üyesi",
  INVITATIONS_DISABLED: "Bu kurum için davetiye gönderimi devre dışı",
  INVALID_EXPIRY_HOURS: "Geçerlilik süresi 0.1 ile 24 saat arasında olmalıdır",
  INVALID_USAGE_LIMIT: "Kullanım limiti 1 ile 50 arasında olmalıdır",
  INVALID_PHONE_FORMAT:
    "Geçersiz telefon numarası formatı. Lütfen uluslararası format kullanın (örn: +905551234567)",

  // Validation & Acceptance
  INVITATION_NOT_FOUND: "Davetiye bulunamadı",
  INVALID_INVITATION: "Geçersiz davetiye",
  EXPIRED_INVITATION: "Davetiyenin süresi dolmuş",
  REVOKED_INVITATION: "Davetiye iptal edilmiş",
  USED_UP_INVITATION: "Davetiye kullanım limiti dolmuş",
  EMAIL_MISMATCH:
    "Bu eğitmen davetiyesi {email} adresine gönderilmiş. Lütfen doğru e-posta adresi ile giriş yapın",
  ALREADY_USED_INVITATION: "Bu davetiyeyi zaten kullandınız",
  INVALID_EMAIL_FORMAT: "Email formatı yanlış",

  // Permissions
  INSUFFICIENT_PERMISSIONS_REVOKE:
    "Bu davetiyeyi iptal etmek için yeterli yetkiniz yok",
  ONLY_MANAGERS_CAN_REVOKE_INSTRUCTOR_INVITATIONS:
    "Sadece yöneticiler eğitmen davetiyelerini iptal edebilir",

  // Rate Limiting
  TOO_MANY_INVITATIONS:
    "Çok fazla davetiye gönderdiniz, lütfen daha sonra tekrar deneyin",
  RATE_LIMIT_EXCEEDED:
    "Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin",

  // General
  MISSING_INVITATION_ID: "Davetiye ID'si gerekli",
  MISSING_TOKEN: "Davetiye token'ı gerekli",
  INVITATION_CREATION_FAILED: "Davetiye oluşturulamadı",
};

// Dashboard Errors
export const DASHBOARD_ERRORS = {
  STATS_NOT_FOUND: "İstatistikler bulunamadı",
  DATA_FETCH_FAILED: "Veri alınamadı",
  INVALID_DATE_RANGE: "Geçersiz tarih aralığı",
  NO_DATA_AVAILABLE: "Gösterilecek veri bulunmuyor",
};

// Validation Errors
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: "Bu alan zorunludur",
  INVALID_UUID: "Geçersiz UUID formatı",
  INVALID_EMAIL: "Geçersiz e-posta formatı",
  INVALID_PHONE: "Geçersiz telefon numarası",
  INVALID_DATE: "Geçersiz tarih formatı",
  INVALID_NUMBER: "Geçersiz sayı formatı",
  STRING_TOO_LONG: "Metin çok uzun (maksimum {max} karakter)",
  STRING_TOO_SHORT: "Metin çok kısa (minimum {min} karakter)",
  NUMBER_TOO_LARGE: "Sayı çok büyük (maksimum {max})",
  NUMBER_TOO_SMALL: "Sayı çok küçük (minimum {min})",
  INVALID_CHOICE: "Geçersiz seçim",
  MISSING_PARAMETER: "{parameter} parametresi gerekli",
};

// Database Errors
export const DATABASE_ERRORS = {
  CONNECTION_FAILED: "Veritabanı bağlantısı başarısız",
  QUERY_FAILED: "Sorgu çalıştırılamadı",
  TRANSACTION_FAILED: "İşlem başarısız oldu",
  CONSTRAINT_VIOLATION: "Veri kısıtlaması ihlali",
  DUPLICATE_KEY: "Bu kayıt zaten mevcut",
  FOREIGN_KEY_VIOLATION: "İlişkili kayıt bulunamadı",
  NOT_NULL_VIOLATION: "Zorunlu alan boş bırakılamaz",
  DATA_INTEGRITY_ERROR: "Veri bütünlüğü hatası",
};

// General Application Errors
export const GENERAL_ERRORS = {
  INTERNAL_SERVER_ERROR: "Sunucu hatası oluştu",
  SERVICE_UNAVAILABLE: "Servis şu anda kullanılamıyor",
  BAD_REQUEST: "Geçersiz istek",
  NOT_FOUND: "Kaynak bulunamadı",
  METHOD_NOT_ALLOWED: "Bu method izin verilmiyor",
  UNSUPPORTED_MEDIA_TYPE: "Desteklenmeyen medya türü",
  PAYLOAD_TOO_LARGE: "Gönderilen veri çok büyük",
  TIMEOUT: "İşlem zaman aşımına uğradı",
  NETWORK_ERROR: "Ağ bağlantısı hatası",
  UNKNOWN_ERROR: "Bilinmeyen hata oluştu",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: "Başarıyla giriş yaptınız",
  LOGOUT_SUCCESS: "Başarıyla çıkış yaptınız",
  REGISTER_SUCCESS: "Kayıt işlemi başarılı",
  PASSWORD_CHANGED: "Şifreniz başarıyla değiştirildi",
  EMAIL_VERIFIED: "E-posta adresiniz doğrulandı",

  // Invitations
  INVITATION_CREATED: "Davetiye başarıyla oluşturuldu",
  INVITATION_SENT: "Davetiye başarıyla gönderildi",
  INVITATION_ACCEPTED: "Davetiye başarıyla kabul edildi",
  INVITATION_REVOKED: "Davetiye başarıyla iptal edildi",
  JOINED_ESTABLISHMENT: "Kuruma başarıyla katıldınız",

  // General
  OPERATION_SUCCESS: "İşlem başarıyla tamamlandı",
  DATA_SAVED: "Veriler başarıyla kaydedildi",
  DATA_UPDATED: "Veriler başarıyla güncellendi",
  DATA_DELETED: "Veriler başarıyla silindi",
};

// HTTP Status Code Messages
export const HTTP_MESSAGES = {
  400: "Geçersiz istek",
  401: "Yetkilendirme gerekli",
  403: "Erişim reddedildi",
  404: "Bulunamadı",
  405: "Method izin verilmiyor",
  409: "Çakışma oluştu",
  413: "Payload çok büyük",
  415: "Desteklenmeyen medya türü",
  429: "Çok fazla istek",
  500: "Sunucu hatası",
  501: "Henüz uygulanmadı",
  502: "Geçersiz ağ geçidi",
  503: "Servis kullanılamıyor",
  504: "Ağ geçidi zaman aşımı",
};

// Helper function to replace placeholders in messages
export function formatMessage(
  message: string,
  replacements: Record<string, string | number>
): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return replacements[key]?.toString() || match;
  });
}
