// worker.js - الخادم الخلفي الكامل

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/|\/$/g, ''); // إزالة / من البداية والنهاية
        
        // رؤوس CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };
        
        // التعامل مع طلبات OPTIONS (ما قبل CORS)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
        
        // مسار الاختبار
        if (request.method === 'GET' && (path === 'test' || path === '')) {
            return new Response(JSON.stringify({
                status: 'online',
                service: 'University Qualification Calculator API',
                version: '1.0.0',
                developer: 'Dr. Cherif Benali - University of Mila',
                endpoints: ['/calculate', '/export-html', '/export-json'],
                timestamp: new Date().toISOString()
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // فقط طلبات POST مسموحة للعمليات الحساسة
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                error: 'الطريقة غير مسموحة',
                allowed_methods: ['POST', 'OPTIONS']
            }), {
                status: 405,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        try {
            const data = await request.json();
            
            switch (path) {
                case 'calculate':
                    return await this.handleCalculate(data, corsHeaders);
                case 'export-html':
                    return await this.handleExportHtml(data, corsHeaders);
                case 'export-json':
                    return await this.handleExportJson(data, corsHeaders);
                default:
                    return new Response(JSON.stringify({
                        error: 'نقطة النهاية غير موجودة',
                        available_endpoints: ['/calculate', '/export-html', '/export-json', '/test']
                    }), {
                        status: 404,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json'
                        }
                    });
            }
        } catch (error) {
            console.error('Worker error:', error);
            
            return new Response(JSON.stringify({
                error: 'طلب غير صالح',
                message: error.message,
                timestamp: new Date().toISOString()
            }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    },
    
    async handleCalculate(data, headers) {
        try {
            // التحقق من البيانات
            this.validateInputData(data);
            
            // حساب النقاط
            const result = this.calculateQualificationPoints(data);
            
            return new Response(JSON.stringify(result), {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'X-Calculated-At': new Date().toISOString()
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'خطأ في الحساب',
                details: error.message,
                timestamp: new Date().toISOString()
            }), {
                status: 422,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
        }
    },
    
    async handleExportHtml(data, headers) {
        try {
            // حساب النقاط أولاً
            const result = this.calculateQualificationPoints(data);
            
            // توليد تقرير HTML
            const html = this.generateHtmlReport(data, result);
            
            return new Response(JSON.stringify({
                html: html,
                filename: `تقرير_نقاط_${data.firstName}_${data.lastName}_${new Date().toISOString().slice(0,10)}.html`,
                generatedAt: new Date().toISOString()
            }), {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'خطأ في توليد التقرير',
                details: error.message
            }), {
                status: 500,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
        }
    },
    
    async handleExportJson(data, headers) {
        try {
            // حساب النقاط
            const result = this.calculateQualificationPoints(data);
            
            // إعداد بيانات التصدير
            const exportData = {
                metadata: {
                    application: "تطبيق حساب نقاط التأهيل الجامعي للأستاذ الباحث",
                    version: "1.0.0",
                    exportedAt: new Date().toISOString(),
                    legalBase: "شبكة التقييم الخاصة بالأستاذ الباحث",
                    ministryDecisions: ["804/2021", "493/2022"],
                    developer: "الدكتور شريف بن علي - جامعة ميلة"
                },
                personalInfo: {
                    fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                    university: data.university || '',
                    department: data.department || '',
                    specializationField: data.specializationField || '',
                    email: data.email || '',
                    specialization: data.specialization === 'sciences' ? 'العلوم والتكنولوجيا' : 'العلوم الإنسانية والاجتماعية',
                    teachingYears: parseInt(data.teachingYears) || 0
                },
                calculatedResults: {
                    totalPoints: result.totalPoints,
                    eligible: result.eligible,
                    eligibilityReason: result.eligibilityReason,
                    breakdown: result.breakdown || [],
                    calculatedAt: new Date().toISOString()
                },
                rawInputData: {
                    // نسخة من البيانات المدخلة
                    ...data,
                    // مع بعض المعالجة الإضافية
                    publications: {
                        aPlus: {
                            firstAuthor: parseInt(data.categoryAPlusFirst) || 0,
                            secondAuthor: parseInt(data.categoryAPlusSecond) || 0,
                            thirdAuthorPlus: parseInt(data.categoryAPlusThird) || 0
                        },
                        a: {
                            firstAuthor: parseInt(data.categoryAFirst) || 0,
                            secondAuthor: parseInt(data.categoryASecond) || 0,
                            thirdAuthorPlus: parseInt(data.categoryAThird) || 0
                        },
                        b: {
                            firstAuthor: parseInt(data.categoryBFirst) || 0,
                            secondAuthor: parseInt(data.categoryBSecond) || 0,
                            thirdAuthorPlus: parseInt(data.categoryBThird) || 0
                        },
                        c: {
                            firstAuthor: parseInt(data.categoryCFirst) || 0,
                            secondAuthor: parseInt(data.categoryCSecond) || 0,
                            thirdAuthorPlus: parseInt(data.categoryCThird) || 0
                        }
                    }
                }
            };
            
            return new Response(JSON.stringify(exportData, null, 2), {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="تأهيل_جامعي_${data.firstName}_${data.lastName}.json"`
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'خطأ في تصدير البيانات',
                details: error.message
            }), {
                status: 500,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
        }
    },
    
    // ========== منطق الحساب الرئيسي ==========
    
    validateInputData(data) {
        // التحقق من البيانات المطلوبة
        if (!data.firstName || !data.lastName) {
            throw new Error('الاسم الأول والاسم الأخير مطلوبان');
        }
        
        if (!data.teachingYears || parseInt(data.teachingYears) < 3) {
            throw new Error('الحد الأدنى لسنوات التدريس هو 3 سنوات');
        }
        
        // التحقق من القيم العددية
        const numericFields = [
            'teachingYears', 'lessonsPerYear', 'guidedWorks', 'practicalWorks',
            'categoryAPlusFirst', 'categoryAPlusSecond', 'categoryAPlusThird'
        ];
        
        for (const field of numericFields) {
            if (data[field] && isNaN(parseInt(data[field]))) {
                throw new Error(`القيمة في ${field} غير صالحة`);
            }
        }
    },
    
    calculateQualificationPoints(data) {
        // نقاط كل فئة (يجب أن تكون مطابقة للواجهة الأمامية)
        const pointsConfig = {
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
        };
        
        let totalPoints = 0;
        let breakdown = [];
        
        // حساب نقاط التعليم (البيداغوجيا)
        totalPoints += this.calculateFieldPoints(data.lessonsPerYear, pointsConfig.lessonsPerYear, 'الدروس السنوية', breakdown);
        totalPoints += this.calculateFieldPoints(data.guidedWorks, pointsConfig.guidedWorks, 'الأعمال الموجهة', breakdown);
        totalPoints += this.calculateFieldPoints(data.practicalWorks, pointsConfig.practicalWorks, 'الأعمال التطبيقية', breakdown);
        totalPoints += this.calculateFieldPoints(data.onlineLessons, pointsConfig.onlineLessons, 'دروس عبر الخط', breakdown);
        
        // حساب نقاط النشاطات البيداغوجية
        totalPoints += this.calculateFieldPoints(data.printedLessons, pointsConfig.printedLessons, 'مطبوعة دروس', breakdown);
        totalPoints += this.calculateFieldPoints(data.pedagogicalPublications, pointsConfig.pedagogicalPublications, 'نشر مؤلفات بيداغوجية', breakdown);
        totalPoints += this.calculateFieldPoints(data.supervisionYears, pointsConfig.supervisionYears, 'القيام بالوصاية', breakdown);
        totalPoints += this.calculateFieldPoints(data.internshipFollowUp, pointsConfig.internshipFollowUp, 'متابعة الطلبة المتربصين', breakdown);
        totalPoints += this.calculateFieldPoints(data.universityEnvironment, pointsConfig.universityEnvironment, 'المشاركة في العلاقة مع المحيط', breakdown);
        totalPoints += this.calculateFieldPoints(data.pedagogicalAnimation, pointsConfig.pedagogicalAnimation, 'المشاركة في التنشيط البيداغوجي', breakdown);
        totalPoints += this.calculateFieldPoints(data.thesisSupervision, pointsConfig.thesisSupervision, 'تأطير مذكرات', breakdown);
        
        // حساب نقاط المنشورات العلمية حسب ترتيب المؤلف
        totalPoints += this.calculatePublicationPoints(
            data.categoryAPlusFirst, data.categoryAPlusSecond, data.categoryAPlusThird,
            pointsConfig.categoryAPlus.points, pointsConfig.categoryAPlus.max,
            'مقالات الصنف "أ+" الدولية', breakdown
        );
        
        totalPoints += this.calculatePublicationPoints(
            data.categoryAFirst, data.categoryASecond, data.categoryAThird,
            pointsConfig.categoryA.points, pointsConfig.categoryA.max,
            'مقالات الصنف "أ" الدولية', breakdown
        );
        
        totalPoints += this.calculatePublicationPoints(
            data.categoryBFirst, data.categoryBSecond, data.categoryBThird,
            pointsConfig.categoryB.points, pointsConfig.categoryB.max,
            'مقالات الصنف "ب" الدولية', breakdown
        );
        
        totalPoints += this.calculatePublicationPoints(
            data.categoryCFirst, data.categoryCSecond, data.categoryCThird,
            pointsConfig.categoryC.points, pointsConfig.categoryC.max,
            'مقالات الصنف "ج" الوطنية', breakdown
        );
        
        // حساب نقاط براءات الاختراع
        totalPoints += this.calculateFieldPoints(data.internationalPatents, pointsConfig.internationalPatents, 'براءات الاختراع الدولية', breakdown);
        totalPoints += this.calculateFieldPoints(data.nationalPatents, pointsConfig.nationalPatents, 'براءات الاختراع الوطنية', breakdown);
        
        // حساب نقاط المؤتمرات
        totalPoints += this.calculateFieldPoints(data.internationalConferences, pointsConfig.internationalConferences, 'المداخلات الدولية', breakdown);
        totalPoints += this.calculateFieldPoints(data.indexedProceedings, pointsConfig.indexedProceedings, 'مداخلات في proceedings مفهرسة', breakdown);
        totalPoints += this.calculateFieldPoints(data.nationalConferences, pointsConfig.nationalConferences, 'المداخلات الوطنية', breakdown);
        
        // حساب نقاط الأنشطة البحثية الأخرى
        totalPoints += this.calculateFieldPoints(data.phdSupervision, pointsConfig.phdSupervision, 'الإشراف على أطروحات الدكتوراه', breakdown);
        totalPoints += this.calculateFieldPoints(data.scientificPublications, pointsConfig.scientificPublications, 'نشر مؤلفات علمية', breakdown);
        totalPoints += this.calculateFieldPoints(data.phdTraining, pointsConfig.phdTraining, 'المشاركة في التكوين في الدكتوراه', breakdown);
        totalPoints += this.calculateFieldPoints(data.eventOrganization, pointsConfig.eventOrganization, 'المشاركة في تنظيم نشاط علمي', breakdown);
        totalPoints += this.calculateFieldPoints(data.internationalProjects, pointsConfig.internationalProjects, 'مشاريع تعاون دولية', breakdown);
        totalPoints += this.calculateFieldPoints(data.scientificActivities, pointsConfig.scientificActivities, 'المشاركة في النشاطات العلمية', breakdown);
        totalPoints += this.calculateFieldPoints(data.researchActivities, pointsConfig.researchActivities, 'المشاركة في نشاطات البحث', breakdown);
        
        // التحقق من المتطلبات
        const teachingYears = parseInt(data.teachingYears) || 0;
        const hasRequiredPublication = this.checkRequiredPublication(data);
        const minPoints = 350;
        
        let eligible = false;
        let eligibilityReason = '';
        
        if (totalPoints >= minPoints && teachingYears >= 3 && hasRequiredPublication) {
            eligible = true;
            eligibilityReason = 'يحقق جميع المتطلبات: نقاط كافية، سنوات تدريس، مقال إجباري';
        } else {
            const reasons = [];
            if (totalPoints < minPoints) reasons.push('نقاط غير كافية');
            if (teachingYears < 3) reasons.push('سنوات تدريس غير كافية');
            if (!hasRequiredPublication) reasons.push('لا يوجد مقال إجباري');
            eligibilityReason = 'غير مؤهل: ' + reasons.join('، ');
        }
        
        // ترتيب النقاط تنازلياً
        breakdown.sort((a, b) => b.points - a.points);
        
        return {
            totalPoints: Math.round(totalPoints),
            eligible: eligible,
            eligibilityReason: eligibilityReason,
            breakdown: breakdown.filter(item => item.points > 0),
            teachingYears: teachingYears,
            hasRequiredPublication: hasRequiredPublication,
            calculatedAt: new Date().toISOString()
        };
    },
    
    calculateFieldPoints(value, config, name, breakdown) {
        const count = parseInt(value) || 0;
        if (count <= 0) return 0;
        
        let points = count * config.points;
        
        // تطبيق الحد الأقصى
        if (config.max !== null && points > config.max) {
            points = config.max;
        }
        
        if (points > 0) {
            breakdown.push({
                name: name,
                points: Math.round(points),
                count: count
            });
        }
        
        return points;
    },
    
    calculatePublicationPoints(first, second, third, basePoints, maxPoints, name, breakdown) {
        const firstCount = parseInt(first) || 0;
        const secondCount = parseInt(second) || 0;
        const thirdCount = parseInt(third) || 0;
        
        let points = (firstCount * basePoints) + 
                     (secondCount * basePoints * 0.5) + 
                     (thirdCount * basePoints * 0.25);
        
        // تطبيق الحد الأقصى
        if (maxPoints !== null && points > maxPoints) {
            points = maxPoints;
        }
        
        const totalCount = firstCount + secondCount + thirdCount;
        
        if (points > 0) {
            breakdown.push({
                name: name,
                points: Math.round(points),
                count: totalCount,
                details: {
                    firstAuthor: firstCount,
                    secondAuthor: secondCount,
                    thirdAuthorPlus: thirdCount
                }
            });
        }
        
        return points;
    },
    
    checkRequiredPublication(data) {
        const specialization = data.specialization;
        
        const aPlusTotal = (parseInt(data.categoryAPlusFirst) || 0) + 
                          (parseInt(data.categoryAPlusSecond) || 0) + 
                          (parseInt(data.categoryAPlusThird) || 0);
        const aTotal = (parseInt(data.categoryAFirst) || 0) + 
                      (parseInt(data.categoryASecond) || 0) + 
                      (parseInt(data.categoryAThird) || 0);
        const bTotal = (parseInt(data.categoryBFirst) || 0) + 
                      (parseInt(data.categoryBSecond) || 0) + 
                      (parseInt(data.categoryBThird) || 0);
        const cTotal = (parseInt(data.categoryCFirst) || 0) + 
                      (parseInt(data.categoryCSecond) || 0) + 
                      (parseInt(data.categoryCThird) || 0);
        
        if (specialization === 'sciences') {
            // للعلوم والتكنولوجيا: يجب نشر مقال في الصنف "أ" أو "ب" أو "أ+"
            return (aPlusTotal > 0 || aTotal > 0 || bTotal > 0);
        } else if (specialization === 'humanities') {
            // للعلوم الإنسانية: يجب نشر مقال في الصنف "أ" أو "ب" أو "ج" أو "أ+"
            return (aPlusTotal > 0 || aTotal > 0 || bTotal > 0 || cTotal > 0);
        }
        
        return false;
    },
    
    // ========== توليد تقرير HTML ==========
    
    generateHtmlReport(data, result) {
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        const university = data.university || 'غير محددة';
        const department = data.department || 'غير محدد';
        const specializationField = data.specializationField || 'غير محدد';
        const specialization = data.specialization === 'sciences' ? 'العلوم والتكنولوجيا' : 'العلوم الإنسانية والاجتماعية';
        const teachingYears = parseInt(data.teachingYears) || 0;
        
        const totalPoints = result.totalPoints || 0;
        const eligible = result.eligible || false;
        
        // جمع إحصائيات المنشورات
        const publicationStats = {
            aPlus: {
                first: parseInt(data.categoryAPlusFirst) || 0,
                second: parseInt(data.categoryAPlusSecond) || 0,
                third: parseInt(data.categoryAPlusThird) || 0
            },
            a: {
                first: parseInt(data.categoryAFirst) || 0,
                second: parseInt(data.categoryASecond) || 0,
                third: parseInt(data.categoryAThird) || 0
            },
            b: {
                first: parseInt(data.categoryBFirst) || 0,
                second: parseInt(data.categoryBSecond) || 0,
                third: parseInt(data.categoryBThird) || 0
            },
            c: {
                first: parseInt(data.categoryCFirst) || 0,
                second: parseInt(data.categoryCSecond) || 0,
                third: parseInt(data.categoryCThird) || 0
            }
        };
        
        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير نقاط التأهيل الجامعي - ${fullName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Cairo', sans-serif; 
        }
        body { 
            background-color: #f5f9fc; 
            color: #333; 
            line-height: 1.6; 
            padding: 20px; 
        }
        .report-container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 5px 30px rgba(0,0,0,0.1); 
        }
        .report-header { 
            text-align: center; 
            background: linear-gradient(135deg, #1a5f7a 0%, #2a9d8f 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
        }
        .report-header h1 { 
            font-size: 28px; 
            margin-bottom: 10px; 
            font-weight: 700; 
        }
        .report-header p { 
            font-size: 16px; 
            opacity: 0.9; 
            margin: 5px 0; 
        }
        .personal-info { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
            border-right: 5px solid #2a9d8f; 
        }
        .personal-info h3 { 
            color: #1a5f7a; 
            margin-bottom: 20px; 
            text-align: center; 
            font-size: 22px; 
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 15px; 
            margin-top: 15px; 
        }
        .info-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 12px; 
            background: white; 
            border-radius: 6px; 
            border: 1px solid #e0e0e0; 
            font-size: 15px; 
        }
        .info-label { 
            font-weight: 600; 
            color: #1a5f7a; 
        }
        .legal-notice { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-right: 4px solid #2196f3; 
            font-size: 14px; 
        }
        .points-summary { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 25px; 
            border-radius: 12px; 
            border-right: 5px solid #2a9d8f; 
            margin-bottom: 30px; 
        }
        .points-summary h3 { 
            color: #1a5f7a; 
            margin-bottom: 20px; 
            text-align: center; 
            font-size: 22px; 
        }
        .points-item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            padding-bottom: 8px; 
            border-bottom: 1px solid #ddd; 
            font-size: 14px; 
        }
        .points-item:last-child { 
            border-bottom: none; 
        }
        .points-item.total { 
            font-weight: 700; 
            font-size: 18px; 
            color: #1a5f7a; 
            margin-top: 10px; 
            padding-top: 15px; 
            border-top: 2px solid #2a9d8f; 
        }
        .result-box { 
            text-align: center; 
            padding: 30px; 
            background: #f8f9fa; 
            border-radius: 10px; 
            margin: 25px 0; 
            border: 2px dashed #2a9d8f; 
        }
        .total-points { 
            font-size: 48px; 
            font-weight: 700; 
            color: #2a9d8f; 
            margin: 20px 0; 
        }
        .status { 
            font-size: 22px; 
            font-weight: 600; 
            padding: 15px 30px; 
            border-radius: 50px; 
            display: inline-block; 
            margin-top: 20px; 
        }
        .eligible { 
            background-color: #d4edda; 
            color: #155724; 
            border: 2px solid #c3e6cb; 
        }
        .not-eligible { 
            background-color: #f8d7da; 
            color: #721c24; 
            border: 2px solid #f5c6cb; 
        }
        .publications-section { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0; 
            border-right: 4px solid #9c27b0; 
        }
        .publications-section h4 { 
            color: #7b1fa2; 
            margin-bottom: 15px; 
            text-align: center; 
        }
        .publication-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-top: 15px; 
        }
        .publication-category { 
            background: white; 
            padding: 15px; 
            border-radius: 8px; 
            text-align: center; 
            border: 2px solid #e0e0e0; 
        }
        .publication-category.a-plus { border-color: #4caf50; background: #e8f5e9; }
        .publication-category.a { border-color: #2196f3; background: #e3f2fd; }
        .publication-category.b { border-color: #ff9800; background: #fff3e0; }
        .publication-category.c { border-color: #9c27b0; background: #f3e5f5; }
        .category-points { 
            font-size: 18px; 
            font-weight: bold; 
            margin-top: 5px; 
        }
        .notes { 
            background: #fff8e1; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-right: 4px solid #ffb300; 
        }
        .notes h4 { 
            color: #ff6f00; 
            margin-bottom: 15px; 
        }
        .notes ul { 
            padding-right: 20px; 
            margin-bottom: 15px; 
        }
        .notes li { 
            margin-bottom: 8px; 
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 20px; 
            color: #666; 
            font-size: 14px; 
            border-top: 1px solid #e0e0e0; 
            background: #f8f9fa; 
        }
        .signature { 
            text-align: left; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #333; 
        }
        .print-button { 
            text-align: center; 
            margin: 20px 0; 
        }
        .print-btn { 
            background: #2a9d8f; 
            color: white; 
            border: none; 
            padding: 12px 25px; 
            border-radius: 5px; 
            font-size: 16px; 
            cursor: pointer; 
        }
        .print-btn:hover { 
            background: #1a5f7a; 
        }
        @media print {
            .print-button { display: none; }
            body { padding: 0; }
            .report-container { 
                box-shadow: none; 
                padding: 15px; 
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1><i class="fas fa-university"></i> تقرير نقاط التأهيل الجامعي للأستاذ الباحث</h1>
            <p>بناءً على شبكة التقييم الخاصة بالأستاذ الباحث</p>
            <p>القرارات الوزارية المعمول بها: 804/2021 و 493/2022</p>
            <p style="font-size: 14px; margin-top: 10px;">تم إنشاء التقرير في: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
        
        <div class="legal-notice">
            <p><strong><i class="fas fa-gavel"></i> ملاحظة قانونية:</strong> هذا التقرير مبني على شبكة التقييم الخاصة بالأستاذ الباحث المعتمدة من قبل وزارة التعليم العالي والبحث العلمي. هذا التقرير للإرشاد فقط ولا يغني عن الرجوع للنصوص القانونية الرسمية.</p>
        </div>
        
        <div class="personal-info">
            <h3><i class="fas fa-user-graduate"></i> البيانات الشخصية</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">الاسم الكامل:</span>
                    <span>${fullName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">الجامعة:</span>
                    <span>${university}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">القسم/المخبر:</span>
                    <span>${department}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">التخصص الدقيق:</span>
                    <span>${specializationField}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">التخصص الرئيسي:</span>
                    <span>${specialization}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">سنوات التدريس:</span>
                    <span>${teachingYears} سنة</span>
                </div>
            </div>
        </div>
        
        <div class="publications-section">
            <h4><i class="fas fa-journal-whills"></i> المنشورات العلمية المدخلة</h4>
            <div class="publication-grid">
                <div class="publication-category a-plus">
                    <div style="font-weight: bold; color: #2e7d32;">الصنف أ+</div>
                    <div style="font-size: 14px; margin: 5px 0;">
                        مؤلف أول: ${publicationStats.aPlus.first}<br>
                        مؤلف ثاني: ${publicationStats.aPlus.second}<br>
                        مؤلف ثالث+: ${publicationStats.aPlus.third}
                    </div>
                    <div class="category-points" style="color: #2e7d32;">
                        ${(publicationStats.aPlus.first + publicationStats.aPlus.second + publicationStats.aPlus.third)} مقال
                    </div>
                </div>
                <div class="publication-category a">
                    <div style="font-weight: bold; color: #1565c0;">الصنف أ</div>
                    <div style="font-size: 14px; margin: 5px 0;">
                        مؤلف أول: ${publicationStats.a.first}<br>
                        مؤلف ثاني: ${publicationStats.a.second}<br>
                        مؤلف ثالث+: ${publicationStats.a.third}
                    </div>
                    <div class="category-points" style="color: #1565c0;">
                        ${(publicationStats.a.first + publicationStats.a.second + publicationStats.a.third)} مقال
                    </div>
                </div>
                <div class="publication-category b">
                    <div style="font-weight: bold; color: #ef6c00;">الصنف ب</div>
                    <div style="font-size: 14px; margin: 5px 0;">
                        مؤلف أول: ${publicationStats.b.first}<br>
                        مؤلف ثاني: ${publicationStats.b.second}<br>
                        مؤلف ثالث+: ${publicationStats.b.third}
                    </div>
                    <div class="category-points" style="color: #ef6c00;">
                        ${(publicationStats.b.first + publicationStats.b.second + publicationStats.b.third)} مقال
                    </div>
                </div>
                <div class="publication-category c">
                    <div style="font-weight: bold; color: #7b1fa2;">الصنف ج</div>
                    <div style="font-size: 14px; margin: 5px 0;">
                        مؤلف أول: ${publicationStats.c.first}<br>
                        مؤلف ثاني: ${publicationStats.c.second}<br>
                        مؤلف ثالث+: ${publicationStats.c.third}
                    </div>
                    <div class="category-points" style="color: #7b1fa2;">
                        ${(publicationStats.c.first + publicationStats.c.second + publicationStats.c.third)} مقال
                    </div>
                </div>
            </div>
            <p style="text-align: center; margin-top: 15px; font-size: 13px; color: #666;">
                <i class="fas fa-info-circle"></i> يتم احتساب النقاط كالتالي: المؤلف الأول (100%)، المؤلف الثاني (50%)، المؤلف الثالث فأكثر (25%)
            </p>
        </div>
        
        <div class="points-summary">
            <h3><i class="fas fa-chart-bar"></i> ملخص النقاط المحسوبة</h3>
            ${result.breakdown && result.breakdown.length > 0 ? 
                result.breakdown.map(item => `
                    <div class="points-item">
                        <span>${item.name}</span>
                        <span>${item.points} نقطة</span>
                    </div>
                `).join('') : 
                '<div style="text-align: center; color: #666; padding: 20px;">لا توجد نقاط محسوبة</div>'
            }
            <div class="points-item total">
                <span>المجموع الإجمالي</span>
                <span>${totalPoints} نقطة</span>
            </div>
        </div>
        
        <div class="result-box">
            <h3>النتيجة النهائية للتأهيل</h3>
            <div class="total-points">${totalPoints} نقطة</div>
            <div class="status ${eligible ? 'eligible' : 'not-eligible'}">
                ${eligible ? '✅ مؤهل للتأهيل الجامعي' : '❌ غير مؤهل للتأهيل'}
            </div>
            <p style="margin-top: 20px; font-size: 16px; color: #666;">
                ${result.eligibilityReason || ''}
            </p>
            <p style="margin-top: 15px;">
                الحد الأدنى المطلوب: <strong>350 نقطة و 3 سنوات تدريس</strong>
            </p>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">
                <i class="fas fa-info-circle"></i> يجب نشر مقال إجباري في المجلات المناسبة حسب التخصص
            </p>
        </div>
        
        <div class="notes">
            <h4><i class="fas fa-exclamation-triangle"></i> ملاحظات هامة:</h4>
            <ul>
                <li>الحد الأدنى المطلوب للتأهيل: <strong>350 نقطة و 3 سنوات تدريس فعلي</strong>.</li>
                <li>للعلوم والتكنولوجيا: يجب نشر مقال في مجلات الصنف <strong>"أ" أو "ب" أو "أ+"</strong>.</li>
                <li>للعلوم الإنسانية: يجب نشر مقال في مجلات الصنف <strong>"أ" أو "ب" أو "ج" أو "أ+"</strong>.</li>
                <li>المقالات المنشورة في مجلات مقتربة أولى محرر مقترب تعتبر <strong>غير مقبولة</strong>.</li>
                <li>يجب على المرشح أن يبرر مركزه بين المؤلفين المشاركين بالنسبة للمجالات التي تعتمد الترتيب الأبجدي.</li>
                <li>يتم احتساب نقاط المؤلفين كالتالي: المؤلف الأول (100%)، المؤلف الثاني (50%)، المؤلف الثالث فأكثر (25%).</li>
                <li>هذا التقرير <strong>غير رسمي</strong> ولا يمثل أي جهة حكومية.</li>
            </ul>
        </div>
        
        <div class="print-button">
            <button class="print-btn" onclick="window.print()">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
        
        <div class="signature">
            <p><strong>تم إنشاء هذا التقرير بواسطة:</strong></p>
            <p>تطبيق حساب نقاط التأهيل الجامعي للأستاذ الباحث</p>
            <p>المطور: <strong>الدكتور شريف بن علي</strong></p>
            <p>قسم الإعلام الآلي - كلية الرياضيات و الإعلام الآلي - جامعة ميلة</p>
            <p>البريد الإلكتروني: c.benali@centre-univ-mila.dz</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} هذا الموقع و المحتوى غير رسمي ولا يمثل أي جهة رسمية.</p>
            <p>تم التطوير من قبل: الدكتور شريف بن علي - جامعة ميلة</p>
            <p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}</p>
            <p style="margin-top: 15px; font-size: 12px; color: #888;">
                <i class="fas fa-code"></i> تم التطوير باستخدام HTML5, CSS3 & JavaScript | 
                <i class="fas fa-cloud"></i> مستضاف على GitHub Pages + Cloudflare Workers
            </p>
        </div>
    </div>
    
    <script>
        // نصيحة الطباعة
        window.addEventListener('beforeprint', () => {
            document.querySelector('.print-button').style.display = 'none';
        });
        window.addEventListener('afterprint', () => {
            document.querySelector('.print-button').style.display = 'block';
        });
    </script>
</body>
</html>`;
        
        return html;
    }
};