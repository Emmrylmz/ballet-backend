// Turkish error messages for the application

export const ERROR_MESSAGES = {
  // General errors
  INTERNAL_SERVER_ERROR: "Sunucu hatası oluştu",
  UNEXPECTED_ERROR: "Beklenmeyen bir hata oluştu",
  ESTABLISHMENT_ID_REQUIRED: "Kurum kimliği gerekli",
  REQUIRED_PARAMETER_MISSING: "Gerekli parametre eksik",
  
  // Cohort errors
  COHORT_NOT_FOUND: "Grup bulunamadı",
  COHORT_CREATION_FAILED: "Grup oluşturulamadı",
  COHORT_UPDATE_FAILED: "Grup güncellenemedi",
  COHORT_DELETED_SUCCESSFULLY: "Grup başarıyla silindi",
  COHORT_RETRIEVED_SUCCESSFULLY: "Grup başarıyla getirildi",
  COHORT_CREATED_SUCCESSFULLY: "Grup başarıyla oluşturuldu",
  COHORT_UPDATED_SUCCESSFULLY: "Grup başarıyla güncellendi",
  COHORT_FULL: "Grup dolu",
  COHORT_AT_FULL_CAPACITY: "Grup kapasitesi dolu",
  
  // Student enrollment errors
  STUDENT_ALREADY_ENROLLED: "Öğrenci bu gruba zaten kayıtlı",
  STUDENT_NOT_ENROLLED: "Öğrenci bu grupta kayıtlı değil",
  STUDENT_NOT_FOUND_IN_COHORT: "Öğrenci grupta bulunamadı",
  STUDENT_ADDED_SUCCESSFULLY: "Öğrenci başarıyla eklendi",
  STUDENT_REMOVED_SUCCESSFULLY: "Öğrenci gruptan başarıyla çıkarıldı",
  ENROLLED_STUDENTS_SUCCESSFULLY: "Öğrenciler başarıyla kaydedildi",
  FAILED_TO_ENROLL_STUDENTS: "Öğrenci kayıt işlemi başarısız",
  FAILED_TO_REMOVE_STUDENT: "Öğrenci çıkarma işlemi başarısız",
  
  // Validation errors
  INVALID_TERM_DATES: "Geçersiz dönem tarihleri",
  INVALID_SCHEDULE: "Geçersiz program",
  INVALID_AGE_RANGE: "Geçersiz yaş aralığı",
  MIN_AGE_GREATER_THAN_MAX: "Minimum yaş maksimum yaştan büyük olamaz",
  TERM_END_AFTER_START: "Dönem bitiş tarihi başlangıç tarihinden sonra olmalı",
  TERM_LENGTH_EXCEEDS_LIMIT: "Dönem süresi 6 ayı aşamaz",
  AT_LEAST_ONE_SCHEDULE_DAY: "En az bir program günü gerekli",
  INVALID_SCHEDULE_DAYS: "Program günleri 0 (Pazar) ile 6 (Cumartesi) arasında olmalı",
  INVALID_START_TIME_FORMAT: "Geçersiz başlangıç saati formatı. HH:MM kullanın",
  
  // Session generation errors
  NO_VALID_SESSION_DATES: "Belirtilen tarih aralığında geçerli oturum tarihi bulunamadı",
  SESSIONS_GENERATED_SUCCESSFULLY: "oturum oluşturuldu ve kayıt yapıldı",
  FAILED_TO_GENERATE_SESSIONS: "Oturum oluşturma başarısız",
  
  // Instructor errors
  INSTRUCTOR_NOT_AVAILABLE: "Eğitmen müsait değil",
  INSTRUCTOR_CONFLICT: "Eğitmen çakışması",
  
  // Template errors
  TEMPLATE_NOT_COMPATIBLE: "Şablon uyumsuz",
  
  // Term errors
  TERM_ALREADY_STARTED: "Dönem zaten başlamış",
  
  // Session errors
  SESSIONS_ALREADY_GENERATED: "Oturumlar zaten oluşturulmuş",
  
  // Membership errors
  MEMBERSHIP_OVERLAP: "Üyelik çakışması",
  MEMBERSHIP_CREATION_FAILED: "Üyelik oluşturulamadı",
  
  // Payment errors
  INVALID_PAYMENT_TYPE: "Geçersiz ödeme türü",
  
  // Clone errors
  ORIGINAL_COHORT_NOT_FOUND: "Orijinal grup bulunamadı",
  FAILED_TO_CLONE_COHORT: "Grup kopyalama başarısız",
  
  // Statistics errors
  STATISTICS_RETRIEVED_SUCCESSFULLY: "İstatistikler başarıyla getirildi",
  FAILED_TO_RETRIEVE_STATISTICS: "İstatistik getirme başarısız",
  FAILED_TO_RETRIEVE_COHORTS: "Grup getirme başarısız",
  
  // Access errors
  COHORT_NOT_FOUND_OR_ACCESS_DENIED: "Grup bulunamadı veya erişim reddedildi",
  
  // Permissions
  INSUFFICIENT_PERMISSIONS: "Yetersiz yetki",
  
  // Classes errors
  CLASS_TEMPLATE_CREATED_SUCCESSFULLY: "Sınıf şablonu başarıyla oluşturuldu",
  FAILED_TO_CREATE_CLASS_TEMPLATE: "Sınıf şablonu oluşturulamadı",
  TEMPLATE_NOT_FOUND: "Şablon bulunamadı",
  CLASS_TEMPLATE_RETRIEVED_SUCCESSFULLY: "Sınıf şablonu başarıyla getirildi",
  FAILED_TO_GET_CLASS_TEMPLATE: "Sınıf şablonu getirilemedi",
  NO_UPDATES_PROVIDED: "Güncelleme bilgisi sağlanmadı",
  CLASS_TEMPLATE_UPDATED_SUCCESSFULLY: "Sınıf şablonu başarıyla güncellendi",
  FAILED_TO_UPDATE_CLASS_TEMPLATE: "Sınıf şablonu güncellenemedi",
  CLASS_TEMPLATE_DELETED_SUCCESSFULLY: "Sınıf şablonu başarıyla silindi",
  FAILED_TO_DELETE_CLASS_TEMPLATE: "Sınıf şablonu silinemedi",
  
  // Sessions errors
  SESSION_CREATED_SUCCESSFULLY: "Oturum başarıyla oluşturuldu",
  FAILED_TO_CREATE_SESSION: "Oturum oluşturulamadı",
  SESSION_NOT_FOUND: "Oturum bulunamadı",
  SESSION_UPDATED_SUCCESSFULLY: "Oturum başarıyla güncellendi",
  FAILED_TO_UPDATE_SESSION: "Oturum güncellenemedi",
  SESSION_DELETED_SUCCESSFULLY: "Oturum başarıyla silindi",
  FAILED_TO_DELETE_SESSION: "Oturum silinemedi",
  SESSIONS_CREATED_SUCCESSFULLY: "Oturumlar başarıyla oluşturuldu",
  FAILED_TO_CREATE_SESSIONS: "Oturumlar oluşturulamadı",
  SESSIONS_ARRAY_REQUIRED: "Oturumlar dizisi gerekli ve boş olamaz",
  
  // Enrollment errors
  STUDENTS_ENROLLED_SUCCESSFULLY: "Öğrenciler başarıyla kaydedildi",
  FAILED_TO_ENROLL_STUDENTS: "Öğrenci kayıt işlemi başarısız",
  USERIDS_ARRAY_REQUIRED: "Kullanıcı ID'leri dizisi gerekli ve boş olamaz",
  
  // General access errors
  ESTABLISHMENT_CONTEXT_REQUIRED: "Kurum bağlamı gerekli",
  INVALID_ESTABLISHMENT_ACCESS: "Geçersiz kurum erişimi",
  
  // Invitation errors
  CANNOT_SPECIFY_BOTH_SESSION_AND_COHORT: "Hem oturum ID'si hem de grup ID'si belirtilemez. Birini seçin.",
  COHORT_ID_REQUIRED: "Grup ID'si gerekli",
  EXPIRY_HOURS_RANGE: "Son kullanma saati 0.1 ile 24 arasında olmalı",
  USAGE_LIMIT_RANGE: "Kullanım limiti 1 ile 50 arasında olmalı",
  COHORT_INVITATION_CREATED: "Grup daveti başarıyla oluşturuldu",
  STUDENT_INVITATIONS_DISABLED: "Öğrenci davetleri devre dışı",
  ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS: "Sadece yöneticiler eğitmen davet edebilir",
  INVALID_EMAIL_FORMAT: "Geçersiz e-posta formatı",
  INVALID_PHONE_FORMAT: "Geçersiz telefon formatı",
  INVITATION_CREATED: "Davet başarıyla oluşturuldu",
  DUPLICATE_INVITATION: "Bu kişiye zaten davet gönderilmiş",
  USER_ALREADY_EXISTS: "Bu e-posta adresiyle kayıtlı kullanıcı zaten mevcut",
  INVITATIONS_DISABLED: "Davetler devre dışı",
  INVITATION_ID_REQUIRED: "Davet ID'si gerekli",
  INVITATION_REVOKED: "Davet başarıyla iptal edildi",
  INVITATION_NOT_FOUND: "Davet bulunamadı",
  INVITATION_CREATION_FAILED: "Davet oluşturulamadı",
  INVALID_INVITATION: "Geçersiz davet",
  EMAIL_MISMATCH: "E-posta uyuşmuyor",
  COHORT_NOT_FOUND_OR_INACTIVE: "Grup bulunamadı veya aktif değil",
  USAGE_LIMIT_EXCEEDED: "Kullanım limiti 50 kişiyi geçemez",
  FAILED_TO_CREATE_INVITATION: "Davet oluşturulamadı",
  
  // Auth errors
  AUTHENTICATION_REQUIRED: "Kimlik doğrulaması gerekli",
  ESTABLISHMENT_ACCESS_REQUIRED: "Kurum erişimi gerekli",
  TOKEN_VALID: "Token geçerli",
  PASSWORD_REQUIRED: "Şifre gerekli",
  SESSION_MANAGEMENT_PENDING: "Oturum yönetimi endpoint'i - implementasyon bekleniyor",
  SESSION_ID_REQUIRED: "Oturum ID'si gerekli",
  SESSION_REVOCATION_PENDING: "Oturum iptali endpoint'i - implementasyon bekleniyor",
  INVALID_TOKEN: "Geçersiz token",
  INSTRUCTOR_ROLE_REQUIRED: "Eğitmen rolü gerekli",
  FAILED_TO_FETCH_USER_ROLE: "Kullanıcı rolü getirilemedi",
  
  // Dashboard errors
  DASHBOARD_SERVICES_UNAVAILABLE: "Gösterge paneli servisleri kullanılamıyor",
  MISSING_USER_ID: "Kullanıcı ID'si eksik"
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;