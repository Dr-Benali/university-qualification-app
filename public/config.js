// config.js - ملف التكوين الديناميكي
window.APP_CONFIG = {
    // إعدادات التطبيق
    appName: 'تطبيق حساب نقاط التأهيل الجامعي للأستاذ الباحث',
    version: '1.0.0',
    developer: 'الدكتور شريف بن علي - جامعة ميلة',
    developerEmail: 'c.benali@centre-univ-mila.dz',
    
    // إعدادات الخادم
    defaultWorkerUrl: 'https://univ-qualification.chefben.workers.dev',
    fallbackWorkerUrls: [
        'https://university-qualification-worker.chefben.workers.dev',
        'https://qualification-backup.chefben.workers.dev'
    ],
    
    // إعدادات الاتصال
    connectionTimeout: 10000, // 10 ثواني
    maxRetries: 3,
    
    // إعدادات النقاط
    minTeachingYears: 3,
    minRequiredPoints: 350,
    
    // قيم الحد الأقصى (للتحقق)
    maxValues: {
        teachingYears: 50,
        lessonsPerYear: 50,
        guidedWorks: 50,
        practicalWorks: 50,
        onlineLessons: 20,
        printedLessons: 10,
        pedagogicalPublications: 10,
        supervisionYears: 10,
        internshipFollowUp: 10,
        universityEnvironment: 5,
        pedagogicalAnimation: 10,
        thesisSupervision: 20,
        categoryAPlusFirst: 20,
        categoryAPlusSecond: 20,
        categoryAPlusThird: 20,
        categoryAFirst: 20,
        categoryASecond: 20,
        categoryAThird: 20,
        categoryBFirst: 20,
        categoryBSecond: 20,
        categoryBThird: 20,
        categoryCFirst: 20,
        categoryCSecond: 20,
        categoryCThird: 20,
        internationalPatents: 10,
        nationalPatents: 10,
        internationalConferences: 20,
        indexedProceedings: 10,
        nationalConferences: 20,
        phdSupervision: 10,
        scientificPublications: 10,
        phdTraining: 10,
        eventOrganization: 10,
        internationalProjects: 10,
        scientificActivities: 10,
        researchActivities: 10
    },
    
    // نقاط كل فئة
    points: {
        // التعليم
        lessonsPerYear: { points: 15, max: 45 },
        guidedWorks: { points: 8, max: 24 },
        practicalWorks: { points: 5, max: 15 },
        onlineLessons: { points: 15, max: null },
        
        // النشاطات البيداغوجية
        printedLessons: { points: 12, max: 24 },
        pedagogicalPublications: { points: 30, max: null },
        supervisionYears: { points: 3, max: 9 },
        internshipFollowUp: { points: 6, max: 18 },
        universityEnvironment: { points: 5, max: null },
        pedagogicalAnimation: { points: 5, max: null },
        thesisSupervision: { points: 9, max: 27 },
        
        // المنشورات العلمية
        categoryAPlus: { points: 100, max: null },
        categoryA: { points: 90, max: null },
        categoryB: { points: 60, max: null },
        categoryC: { points: 40, max: 80 },
        
        // براءات الاختراع
        internationalPatents: { points: 40, max: null },
        nationalPatents: { points: 20, max: null },
        
        // المؤتمرات
        internationalConferences: { points: 20, max: 40 },
        indexedProceedings: { points: 5, max: null },
        nationalConferences: { points: 10, max: 20 },
        
        // الأنشطة البحثية الأخرى
        phdSupervision: { points: 20, max: null },
        scientificPublications: { points: 20, max: null },
        phdTraining: { points: 15, max: null },
        eventOrganization: { points: 5, max: 10 },
        internationalProjects: { points: 5, max: 10 },
        scientificActivities: { points: 5, max: 15 },
        researchActivities: { points: 5, max: 10 }
    },
    
    // إعدادات واجهة المستخدم
    ui: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 ثانية
        showTooltips: true,
        animations: true,
        theme: 'light',
        language: 'ar',
        rtl: true
    },
    
    // الميزات المتاحة
    features: {
        calculate: true,
        exportHtml: true,
        exportJson: true,
        importJson: true,
        saveLocal: true,
        offlineMode: false, // لن يعمل بدون اتصال بسبب Worker
        backupData: true,
        restoreData: true,
        resetData: true
    },
    
    // المعلومات القانونية
    legalInfo: {
        basedOn: 'شبكة التقييم الخاصة بالأستاذ الباحث',
        ministryDecisions: ['804/2021', '493/2022'],
        lastUpdate: '2024-01-01',
        disclaimer: 'هذا التطبيق غير رسمي ولا يمثل أي جهة حكومية'
    },
    
    // معلومات النشر
    hosting: {
        frontend: 'GitHub Pages',
        backend: 'Cloudflare Workers',
        database: 'LocalStorage فقط',
        domain: 'مخصص (اختياري)'
    }
};

// تهيئة الإعدادات عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // عرض نسخة التطبيق
    const versionElements = document.querySelectorAll('#appVersion, #appVersionInfo');
    versionElements.forEach(el => {
        el.textContent = `الإصدار ${window.APP_CONFIG.version}`;
    });
    
    // تحميل إعدادات المستخدم
    const userSettings = localStorage.getItem('userSettings');
    if (userSettings) {
        try {
            const settings = JSON.parse(userSettings);
            if (settings.workerUrl) {
                window.WORKER_URL = settings.workerUrl;
                document.getElementById('workerUrl').value = settings.workerUrl;
            }
        } catch (e) {
            console.warn('خطأ في تحميل إعدادات المستخدم:', e);
        }
    }
    
    // إذا لم يكن هناك إعدادات، استخدم الافتراضي
    if (!window.WORKER_URL) {
        window.WORKER_URL = window.APP_CONFIG.defaultWorkerUrl;
    }
    
    // تحديث حالة الاتصال
    updateConnectionStatus();
});

// دالة لتحديث حالة الاتصال
function updateConnectionStatus() {
    const connectionStatus = document.getElementById('connectionStatus');
    const connectionStatusInfo = document.getElementById('connectionStatusInfo');
    
    if (navigator.onLine) {
        connectionStatus.textContent = '🔗 متصل بالإنترنت';
        connectionStatus.style.color = '#2a9d8f';
        connectionStatusInfo.textContent = '🔗 متصل بالإنترنت';
    } else {
        connectionStatus.textContent = '📡 غير متصل بالإنترنت';
        connectionStatus.style.color = '#ff6b6b';
        connectionStatusInfo.textContent = '📡 غير متصل بالإنترنت';
    }
}

// مستمع لتغير حالة الاتصال
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);