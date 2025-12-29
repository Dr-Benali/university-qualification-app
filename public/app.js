// app.js - المنطق الرئيسي للواجهة الأمامية

class QualificationApp {
    constructor() {
        this.workerUrl = window.WORKER_URL || window.APP_CONFIG.defaultWorkerUrl;
        this.isOnline = navigator.onLine;
        this.isCalculating = false;
        this.lastCalculation = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadSavedData();
        this.setupAutoSave();
        this.checkWorkerConnection();
        this.updatePublicationSummaries();
    }
    
    bindEvents() {
        // أزرار التبويب
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });
        
        // أزرار الإجراءات الرئيسية
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculatePoints());
        document.getElementById('saveData').addEventListener('click', () => this.saveToLocalStorage());
        document.getElementById('exportHtml').addEventListener('click', () => this.exportHtmlReport());
        document.getElementById('exportJson').addEventListener('click', () => this.exportJsonData());
        document.getElementById('importJson').addEventListener('click', () => this.importJsonData());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetForm());
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testWorkerConnection());
        
        // أزرار الإعدادات
        document.getElementById('saveSettings').addEventListener('click', () => this.saveUserSettings());
        document.getElementById('resetSettings').addEventListener('click', () => this.resetUserSettings());
        document.getElementById('backupData').addEventListener('click', () => this.backupAllData());
        document.getElementById('restoreData').addEventListener('click', () => this.restoreBackupData());
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllLocalData());
        
        // تحديث ملخصات المنشورات عند التغيير
        document.querySelectorAll('.author-fields input').forEach(input => {
            input.addEventListener('input', () => this.updatePublicationSummaries());
        });
        
        // تحديث القيم القصوى
        this.setupMaxValueChecks();
        
        // التحقق من اتصال الإنترنت
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionUI(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionUI(false);
        });
    }
    
    switchTab(e) {
        const tabId = e.target.getAttribute('data-tab');
        
        // إزالة النشاط من جميع الأزرار
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // إزالة النشاط من جميع المحتويات
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // إضافة النشاط للعناصر المحددة
        e.target.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }
    
    setupMaxValueChecks() {
        const maxValues = window.APP_CONFIG.maxValues;
        
        Object.keys(maxValues).forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.addEventListener('change', (e) => {
                    const max = maxValues[fieldId];
                    if (parseInt(e.target.value) > max) {
                        e.target.value = max;
                        this.showNotification(`القيمة القصوى المسموحة هي ${max}`, 'warning');
                    }
                });
            }
        });
    }
    
    setupAutoSave() {
        if (window.APP_CONFIG.ui.autoSave) {
            setInterval(() => {
                if (this.hasUnsavedChanges()) {
                    this.saveToLocalStorage(true);
                }
            }, window.APP_CONFIG.ui.autoSaveInterval);
        }
    }
    
    hasUnsavedChanges() {
        // يمكن إضافة منطق للتحقق من التغييرات غير المحفوظة
        return true; // مؤقتاً
    }
    
    // ========== الحساب والنقاط ==========
    
    async calculatePoints() {
        if (!this.isOnline) {
            this.showNotification('يجب أن تكون متصلاً بالإنترنت لحساب النقاط', 'error');
            return;
        }
        
        if (this.isCalculating) {
            return;
        }
        
        // التحقق من البيانات المطلوبة
        if (!this.validateRequiredFields()) {
            return;
        }
        
        this.isCalculating = true;
        this.showLoading(true);
        
        try {
            const formData = this.collectFormData();
            
            const response = await this.callWorker('calculate', formData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.updateResults(response);
            this.lastCalculation = {
                timestamp: new Date(),
                data: formData,
                result: response
            };
            
            this.updateLastCalculationInfo();
            this.showNotification('تم حساب النقاط بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في الحساب:', error);
            this.showNotification(`خطأ في الحساب: ${error.message}`, 'error');
            
            // محاولة الحساب محلياً كبديل
            this.calculateLocally();
            
        } finally {
            this.isCalculating = false;
            this.showLoading(false);
        }
    }
    
    calculateLocally() {
        try {
            const formData = this.collectFormData();
            const result = this.performLocalCalculation(formData);
            this.updateResults(result);
            this.showNotification('تم الحساب محلياً (بدون خادم)', 'info');
        } catch (error) {
            this.showNotification('فشل الحساب تماماً', 'error');
        }
    }
    
    performLocalCalculation(data) {
        // هذا منطق احتياطي للحساب المحلي
        // يمكن تنفيذه بشكل كامل إذا لزم الأمر
        return {
            totalPoints: 0,
            eligible: false,
            breakdown: [],
            message: 'الحساب المحلي غير متوفر، يرجى الاتصال بالإنترنت'
        };
    }
    
    updateResults(result) {
        // تحديث النقاط الإجمالية
        document.getElementById('totalPoints').textContent = result.totalPoints || 0;
        
        // تحديث حالة الأهلية
        const eligibilityElement = document.getElementById('eligibilityStatus');
        if (result.eligible) {
            eligibilityElement.textContent = 'مؤهل للتأهيل الجامعي';
            eligibilityElement.className = 'status eligible';
        } else {
            eligibilityElement.textContent = 'غير مؤهل للتأهيل';
            eligibilityElement.className = 'status not-eligible';
        }
        
        // تحديث ملخص النقاط
        this.updatePointsSummary(result.breakdown || [], result.totalPoints || 0);
    }
    
    updatePointsSummary(breakdown, totalPoints) {
        const container = document.getElementById('pointsSummary');
        
        if (!breakdown || breakdown.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-info-circle"></i><br>
                    لم يتم حساب أي نقاط بعد
                </div>
            `;
            return;
        }
        
        let html = '';
        breakdown.forEach(item => {
            html += `
                <div class="points-item">
                    <span>${item.name}</span>
                    <span>${item.points} نقطة</span>
                </div>
            `;
        });
        
        html += `
            <div class="points-item total">
                <span>المجموع الإجمالي</span>
                <span>${totalPoints} نقطة</span>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    // ========== التصدير والاستيراد ==========
    
    async exportHtmlReport() {
        if (!this.isOnline) {
            this.showNotification('يجب أن تكون متصلاً بالإنترنت لتصدير التقرير', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const formData = this.collectFormData();
            const response = await this.callWorker('export-html', formData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.downloadFile(
                response.html,
                `تقرير_نقاط_التأهيل_${formData.firstName}_${formData.lastName}_${new Date().toISOString().slice(0,10)}.html`,
                'text/html'
            );
            
            this.showNotification('تم تصدير التقرير بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في تصدير HTML:', error);
            this.showNotification(`خطأ في التصدير: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async exportJsonData() {
        if (!this.isOnline) {
            this.showNotification('يجب أن تكون متصلاً بالإنترنت لتصدير JSON', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const formData = this.collectFormData();
            const response = await this.callWorker('export-json', formData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.downloadFile(
                JSON.stringify(response, null, 2),
                `بيانات_التأهيل_${formData.firstName}_${formData.lastName}_${new Date().toISOString().slice(0,10)}.json`,
                'application/json'
            );
            
            this.showNotification('تم تصدير البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في تصدير JSON:', error);
            this.showNotification(`خطأ في التصدير: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    importJsonData() {
        const fileInput = document.getElementById('fileImport');
        fileInput.onchange = (e) => this.handleFileImport(e);
        fileInput.click();
    }
    
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadImportedData(data);
                this.showNotification('تم استيراد البيانات بنجاح', 'success');
                this.calculatePoints(); // حساب النقاط بعد الاستيراد
            } catch (error) {
                console.error('خطأ في قراءة الملف:', error);
                this.showNotification('ملف غير صالح. يرجى التأكد من صيغة JSON', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // مسح الملف المحدد
    }
    
    loadImportedData(data) {
        // تحميل البيانات الشخصية
        if (data.firstName) document.getElementById('firstName').value = data.firstName;
        if (data.lastName) document.getElementById('lastName').value = data.lastName;
        if (data.university) document.getElementById('university').value = data.university;
        if (data.department) document.getElementById('department').value = data.department;
        if (data.specializationField) document.getElementById('specializationField').value = data.specializationField;
        if (data.email) document.getElementById('email').value = data.email;
        
        // تحميل بيانات الحساب
        if (data.specialization) document.getElementById('specialization').value = data.specialization;
        if (data.teachingYears) document.getElementById('teachingYears').value = data.teachingYears;
        
        // تحميل بقية البيانات...
        // [يمكن إكمال تحميل جميع الحقول هنا]
        
        this.updatePublicationSummaries();
        this.saveToLocalStorage();
    }
    
    // ========== إدارة البيانات المحلية ==========
    
    saveToLocalStorage(silent = false) {
        try {
            const data = this.collectFormData();
            data.lastSaved = new Date().toISOString();
            
            localStorage.setItem('qualificationData', JSON.stringify(data));
            
            if (!silent) {
                this.showNotification('تم حفظ البيانات محلياً', 'success');
            }
            
            this.updateSavedDataInfo();
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            if (!silent) {
                this.showNotification('خطأ في حفظ البيانات', 'error');
            }
            return false;
        }
    }
    
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('qualificationData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.loadImportedData(data);
                this.updateSavedDataInfo();
                
                // إذا كان هناك حساب سابق، قم بعرضه
                if (data.lastCalculation) {
                    this.updateResults(data.lastCalculation);
                }
            }
        } catch (error) {
            console.warn('خطأ في تحميل البيانات المحفوظة:', error);
        }
    }
    
    backupAllData() {
        try {
            const allData = {
                qualificationData: localStorage.getItem('qualificationData'),
                userSettings: localStorage.getItem('userSettings'),
                backupDate: new Date().toISOString(),
                appVersion: window.APP_CONFIG.version
            };
            
            this.downloadFile(
                JSON.stringify(allData, null, 2),
                `نسخة_احتياطية_التأهيل_${new Date().toISOString().slice(0,10)}.json`,
                'application/json'
            );
            
            this.showNotification('تم إنشاء نسخة احتياطية', 'success');
        } catch (error) {
            console.error('خطأ في النسخ الاحتياطي:', error);
            this.showNotification('خطأ في النسخ الاحتياطي', 'error');
        }
    }
    
    restoreBackupData() {
        const fileInput = document.getElementById('fileRestore');
        fileInput.onchange = (e) => this.handleBackupRestore(e);
        fileInput.click();
    }
    
    handleBackupRestore(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!confirm('هل أنت متأكد من رغبتك في استعادة النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (backup.qualificationData) {
                    localStorage.setItem('qualificationData', backup.qualificationData);
                }
                
                if (backup.userSettings) {
                    localStorage.setItem('userSettings', backup.userSettings);
                }
                
                // إعادة تحميل الصفحة
                setTimeout(() => {
                    location.reload();
                }, 1000);
                
                this.showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success');
            } catch (error) {
                console.error('خطأ في استعادة النسخة الاحتياطية:', error);
                this.showNotification('ملف النسخة الاحتياطية غير صالح', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }
    
    clearAllLocalData() {
        if (!confirm('⚠️ تحذير: هل أنت متأكد من رغبتك في حذف جميع البيانات المحفوظة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
            return;
        }
        
        try {
            localStorage.clear();
            this.resetForm();
            this.showNotification('تم حذف جميع البيانات', 'success');
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            this.showNotification('خطأ في حذف البيانات', 'error');
        }
    }
    
    // ========== الإعدادات ==========
    
    saveUserSettings() {
        const workerUrl = document.getElementById('workerUrl').value.trim();
        
        if (workerUrl && !this.isValidUrl(workerUrl)) {
            this.showNotification('رابط الخادم غير صالح', 'error');
            return;
        }
        
        const settings = {
            workerUrl: workerUrl || window.APP_CONFIG.defaultWorkerUrl,
            savedAt: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('userSettings', JSON.stringify(settings));
            this.workerUrl = settings.workerUrl;
            this.showNotification('تم حفظ الإعدادات', 'success');
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            this.showNotification('خطأ في حفظ الإعدادات', 'error');
        }
    }
    
    resetUserSettings() {
        if (confirm('هل تريد استعادة الإعدادات الافتراضية؟')) {
            localStorage.removeItem('userSettings');
            document.getElementById('workerUrl').value = window.APP_CONFIG.defaultWorkerUrl;
            this.workerUrl = window.APP_CONFIG.defaultWorkerUrl;
            this.showNotification('تم استعادة الإعدادات الافتراضية', 'success');
        }
    }
    
    // ========== مساعدة وخدمات ==========
    
    async testWorkerConnection() {
        if (!this.isOnline) {
            this.showNotification('غير متصل بالإنترنت', 'error');
            return;
        }
        
        this.showLoading(true, 'جارٍ اختبار الاتصال...');
        
        try {
            const response = await fetch(this.workerUrl + '/test', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showNotification(`✅ الاتصال ناجح: ${data.message || 'الخادم يعمل'}`, 'success');
            } else {
                throw new Error(`خطأ ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('فشل اختبار الاتصال:', error);
            
            // محاولة استخدام رابط بديل
            if (this.workerUrl !== window.APP_CONFIG.defaultWorkerUrl) {
                this.showNotification('محاولة استخدام الرابط الافتراضي...', 'info');
                this.workerUrl = window.APP_CONFIG.defaultWorkerUrl;
                setTimeout(() => this.testWorkerConnection(), 1000);
            } else {
                this.showNotification('❌ فشل الاتصال بالخادم', 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }
    
    async checkWorkerConnection() {
        if (!this.isOnline) return;
        
        try {
            // محاولة بسيطة للتحقق من الاتصال
            await fetch(this.workerUrl, { method: 'HEAD' });
            this.updateConnectionUI(true);
        } catch (error) {
            console.warn('الخادم غير متاح:', error);
            this.updateConnectionUI(false);
        }
    }
    
    updateConnectionUI(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const statusInfo = document.getElementById('connectionStatusInfo');
        const offlineWarning = document.getElementById('offlineWarning');
        const offlineMessage = document.getElementById('offlineMessage');
        
        if (connected) {
            statusElement.innerHTML = '🔗 متصل بالخادم';
            statusElement.style.color = '#2a9d8f';
            statusInfo.innerHTML = '🔗 متصل بالخادم';
            offlineWarning.style.display = 'none';
        } else {
            statusElement.innerHTML = '📡 الخادم غير متاح';
            statusElement.style.color = '#ff6b6b';
            statusInfo.innerHTML = '📡 الخادم غير متاح';
            
            if (!this.isOnline) {
                offlineMessage.textContent = 'لا يمكن استخدام التطبيق بدون اتصال بالإنترنت';
                offlineWarning.style.display = 'block';
            }
        }
    }
    
    // ========== أدوات مساعدة ==========
    
    collectFormData() {
        const data = {};
        
        // البيانات الشخصية
        data.firstName = document.getElementById('firstName').value;
        data.lastName = document.getElementById('lastName').value;
        data.university = document.getElementById('university').value;
        data.department = document.getElementById('department').value;
        data.specializationField = document.getElementById('specializationField').value;
        data.email = document.getElementById('email').value;
        
        // بيانات الحساب
        data.specialization = document.getElementById('specialization').value;
        data.teachingYears = document.getElementById('teachingYears').value;
        
        // جمع جميع الحقول الرقمية
        const numberFields = [
            'lessonsPerYear', 'guidedWorks', 'practicalWorks', 'onlineLessons',
            'printedLessons', 'pedagogicalPublications', 'supervisionYears', 'internshipFollowUp',
            'universityEnvironment', 'pedagogicalAnimation', 'thesisSupervision',
            'categoryAPlusFirst', 'categoryAPlusSecond', 'categoryAPlusThird',
            'categoryAFirst', 'categoryASecond', 'categoryAThird',
            'categoryBFirst', 'categoryBSecond', 'categoryBThird',
            'categoryCFirst', 'categoryCSecond', 'categoryCThird',
            'internationalPatents', 'nationalPatents',
            'internationalConferences', 'indexedProceedings', 'nationalConferences',
            'phdSupervision', 'scientificPublications', 'phdTraining',
            'eventOrganization', 'internationalProjects', 'scientificActivities', 'researchActivities'
        ];
        
        numberFields.forEach(field => {
            const value = document.getElementById(field).value;
            data[field] = value ? parseInt(value) : 0;
        });
        
        return data;
    }
    
    validateRequiredFields() {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const teachingYears = parseInt(document.getElementById('teachingYears').value) || 0;
        
        if (!firstName || !lastName) {
            this.showNotification('الرجاء إدخال الاسم الأول والاسم الأخير', 'warning');
            return false;
        }
        
        if (teachingYears < window.APP_CONFIG.minTeachingYears) {
            this.showNotification(`الحد الأدنى لسنوات التدريس هو ${window.APP_CONFIG.minTeachingYears} سنوات`, 'warning');
            return false;
        }
        
        return true;
    }
    
    async callWorker(endpoint, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), window.APP_CONFIG.connectionTimeout);
        
        try {
            const response = await fetch(`${this.workerUrl}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`خطأ ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('انتهت مهلة الاتصال بالخادم');
            }
            throw error;
        }
    }
    
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    showNotification(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // إضافة الأنماط
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10001;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideDown 0.3s ease;
                min-width: 300px;
                max-width: 500px;
            }
            @keyframes slideDown {
                from { top: -100px; opacity: 0; }
                to { top: 20px; opacity: 1; }
            }
            .notification-success { background: linear-gradient(135deg, #2a9d8f 0%, #1a5f7a 100%); }
            .notification-error { background: linear-gradient(135deg, #ff6b6b 0%, #c44569 100%); }
            .notification-warning { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); }
            .notification-info { background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%); }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-right: 0;
                margin-left: auto;
            }
        `;
        document.head.appendChild(style);
        
        // إضافة الإشعار إلى الصفحة
        document.body.appendChild(notification);
        
        // إغلاق الإشعار عند النقر على الزر
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // إزالة الإشعار تلقائياً بعد 5 ثواني
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    showLoading(show, message = 'جارٍ المعالجة...') {
        const overlay = document.getElementById('loadingOverlay');
        
        if (show) {
            overlay.style.display = 'flex';
            overlay.querySelector('p').textContent = message;
        } else {
            overlay.style.display = 'none';
        }
    }
    
    updatePublicationSummaries() {
        // حساب وتحديث ملخصات المنشورات
        const categories = ['APlus', 'A', 'B', 'C'];
        
        categories.forEach(category => {
            const first = parseInt(document.getElementById(`category${category}First`).value) || 0;
            const second = parseInt(document.getElementById(`category${category}Second`).value) || 0;
            const third = parseInt(document.getElementById(`category${category}Third`).value) || 0;
            
            const total = first + second + third;
            document.getElementById(`category${category}Total`).textContent = total;
            
            // حساب النقاط المحتملة
            const basePoints = window.APP_CONFIG.points[`category${category}`].points;
            const maxPoints = window.APP_CONFIG.points[`category${category}`].max;
            
            let points = (first * basePoints) + 
                         (second * basePoints * 0.5) + 
                         (third * basePoints * 0.25);
            
            if (maxPoints) {
                points = Math.min(points, maxPoints);
            }
            
            document.getElementById(`category${category}Points`).textContent = Math.round(points);
        });
    }
    
    updateLastCalculationInfo() {
        if (this.lastCalculation) {
            const date = new Date(this.lastCalculation.timestamp).toLocaleString('ar-EG');
            document.getElementById('lastCalculationInfo').textContent = date;
        }
    }
    
    updateSavedDataInfo() {
        const savedData = localStorage.getItem('qualificationData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                const date = new Date(data.lastSaved || Date.now()).toLocaleString('ar-EG');
                document.getElementById('savedDataInfo').textContent = `محفوظة في: ${date}`;
            } catch (e) {
                document.getElementById('savedDataInfo').textContent = 'محفوظة';
            }
        } else {
            document.getElementById('savedDataInfo').textContent = 'لا يوجد';
        }
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    resetForm() {
        if (!confirm('هل أنت متأكد من رغبتك في إعادة تعيين جميع الحقول؟ سيتم فقدان جميع البيانات الحالية.')) {
            return;
        }
        
        // إعادة تعيين النموذج
        const form = document.querySelector('form, .tab-content.active');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else if (input.type === 'number') {
                    input.value = '0';
                } else if (input.id === 'teachingYears') {
                    input.value = '3';
                } else if (input.id === 'specialization') {
                    input.value = 'sciences';
                } else {
                    input.value = '';
                }
            });
        }
        
        // إعادة تعيين النتائج
        document.getElementById('totalPoints').textContent = '0';
        document.getElementById('eligibilityStatus').textContent = 'غير مؤهل للتأهيل';
        document.getElementById('eligibilityStatus').className = 'status not-eligible';
        document.getElementById('pointsSummary').innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px;">
                <i class="fas fa-calculator"></i><br>
                أدخل البيانات ثم اضغط على "حساب النقاط"
            </div>
        `;
        
        // تحديث ملخصات المنشورات
        this.updatePublicationSummaries();
        
        this.showNotification('تم إعادة تعيين النموذج', 'success');
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.qualificationApp = new QualificationApp();
    
    // تحديث معلومات التطبيق
    qualificationApp.updateSavedDataInfo();
    qualificationApp.updateLastCalculationInfo();
});