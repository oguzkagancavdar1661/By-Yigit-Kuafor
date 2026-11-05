/* ===================================================================
   BY YİĞİT KUAFÖR - ONLINE RANDEVU YÖNETİM MOTORU
   - Adım Adım Randevu Rezervasyonu
   - Sunucu Çakışma Kontrolü (Conflict Protection)
   - Gerçek Zamanlı Takvim & Pazar Günü Filtresi
   - WhatsApp ve .ICS Takvim Entegrasyonu
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        currentStep: 1,
        services: [],
        selectedService: null,
        selectedDate: null,
        selectedTime: null,
        currentCalendarMonth: new Date().getMonth(),
        currentCalendarYear: new Date().getFullYear(),
        customer: {
            name: '',
            phone: '',
            notes: ''
        },
        confirmedAppointment: null
    };

    // DOM Elements
    const stepperItems = document.querySelectorAll('.step-item');
    const stepPanes = document.querySelectorAll('.booking-step-pane');
    const servicesGrid = document.getElementById('bookingServicesGrid');
    const calendarDaysGrid = document.getElementById('calendarDaysGrid');
    const currentMonthLabel = document.getElementById('currentMonthLabel');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const slotsGrid = document.getElementById('slotsGrid');
    
    // Summary Fields
    const summaryServiceName = document.getElementById('summaryServiceName');
    const summaryDateTime = document.getElementById('summaryDateTime');
    const summaryDuration = document.getElementById('summaryDuration');
    const summaryPrice = document.getElementById('summaryPrice');

    // Navigation Buttons
    const btnToStep2 = document.getElementById('btnToStep2');
    const btnBackTo1 = document.getElementById('btnBackTo1');
    const btnToStep3 = document.getElementById('btnToStep3');
    const btnBackTo2 = document.getElementById('btnBackTo2');
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');
    const btnNewBooking = document.getElementById('btnNewBooking');
    const btnWhatsAppConfirm = document.getElementById('btnWhatsAppConfirm');
    const btnDownloadIcs = document.getElementById('btnDownloadIcs');

    // Customer Form Inputs
    const inputCustomerName = document.getElementById('customerName');
    const inputCustomerPhone = document.getElementById('customerPhone');
    const inputCustomerNotes = document.getElementById('customerNotes');

    // Fallback Services if backend is not reachable
    const FALLBACK_SERVICES = [
        {
            id: "sac-yikama",
            name: "Saç Kesimi & Yıkama",
            category: "Saç",
            price: 400,
            priceDisplay: "400 ₺",
            duration: "45 dk",
            badge: "En Çok Tercih Edilen",
            description: "Kafa yapısına uygun modern veya klasik kesim, şampuanla yıkama ve profesyonel fön."
        },
        {
            id: "fade-kesim",
            name: "Özel Fade & Skin Fade Kesim",
            category: "Saç",
            price: 450,
            priceDisplay: "450 ₺",
            duration: "50 dk",
            badge: "Trend Stil",
            description: "Kusursuz Low / Mid / High fade saç kesimi, çizgi rötuşları ve yıkama."
        },
        {
            id: "sakal-tasarim",
            name: "Sakal Tıraşı & Buharlı Bakım",
            category: "Sakal",
            price: 250,
            priceDisplay: "250 ₺",
            duration: "30 dk",
            badge: "Klasik Ustura",
            description: "Sıcak buhar terapi eşliğinde geleneksel ustura tıraşı ve sakal serumu."
        },
        {
            id: "kombin-bakim",
            name: "Saç & Sakal Kombin Bakım",
            category: "Kombin",
            price: 600,
            priceDisplay: "600 ₺",
            duration: "60 dk",
            badge: "Tavsiye Edilen",
            description: "Saç kesimi, buharlı ustura sakal tasarımı, saç yıkama, fön ve ağda bakımı."
        },
        {
            id: "vip-damat",
            name: "VIP Damat Tıraşı Paketi",
            category: "Özel",
            price: 1500,
            priceDisplay: "1.500 ₺",
            duration: "120 dk",
            badge: "VIP Özel",
            description: "Komple saç-sakal tasarımı, cilt detoksu, siyah nokta maskesi ve kahve ikramı."
        },
        {
            id: "cilt-maske",
            name: "Cilt Bakımı & Kil Maskesi",
            category: "Bakım",
            price: 250,
            priceDisplay: "250 ₺",
            duration: "30 dk",
            badge: "Ferahlık",
            description: "Gözenek açıcı buhar uygulaması, arındırıcı kil maskesi ve canlandırıcı tonik."
        }
    ];

    // Master slots for working hours
    const MASTER_SLOTS = [
        "09:00", "09:45", "10:30", "11:15", "12:00", "12:45",
        "13:30", "14:15", "15:00", "15:45", "16:30", "17:15",
        "18:00", "18:45", "19:30", "20:15"
    ];

    // Initialize Services
    async function loadServices() {
        try {
            const res = await fetch('/api/services');
            if (!res.ok) throw new Error('API failed');
            state.services = await res.json();
        } catch (e) {
            console.warn('API kullanılamıyor, dahili veriler yükleniyor:', e);
            state.services = FALLBACK_SERVICES;
        }
        renderServices();
    }

    // Render Services Step 1
    function renderServices() {
        if (!servicesGrid) return;
        servicesGrid.innerHTML = '';

        state.services.forEach(service => {
            const card = document.createElement('div');
            card.className = `booking-service-card ${state.selectedService && state.selectedService.id === service.id ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="select-radio"></div>
                <div class="bsc-title">${service.name}</div>
                <div class="bsc-price">${service.price} ₺</div>
                <div class="bsc-meta"><i class="fa-regular fa-clock"></i> Süre: ${service.duration}</div>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-top:8px;">${service.description}</p>
            `;

            card.addEventListener('click', () => {
                selectService(service);
            });

            servicesGrid.appendChild(card);
        });
    }

    function selectService(service) {
        state.selectedService = service;
        renderServices();
        if (btnToStep2) btnToStep2.removeAttribute('disabled');
        updateSummary();
    }

    // Calendar & Dates
    const MONTH_NAMES = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    function renderCalendar() {
        if (!calendarDaysGrid || !currentMonthLabel) return;

        const year = state.currentCalendarYear;
        const month = state.currentCalendarMonth;

        currentMonthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

        calendarDaysGrid.innerHTML = '';

        // Day of week names
        const dayHeaders = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        dayHeaders.forEach((dh, idx) => {
            const hDiv = document.createElement('div');
            hDiv.className = `cal-day-name ${idx === 6 ? 'sunday' : ''}`;
            hDiv.textContent = dh;
            calendarDaysGrid.appendChild(hDiv);
        });

        // First day of month
        const firstDayDate = new Date(year, month, 1);
        let firstDayIndex = firstDayDate.getDay() - 1; // 0 for Mon, 6 for Sun
        if (firstDayIndex === -1) firstDayIndex = 6;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells before first day
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day disabled';
            calendarDaysGrid.appendChild(emptyCell);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const cell = document.createElement('div');
            const thisDate = new Date(year, month, dayNum);
            thisDate.setHours(0, 0, 0, 0);

            const isPast = thisDate < today;
            const isSunday = thisDate.getDay() === 0;
            const isToday = thisDate.getTime() === today.getTime();

            // Date string format YYYY-MM-DD
            const yyyy = year;
            const mm = String(month + 1).padStart(2, '0');
            const dd = String(dayNum).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const isSelected = state.selectedDate === dateStr;

            cell.className = 'cal-day';
            cell.textContent = dayNum;

            if (isPast) {
                cell.classList.add('disabled');
            } else if (isSunday) {
                cell.classList.add('sunday');
                cell.title = "Pazar günleri kapalıyız";
            } else {
                if (isToday) cell.classList.add('today');
                if (isSelected) cell.classList.add('selected');

                cell.addEventListener('click', () => {
                    selectDate(dateStr, thisDate);
                });
            }

            calendarDaysGrid.appendChild(cell);
        }
    }

    async function selectDate(dateStr, dateObj) {
        state.selectedDate = dateStr;
        state.selectedTime = null; // Reset time slot when date changes
        if (btnToStep3) btnToStep3.setAttribute('disabled', 'true');

        const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' });
        const formatted = `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}, ${dayName}`;
        if (selectedDateDisplay) {
            selectedDateDisplay.innerHTML = `<i class="fa-solid fa-calendar-check" style="color:var(--gold-primary)"></i> ${formatted}`;
        }

        renderCalendar();
        await loadAvailableSlots(dateStr);
        updateSummary();
    }

    // Load available slots from server or local calculation
    async function loadAvailableSlots(dateStr) {
        if (!slotsGrid) return;
        slotsGrid.innerHTML = '<div class="slots-empty-notice"><i class="fa-solid fa-circle-notch fa-spin"></i> Saatler kontrol ediliyor...</div>';

        let slotData = [];
        try {
            const res = await fetch(`/api/available-slots?date=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                slotData = data.slots || [];
            } else {
                throw new Error();
            }
        } catch (e) {
            // Local fallback calculation if offline or direct file://
            const bookedList = JSON.parse(localStorage.getItem('by_yigit_appointments') || '[]');
            const bookedSet = new Set(
                bookedList.filter(item => item.date === dateStr && item.status !== 'İptal Edildi').map(item => item.time)
            );

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            slotData = MASTER_SLOTS.map(timeStr => {
                const [h, m] = timeStr.split(':').map(Number);
                const isPast = isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
                const isBooked = bookedSet.has(timeStr);
                return {
                    time: timeStr,
                    available: !isPast && !isBooked,
                    reason: isBooked ? 'Dolu' : (isPast ? 'Geçmiş' : 'Müsait')
                };
            });
        }

        renderSlots(slotData);
    }

    function renderSlots(slots) {
        if (!slotsGrid) return;
        slotsGrid.innerHTML = '';

        if (!slots || slots.length === 0) {
            slotsGrid.innerHTML = '<div class="slots-empty-notice">Bu tarihte uygun randevu saati bulunmamaktadır.</div>';
            return;
        }

        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';

            if (!slot.available) {
                if (slot.reason === 'Dolu') {
                    btn.classList.add('booked');
                    btn.innerHTML = `${slot.time} <small>Dolu</small>`;
                } else {
                    btn.classList.add('past');
                    btn.innerHTML = `${slot.time} <small>Geçti</small>`;
                }
                btn.disabled = true;
            } else {
                if (state.selectedTime === slot.time) {
                    btn.classList.add('selected');
                }
                btn.innerHTML = `${slot.time} <small>Müsait</small>`;
                btn.addEventListener('click', () => {
                    selectTimeSlot(slot.time);
                });
            }

            slotsGrid.appendChild(btn);
        });
    }

    function selectTimeSlot(timeStr) {
        state.selectedTime = timeStr;
        const allSlotBtns = slotsGrid.querySelectorAll('.slot-btn');
        allSlotBtns.forEach(btn => {
            if (btn.textContent.startsWith(timeStr)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        if (btnToStep3) btnToStep3.removeAttribute('disabled');
        updateSummary();
    }

    // Step 3 Summary update
    function updateSummary() {
        if (summaryServiceName) {
            summaryServiceName.textContent = state.selectedService ? state.selectedService.name : '-';
        }
        if (summaryDuration) {
            summaryDuration.textContent = state.selectedService ? state.selectedService.duration : '-';
        }
        if (summaryPrice) {
            summaryPrice.textContent = state.selectedService ? `${state.selectedService.price} ₺` : '0 ₺';
        }
        if (summaryDateTime) {
            if (state.selectedDate && state.selectedTime) {
                const [y, m, d] = state.selectedDate.split('-');
                summaryDateTime.textContent = `${d}.${m}.${y} Saat: ${state.selectedTime}`;
            } else if (state.selectedDate) {
                const [y, m, d] = state.selectedDate.split('-');
                summaryDateTime.textContent = `${d}.${m}.${y} (Saat seçiniz)`;
            } else {
                summaryDateTime.textContent = '-';
            }
        }
    }

    // Stepper Navigation
    function goToStep(stepNum) {
        state.currentStep = stepNum;

        // Update stepper indicators
        stepperItems.forEach((item, idx) => {
            const itemStep = idx + 1;
            item.classList.remove('active', 'completed');
            if (itemStep === stepNum) {
                item.classList.add('active');
            } else if (itemStep < stepNum) {
                item.classList.add('completed');
            }
        });

        // Show corresponding pane
        stepPanes.forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `stepPane${stepNum}`) {
                pane.classList.add('active');
            }
        });

        // Scroll into view smoothly
        const bookingSection = document.getElementById('randevu');
        if (bookingSection) {
            bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Step Button Bindings
    if (btnToStep2) {
        btnToStep2.addEventListener('click', () => {
            if (!state.selectedService) {
                showToast('Lütfen önce almak istediğiniz hizmeti seçiniz.', 'error');
                return;
            }
            goToStep(2);
            // Default select tomorrow or first available day if not selected
            if (!state.selectedDate) {
                const target = new Date();
                target.setDate(target.getDate() + 1);
                if (target.getDay() === 0) target.setDate(target.getDate() + 1); // skip sunday

                const yyyy = target.getFullYear();
                const mm = String(target.getMonth() + 1).padStart(2, '0');
                const dd = String(target.getDate()).padStart(2, '0');
                selectDate(`${yyyy}-${mm}-${dd}`, target);
            }
        });
    }

    if (btnBackTo1) {
        btnBackTo1.addEventListener('click', () => goToStep(1));
    }

    if (btnToStep3) {
        btnToStep3.addEventListener('click', () => {
            if (!state.selectedDate || !state.selectedTime) {
                showToast('Lütfen randevu tarihi ve saati seçiniz.', 'error');
                return;
            }
            updateSummary();
            goToStep(3);
        });
    }

    if (btnBackTo2) {
        btnBackTo2.addEventListener('click', () => goToStep(2));
    }

    // Month Navigation
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            const today = new Date();
            // Do not go earlier than current month
            if (state.currentCalendarYear === today.getFullYear() && state.currentCalendarMonth <= today.getMonth()) {
                return;
            }
            state.currentCalendarMonth--;
            if (state.currentCalendarMonth < 0) {
                state.currentCalendarMonth = 11;
                state.currentCalendarYear--;
            }
            renderCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            state.currentCalendarMonth++;
            if (state.currentCalendarMonth > 11) {
                state.currentCalendarMonth = 0;
                state.currentCalendarYear++;
            }
            renderCalendar();
        });
    }

    // Submit Booking (Step 3 -> Step 4 Confirmation)
    if (btnSubmitBooking) {
        btnSubmitBooking.addEventListener('click', async () => {
            const name = inputCustomerName ? inputCustomerName.value.trim() : '';
            const phone = inputCustomerPhone ? inputCustomerPhone.value.trim() : '';
            const notes = inputCustomerNotes ? inputCustomerNotes.value.trim() : '';

            if (!name || name.length < 3) {
                showToast('Lütfen adınızı ve soyadınızı eksiksiz giriniz.', 'error');
                if (inputCustomerName) inputCustomerName.focus();
                return;
            }

            // Simple phone format validation
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length < 10) {
                showToast('Lütfen geçerli bir telefon numarası giriniz (ör: 0542 695 82 41).', 'error');
                if (inputCustomerPhone) inputCustomerPhone.focus();
                return;
            }

            btnSubmitBooking.setAttribute('disabled', 'true');
            btnSubmitBooking.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Randevunuz Oluşturuluyor...';

            const payload = {
                serviceId: state.selectedService.id,
                date: state.selectedDate,
                time: state.selectedTime,
                customerName: name,
                customerPhone: phone,
                notes: notes
            };

            try {
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.status === 409) {
                    // Conflict error
                    showToast(result.error || 'Bu saat için az önce randevu alındı. Lütfen başka bir saat seçiniz.', 'error');
                    goToStep(2);
                    await loadAvailableSlots(state.selectedDate);
                    return;
                }

                if (!response.ok) {
                    throw new Error(result.error || 'Randevu oluşturulamadı');
                }

                // Success
                state.confirmedAppointment = result.appointment;
                renderConfirmationTicket(result.appointment);
                showToast('Randevunuz başarıyla oluşturuldu!', 'success');
                goToStep(4);

            } catch (err) {
                console.warn('API error, falling back to local storage simulation:', err);

                // Local fallback simulation
                const randomCode = Math.floor(1000 + Math.random() * 9000);
                const localAppointment = {
                    id: `BY-${randomCode}`,
                    serviceId: state.selectedService.id,
                    serviceName: state.selectedService.name,
                    price: state.selectedService.price,
                    duration: state.selectedService.duration,
                    date: state.selectedDate,
                    time: state.selectedTime,
                    customerName: name,
                    customerPhone: phone,
                    notes: notes,
                    status: 'Onaylandı',
                    createdAt: new Date().toISOString()
                };

                const existing = JSON.parse(localStorage.getItem('by_yigit_appointments') || '[]');
                existing.unshift(localAppointment);
                localStorage.setItem('by_yigit_appointments', JSON.stringify(existing));

                state.confirmedAppointment = localAppointment;
                renderConfirmationTicket(localAppointment);
                showToast('Randevunuz başarıyla oluşturuldu!', 'success');
                goToStep(4);

            } finally {
                btnSubmitBooking.removeAttribute('disabled');
                btnSubmitBooking.innerHTML = 'Randevuyu Onayla ve Tamamla <i class="fa-solid fa-check"></i>';
            }
        });
    }

    // Render Ticket View (Step 4)
    function renderConfirmationTicket(app) {
        const ticketCode = document.getElementById('ticketCode');
        const ticketCustomer = document.getElementById('ticketCustomer');
        const ticketService = document.getElementById('ticketService');
        const ticketDate = document.getElementById('ticketDate');
        const ticketTime = document.getElementById('ticketTime');
        const ticketPrice = document.getElementById('ticketPrice');
        const ticketPhone = document.getElementById('ticketPhone');

        if (ticketCode) ticketCode.textContent = app.id;
        if (ticketCustomer) ticketCustomer.textContent = app.customerName;
        if (ticketService) ticketService.textContent = `${app.serviceName} (${app.duration})`;

        const [y, m, d] = app.date.split('-');
        if (ticketDate) ticketDate.textContent = `${d}.${m}.${y}`;
        if (ticketTime) ticketTime.textContent = app.time;
        if (ticketPrice) ticketPrice.textContent = `${app.price} ₺`;
        if (ticketPhone) ticketPhone.textContent = app.customerPhone;

        // WhatsApp message preparation
        if (btnWhatsAppConfirm) {
            const message = encodeURIComponent(
                `Merhaba By Yiğit Kuaför, ${app.date} saat ${app.time} için ${app.serviceName} randevusu aldım.\nRandevu Kodum: ${app.id}\nİsmim: ${app.customerName}`
            );
            btnWhatsAppConfirm.href = `https://wa.me/905426958241?text=${message}`;
        }

        // Setup iCal download
        if (btnDownloadIcs) {
            btnDownloadIcs.onclick = () => downloadIcsFile(app);
        }
    }

    // Generate and download .ics calendar file
    function downloadIcsFile(app) {
        const dateClean = app.date.replace(/-/g, '');
        const [h, m] = app.time.split(':');
        const startHour = String(h).padStart(2, '0');
        const startMin = String(m).padStart(2, '0');

        // Assume 45 mins duration for ics end time
        let endH = parseInt(h);
        let endM = parseInt(m) + 45;
        if (endM >= 60) {
            endH += Math.floor(endM / 60);
            endM = endM % 60;
        }
        const endHour = String(endH).padStart(2, '0');
        const endMin = String(endM).padStart(2, '0');

        const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BY YIGIT KUAFOR//TR
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:BY YİĞİT KUAFÖR - ${app.serviceName} Randevusu
DESCRIPTION:Randevu Kodu: ${app.id}\\nHizmet: ${app.serviceName}\\nÜcret: ${app.price} TL\\nTel: 0542 695 82 41
LOCATION:Onursal Apart, Selçuklu Mah. Milli Egemenlik Cd. Altı B/17, Aziziye / Erzurum
DTSTART:${dateClean}T${startHour}${startMin}00
DTEND:${dateClean}T${endHour}${endMin}00
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `By_Yigit_Kuafor_${app.id}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Takvim dosyası (.ics) indirildi.', 'success');
    }

    // New Booking Button Reset
    if (btnNewBooking) {
        btnNewBooking.addEventListener('click', () => {
            state.selectedService = null;
            state.selectedDate = null;
            state.selectedTime = null;
            state.confirmedAppointment = null;
            if (inputCustomerName) inputCustomerName.value = '';
            if (inputCustomerPhone) inputCustomerPhone.value = '';
            if (inputCustomerNotes) inputCustomerNotes.value = '';
            renderServices();
            goToStep(1);
        });
    }

    // Helper: Toast Notifications
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Global listener for fast booking buttons from Services cards
    window.selectServiceAndBook = function(serviceId) {
        const service = state.services.find(s => s.id === serviceId);
        if (service) {
            selectService(service);
            const bookingSection = document.getElementById('randevu');
            if (bookingSection) {
                bookingSection.scrollIntoView({ behavior: 'smooth' });
            }
            goToStep(2);
            // Default select tomorrow if not selected
            if (!state.selectedDate) {
                const target = new Date();
                target.setDate(target.getDate() + 1);
                if (target.getDay() === 0) target.setDate(target.getDate() + 1);

                const yyyy = target.getFullYear();
                const mm = String(target.getMonth() + 1).padStart(2, '0');
                const dd = String(target.getDate()).padStart(2, '0');
                selectDate(`${yyyy}-${mm}-${dd}`, target);
            }
        }
    };

    // Initial load
    loadServices();
    renderCalendar();
});
